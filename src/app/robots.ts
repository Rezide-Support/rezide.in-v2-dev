import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { developerSitemapCount } from "@/services/developer-sitemap";
import { localitySitemapCount } from "@/services/locality-sitemap";
import { projectSitemapCount } from "@/services/project-sitemap";

const files = (section: string, count: number) => Array.from({ length: count }, (_, i) => `${SITE_URL}/${section}/sitemap/${i}.xml`);

/** robots.txt: everything may be crawled; points search engines at the project, locality and developer sitemaps. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const [projects, localities, developers] = await Promise.all([
    projectSitemapCount().catch(() => 1),
    localitySitemapCount().catch(() => 1),
    developerSitemapCount().catch(() => 1),
  ]);
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: [...files("projects", projects), ...files("locality", localities), ...files("developers", developers)],
  };
}
