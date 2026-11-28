import { setBounded } from "@/lib/bounded-cache";
import { cache as cacheDetail } from "react";
import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { ApiError, api } from "@/lib/api/client";
import { paginate } from "@/features/search/match";
import type { Intent, Paginated, Project, ProjectSearchCriteria, Property } from "@/types/models";
import type { DeveloperStats, ProjectDetail } from "./catalog";
import { fetchLandmarks, findLocality } from "./localities";
import { projectCityLookup } from "./project-city-index";
import { inChosenBudgets, projectMediaOf, toConfigurationPlans, toListingProject, toProject, toProjectFilters, withProjectDetail, type BackendProjectDetail, type BackendProjectRow } from "./project-mapper";
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
    const [first, cityOf] = await Promise.all([postFilters(body, PAGE_TIMEOUT_MS), projectCityLookup()]);
    const pageCount = Math.ceil(Math.min(first.result_count ?? 0, MAX_PROJECTS) / PAGE_SIZE);
    const pages = [first];
    for (let next = 2; next <= pageCount; next += PAGE_CONCURRENCY) {
      const batch = Array.from({ length: Math.min(PAGE_CONCURRENCY, pageCount - next + 1) }, (_, i) => postFilters({ ...body, page: next + i }, PAGE_TIMEOUT_MS));
      pages.push(...(await Promise.all(batch)));
    }
    return pages.flatMap((p) => (p.data ?? []).map((row) => toProject(row, c.city, statusFor(c), cityOf)));
  };
  const projects = load();
  setBounded(cache, key, { at: now, projects }, 25, TTL_MS, now);
  projects.catch(() => { if (cache.get(key)?.projects === projects) cache.delete(key); });
  return projects;
}

/**
 * The project search. Most filters are the backend's. It ignores possession years and
 * treats budgets as one range, so those searches are checked here.
 */
export async function searchProjects(c: ProjectSearchCriteria): Promise<Paginated<Project>> {
  if (c.years.length === 0 && c.budget.length <= 1) {
    const [page, cityOf] = await Promise.all([postFilters(toProjectFilters(c)), projectCityLookup()]);
    const total = page.result_count ?? 0;
    return {
      items: await withConfigurations((page.data ?? []).map((row) => toProject(row, c.city, statusFor(c), cityOf))),
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
      (c.budget.length <= 1 || inChosenBudgets(p, c)),
  );
  const page = paginate(matched, c.page, c.perPage);
  return { ...page, items: await withConfigurations(page.items) };
}

/**
 * The cards' per-configuration ranges (the "Details" table), as rezide.in loads them: one
 * batched POST /Inventory/project/ids for the page. Those records hold the developer's bank
 * details, so only the ranges are copied. A failure leaves the cards without the table.
 */
async function withConfigurations(items: Project[]): Promise<Project[]> {
  const ids = items.map((p) => p.id).filter((id) => BACKEND_ID_PATTERN.test(id));
  if (ids.length === 0) return items;
  try {
    type Row = Parameters<typeof toConfigurationPlans>[0] & Parameters<typeof projectMediaOf>[0] & { _id?: string };
    const { data } = await api.post<{ data?: Row[] }>("/Inventory/project/ids", { projectIds: ids });
    const byId = new Map((data.data ?? []).flatMap((r) => (r?._id ? [[r._id, r] as const] : [])));
    return items.map((p) => {
      const row = byId.get(p.id);
      if (!row) return p;
      const plans = toConfigurationPlans(row);
      // The same rows carry the video and the 360° tour (the card's buttons, as on rezide.in).
      return { ...p, ...projectMediaOf(row), ...(plans.length ? { configurationPlans: plans } : {}) };
    });
  } catch {
    return items;
  }
}

/**
 * Compare Project's "Select project" list, as rezide.in asks for it: the backend's first page
 * (10) of projects matching any of the locality and name typed, or the latest with neither.
 */
export async function findProjectsByNames(names: string[]): Promise<{ id: string; name: string }[]> {
  const terms = names.map((n) => n.trim()).filter(Boolean).slice(0, 2);
  const { data } = await api.post<ProjectPage>(FILTER_URL, { project_names_localities_subRegions: terms });
  return (data.data ?? []).flatMap((r) => (r._id && r.project_name ? [{ id: String(r._id), name: r.project_name.trim() }] : []));
}

/** Specific projects, in the given city. */
export async function getProjectsByIds(ids: string[], city: string): Promise<Paginated<Project>> {
  if (ids.length === 0) return { items: [], total: 0, page: 1, perPage: 1, pageCount: 1 };
  const [page, cityOf] = await Promise.all([api.post<ProjectPage>(FILTER_URL, { page: 1, pageSize: ids.length, ids }).then((r) => r.data), projectCityLookup()]);
  const items = (page.data ?? []).map((row) => toProject(row, city, undefined, cityOf));
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
export const getProjectDetail = cacheDetail(async (id: string): Promise<ProjectDetail> => {
  // Checked first: the backend's detail endpoint answers an unknown id with a server error.
  const missing = () => new ApiError("This project doesn't exist or is no longer live.", 404);
  if (!BACKEND_ID_PATTERN.test(id)) throw missing();
  const rows = await getProjectsByIds([id], "");
  const row = rows.items.find((p) => p.id === id);
  if (!row) throw missing();
  const { data: detail } = await api.get<BackendProjectDetail>(`/Inventory/project/${encodeURIComponent(id)}`);
  if (!detail.project) throw missing();

  const project = withProjectDetail(row, detail);
  const address = detail.project.locality_and_address?.address;
  const similarIds = (detail.project.similar_projects ?? []).flatMap((s) => (s.value && s.value !== id ? [s.value] : [])).slice(0, RELATED_COUNT);
  const place = address?.sub_region?.trim() || project.locality;

  const [listings, landmarks, locality, similar, nearby, developer] = await Promise.all([
    listingsOf(id, project.name).catch(orEmpty<Property[]>([])),
    fetchLandmarks(id).catch(orEmpty(undefined)),
    address?.locality ? findLocality(address.locality).catch(orEmpty(null)) : Promise.resolve(null),
    getProjectsByIds(similarIds, project.city).then((p) => p.items).catch(orEmpty<Project[]>([])),
    // Near by: rezide.in searches the project's sub-region.
    place
      ? postFilters({ page: 1, pageSize: RELATED_COUNT + 1, city: [], project_names_localities_subRegions: [place], subRegions: [], project_age: [], views: [], sortBy: "Latest", ids: [] })
          .then(async (p) => {
            const cityOf = await projectCityLookup();
            return (p.data ?? []).map((r) => toProject(r, project.city, undefined, cityOf)).filter((p2) => p2.id !== id).slice(0, RELATED_COUNT);
          })
          .catch(orEmpty<Project[]>([]))
      : Promise.resolve<Project[]>([]),
    developerStats(project).catch(orEmpty(undefined)),
  ]);
  const similarOnly = similar.filter((s) => !nearby.some((n) => n.id === s.id));
  // The cards' Details tables: one batched request for both rails.
  const withRanges = await withConfigurations([...similarOnly, ...nearby]);
  return {
    project: { ...project, landmarks, localityPhoto: locality?.photo ?? undefined, localityId: locality?.id, localitySlug: locality?.slug },
    listings,
    similar: withRanges.slice(0, similarOnly.length),
    nearby: withRanges.slice(similarOnly.length),
    developer,
  };
});

/** How many projects the developer's counts are read from (rezide.in reads one page of 50). */
const DEVELOPER_PAGE = 50;

/**
 * The About developer counts, worked out as rezide.in does: the backend has no developer
 * filter, so projects are searched by the developer's name. The total is the search's
 * count; the statuses are counted on its first page of 50.
 */
async function developerStats(project: Project): Promise<DeveloperStats | undefined> {
  const name = project.developerProfile?.name || project.developer;
  if (!name.trim()) return undefined;
  const page = await postFilters({
    page: 1,
    pageSize: DEVELOPER_PAGE,
    city: [],
    project_names_localities_subRegions: [name.trim()],
    subRegions: [],
    project_age: [],
    views: [],
    sortBy: "Latest",
    ids: [],
  });
  const statuses = (page.data ?? []).map((r) => r.status?.trim().toLowerCase());
  const count = (s: string) => statuses.filter((v) => v === s).length;
  return {
    total: page.result_count ?? 0,
    rtm: count("ready to move"),
    uc: count("under construction"),
    nl: count("new launch"),
    cities: project.developerProfile?.cities?.length ? project.developerProfile.cities : [project.city],
  };
}

/** A developer's projects for their page, by the backend's status (rezide.in's four tabs). */
export type DeveloperProjects = { total: number; all: Project[]; rtm: Project[]; uc: Project[]; nl: Project[] };

/**
 * rezide.in's "Projects By {developer}": the first 50 projects found by the developer's name,
 * with the cards' Details tables. The total is the search's count; each tab takes the projects
 * the backend words with that status.
 */
/** `city`: shown on cards whose search row names none (the developer's city). */
export async function getDeveloperProjects(name: string, city = ""): Promise<DeveloperProjects> {
  const empty = { total: 0, all: [], rtm: [], uc: [], nl: [] };
  if (!name.trim()) return empty;
  const page = await postFilters({
    page: 1,
    pageSize: DEVELOPER_PAGE,
    city: [],
    project_names_localities_subRegions: [name.trim()],
    subRegions: [],
    project_age: [],
    views: [],
    sortBy: "Latest",
    ids: [],
  });
  const rows = page.data ?? [];
  const cityOf = await projectCityLookup();
  const all = await withConfigurations(rows.map((r) => toProject(r, r.city?.trim() || city, undefined, cityOf)));
  const withStatus = (s: string) => all.filter((_, i) => rows[i].status?.trim().toLowerCase() === s);
  return { total: page.result_count ?? 0, all, rtm: withStatus("ready to move"), uc: withStatus("under construction"), nl: withStatus("new launch") };
}

/** The project on a listing page, with its listing counts. A failure never fails the listing. */
export async function findListingProject(projectId: string | undefined, city: string) {
  if (!projectId) return { project: null, projectStock: undefined };
  const [rows, stock] = await Promise.all([
    api.post<{ data?: BackendProjectRow[] }>("/Inventory/project/ids", { projectIds: [projectId] })
      .then(({ data }) => ({ items: (Array.isArray(data.data) ? data.data : []).map(row => toListingProject(row, city)) })).catch(() => null),
    api
      .post<{ result_sale?: number; result_rent?: number }>("/inventory/Listing/mobile/filter/count", { project_id: [projectId] })
      .then(({ data }) => ({ sale: data.result_sale ?? 0, rent: data.result_rent ?? 0 }))
      .catch(() => undefined),
  ]);
  return { project: rows?.items.find((p) => p.id === projectId) ?? null, projectStock: stock };
}
