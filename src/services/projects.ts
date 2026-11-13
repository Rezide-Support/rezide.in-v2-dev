import { ApiError, api } from "@/lib/api/client";
import { matchesText, paginate } from "@/features/search/match";
import type { Intent, Paginated, Project, ProjectSearchCriteria, Property } from "@/types/models";
import type { ProjectDetail } from "./catalog";
import { fetchLandmarks, fetchLocalityPhoto } from "./localities";
import { inChosenBudgets, toProject, toProjectFilters, withProjectDetail, type BackendProjectDetail, type BackendProjectRow } from "./project-mapper";
import { toProperty, type BackendListingPage } from "./property-mapper";

/*
 * Server only: projects from the Rezide backend, the same endpoints as rezide.in's
 * /api/projects routes. Detail records hold the developer's bank and PAN details, so
 * the browser only ever gets what ./project-mapper.ts copies. Contract: docs/API.md.
 */

const FILTER_URL = "/Inventory/project/filter/new";
type ProjectPage = { data?: BackendProjectRow[]; result_count?: number };
type Filters = ReturnType<typeof toProjectFilters>;

const postFilters = (body: Filters, timeout?: number) => api.post<ProjectPage>(FILTER_URL, body, timeout ? { timeout } : undefined).then((r) => r.data);

/* ---------------- Search ---------------- */

const PAGE_SIZE = 250;
const MAX_PROJECTS = 6000;
const TTL_MS = 5 * 60_000;
/** A big page is slow, and many at once overload the backend, so they go a few at a time. */
const PAGE_TIMEOUT_MS = 60_000;
const PAGE_CONCURRENCY = 4;
const cache = new Map<string, { at: number; projects: Promise<Project[]> }>();

/** Empties the cache (tests). */
export const resetProjectCache = () => cache.clear();

/** Only New Launch can't be read from a row (the backend words them as Under Construction). */
const statusFor = (c: ProjectSearchCriteria) => (c.status.length === 1 && c.status[0] === "nl" ? "nl" : undefined);

/** Everything matching the filters, for the checks the backend can't do. Fetched in pages and kept for a few minutes. */
function allMatching(c: ProjectSearchCriteria, now = Date.now()): Promise<Project[]> {
  const body = { ...toProjectFilters(c), page: 1, pageSize: PAGE_SIZE };
  const key = JSON.stringify(body);
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.projects;
  const load = async () => {
    const first = await postFilters(body, PAGE_TIMEOUT_MS);
    const pageCount = Math.ceil(Math.min(first.result_count ?? 0, MAX_PROJECTS) / PAGE_SIZE);
    const pages = [first];
    for (let next = 2; next <= pageCount; next += PAGE_CONCURRENCY) {
      const batch = Array.from({ length: Math.min(PAGE_CONCURRENCY, pageCount - next + 1) }, (_, i) => postFilters({ ...body, page: next + i }, PAGE_TIMEOUT_MS));
      pages.push(...(await Promise.all(batch)));
    }
    return pages.flatMap((p) => (p.data ?? []).map((row) => toProject(row, c.city, statusFor(c))));
  };
  const projects = load();
  cache.set(key, { at: now, projects });
  projects.catch(() => cache.delete(key));
  return projects;
}

/**
 * The project search. Most filters are the backend's. It ignores possession years, can't
 * combine text with localities (any of them matches), and treats budgets as one range, so
 * those searches are checked here.
 */
export async function searchProjects(c: ProjectSearchCriteria): Promise<Paginated<Project>> {
  const textAndPlace = c.q.trim() !== "" && c.localities.length > 0;
  if (c.years.length === 0 && !textAndPlace && c.budget.length <= 1) {
    const page = await postFilters(toProjectFilters(c));
    const total = page.result_count ?? 0;
    return {
      items: (page.data ?? []).map((row) => toProject(row, c.city, statusFor(c))),
      total,
      page: c.page,
      perPage: c.perPage,
      pageCount: Math.max(1, Math.ceil(total / c.perPage)),
    };
  }
  const all = await allMatching(c);
  const matched = all.filter(
    (p) =>
      (c.years.length === 0 || (p.possessionYear !== undefined && c.years.includes(p.possessionYear))) &&
      (!textAndPlace || matchesText(c.q, [p.name, p.developer, p.locality])) &&
      (c.budget.length <= 1 || inChosenBudgets(p, c)),
  );
  return paginate(matched, c.page, c.perPage);
}

/** Specific projects, in the given city. */
export async function getProjectsByIds(ids: string[], city: string): Promise<Paginated<Project>> {
  if (ids.length === 0) return { items: [], total: 0, page: 1, perPage: 1, pageCount: 1 };
  const page = await api.post<ProjectPage>(FILTER_URL, { page: 1, pageSize: ids.length, ids }).then((r) => r.data);
  const items = (page.data ?? []).map((row) => toProject(row, city));
  return { items, total: items.length, page: 1, perPage: ids.length, pageCount: 1 };
}

/* ---------------- Details ---------------- */

/** How many similar and nearby projects a detail page shows. */
const RELATED_COUNT = 6;
/** The most listings a project page lists per purpose. */
const MAX_LISTINGS = 100;

/** A project's listings. The backend's project_id filter misses listings here, so they're found by name, and kept by id. */
async function listingsOf(projectId: string, projectName: string): Promise<Property[]> {
  const purpose = async (intent: Intent) => {
    const { data } = await api.post<BackendListingPage>("/inventory/Listing/mobile/all", {
      page: 1,
      pageSize: MAX_LISTINGS,
      project_names_localities: [projectName],
      property_purpose: [intent === "rent" ? "rent" : "sale"],
    });
    return (data.data ?? []).map(toProperty).filter((l) => l.projectId === projectId);
  };
  const [sale, rent] = await Promise.all([purpose("buy"), purpose("rent")]);
  return [...sale, ...rent];
}

const orEmpty = <T,>(fallback: T) => (): T => fallback;

/** One project for the detail page. A missing project rejects with a 404. */
export async function getProjectDetail(id: string): Promise<ProjectDetail> {
  // Checked first: the backend's detail endpoint answers an unknown id with a server error.
  const missing = () => new ApiError("This project doesn't exist or is no longer live.", 404);
  if (!/^[0-9a-f]{24}$/i.test(id)) throw missing();
  const rows = await getProjectsByIds([id], "");
  const row = rows.items.find((p) => p.id === id);
  if (!row) throw missing();
  const { data: detail } = await api.get<BackendProjectDetail>(`/Inventory/project/${encodeURIComponent(id)}`);
  if (!detail.project) throw missing();

  const project = withProjectDetail(row, detail);
  const address = detail.project.locality_and_address?.address;
  const similarIds = (detail.project.similar_projects ?? []).flatMap((s) => (s.value && s.value !== id ? [s.value] : [])).slice(0, RELATED_COUNT);
  const place = address?.sub_region?.trim() || project.locality;

  const [listings, landmarks, localityPhoto, similar, nearby] = await Promise.all([
    listingsOf(id, project.name).catch(orEmpty<Property[]>([])),
    fetchLandmarks(id).catch(orEmpty(undefined)),
    address?.locality ? fetchLocalityPhoto(address.locality).catch(orEmpty(null)) : Promise.resolve(null),
    getProjectsByIds(similarIds, project.city).then((p) => p.items).catch(orEmpty<Project[]>([])),
    // Near by: rezide.in searches the project's sub-region.
    place
      ? postFilters({ page: 1, pageSize: RELATED_COUNT + 1, city: [], project_names_localities_subRegions: [place], project_age: [], views: [], ids: [] })
          .then((p) => (p.data ?? []).map((r) => toProject(r, project.city)).filter((p2) => p2.id !== id).slice(0, RELATED_COUNT))
          .catch(orEmpty<Project[]>([]))
      : Promise.resolve<Project[]>([]),
  ]);
  const similarOnly = similar.filter((s) => !nearby.some((n) => n.id === s.id));
  return { project: { ...project, landmarks, localityPhoto: localityPhoto ?? undefined }, listings, similar: similarOnly, nearby };
}

/** The project on a listing page, with its listing counts. A failure never fails the listing. */
export async function findListingProject(projectId: string | undefined, city: string) {
  if (!projectId) return { project: null, projectStock: undefined };
  const [rows, stock] = await Promise.all([
    getProjectsByIds([projectId], city).catch(() => null),
    api
      .post<{ result_sale?: number; result_rent?: number }>("/inventory/Listing/mobile/filter/count", { project_id: [projectId] })
      .then(({ data }) => ({ sale: data.result_sale ?? 0, rent: data.result_rent ?? 0 }))
      .catch(() => undefined),
  ]);
  return { project: rows?.items.find((p) => p.id === projectId) ?? null, projectStock: stock };
}
