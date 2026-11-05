import { api } from "@/lib/api/client";
import { defaultPropertyCriteria } from "@/features/search/criteria";
import type { Intent, Property } from "@/types/models";
import { toBackendCity } from "./locations";
import { toListingFilters, toProperty, type BackendListingPage } from "./property-mapper";

/*
 * Server only. Every live listing for one city and purpose, mapped to the UI's
 * Property and kept in memory for a few minutes. The filter drawer's per-option
 * counts and the Location / Projects views are computed from it, because the
 * backend's /filter/count endpoint only returns totals. A full Mumbai sale list
 * is ~30 MB from the backend but ~1 MB once mapped, so it is fetched in a few
 * parallel pages and reused rather than downloaded per request.
 */

/** How long a city's listings are reused before they are fetched again. */
const TTL_MS = 10 * 60_000;
const PAGE_SIZE = 250;
/** Safety cap: no city has anywhere near this many live listings today. */
const MAX_LISTINGS = 5000;

const cache = new Map<string, { at: number; listings: Promise<Property[]> }>();

async function loadAll(city: string, intent: Intent): Promise<Property[]> {
  const body = toListingFilters(defaultPropertyCriteria({ city, intent, perPage: PAGE_SIZE }));
  const page = (n: number) =>
    api.post<BackendListingPage>("/inventory/Listing/mobile/all", { ...body, page: n, pageSize: PAGE_SIZE }).then((r) => r.data);

  const first = await page(1);
  const total = Math.min((intent === "rent" ? first.result_rent : first.result_sale) ?? 0, MAX_LISTINGS);
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => page(i + 2)));
  return [first, ...rest].flatMap((p) => (p.data ?? []).map(toProperty));
}

/** Every listing for the city and purpose (homes only: the backend holds nothing else). */
export function listingIndex(city: string, intent: Intent, now = Date.now()): Promise<Property[]> {
  const key = `${toBackendCity(city).toLowerCase()}|${intent}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.listings;
  const listings = loadAll(city, intent);
  cache.set(key, { at: now, listings });
  // A failed load isn't kept, so the next request tries again.
  listings.catch(() => {
    if (cache.get(key)?.listings === listings) cache.delete(key);
  });
  return listings;
}

/** Forget every cached city (tests). */
export function clearListingIndex() {
  cache.clear();
}
