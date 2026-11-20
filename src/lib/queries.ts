import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  fetchProject,
  fetchProjects,
  fetchProjectsByIds,
  fetchProjectsByNames,
  fetchCompareListings,
  fetchCompareProjects,
  fetchCompareUnits,
  fetchFirm,
  fetchFirmAgent,
  fetchRealtor,
  fetchRealtors,
  type PropertyGroupBy,
} from "@/services/catalog";
import { offerRow, visitRow } from "@/features/account/presenters";
import type { MapArea } from "@/features/search/match";
import { fetchOffers, fetchOwnerListings, fetchVisits } from "@/services/account";
import { fetchActivity, fetchShortlistIds, fetchViewedIds, type ActivityUser } from "@/services/activity";
import { fetchUser } from "@/services/auth";
import { fetchProperties, fetchProperty, fetchPropertyCount, fetchPropertyFacets, fetchPropertyGroups } from "@/services/properties";
import {
  fetchCities,
  fetchCityId,
  fetchRegionLocalities,
  fetchRegions,
  fetchSearchSuggestions,
  fetchSubRegionLocalities,
  fetchSubRegions,
  type SuggestionScope,
} from "@/services/locations";
import { fetchTransactions, type TransactionKind } from "@/services/transactions";
import { fetchFloorPlans, fetchUnitPlans } from "@/services/project-plans";
import { MAP_PAGE_SIZE } from "@/lib/constants";
import { fetchProjectHome, fetchPropertyHome } from "@/services/home";
import { fetchLandmarks, fetchLocalityPhoto } from "@/services/localities";
import {
  fetchAssociableProjects,
  fetchAssociableUnits,
  fetchContact,
  fetchContacts,
  fetchCredits,
  fetchFirmProfile,
  fetchGroups,
  fetchMyProfile,
  fetchTeam,
  fetchUpload,
  fetchUploads,
} from "@/services/dashboard";
import type { AssociableProjectQuery } from "@/types/dashboard";
import type {
  AccountRole,
  ActivityTab,
  Intent,
  ProjectStatus,
  ProjectSearchCriteria,
  PropertyCategory,
  PropertySearchCriteria,
  RealtorSearchCriteria,
} from "@/types/models";

/**
 * Query keys and options, shared by Server Components (prefetch) and
 * Client Components (useQuery) so both use identical cache identities.
 */
const CATALOG_STALE = 60_000;


/** Registered transactions in a project (Rezide backend, never mocked). */
export const transactionQueries = {
  recent: (projectId: string, kind: TransactionKind) =>
    queryOptions({
      queryKey: ["transactions", projectId, kind] as const,
      queryFn: () => fetchTransactions(projectId, kind),
      staleTime: 10 * 60_000,
    }),
};

/** Cities and search suggestions from the Rezide backend (never mocked). */
export const locationQueries = {
  /** The city master barely changes: fetch it once per visit. */
  cities: () => queryOptions({ queryKey: ["locations", "cities"] as const, queryFn: fetchCities, staleTime: 5 * 60_000 }),
  /* The region → sub-region → locality tree barely changes either. */
  cityId: (city: string) => queryOptions({ queryKey: ["locations", "city-id", city] as const, queryFn: () => fetchCityId(city), staleTime: 5 * 60_000 }),
  regions: (cityId: string) => queryOptions({ queryKey: ["locations", "regions", cityId] as const, queryFn: () => fetchRegions(cityId), staleTime: Infinity }),
  subRegions: (regionId: string) =>
    queryOptions({ queryKey: ["locations", "sub-regions", regionId] as const, queryFn: () => fetchSubRegions(regionId), staleTime: Infinity }),
  localities: (subRegionId: string) =>
    queryOptions({ queryKey: ["locations", "localities", subRegionId] as const, queryFn: () => fetchSubRegionLocalities(subRegionId), staleTime: Infinity }),
  /** A region's localities, 10 at a time (more load as the list scrolls), searched by name. */
  regionLocalities: (regionId: string, search: string) =>
    infiniteQueryOptions({
      queryKey: ["locations", "region-localities", regionId, search.trim().toLowerCase()] as const,
      queryFn: ({ pageParam }) => fetchRegionLocalities(regionId, search.trim(), pageParam),
      initialPageParam: 1,
      getNextPageParam: (last, pages) => {
        const loaded = pages.reduce((n, p) => n + p.items.length, 0);
        return last.items.length > 0 && loaded < last.total ? last.page + 1 : undefined;
      },
      staleTime: 5 * 60_000,
    }),
  suggestions: (query: string, city: string, scope: SuggestionScope = "all") =>
    queryOptions({
      queryKey: ["locations", "suggestions", scope, city, query.trim().toLowerCase()] as const,
      queryFn: () => fetchSearchSuggestions(query, { city, scope }),
      staleTime: 5 * 60_000,
    }),
};

export const propertyQueries = {
  /** `area`: only the listings in that part of the map. */
  search: (c: PropertySearchCriteria, area?: MapArea) =>
    queryOptions({
      // View mode does not change results, so it is not part of the key.
      queryKey: ["properties", "search", { ...c, view: undefined }, area ?? null] as const,
      queryFn: () => fetchProperties(c, area),
      staleTime: CATALOG_STALE,
      placeholderData: keepPreviousData,
    }),
  /**
   * The map view's list: the listings in that part of the map, MAP_PAGE_SIZE at a time,
   * the next batch loading as the list scrolls (no page numbers). Paging isn't in the key.
   */
  mapList: (c: PropertySearchCriteria, area: MapArea) =>
    infiniteQueryOptions({
      queryKey: ["properties", "map-list", { ...c, view: undefined, page: undefined, perPage: undefined }, area] as const,
      queryFn: ({ pageParam }) => fetchProperties({ ...c, page: pageParam, perPage: MAP_PAGE_SIZE }, area),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.page < last.pageCount ? last.page + 1 : undefined),
      staleTime: CATALOG_STALE,
      placeholderData: keepPreviousData,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ["properties", "detail", id] as const,
      queryFn: () => fetchProperty(id),
      staleTime: CATALOG_STALE,
    }),
  /** Filter-drawer counts. Paging, sort and view don't change them, so they aren't in the key. */
  facets: (c: PropertySearchCriteria) =>
    queryOptions({
      queryKey: ["properties", "facets-v2", { ...c, view: undefined, sort: undefined, page: undefined, perPage: undefined }] as const,
      queryFn: () => fetchPropertyFacets(c),
      staleTime: CATALOG_STALE,
      placeholderData: keepPreviousData,
    }),
  /** Total matching listings from Rezide's dedicated /filter/count endpoint. */
  count: (c: PropertySearchCriteria) =>
    queryOptions({
      queryKey: ["properties", "count", { ...c, view: undefined, sort: undefined, page: undefined, perPage: undefined }] as const,
      queryFn: () => fetchPropertyCount(c),
      staleTime: CATALOG_STALE,
    }),
  /** Listings grouped per locality or project (the grouped result views). */
  groups: (c: PropertySearchCriteria, groupBy: PropertyGroupBy) =>
    queryOptions({
      queryKey: ["properties", "groups", groupBy, { ...c, view: undefined, sort: undefined, page: undefined, perPage: undefined }] as const,
      queryFn: () => fetchPropertyGroups(c, groupBy),
      staleTime: CATALOG_STALE,
    }),
};

/** Landmarks and locality photos from the Rezide backend (never mocked). */
export const localityQueries = {
  landmarks: (projectId: string) =>
    queryOptions({ queryKey: ["localities", "landmarks", projectId] as const, queryFn: () => fetchLandmarks(projectId), staleTime: 10 * 60_000 }),
  photo: (name: string) =>
    queryOptions({ queryKey: ["localities", "photo", name] as const, queryFn: () => fetchLocalityPhoto(name), staleTime: 10 * 60_000 }),
};

/** Home page rails from the Rezide backend (never mocked). */
export const homeQueries = {
  properties: (intent: Intent, city: string, category: PropertyCategory) =>
    queryOptions({ queryKey: ["home", "properties", intent, city, category] as const, queryFn: () => fetchPropertyHome(intent, city, category), staleTime: CATALOG_STALE }),
  projects: (city: string, status: ProjectStatus) =>
    queryOptions({ queryKey: ["home", "projects", city, status] as const, queryFn: () => fetchProjectHome(city, status), staleTime: CATALOG_STALE }),
};

/** A project's unit plans (per configuration) and floor plans (per tower). Public backend reads. */
export const projectPlanQueries = {
  unit: (projectId: string, bhk: string) =>
    queryOptions({ queryKey: ["project-plans", projectId, "unit", bhk] as const, queryFn: () => fetchUnitPlans(projectId, bhk), staleTime: 10 * 60_000 }),
  floor: (projectId: string) =>
    queryOptions({ queryKey: ["project-plans", projectId, "floor"] as const, queryFn: () => fetchFloorPlans(projectId), staleTime: 10 * 60_000 }),
};

export const projectQueries = {
  search: (c: ProjectSearchCriteria) =>
    queryOptions({
      queryKey: ["projects", "search", c] as const,
      queryFn: () => fetchProjects(c),
      staleTime: CATALOG_STALE,
      placeholderData: keepPreviousData,
    }),
  byIds: (ids: string[], city: string) =>
    queryOptions({
      queryKey: ["projects", "by-ids", city, ids] as const,
      queryFn: () => fetchProjectsByIds(ids, city),
      staleTime: CATALOG_STALE,
      placeholderData: keepPreviousData,
    }),
  /** The Sale / Rental compare table's listings, with the room labels. */
  compareListings: (ids: string[]) =>
    queryOptions({
      queryKey: ["compare", "listings", ids] as const,
      queryFn: () => fetchCompareListings(ids),
      staleTime: CATALOG_STALE,
      placeholderData: keepPreviousData,
    }),
  /** "Add Property": projects with listings matching the text (three letters or more). */
  compareProjects: (query: string) =>
    queryOptions({
      queryKey: ["compare", "projects", query] as const,
      queryFn: () => fetchCompareProjects(query),
      staleTime: CATALOG_STALE,
      enabled: query.trim().length > 2,
    }),
  /** "Add Property": a project's units for sale or rent. */
  compareUnits: (projectId: string, projectName: string, purpose: "sale" | "rent") =>
    queryOptions({
      queryKey: ["compare", "units", projectId, purpose] as const,
      queryFn: () => fetchCompareUnits(projectId, projectName, purpose),
      staleTime: CATALOG_STALE,
      enabled: projectId !== "",
    }),
  /** Compare Project's picker: up to 10 projects matching a locality and/or name. */
  byNames: (names: string[]) =>
    queryOptions({
      queryKey: ["projects", "by-names", names] as const,
      queryFn: () => fetchProjectsByNames(names),
      staleTime: CATALOG_STALE,
      placeholderData: keepPreviousData,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ["projects", "detail", id] as const,
      queryFn: () => fetchProject(id),
      staleTime: CATALOG_STALE,
    }),
};

export const realtorQueries = {
  search: (c: RealtorSearchCriteria) =>
    queryOptions({
      queryKey: ["realtors", "search", c] as const,
      queryFn: () => fetchRealtors(c),
      staleTime: CATALOG_STALE,
      placeholderData: keepPreviousData,
      // The finder shows one page (up to REALTORS_PER_PAGE); screens read the items.
      select: (page) => page.items,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ["realtors", "detail", id] as const,
      queryFn: () => fetchRealtor(id),
      staleTime: CATALOG_STALE,
    }),
  /** Agent profile by firm + agent slug (/realtors/<firm>/<agent>). */
  agent: (firmSlug: string, agentSlug: string) =>
    queryOptions({
      queryKey: ["realtors", "agent", firmSlug, agentSlug] as const,
      queryFn: () => fetchFirmAgent(firmSlug, agentSlug),
      staleTime: CATALOG_STALE,
    }),
};

export const firmQueries = {
  detail: (slug: string) =>
    queryOptions({
      queryKey: ["firms", "detail", slug] as const,
      queryFn: () => fetchFirm(slug),
      staleTime: CATALOG_STALE,
    }),
};

export const accountQueries = {
  /** One activity tab of a user (Rezide backend, never mocked). */
  activity: (tab: ActivityTab, user: ActivityUser) =>
    queryOptions({ queryKey: ["account", "activity", tab, user.id, user.phone ?? ""] as const, queryFn: () => fetchActivity(tab, user) }),
  /** Which listings the user has shortlisted, for the Shortlist button. */
  /** Which listings the user has shortlisted, for the Shortlist button. */
  shortlistIds: (userId: string) =>
    queryOptions({ queryKey: ["account", "shortlist-ids", userId] as const, queryFn: () => fetchShortlistIds(userId) }),
  /** Which listings the user has already opened, for the "Viewed" mark on cards. */
  viewedIds: (userId: string) =>
    queryOptions({ queryKey: ["account", "viewed-ids", userId] as const, queryFn: () => fetchViewedIds(userId) }),
  /** Visits as display rows (the raw records are cached; `select` formats them). */
  visits: (role: AccountRole) =>
    queryOptions({
      queryKey: ["account", "visits", role] as const,
      queryFn: () => fetchVisits(role),
      select: (rows) => rows.map((v) => visitRow(v, role)),
    }),
  offers: (role: AccountRole) =>
    queryOptions({
      queryKey: ["account", "offers", role] as const,
      queryFn: () => fetchOffers(role),
      select: (rows) => rows.map((o) => offerRow(o, role)),
    }),
  listings: () => queryOptions({ queryKey: ["account", "listings"] as const, queryFn: fetchOwnerListings }),
  /** The signed-in user's record on the Rezide backend (name, phone, email). */
  user: (id: string) => queryOptions({ queryKey: ["account", "user", id] as const, queryFn: () => fetchUser(id), staleTime: 5 * 60_000, refetchOnWindowFocus: false }),
};

/* Realtor CRM. Every key starts with "dashboard" so one invalidation refreshes the CRM after a write. */
export const dashboardQueries = {
  contacts: () => queryOptions({ queryKey: ["dashboard", "contacts"] as const, queryFn: fetchContacts }),
  contact: (id: string) => queryOptions({ queryKey: ["dashboard", "contacts", id] as const, queryFn: () => fetchContact(id) }),
  groups: () => queryOptions({ queryKey: ["dashboard", "groups"] as const, queryFn: fetchGroups }),
  uploads: () => queryOptions({ queryKey: ["dashboard", "uploads"] as const, queryFn: fetchUploads }),
  upload: (id: string) => queryOptions({ queryKey: ["dashboard", "uploads", id] as const, queryFn: () => fetchUpload(id) }),
  credits: () => queryOptions({ queryKey: ["dashboard", "credits"] as const, queryFn: fetchCredits }),
  team: () => queryOptions({ queryKey: ["dashboard", "team"] as const, queryFn: fetchTeam }),
  firm: () => queryOptions({ queryKey: ["dashboard", "firm"] as const, queryFn: fetchFirmProfile }),
  me: () => queryOptions({ queryKey: ["dashboard", "me"] as const, queryFn: fetchMyProfile }),
  associableProjects: (q: AssociableProjectQuery) =>
    queryOptions({
      queryKey: ["dashboard", "associable-projects", q] as const,
      queryFn: () => fetchAssociableProjects(q),
      staleTime: CATALOG_STALE,
      placeholderData: keepPreviousData,
    }),
  associableUnits: (projectId: string, tower: string) =>
    queryOptions({
      queryKey: ["dashboard", "associable-projects", projectId, "units", tower] as const,
      queryFn: () => fetchAssociableUnits(projectId, tower),
      staleTime: CATALOG_STALE,
    }),
};
