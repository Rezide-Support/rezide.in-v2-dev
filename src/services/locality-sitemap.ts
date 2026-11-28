import "server-only";
import { cacheLife } from "next/cache";
import { isThinLocality } from "@/features/localities/seo";
import { api } from "@/lib/api/client";
import { localityPath, localityRowSlug, type LocalitySlugRow } from "@/lib/locality-url";
import { cdnImage } from "./property-mapper";

/*
 * Every locality page worth indexing, for the sitemap (src/app/(site)/locality/sitemap.ts) and
 * robots.txt. Read from the locality list, whose rows give each page's canonical URL. Localities
 * with no write-up and no photos (the page marks them noindex) are left out. One cached list
 * (refreshed hourly) is shared by all sitemap files.
 */

/** Localities per sitemap file. */
export const LOCALITIES_PER_SITEMAP = 5_000;
/** The backend answers 2,500 rows in under two seconds. */
const PAGE_SIZE = 2_500;
/** A safety stop, far above the list's size (~3,400 in Nov 2026). */
const MAX_PAGES = 40;

export type LocalitySitemapEntry = { path: string; updatedAt?: string; image?: string };

type Info = { locality_name?: string; description?: string; what_to_expect?: string; the_lifestyle?: string; unexpected_appeal?: string; the_market?: string };
type Row = LocalitySlugRow & { _id?: string; updatedAt?: string; general_information?: Info & LocalitySlugRow["general_information"]; media?: { images?: { url?: string }[] } };

/** All indexable localities' URLs, oldest first (new ones join the last file instead of shifting every file). */
export async function getLocalitySitemapEntries(): Promise<LocalitySitemapEntry[]> {
  "use cache";
  cacheLife("hours");
  const rows: Row[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await api.post<{ data?: Row[]; result_count?: number }>(
      "/Repository/Locality/filter",
      { sub_regions: null, regions: null, searchQuery: null },
      { params: { page, pageSize: PAGE_SIZE }, timeout: 60_000 },
    );
    const batch = data.data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE || rows.length >= Number(data.result_count)) break;
  }
  const seen = new Set<string>();
  const entries: LocalitySitemapEntry[] = [];
  for (const row of rows) {
    const id = String(row._id ?? "");
    const g = row.general_information ?? {};
    // The page needs a name (an unnamed locality is a 404 there).
    if (!/^[a-f0-9]{24}$/i.test(id) || seen.has(id) || !g.locality_name?.trim()) continue;
    const text = (s?: string) => s?.trim() ?? "";
    const images = (row.media?.images ?? []).map((i) => i.url?.trim() ?? "").filter(Boolean).map(cdnImage);
    const content = { description: text(g.description), whatToExpect: text(g.what_to_expect), lifestyle: text(g.the_lifestyle), unexpectedAppeal: text(g.unexpected_appeal), market: text(g.the_market), images };
    if (isThinLocality(content)) continue;
    seen.add(id);
    entries.push({ path: localityPath({ id, slug: localityRowSlug(row) }), ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}), ...(images[0] ? { image: images[0] } : {}) });
  }
  return entries.reverse();
}

/** How many locality sitemap files there are (at least one). */
export async function localitySitemapCount(): Promise<number> {
  return Math.max(1, Math.ceil((await getLocalitySitemapEntries()).length / LOCALITIES_PER_SITEMAP));
}
