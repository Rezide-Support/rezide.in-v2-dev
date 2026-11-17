import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { cache } from "react";
import { ApiError, api } from "@/lib/api/client";
import { defaultPropertyCriteria, serializePropertyCriteria } from "@/features/search/criteria";
import { groupProperties, propertyFacets, searchProperties, type MapArea } from "@/features/search/match";
import {
  BATHROOM_OPTIONS,
  BHK_OPTIONS,
  FACING_OPTIONS,
  FURNISHING_OPTIONS,
  MEDIA_OPTIONS,
  PARKING_OPTIONS,
  UNIT_TYPES,
} from "@/lib/constants";
import type { Paginated, Property, PropertySearchCriteria } from "@/types/models";
import type { PropertyDetail, PropertyFacets, PropertyGroupBy, PropertyGroups } from "./catalog";
import { listingIndex } from "./listing-index";
import { findListingProject, getProjectsByIds } from "./projects";
import { findRealtor } from "./realtors";
import {
  brochureUrlFor,
  toListingFilters,
  toProperty,
  toPropertyPage,
  type BackendListing,
  type BackendListingPage,
} from "./property-mapper";

/*
 * Property listings from the Rezide backend. As on rezide.in, the browser never
 * calls the listing endpoints itself: it asks this app's server
 * (src/app/api/properties), which calls the backend and maps the result, so a
 * withheld price never reaches the browser. Contract: docs/API.md → Properties.
 */

const isServer = typeof window === "undefined";

const emptyPage = (c: PropertySearchCriteria): Paginated<Property> => ({
  items: [],
  total: 0,
  page: c.page,
  perPage: c.perPage,
  pageCount: 1,
});

/** Server only: one page of listings from the backend, in the UI's shape. */
export async function searchListings(criteria: PropertySearchCriteria): Promise<Paginated<Property>> {
  // The backend sorts area as text ("998" before "5432"): sort the city's listings here instead.
  if (criteria.sort === "area-asc" || criteria.sort === "area-desc") return searchProperties(await indexFor(criteria), criteria);
  // The backend's project_id filter misses listings, so projects are searched by name.
  const projectNames = criteria.projects.length ? (await getProjectsByIds(criteria.projects, criteria.city)).items.map((p) => p.name) : [];
  if (criteria.projects.length && projectNames.length === 0) return emptyPage(criteria);
  const { data } = await api.post<BackendListingPage>("/inventory/Listing/mobile/all", toListingFilters(criteria, projectNames));
  return toPropertyPage(data, criteria);
}

const toParams = (sp: URLSearchParams) => {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(sp.keys())) {
    const values = sp.getAll(key);
    out[key] = values.length > 1 ? values : values[0];
  }
  return out;
};

/** How many similar listings the detail page shows. */
const SIMILAR_COUNT = 3;

/**
 * Server only: one listing for the detail page, with similar listings (same
 * purpose in the same locality). A missing listing rejects with the backend's 404.
 */
export const getListingDetail = cache(async (id: string): Promise<PropertyDetail> => {
  if (!BACKEND_ID_PATTERN.test(id)) throw new ApiError("This listing does not exist.", 404);
  const { data } = await api.get<BackendListing>(`/inventory/Listing/${encodeURIComponent(id)}`);
  const property = toProperty(data);
  const [nearby, brochureUrl, realtor, { project, projectStock }] = await Promise.all([
    searchListings(
      defaultPropertyCriteria({ city: property.city, intent: property.intent, category: property.category, localities: [property.locality], perPage: SIMILAR_COUNT + 1 }),
    ).catch(() => null),
    findBrochure(property.id),
    findRealtor(property.realtorId),
    findListingProject(property.projectId, property.city),
  ]);
  const similar = (nearby?.items ?? []).filter((s) => s.id !== property.id).slice(0, SIMILAR_COUNT);
  return { property: { ...property, brochureUrl }, realtor, similar, project, projectStock };
});

/**
 * The listing's brochure on the Rezide CDN, where rezide.in downloads it from, if it
 * exists (most listings have one; new ones may not yet).
 */
async function findBrochure(listingId: string): Promise<string | undefined> {
  const url = brochureUrlFor(listingId);
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) });
    return res.ok ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Listing detail: on the server it calls the backend; in the browser it goes through /api/properties/{id}. */
export async function fetchProperty(id: string): Promise<PropertyDetail> {
  if (isServer) return getListingDetail(id);
  const { data } = await api.get<PropertyDetail>(`/api/properties/${encodeURIComponent(id)}`, { baseURL: "" });
  return data;
}

/** Listings the counts, groups and map list are computed from. */
const indexFor = (c: PropertySearchCriteria) => listingIndex(c.city, c.intent, c.category);

/** Server only: one page of the listings in part of the map. The backend can't search by area. */
export async function searchListingsInArea(criteria: PropertySearchCriteria, area: MapArea): Promise<Paginated<Property>> {
  return searchProperties(await indexFor(criteria), criteria, area);
}

/**
 * Server only: per-option counts for the filter drawer ("disjunctive": each count
 * keeps every other group's choices). Localities are the ones that have listings.
 */
export async function listingFacets(criteria: PropertySearchCriteria): Promise<PropertyFacets> {
  return propertyFacets(await indexFor(criteria), criteria, {
    unitTypes: UNIT_TYPES[criteria.category],
    bhk: BHK_OPTIONS,
    furnishing: FURNISHING_OPTIONS,
    bathrooms: BATHROOM_OPTIONS,
    parking: PARKING_OPTIONS,
    media: MEDIA_OPTIONS,
    facing: FACING_OPTIONS,
  });
}

/** Server only: matching listings summarised per locality or per project (the Location / Projects views). */
export async function listingGroups(criteria: PropertySearchCriteria, groupBy: PropertyGroupBy): Promise<PropertyGroups> {
  return { groupBy, groups: groupProperties(await indexFor(criteria), criteria, groupBy) };
}

/** Listing query string without paging, sorting or view (they don't change counts or groups). */
const filterParams = (criteria: PropertySearchCriteria) =>
  toParams(serializePropertyCriteria({ ...criteria, view: "list", sort: "latest", page: 1, perPage: 9 }));

/** Filter-drawer counts: computed on the server; the browser asks /api/properties/facets. */
export async function fetchPropertyFacets(criteria: PropertySearchCriteria): Promise<PropertyFacets> {
  if (isServer) return listingFacets(criteria);
  const { data } = await api.get<PropertyFacets>("/api/properties/facets", { baseURL: "", params: filterParams(criteria) });
  return data;
}

/** Location / Projects views: computed on the server; the browser asks /api/properties/groups. */
export async function fetchPropertyGroups(criteria: PropertySearchCriteria, groupBy: PropertyGroupBy): Promise<PropertyGroups> {
  if (isServer) return listingGroups(criteria, groupBy);
  const { data } = await api.get<PropertyGroups>("/api/properties/groups", {
    baseURL: "",
    params: { ...filterParams(criteria), groupBy },
  });
  return data;
}

/** Listing search, optionally within part of the map: on the server it calls the backend; in the browser it goes through /api/properties. */
export async function fetchProperties(criteria: PropertySearchCriteria, area?: MapArea): Promise<Paginated<Property>> {
  if (isServer) return area ? searchListingsInArea(criteria, area) : searchListings(criteria);
  const { data } = await api.get<Paginated<Property>>("/api/properties", {
    // This app's own route, not the backend: no base URL.
    baseURL: "",
    params: { ...toParams(serializePropertyCriteria({ ...criteria, view: "list" })), bbox: area?.join(",") },
  });
  return data;
}
