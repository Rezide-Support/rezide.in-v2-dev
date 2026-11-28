import "server-only";
import { cacheLife } from "next/cache";
import { isThinProject } from "@/features/projects/seo";
import { api } from "@/lib/api/client";
import { projectPath } from "@/lib/project-url";
import { projectCityLookup } from "./project-city-index";
import { toProject, type BackendProjectRow } from "./project-mapper";

/*
 * Every live project's SEO URL, for the sitemap (src/app/(site)/projects/sitemap.ts) and
 * robots.txt. Made by the same mapper and city index as the cards, so each URL is the page's
 * canonical one. Thin projects (no photos, configurations or price; the page marks them
 * noindex) are left out. One cached list (refreshed hourly) is shared by all sitemap files.
 */

/** Projects per sitemap file (Google allows 50,000; smaller files are quicker to fetch and read). */
export const PROJECTS_PER_SITEMAP = 5_000;
/** The backend answers 2,500 rows in about half a second. */
const PAGE_SIZE = 2_500;
/** A safety stop, far above the catalogue's size (~9,500 in Nov 2026). */
const MAX_PAGES = 40;

export type ProjectSitemapEntry = { path: string; updatedAt?: string; image?: string };

type Row = BackendProjectRow & { updatedAt?: string };

/** All indexable projects' URLs, oldest first (new projects join the last file instead of shifting every file). */
export async function getProjectSitemapEntries(): Promise<ProjectSitemapEntry[]> {
  "use cache";
  cacheLife("hours");
  const [cityOf, rows] = await Promise.all([projectCityLookup(), allRows()]);
  const seen = new Set<string>();
  const entries: ProjectSitemapEntry[] = [];
  for (const row of rows) {
    const project = toProject(row, "", undefined, cityOf);
    if (!/^[a-f0-9]{24}$/i.test(project.id) || seen.has(project.id) || isThinProject(project)) continue;
    seen.add(project.id);
    const image = project.images.find((src) => /^https?:\/\//i.test(src));
    entries.push({ path: projectPath(project), ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}), ...(image ? { image } : {}) });
  }
  return entries.reverse();
}

async function allRows(): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = { page, pageSize: PAGE_SIZE, city: [], project_names_localities_subRegions: [], subRegions: [], project_age: [], views: [], sortBy: "Latest", ids: [] };
    const { data } = await api.post<{ data?: Row[]; result_count?: number }>("/Inventory/project/filter/new", body, { timeout: 60_000 });
    const batch = data.data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE || rows.length >= Number(data.result_count)) break;
  }
  return rows;
}

/** How many project sitemap files there are (at least one, so robots.txt never points nowhere). */
export async function projectSitemapCount(): Promise<number> {
  return Math.max(1, Math.ceil((await getProjectSitemapEntries()).length / PROJECTS_PER_SITEMAP));
}
