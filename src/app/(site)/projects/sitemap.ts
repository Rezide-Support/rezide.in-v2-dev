import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getProjectSitemapEntries, PROJECTS_PER_SITEMAP, projectSitemapCount } from "@/services/project-sitemap";

/*
 * Project page sitemaps: /projects/sitemap/0.xml, /projects/sitemap/1.xml, … (5,000 projects each),
 * listed in robots.txt (src/app/robots.ts). Each URL is the project's canonical SEO URL, with its
 * main photo for image search.
 */

export async function generateSitemaps() {
  return Array.from({ length: await projectSitemapCount() }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const start = id * PROJECTS_PER_SITEMAP;
  const entries = (await getProjectSitemapEntries()).slice(start, start + PROJECTS_PER_SITEMAP);
  return entries.map((e) => ({
    url: `${SITE_URL}${e.path}`,
    ...(e.updatedAt && !Number.isNaN(Date.parse(e.updatedAt)) ? { lastModified: new Date(e.updatedAt) } : {}),
    changeFrequency: "weekly",
    priority: 0.8,
    ...(e.image ? { images: [e.image] } : {}),
  }));
}
