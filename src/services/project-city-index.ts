import { api } from "@/lib/api/client";
import { cityLabel } from "./locations";

/*
 * Server only (called from server branches): which city each project is filed under, for the
 * city in its SEO URL (src/lib/project-url.ts). The backend's project search rows don't name
 * their city, but its search filters by city, so this asks it once per city and remembers the
 * answer for an hour. The cities are those its locality list names (Nov 2026: 18 cities, which
 * hold 9,468 of 9,534 projects; the rest get a URL without a city).
 *
 * A plain in-memory cache like the project search's: this module is also bundled for the
 * browser through src/services/catalog.ts, where it never runs.
 */

const TTL_MS = 60 * 60_000;
const PAGE_SIZE = 2_500;
/** A safety stop per city (Mumbai, the largest, has ~6,100 projects). */
const MAX_PAGES = 20;
const FILTER_URL = "/Inventory/project/filter/new";

type Index = Map<string, string>;
let cached: { at: number; index: Promise<Index> } | undefined;

/** Forgets the index (tests). */
export const resetProjectCityIndex = () => {
  cached = undefined;
};

/** The cities the backend's locality list names, as its city master spells them ("Bangalore"). */
async function cities(): Promise<string[]> {
  const names = new Set<string>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await api.post<{ data?: { general_information?: { city?: { name?: string } | string } }[]; result_count?: number }>(
      "/Repository/Locality/filter",
      { sub_regions: null, regions: null, searchQuery: null },
      { params: { page, pageSize: PAGE_SIZE }, timeout: 60_000 },
    );
    const rows = data.data ?? [];
    for (const row of rows) {
      const city = row.general_information?.city;
      const name = typeof city === "object" ? city?.name?.trim() : undefined;
      if (name) names.add(name);
    }
    if (rows.length < PAGE_SIZE || page * PAGE_SIZE >= Number(data.result_count)) break;
  }
  return [...names];
}

/** The ids of every project the search files under `city`. */
async function projectIdsIn(city: string): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = { page, pageSize: PAGE_SIZE, city: [city], project_names_localities_subRegions: [], subRegions: [], project_age: [], views: [], sortBy: "Latest", ids: [] };
    const { data } = await api.post<{ data?: { _id?: string }[]; result_count?: number }>(FILTER_URL, body, { timeout: 60_000 });
    const rows = data.data ?? [];
    ids.push(...rows.flatMap((r) => (r._id ? [String(r._id)] : [])));
    if (rows.length < PAGE_SIZE || ids.length >= Number(data.result_count)) break;
  }
  return ids;
}

async function build(): Promise<Index> {
  const index: Index = new Map();
  // A few cities at a time, so the backend isn't flooded.
  const all = await cities();
  for (let i = 0; i < all.length; i += 4) {
    const batch = all.slice(i, i + 4);
    const found = await Promise.all(batch.map(async (city) => [city, await projectIdsIn(city)] as const));
    for (const [city, ids] of found) for (const id of ids) if (!index.has(id)) index.set(id, cityLabel(city));
  }
  return index;
}

/**
 * The city each project is filed under ("Mumbai", "Bengaluru"), as a lookup by project id.
 * Never fails: if the backend can't be read, projects get URLs without a city until it can.
 */
export async function projectCityLookup(now = Date.now()): Promise<(id: string) => string | undefined> {
  if (!cached || now - cached.at >= TTL_MS) {
    const index = build();
    cached = { at: now, index };
    // A failed build isn't kept: the next request tries again.
    index.catch(() => {
      if (cached?.index === index) cached = undefined;
    });
  }
  try {
    const index = await cached.index;
    return (id) => index.get(id);
  } catch {
    return () => undefined;
  }
}
