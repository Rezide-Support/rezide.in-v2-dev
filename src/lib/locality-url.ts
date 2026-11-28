import { cityLabel } from "./city-names";
import { projectIdFromParam, slugFromParts } from "./project-url";

/*
 * SEO-friendly locality URLs, like the project ones (src/lib/project-url.ts):
 *   /locality/<locality>-<sub-region>-<city>-<backend id>
 *   /locality/indiraji-nagar-juhu-mumbai-65310013e577f28d600a13a5
 *
 * Only the 24-character id at the end identifies the locality. The words come from the
 * locality's row in the backend's locality list, which names its sub-region and city (the
 * detail record only has their ids), so the Localities tab, a project's "Explore" photo, the
 * page, the sitemap and the old-URL redirect (src/proxy.ts) all build the same URL. The city is
 * always shown through cityLabel ("Bangalore" → "Bengaluru").
 *
 * Kept free of app imports: src/proxy.ts uses it.
 */

/** A named place as the locality list expands it ({ name }), or anything else (an id, nothing). */
export const placeName = (value: unknown): string | undefined => {
  const name = value && typeof value === "object" ? (value as { name?: unknown }).name : undefined;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
};

/** A backend locality list row (POST /Repository/Locality/filter): its name, sub-region and city. */
export type LocalitySlugRow = { general_information?: { locality_name?: string | null; sub_region?: unknown; city?: unknown } | null };

/** The words of a locality URL: "indiraji-nagar-juhu-mumbai". A place already said is left out. */
export function localityRowSlug(row: LocalitySlugRow): string {
  const g = row.general_information;
  const city = placeName(g?.city);
  return slugFromParts([g?.locality_name, placeName(g?.sub_region), city ? cityLabel(city) : undefined]);
}

/** What a locality link needs. `slug` is set on localities from the backend; otherwise just the id. */
export type LocalityLinkable = { id: string; slug?: string };

/** The locality's canonical path: "/locality/indiraji-nagar-juhu-mumbai-6531…". Just the id when there are no words. */
export const localityPath = (l: LocalityLinkable) => `/locality/${l.slug ? `${l.slug}-` : ""}${l.id}`;

/** The backend id from a locality URL segment (with or without the words), or undefined when it has none. */
export const localityIdFromParam = projectIdFromParam;
