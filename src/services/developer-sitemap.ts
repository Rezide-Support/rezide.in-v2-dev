import "server-only";
import { cacheLife } from "next/cache";
import { api } from "@/lib/api/client";
import { developerPath, developerRecordSlug, type DeveloperSlugRecord } from "@/lib/developer-url";

/*
 * Every developer page worth indexing, for the sitemap (src/app/(site)/developers/sitemap.ts) and
 * robots.txt. GET /repository/developer answers every developer at once (~3,400, ~5 MB). Those
 * records hold bank account details, so only the id, name, office city and update time are read,
 * on this server. Developers without an About text are left out (the list can't tell which have
 * projects; such a page is still reachable from its projects). One cached list, refreshed hourly.
 */

/** Developers per sitemap file. */
export const DEVELOPERS_PER_SITEMAP = 5_000;

export type DeveloperSitemapEntry = { path: string; updatedAt?: string };

type Row = DeveloperSlugRecord & { _id?: string; updated_at?: string; general_information?: { developer_name?: string; description?: string } };

/** All developers' paths worth listing, in the backend's order. */
export async function getDeveloperSitemapEntries(): Promise<DeveloperSitemapEntry[]> {
  "use cache";
  cacheLife("hours");
  const { data } = await api.get<{ data?: Row[] } | Row[]>("/repository/developer", { timeout: 60_000 });
  const rows = Array.isArray(data) ? data : (data.data ?? []);
  const seen = new Set<string>();
  const entries: DeveloperSitemapEntry[] = [];
  for (const row of rows) {
    const id = String(row._id ?? "");
    const info = row.general_information;
    // The page needs a name (an unnamed developer is a 404 there).
    if (!/^[a-f0-9]{24}$/i.test(id) || seen.has(id) || !info?.developer_name?.trim() || !info.description?.trim()) continue;
    seen.add(id);
    entries.push({ path: developerPath({ id, slug: developerRecordSlug(row) }), ...(row.updated_at ? { updatedAt: row.updated_at } : {}) });
  }
  return entries;
}

/** How many developer sitemap files there are (at least one). */
export async function developerSitemapCount(): Promise<number> {
  return Math.max(1, Math.ceil((await getDeveloperSitemapEntries()).length / DEVELOPERS_PER_SITEMAP));
}
