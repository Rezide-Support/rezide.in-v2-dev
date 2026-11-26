import { itemPrice, mapFiltersFor, searchMap, type ListingItem } from "./map-search";
import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { uniqueGalleryPhotos } from "@/lib/listing-media";
import { cache } from "react";
import { ApiError, api } from "@/lib/api/client";
import { serializePropertyCriteria, type PropertyArrayFilter } from "@/features/search/criteria";
import { groupProperties, paginate, sortProperties, propertyFacets, searchProperties, type MapArea } from "@/features/search/match";
import {
  BATHROOM_OPTIONS,
  BHK_OPTIONS,
  FACING_OPTIONS,
  FURNISHING_OPTIONS,
  MEDIA_OPTIONS,
  PARKING_OPTIONS,
  UNIT_TYPES,
} from "@/lib/constants";
import {
  SALE_AGE_OPTIONS,
  SALE_AVAILABILITY_OPTIONS,
  SALE_BHK_OPTIONS,
  SALE_BALCONY_OPTIONS,
  SALE_BATHROOM_OPTIONS,
  SALE_BUILDING_TYPES,
  SALE_EXIT_DIRECTIONS,
  SALE_FLOOR_OPTIONS,
  SALE_FURNISHING_OPTIONS,
  SALE_PARKING_OPTIONS,
  SALE_PREFERRED_APARTMENT_OPTIONS,
  SALE_PROPERTY_TYPES,
  SALE_TIME_OPTIONS,
  RENT_AVAILABILITY_OPTIONS,
  RENT_BHK_OPTIONS,
  RENT_TIME_OPTIONS,
} from "@/features/search/sale-filter-options";
import type { Paginated, Property, PropertySearchCriteria, PropertyCategory } from "@/types/models";
import type { PropertyDetail, PropertyFacets, PropertyGroupBy, PropertyGroups } from "./catalog";
import { listingIndex } from "./listing-index";
import { findListingProject, getProjectsByIds } from "./projects";
import { findRealtor } from "./realtors";
import { toRealtor, type BackendPerson } from "./realtor-mapper";
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
const FACET_COUNT_CONCURRENCY = 6;
const FACET_COUNT_TTL = 60_000;
const FACET_COUNT_CACHE_LIMIT = 500;

const HOME_FACET_COUNT_KEYS = [
  "localities",
  "unitTypes",
  "bhk",
  "furnishing",
  "bathrooms",
  "parking",
  "media",
  "facing",
  "availability",
  "buildingTypes",
  "balconies",
  "buildingAges",
  "preferredApartment",
  "floorRanges",
  "timeOnRezide",
] as const satisfies readonly PropertyArrayFilter[];

const facetCountCache = new Map<string, { expiresAt: number; promise: Promise<number> }>();
let activeFacetCounts = 0;
const waitingFacetCounts: Array<() => void> = [];

export function clearFacetCountCache() {
  facetCountCache.clear();
}

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

/** Server only: the Rezide filter-count endpoint used by the sale filter drawer. */
export async function countPropertyListings(criteria: PropertySearchCriteria, projectNames: string[] = []): Promise<number> {
  const filters = {
    ...toListingFilters({ ...criteria, page: 1, perPage: 9 }, projectNames),
    sortBy: undefined,
  };
  const { data } = await api.post<{ result_sale?: number | string; result_rent?: number | string }>(
    "/inventory/Listing/mobile/filter/count",
    filters,
  );
  const total = Number(criteria.intent === "rent" ? data.result_rent : data.result_sale);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new ApiError("The listings service returned an invalid result count.", 502);
  }
  return total;
}

function cachedFacetCount(
  criteria: PropertySearchCriteria,
  key: PropertyArrayFilter,
  value: string,
  projectNames: string[],
): Promise<number> {
  const optionCriteria = { ...criteria, [key]: [value], page: 1, perPage: 9 };
  const cacheKey = JSON.stringify({
    ...toListingFilters(optionCriteria, projectNames),
    sortBy: undefined,
  });
  const now = Date.now();
  const cached = facetCountCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.promise;
  if (cached) facetCountCache.delete(cacheKey);

  const promise = withFacetCountSlot(() => countPropertyListings(optionCriteria, projectNames));
  facetCountCache.set(cacheKey, { expiresAt: now + FACET_COUNT_TTL, promise });
  if (facetCountCache.size > FACET_COUNT_CACHE_LIMIT) {
    const oldest = facetCountCache.keys().next();
    if (!oldest.done) facetCountCache.delete(oldest.value);
  }
  void promise.catch(() => {
    if (facetCountCache.get(cacheKey)?.promise === promise) facetCountCache.delete(cacheKey);
  });
  return promise;
}

function withFacetCountSlot<T>(request: () => Promise<T>): Promise<T> {
  return (async () => {
    if (activeFacetCounts >= FACET_COUNT_CONCURRENCY) {
      await new Promise<void>((resolve) => waitingFacetCounts.push(resolve));
    } else {
      activeFacetCounts++;
    }
    try {
      return await request();
    } finally {
      const next = waitingFacetCounts.shift();
      if (next) next();
      else activeFacetCounts--;
    }
  })();
}

async function applyHomeFacetCounts(
  criteria: PropertySearchCriteria,
  localFacets: PropertyFacets,
  options: Partial<Record<PropertyArrayFilter, string[]>>,
  projectNames: string[],
): Promise<PropertyFacets> {
  const localityValues = Object.entries(localFacets.facets.localities)
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .slice(0, 40)
    .map(([name]) => name);
  const valuesByKey: Partial<Record<PropertyArrayFilter, string[]>> = {
    ...options,
    localities: [...new Set([...localityValues, ...criteria.localities])],
  };
  const facets = { ...localFacets.facets };
  const unavailable: NonNullable<PropertyFacets["unavailable"]> = {};
  const countsToFetch = HOME_FACET_COUNT_KEYS.flatMap((key) =>
    (valuesByKey[key] ?? []).map((value) => ({ key, value })),
  );
  for (const key of HOME_FACET_COUNT_KEYS) facets[key] = { ...facets[key] };

  let next = 0;
  await Promise.all(Array.from(
    { length: Math.min(FACET_COUNT_CONCURRENCY, countsToFetch.length) },
    async () => {
      while (next < countsToFetch.length) {
        const { key, value } = countsToFetch[next++];
        try {
          facets[key][value] = await cachedFacetCount(criteria, key, value, projectNames);
        } catch (error) {
          delete facets[key][value];
          unavailable[key] ??= {};
          unavailable[key]![value] = true;
          console.error(`Could not load home filter count for ${key}=${value}`, error);
        }
      }
    },
  ));

  return {
    ...localFacets,
    facets,
    ...(Object.keys(unavailable).length ? { unavailable } : {}),
  };
}

const toParams = (sp: URLSearchParams) => {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(sp.keys())) {
    const values = sp.getAll(key);
    out[key] = values.length > 1 ? values : values[0];
  }
  return out;
};

/** Candidate limit for other units in this project. */
const SIMILAR_COUNT = 10;

/**
 * Server only: one listing for the detail page, with similar listings (same
 * BHK, purpose and project). A missing listing rejects with the backend's 404.
 */
export const getListingDetail = cache(async (id: string): Promise<PropertyDetail> => {
  if (!BACKEND_ID_PATTERN.test(id)) throw new ApiError("This listing does not exist.", 404);
  const { data } = await api.get<BackendListing>(`/inventory/Listing/${encodeURIComponent(id)}`);
  if (!data || typeof data !== "object" || !data._id) throw new ApiError("Couldn't load this listing.", 502);
  const property = toProperty(data);
  const bhkIdOf = (listing: BackendListing) => typeof listing.listing_details?.bhk === "object"
    ? listing.listing_details.bhk?._id
    : listing.listing_details?.bhk;
  const bhkId = bhkIdOf(data);
  const unit = data.listing_details?.unit_no;
  const combined = unit && typeof unit === "object" && Array.isArray(unit.combineWith) ? unit.combineWith.slice(0, 10) : [];
  const [nearby, brochureUrl, realtor, { project, projectStock }] = await Promise.all([
    property.projectId && bhkId ? api.post<BackendListingPage>("/inventory/Listing/mobile/all", {
      bhk: bhkId,
      page: 1, pageSize: SIMILAR_COUNT, property_purpose: property.intent === "rent" ? "rent" : "sale",
      // The existing backend supports searching project names; still verify IDs below.
      ...(property.projectName ? { project_names_localities: [property.projectName] } : {}),
    }).then(response => response.data).catch(() => null) : Promise.resolve(null),
    findBrochure(property.id),
    listingBroker(property.realtorId, property.realtorFirm).catch(() => findRealtor(property.realtorId)),
    property.projectHidden ? Promise.resolve({ project: null, projectStock: undefined }) : findListingProject(property.projectId, property.city),
  ]);
  const combinedProperties = await Promise.all(combined.map(async number => {
    if (!unit || typeof unit !== "object" || !unit.project_id || !unit.tower_name) return null;
    try {
      const response = await api.post<{ data?: { config_id?: string } }>("/Inventory/unit/specific", { project_id: unit.project_id, tower_name: unit.tower_name, unit_number: String(number) });
      const configId = response.data?.data?.config_id;
      if (!configId) return null;
      return {
        configId,
        property: toProperty({ ...data, listing_details: { ...data.listing_details, unit_no: { ...unit, config_id: configId } } }),
      };
    } catch { return null; }
  }));
  const configurations = (() => {
    const projectConfigurations = Array.isArray(data.listing_details?.project?.configuration)
      ? data.listing_details.project.configuration
      : [];
    const currentConfigId = unit && typeof unit === "object" ? unit.config_id : undefined;
    const options: { id: string; name: string; property: Property }[] = [];
    if (currentConfigId) {
      const config = projectConfigurations.find(item => item._id === currentConfigId);
      const name = config?.config_name?.trim();
      if (name) options.push({ id: currentConfigId, name, property });
    }
    combined.forEach((number, index) => {
      const combinedProperty = combinedProperties[index]?.property;
      if (!combinedProperty) return;
      const configId = combinedProperties[index]?.configId;
      if (!configId) return;
      const config = projectConfigurations.find(item => item._id === configId);
      const name = config?.config_name?.trim();
      if (name && !options.some(option => option.id === configId)) {
        options.push({ id: configId, name, property: combinedProperty });
      }
    });
    return options;
  })();
  const seen = new Set<string>([property.id]);
  const similar = (Array.isArray(nearby?.data) ? nearby.data : [])
    .filter(item => item && bhkIdOf(item) === bhkId)
    .map(toProperty)
    .filter(item => {
      if (!item.id || seen.has(item.id) || item.projectId !== property.projectId || item.intent !== property.intent) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, SIMILAR_COUNT);
  const planPhotos = uniqueGalleryPhotos([...(property.planPhotos ?? []), ...combinedProperties.flatMap(p => p?.property.planPhotos ?? [])]);
  return { property: { ...property, brochureUrl,
    realtorFirmId: realtor?.firmId || property.realtorFirmId,
    contactPersonId: realtor?.id,
    rooms: [...(property.rooms ?? []), ...combinedProperties.flatMap((p, index) => (p?.property.rooms ?? []).map(room => ({ ...room, name: `Unit ${combined[index]} · ${room.name}` })))],
    planImages: planPhotos.map(photo => photo.url),
    planPhotos,
  }, realtor, similar, project, projectStock, configurations };
});

/** The listing's broker response is consumed directly; only public person fields leave the server. */
async function listingBroker(id: string, firmName: string) {
  if (!BACKEND_ID_PATTERN.test(id)) return null;
  const { data } = await api.get<{ firm_id?: string; agent?: BackendPerson; manager?: BackendPerson }>(`/brokers/get-broker/${encodeURIComponent(id)}`);
  const person = data?.agent?._id ? data.agent : data?.manager;
  if (!person?._id) return findRealtor(id);
  return toRealtor(person, { _id: data.firm_id, general_information: { firm_name: firmName }, managers: [person] });
}

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
export async function searchListingsInArea(criteria: PropertySearchCriteria, area: MapArea, focus?: string, mapZoom?: number): Promise<Paginated<Property>> {
  if (!focus && mapZoom === undefined) return searchProperties(await indexFor(criteria), criteria, area);
  // Use the same backend filters for visible pins and selected cluster members.
  const members = await searchMap({ bbox: area, zoom: focus ? 18 : mapZoom!, focus, ...mapFiltersFor(criteria) });
  const rows: ListingItem[] = members.items.flatMap(item => item.type === "listing" ? [item] : item.type === "cluster" && !focus ? [] : (item.listings ?? []).map(listing => ({ ...listing, type: "listing" as const, lat: listing.lat ?? item.lat, lng: listing.lng ?? item.lng })));
  const categoryFor = (type?: string): PropertyCategory => ({ home: "homes", office: "offices", retail: "retail", industrial: "industrial", land: "land" } as Record<string, PropertyCategory>)[type ?? ""] ?? criteria.category;
  const categories = [...new Set(rows.map(row => categoryFor(row.listingType)))];
  const inventories = await Promise.all(categories.flatMap(category => (["buy", "rent"] as const).map(intent => indexFor({ ...criteria, category, intent }).catch(() => []))));
  const records = new Map(inventories.flat().flatMap(property => [[property.id, property] as const, ...(property.listingCode ? [[property.listingCode, property] as const] : [])]));
  const unique = new Map<string, Property>();
  for (const row of rows) {
    const key = row.listingId ?? row.title + ":" + row.lat + ":" + row.lng;
    if (unique.has(key)) continue;
    const full = row.listingId ? records.get(row.listingId) : undefined;
    const price = itemPrice(row.price);
    unique.set(key, full ?? { ...toProperty({}), id: key, listingCode: row.listingId, mapSummary: true, title: row.title, category: categoryFor(row.listingType), intent: criteria.intent, city: row.city || criteria.city, locality: row.locality || "", locationLabel: row.address || "", coords: [row.lat, row.lng], price: price ?? 0, priceHidden: !price, images: [], unitType: "", bhk: row.bedrooms, areaSqft: row.area ?? 0 });
  }
  return paginate(sortProperties([...unique.values()], criteria.sort), criteria.page, criteria.perPage);
}

/**
 * Server only: disjunctive filter counts. Sale options use the backend count
 * endpoint; locality choices come from the cached city listing index.
 */
export async function listingFacets(criteria: PropertySearchCriteria): Promise<PropertyFacets> {
  const saleHomes = criteria.intent === "buy" && criteria.category === "homes";
  const rentHomes = criteria.intent === "rent" && criteria.category === "homes";
  const homeDirectory = saleHomes || rentHomes;
  const options: Partial<Record<PropertyArrayFilter, string[]>> = {
    unitTypes: homeDirectory ? SALE_PROPERTY_TYPES.map(({ value }) => value) : UNIT_TYPES[criteria.category],
    bhk: rentHomes ? RENT_BHK_OPTIONS : saleHomes ? SALE_BHK_OPTIONS : BHK_OPTIONS,
    furnishing: homeDirectory ? SALE_FURNISHING_OPTIONS.map(({ value }) => value) : FURNISHING_OPTIONS,
    bathrooms: homeDirectory ? SALE_BATHROOM_OPTIONS : BATHROOM_OPTIONS,
    parking: homeDirectory ? SALE_PARKING_OPTIONS : PARKING_OPTIONS,
    media: MEDIA_OPTIONS,
    facing: homeDirectory ? SALE_EXIT_DIRECTIONS.map(({ value }) => value) : FACING_OPTIONS,
    availability: saleHomes
      ? SALE_AVAILABILITY_OPTIONS.map(({ value }) => value)
      : rentHomes ? RENT_AVAILABILITY_OPTIONS.map(({ value }) => value) : [],
    buildingTypes: homeDirectory ? SALE_BUILDING_TYPES : [],
    balconies: homeDirectory ? SALE_BALCONY_OPTIONS : [],
    buildingAges: homeDirectory ? SALE_AGE_OPTIONS.map(({ value }) => value) : [],
    preferredApartment: homeDirectory ? SALE_PREFERRED_APARTMENT_OPTIONS : [],
    floorRanges: homeDirectory ? SALE_FLOOR_OPTIONS.map(({ value }) => value) : [],
    timeOnRezide: saleHomes
      ? SALE_TIME_OPTIONS
      : rentHomes ? RENT_TIME_OPTIONS.map(({ value }) => value) : [],
  };
  const localFacets = propertyFacets(await indexFor(criteria), criteria, options);
  if (!homeDirectory) return localFacets;
  const projectNames = criteria.projects.length
    ? (await getProjectsByIds(criteria.projects, criteria.city)).items.map((project) => project.name)
    : [];
  return applyHomeFacetCounts(criteria, localFacets, options, projectNames);
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

/** Result count for the sale filter drawer, using the backend's dedicated count endpoint. */
export async function fetchPropertyCount(criteria: PropertySearchCriteria): Promise<number> {
  if (isServer) return countPropertyListings(criteria);
  const { data } = await api.get<{ total: number }>("/api/properties/count", {
    baseURL: "",
    params: filterParams(criteria),
  });
  return data.total;
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
export async function fetchProperties(criteria: PropertySearchCriteria, area?: MapArea, focus?: string, mapZoom?: number): Promise<Paginated<Property>> {
  if (isServer) return area ? searchListingsInArea(criteria, area, focus, mapZoom) : searchListings(criteria);
  const { data } = await api.get<Paginated<Property>>("/api/properties", {
    // This app's own route, not the backend: no base URL.
    baseURL: "",
    params: { ...toParams(serializePropertyCriteria({ ...criteria, view: "list" })), bbox: area?.join(","), focus, mapZoom },
  });
  return data;
}
