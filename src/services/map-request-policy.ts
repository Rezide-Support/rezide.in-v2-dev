/*
 * Keeps map interaction from flooding the Spatial Search API, as GeoEstate does
 * (geo_estate_new/src/services/requestPolicy.js): padded and grid-snapped bounds,
 * a short response cache, shared in-flight requests and a client-side request
 * budget with back-off after HTTP 429.
 */

export type BBox = [west: number, south: number, east: number, north: number];

export const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX_ENTRIES = 60;
/** Up to BURST requests back to back, then one per REFILL_MS (~30 a minute sustained). */
const BURST = 8;
const REFILL_MS = 2000;
/** Each side of the view is padded by this fraction, so small pans stay inside the fetched area. */
const PAD = 0.25;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Pads the bounds and snaps them outward to the map's tile grid at this zoom, so
 * nearby views make identical requests (cacheable here and by a CDN or the browser).
 */
export function expandBbox([west, south, east, north]: BBox, zoom: number): BBox {
  const padX = (east - west) * PAD;
  const padY = (north - south) * PAD;
  const step = 360 / 2 ** clamp(Math.round(zoom), 0, 20);
  const snap = (value: number, round: (n: number) => number) => Number((round(value / step) * step).toFixed(7));
  return [
    clamp(snap(west - padX, Math.floor), -180, 180),
    clamp(snap(south - padY, Math.floor), -90, 90),
    clamp(snap(east + padX, Math.ceil), -180, 180),
    clamp(snap(north + padY, Math.ceil), -90, 90),
  ];
}

export const containsBbox = (outer: BBox, inner: BBox) =>
  outer[0] <= inner[0] && outer[1] <= inner[1] && outer[2] >= inner[2] && outer[3] >= inner[3];

type CacheEntry<T> = { scope: string; bbox: BBox; value: T; time: number };

/** scope (endpoint + zoom) → fetched bounds → response; insertion order doubles as LRU order. */
const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/** A cached response for this scope whose fetched bounds cover `bbox`, if still fresh. */
export function readCache<T>(scope: string, bbox: BBox, now = Date.now()): T | null {
  for (const [key, entry] of cache) {
    if (now - entry.time > CACHE_TTL_MS) {
      cache.delete(key);
      continue;
    }
    if (entry.scope !== scope || !containsBbox(entry.bbox, bbox)) continue;
    cache.delete(key);
    cache.set(key, entry);
    return entry.value as T;
  }
  return null;
}

export function writeCache<T>(scope: string, bbox: BBox, value: T, now = Date.now()) {
  const key = `${scope}|${bbox.join(",")}`;
  cache.delete(key);
  cache.set(key, { scope, bbox, value, time: now });
  while (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}

/**
 * Identical concurrent requests share one network call. Once sent, a request may
 * finish (and fill the cache) even if the view that asked for it has moved on.
 */
export function shared<T>(key: string, run: () => Promise<T>): Promise<T> {
  if (!inflight.has(key)) inflight.set(key, run().finally(() => inflight.delete(key)));
  return inflight.get(key) as Promise<T>;
}

let tokens = BURST;
let refilledAt = Date.now();
let blockedUntil = 0;

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/** Waits for request budget. A view that is superseded aborts while waiting, so only the latest view is sent. */
export async function takeToken(signal?: AbortSignal) {
  for (;;) {
    const now = Date.now();
    tokens = Math.min(BURST, tokens + (now - refilledAt) / REFILL_MS);
    refilledAt = now;
    if (now >= blockedUntil && tokens >= 1) {
      tokens -= 1;
      return;
    }
    await wait(Math.max(blockedUntil - now, (1 - tokens) * REFILL_MS), signal);
  }
}

/** Pauses every request after the service says we're rate limited (HTTP 429). */
export function backOff(ms: number) {
  blockedUntil = Math.max(blockedUntil, Date.now() + ms);
}

/** Back to a clean state (tests). */
export function resetRequestPolicy() {
  cache.clear();
  inflight.clear();
  tokens = BURST;
  refilledAt = Date.now();
  blockedUntil = 0;
}
