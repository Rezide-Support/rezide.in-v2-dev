import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getLocalitySitemapEntries, LOCALITIES_PER_SITEMAP, localitySitemapCount } from "@/services/locality-sitemap";

/*
 * Locality page sitemaps: /locality/sitemap/0.xml, … (5,000 localities each), listed in robots.txt
 * (src/app/robots.ts). Each URL is the locality's canonical SEO URL, with its main photo.
 */

export async function generateSitemaps() {
  return Array.from({ length: await localitySitemapCount() }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const start = id * LOCALITIES_PER_SITEMAP;
  const entries = (await getLocalitySitemapEntries()).slice(start, start + LOCALITIES_PER_SITEMAP);
  return entries.map((e) => ({
    url: `${SITE_URL}${e.path}`,
    ...(e.updatedAt && !Number.isNaN(Date.parse(e.updatedAt)) ? { lastModified: new Date(e.updatedAt) } : {}),
    changeFrequency: "monthly",
    priority: 0.6,
    ...(e.image ? { images: [e.image] } : {}),
  }));
}
