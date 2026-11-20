import { api } from "@/lib/api/client";
import { serializeProjectCriteria } from "@/features/search/criteria";
import type { PropertyFacets, PropertyGroupBy, PropertyGroupSummary } from "@/features/search/match";
import type {
  Firm,
  Paginated,
  Project,
  ProjectSearchCriteria,
  Property,
  Realtor,
  RealtorSearchCriteria,
} from "@/types/models";
import { findProjectsByNames, getProjectDetail, getProjectsByIds, searchProjects } from "./projects";
import { compareUnits, getCompareListings, searchCompareProjects } from "./compare-listings";
import { getFirmAgentDetail, getFirmDetail, getRealtorDetail, searchRealtors } from "./realtors";

const isServer = typeof window === "undefined";

/* Read-only catalogue endpoints: properties, projects, realtors and firms. */

export type { PropertyFacets, PropertyGroupBy, PropertyGroupSummary };
export type PropertyGroups = { groupBy: PropertyGroupBy; groups: PropertyGroupSummary[] };
/** Query of GET /properties/stats (same parameter names as the search). */
export type PropertyStatsQuery = { city: string; intent: string; category: string };

const toParams = (sp: URLSearchParams) => {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(sp.keys())) {
    const values = sp.getAll(key);
    out[key] = values.length > 1 ? values : values[0];
  }
  return out;
};

export type PropertyDetail = {
  property: Property;
  realtor: Realtor | null;
  similar: Property[];
  /** The project the unit belongs to, when any (detail-page project card). */
  project?: Project | null;
  /** Live listings in that project. */
  projectStock?: { sale: number; rent: number };
};
export type PropertyStats = {
  total: number;
  byLocality: Record<string, number>;
  byUnitType: Record<string, number>;
  byBhk: Record<string, number>;
  byBudget: Record<string, number>;
  /** Keyed `min-max` in sq ft (max empty for open-ended), see AREA_BANDS. */
  byArea: Record<string, number>;
};
export type DeveloperStats = { total: number; rtm: number; uc: number; nl: number; cities: string[] };
export type ProjectDetail = {
  project: Project;
  listings: Property[];
  similar?: Project[];
  nearby?: Project[];
  /** Counts across the developer's projects on Rezide. */
  developer?: DeveloperStats;
};
export type ProjectStats = {
  total: number;
  byStatus: Record<string, number>;
  byLocality: Record<string, number>;
  byBudget: Record<string, number>;
  byYear: Record<string, number>;
};
/** An agent with counts of their own live listings, for team and "other agents" cards. */
export type AgentSummary = { realtor: Realtor; saleCount: number; rentCount: number };
export type RealtorDetail = {
  realtor: Realtor;
  listings: Property[];
  /** The agent's firm, when known. */
  firm?: Firm | null;
  /** Colleagues first, then other agents in the same city. */
  others?: AgentSummary[];
};
export type FirmDetail = { firm: Firm; team: AgentSummary[]; listings: Property[] };

/*
 * Listing search, detail, filter counts and groups (fetchProperties, fetchProperty,
 * fetchPropertyFacets, fetchPropertyGroups) are live: see ./properties.ts.
 */

export async function fetchPropertyStats({ city, intent, category }: PropertyStatsQuery) {
  // `type` is the category, as in GET /properties.
  const { data } = await api.get<PropertyStats>("/properties/stats", { params: { city, intent, type: category } });
  return data;
}

/** Projects: on the server they call the backend; in the browser they go through this app's /api routes. */
export async function fetchProjects(criteria: ProjectSearchCriteria) {
  if (isServer) return searchProjects(criteria);
  const { data } = await api.get<Paginated<Project>>("/api/projects", {
    baseURL: "",
    params: toParams(serializeProjectCriteria(criteria)),
  });
  return data;
}

/** Specific projects by id, for the listings' Projects view. */
export async function fetchProjectsByIds(ids: string[], city: string) {
  if (isServer) return getProjectsByIds(ids, city);
  const { data } = await api.get<Paginated<Project>>("/api/projects", { baseURL: "", params: { ids, city } });
  return data;
}

/** The Sale / Rental compare table (see ./compare-listings). */
export async function fetchCompareListings(ids: string[]) {
  if (isServer) return getCompareListings(ids);
  const { data } = await api.get<Awaited<ReturnType<typeof getCompareListings>>>("/api/compare/listings", { baseURL: "", params: { ids } });
  return data;
}

export async function fetchCompareProjects(query: string) {
  if (isServer) return searchCompareProjects(query);
  const { data } = await api.get<{ id: string; name: string }[]>("/api/compare/listings", { baseURL: "", params: { projects: query } });
  return data;
}

export async function fetchCompareUnits(projectId: string, projectName: string, purpose: "sale" | "rent") {
  if (isServer) return compareUnits(projectId, projectName, purpose);
  const { data } = await api.get<{ id: string; name: string }[]>("/api/compare/listings", { baseURL: "", params: { project: projectId, name: projectName, purpose } });
  return data;
}

/** Compare Project's "Select project" list (see findProjectsByNames). */
export async function fetchProjectsByNames(names: string[]) {
  if (isServer) return findProjectsByNames(names);
  const { data } = await api.get<{ id: string; name: string }[]>("/api/projects", { baseURL: "", params: { names: names.length ? names : [""] } });
  return data;
}

export async function fetchProject(id: string) {
  if (isServer) return getProjectDetail(id);
  const { data } = await api.get<ProjectDetail>(`/api/projects/${encodeURIComponent(id)}`, { baseURL: "" });
  return data;
}

export async function fetchProjectStats(city: string, status?: string) {
  const { data } = await api.get<ProjectStats>("/projects/stats", { params: { city, status } });
  return data;
}

/** Realtor directory page size; the finder shows a single page. */
export const REALTORS_PER_PAGE = 50;

/** Realtors and firms: on the server they call the backend; in the browser they go through this app's /api routes, as private fields must not reach it. */
export async function fetchRealtors(c: RealtorSearchCriteria, page = 1, perPage = REALTORS_PER_PAGE) {
  if (isServer) return searchRealtors(c, page, perPage);
  const { data } = await api.get<Paginated<Realtor>>("/api/realtors", {
    // This app's own route, not the backend: no base URL.
    baseURL: "",
    params: {
      city: c.city,
      by: c.by,
      q: c.q || undefined,
      spec: c.specializations.length ? c.specializations : undefined,
      loc: c.locality || undefined,
      lang: c.language || undefined,
      gender: c.gender || undefined,
      page: page > 1 ? page : undefined,
      per: perPage,
    },
  });
  return data;
}

export async function fetchRealtor(id: string) {
  if (isServer) return getRealtorDetail(id);
  const { data } = await api.get<RealtorDetail>(`/api/realtors/${encodeURIComponent(id)}`, { baseURL: "" });
  return data;
}

export async function fetchFirm(slug: string) {
  if (isServer) return getFirmDetail(slug);
  const { data } = await api.get<FirmDetail>(`/api/firms/${encodeURIComponent(slug)}`, { baseURL: "" });
  return data;
}

/** Agent profile addressed by firm and agent slug, as in /realtors/<firm>/<agent>. */
export async function fetchFirmAgent(firmSlug: string, agentSlug: string) {
  if (isServer) return getFirmAgentDetail(firmSlug, agentSlug);
  const { data } = await api.get<RealtorDetail>(`/api/firms/${encodeURIComponent(firmSlug)}/agents/${encodeURIComponent(agentSlug)}`, { baseURL: "" });
  return data;
}
