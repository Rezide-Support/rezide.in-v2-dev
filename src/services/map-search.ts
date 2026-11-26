import type { Intent, PropertyCategory, PropertySearchCriteria } from "@/types/models";
import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { backOff, expandBbox, readCache, shared, withCallerAbort, takeToken, writeCache, type BBox } from "./map-request-policy";

/*
 * Map markers from the Spatial Search API (v1): for the part of the map in view,
 * listings grouped into clusters, project groups and single listings. Called
 * straight from the browser, as GeoEstate does (geo_estate_new/src/services/
 * properties.js), so the service must allow this site's origin in its CORS list.
 */

export type { BBox };

/**
 * The service. NEXT_PUBLIC_SPATIAL_API_URL overrides it for another environment.
 */
export const SPATIAL_API_URL = (process.env.NEXT_PUBLIC_SPATIAL_API_URL || "https://si.rezide.in")
  .trim()
  .replace(/\/+$/, "");

/** H3 + Supercluster below zoom 13, Supercluster above (GeoEstate's default "ALGORITHM_1"). */
const ENDPOINT = "/v1/locations/search-hybrid";
export const MAX_MAP_ZOOM = 18;
/** The service groups up to zoom 24, past what map tiles allow: the deepest map zoom asks for its deepest split. */
const MAX_API_ZOOM = 24;
const RADIUS = 64;
export const MAP_LIMIT = 5000;

export type ClusterItem = { bounds?: BBox; expansionZoom?: number | null; listings?: ProjectListing[]; type: "cluster"; clusterId: string; count: number; lat: number; lng: number };
/** A listing a project pin carries. */
export type ProjectListing = { listingId?: string; title: string; listingType?: string; price?: number | string; lat?: number; lng?: number };
export type ProjectItem = { type: "project"; expansionZoom?: number | null; minPrice?: number; projectId: string; projectName?: string; count: number; clusterId?: string; lat: number; lng: number; listings?: ProjectListing[] };
export type ListingItem = {
  type: "listing";
  listingType?: string;
  listingId?: string;
  title: string;
  price?: number | string;
  lat: number;
  lng: number;
  /* Shown in the popup when the service sends them. */
  locality?: string;
  city?: string;
  address?: string;
  bedrooms?: number;
  bhk?: string;
  area?: number;
  area_unit?: string;
};
export type MapItem = ClusterItem | ProjectItem | ListingItem;

type SearchData = { algorithm?: string; zoom?: number; count?: number; items: MapItem[] };

export type MapResult = {
  /** Markers inside the view. */
  items: MapItem[];
  /** Listings behind those markers (each listing counted once). */
  count: number;
  /** True when the fetched area hit the service's limit, so some listings were left out. */
  capped: boolean;
};

/** The view as the map reports it: [west, south, east, north] and the whole zoom. */
export type MapFilters = { type?: "home" | "office" | "retail" | "industrial" | "land"; intend?: Intent; minPrice?: number; maxPrice?: number };
const MAP_TYPES: Record<PropertyCategory, NonNullable<MapFilters["type"]>> = { homes: "home", offices: "office", retail: "retail", industrial: "industrial", land: "land" };
export function mapFiltersFor(criteria: Pick<PropertySearchCriteria, "category" | "intent" | "budgetMin" | "budgetMax">): MapFilters {
  return { type: MAP_TYPES[criteria.category], intend: criteria.intent, minPrice: criteria.budgetMin, maxPrice: criteria.budgetMax };
}
export type MapView = MapFilters & { bbox: BBox; zoom: number; focus?: string };

/** Markers for the view. `fresh` skips the response cache ("Try again"). */
export async function searchMap(view: MapView, signal?: AbortSignal, { fresh = false } = {}): Promise<MapResult> {
  signal?.throwIfAborted();
  const zoom = Math.round(view.zoom);
  const requestZoom = zoom >= MAX_MAP_ZOOM ? MAX_API_ZOOM : zoom;
  // Grouping depends only on zoom, so a response for larger bounds at the same zoom serves any view inside them.
  const scope = `${ENDPOINT}|${requestZoom}|${view.focus ?? ""}|${view.type ?? ""}|${view.intend ?? ""}|${view.minPrice ?? ""}|${view.maxPrice ?? ""}`;
  let data = fresh ? null : readCache<SearchData>(scope, view.bbox);
  if (!data) {
    const fetchBbox = expandBbox(view.bbox, zoom);
    const params = new URLSearchParams({
      bbox: fetchBbox.map((v) => v.toFixed(6)).join(","),
      zoom: String(requestZoom),
      radius: String(RADIUS),
      limit: String(MAP_LIMIT),
      mapMaxZoom: String(MAX_MAP_ZOOM),
    });
    if (view.focus) params.set("focus", view.focus);
    if (view.type) params.set("type", view.type);
    if (view.intend) params.set("intend", view.intend);
    for (const key of ["minPrice", "maxPrice"] as const) {
      const value = view[key];
      if (value !== undefined && Number.isFinite(value) && value >= 0) params.set(key, String(value));
    }
    const url = `${SPATIAL_API_URL}${ENDPOINT}?${params}`;
    data = await withCallerAbort(shared(url, async () => {
      await takeToken();
      // No credentials: the service doesn't allow them cross-origin.
      const response = await fetch(url, { method: "GET" });
      if (response.status === 429) {
        backOff((Number(response.headers.get("Retry-After")) || 30) * 1000);
        throw new Error("Too many map searches right now. Please wait a moment and try again.");
      }
      if (response.status === 410) throw new Error("The map data was updated. Exit the focused area and try again.");
      if (!response.ok) throw new Error(`Couldn't load map listings (HTTP ${response.status}). Please try again.`);
      const body = (await response.json()) as { success?: boolean; message?: string; data?: SearchData };
      if (body.success === false) throw new Error(body.message || "The map search failed.");
      if (!body.data || !Array.isArray(body.data.items)) throw new Error("The map service returned an unexpected response.");
      writeCache(scope, fetchBbox, body.data);
      return body.data;
    }), signal);
  }
  if (signal?.aborted) throw signal.reason;
  const [w, s, e, n] = view.bbox;
  const items = data.items.filter((i) => i.lng >= w && i.lng <= e && i.lat >= s && i.lat <= n);
  return {
    items,
    count: items.reduce((sum, i) => sum + (i.type === "listing" ? 1 : i.count), 0),
    capped: (data.count ?? 0) >= MAP_LIMIT,
  };
}

/** A listing id the detail page can open (a backend _id); the service's short listing_id can't be. */
export const openableListingId = (id: string | undefined) => (id && BACKEND_ID_PATTERN.test(id) ? id : undefined);

/** A marker's price, which the service passes through unconverted (number or text). */
export function itemPrice(price: unknown): number | undefined {
  const n = typeof price === "number" ? price : typeof price === "string" ? Number(price.replace(/[^\d.]/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
