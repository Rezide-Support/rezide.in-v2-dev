import { cityLabel } from "./city-names";
import { projectIdFromParam, slugFromParts } from "./project-url";

/*
 * SEO-friendly developer URLs, like the project ones (src/lib/project-url.ts):
 *   /developers/<developer-name>-<head-office city>-<backend id>
 *   /developers/lodha-group-mumbai-658eaf4b07130a3f09bc3801
 *
 * Only the 24-character id at the end identifies the developer. The words are the developer's
 * name and its first office's city, which the developer record, the developer list (sitemap) and
 * the developer embedded in a project record all carry, so the project page's "Builder Details"
 * link, the page, the sitemap and the old-URL redirect (src/proxy.ts) all build the same URL.
 * A developer without an office city gets a URL without one.
 *
 * Kept free of app imports: src/proxy.ts uses it.
 */

/** The fields of a backend developer record its URL is made from. */
export type DeveloperSlugRecord = {
  general_information?: { developer_name?: string | null } | null;
  contact_details?: { address?: { city?: { label?: string | null } | null }[] | null } | null;
};

/** "Lodha Group" in Mumbai → "lodha-group-mumbai" (a city the name already says isn't repeated). */
export function developerRecordSlug(record: DeveloperSlugRecord): string {
  const city = record.contact_details?.address?.[0]?.city?.label?.trim();
  return slugFromParts([record.general_information?.developer_name, city ? cityLabel(city) : undefined]);
}

/** What a developer link needs. */
export type DeveloperLinkable = { id: string; slug?: string };

/** The developer's canonical path: "/developers/lodha-group-mumbai-658e…". Just the id when there are no words. */
export const developerPath = (d: DeveloperLinkable) => `/developers/${d.slug ? `${d.slug}-` : ""}${d.id}`;

/** The backend id from a developer URL segment (with or without the words), or undefined when it has none. */
export const developerIdFromParam = projectIdFromParam;
