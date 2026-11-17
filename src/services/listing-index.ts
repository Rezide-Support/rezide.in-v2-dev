import { setBounded } from "@/lib/bounded-cache";
import { api } from "@/lib/api/client";
import { defaultPropertyCriteria } from "@/features/search/criteria";
import type { Intent, Property, PropertyCategory } from "@/types/models";
import { toBackendCity } from "./locations";
import { toListingFilters, toProperty, type BackendListing, type BackendListingPage } from "./property-mapper";

/*
 * Server only. Every live listing for one city, purpose and category, mapped to the UI's
 * Property and kept in memory for a few minutes. The filter drawer's per-option
 * counts and the Location / Projects views are computed from it, because the
 * backend's /filter/count endpoint only returns totals. A full Mumbai sale list
 * is ~30 MB from the backend but ~1 MB once mapped, so it is fetched in a few
 * parallel pages and reused rather than downloaded per request.
 */

/** How long a city's listings count as fresh. After that they're refreshed in the background. */
const TTL_MS = 10 * 60_000;
/**
 * How long older listings may still be served while the refresh runs. Loading a city
 * takes seconds (~30 MB from the backend for Mumbai sale), so nobody waits for it twice.
 */
const STALE_MS = 60 * 60_000;
const PAGE_SIZE = 250;
/** Safety cap: no city has anywhere near this many live listings today. */
const MAX_LISTINGS = 5000;

type Entry = {
  /** When `listings` was requested. */
  at: number;
  listings: Promise<Property[]>;
  /** Set once `listings` has loaded, so a stale entry is known to be servable. */
  ready?: true;
  /** A background refresh is under way. */
  refreshing?: true;
};
/**
 * Kept on globalThis: Next bundles each route handler separately, and a module-level Map
 * isn't shared between them, so the listing search route's warm-up would fill a cache the
 * facets/groups routes never read. One Map per server process.
 */
const GLOBAL_KEY = Symbol.for("rezide.listingIndex");
const store = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Map<string, Entry> };
const cache = (store[GLOBAL_KEY] ??= new Map<string, Entry>());

async function loadAll(city: string, intent: Intent, category: PropertyCategory): Promise<Property[]> {
  const body = toListingFilters(defaultPropertyCriteria({ city, intent, category, perPage: PAGE_SIZE }));
  const page = (n: number) =>
    api.post<BackendListingPage>("/inventory/Listing/mobile/all", { ...body, page: n, pageSize: PAGE_SIZE }).then((r) => r.data);

  const first = await page(1);
  const total = Math.min((intent === "rent" ? first.result_rent : first.result_sale) ?? 0, MAX_LISTINGS);
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => page(i + 2)));
  return [first, ...rest].flatMap((p) => (p.data ?? []).flatMap(mapOrSkip));
}

/** One malformed record must not empty the whole city's filter counts: skip it and say which. */
function mapOrSkip(raw: BackendListing): Property[] {
  try {
    return [toProperty(raw)];
  } catch (error) {
    console.error("Skipped a listing the index couldn't read", { id: raw?._id, error });
    return [];
  }
}

/** Starts loading and caches the load; it replaces the entry only once it has succeeded, if `keep` is set. */
function load(key: string, city: string, intent: Intent, category: PropertyCategory, now: number, keep?: Entry): Promise<Property[]> {
  const listings = loadAll(city, intent, category);
  const entry: Entry = { at: now, listings };
  if (!keep) setBounded(cache, key, entry, 10, STALE_MS, now);
  listings.then(
    () => {
      entry.ready = true;
      // A refresh takes over only when it worked; until then the older listings keep being served.
      if (keep) setBounded(cache, key, entry, 10, STALE_MS, Date.now());
    },
    () => {
      // A failed load isn't kept, so the next request tries again.
      if (keep) delete keep.refreshing;
      else if (cache.get(key) === entry) cache.delete(key);
    },
  );
  return listings;
}

/**
 * Every listing for the city, purpose and category. Fresh listings come from memory;
 * listings older than TTL_MS are still returned at once while a refresh runs in the background.
 */
export function listingIndex(city: string, intent: Intent, category: PropertyCategory = "homes", now = Date.now()): Promise<Property[]> {
  const key = `${toBackendCity(city).toLowerCase()}|${intent}|${category}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.listings;
  if (hit?.ready && now - hit.at < STALE_MS) {
    if (!hit.refreshing) {
      hit.refreshing = true;
      load(key, city, intent, category, now, hit).catch(() => undefined);
    }
    return hit.listings;
  }
  return load(key, city, intent, category, now);
}

/**
 * Starts loading the city's listings without waiting, so the filter counts and the
 * Location / Projects views are ready by the time someone opens them.
 */
export function warmListingIndex(city: string, intent: Intent, category: PropertyCategory = "homes") {
  listingIndex(city, intent, category).catch(() => undefined);
}

/** Forget every cached city (tests). */
export function clearListingIndex() {
  cache.clear();
}
