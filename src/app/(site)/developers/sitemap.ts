import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { DEVELOPERS_PER_SITEMAP, developerSitemapCount, getDeveloperSitemapEntries } from "@/services/developer-sitemap";

/*
 * Developer page sitemaps: /developers/sitemap/0.xml, … (5,000 developers each), listed in
 * robots.txt (src/app/robots.ts). Each URL is the developer's canonical SEO URL.
 */

export async function generateSitemaps() {
  return Array.from({ length: await developerSitemapCount() }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const start = id * DEVELOPERS_PER_SITEMAP;
  const entries = (await getDeveloperSitemapEntries()).slice(start, start + DEVELOPERS_PER_SITEMAP);
  return entries.map((e) => ({
    url: `${SITE_URL}${e.path}`,
    ...(e.updatedAt && !Number.isNaN(Date.parse(e.updatedAt)) ? { lastModified: new Date(e.updatedAt) } : {}),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
}
