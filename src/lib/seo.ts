import { SITE_URL } from "./site";

/* Helpers for the pages' search-engine data (src/features/projects/seo.ts). */

/** Google shows about 155–160 characters of a description. */
export const DESCRIPTION_LENGTH = 160;

/** Cuts text to `max` characters at a word boundary, with an ellipsis. */
export function clip(text: string, max = DESCRIPTION_LENGTH): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : cut.length).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** An absolute URL search engines can fetch (site-relative paths get the site's address). */
export const absoluteUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`);

/** JSON-LD as a <script> body: `<` is escaped so a value can't close the tag (Next.js JSON-LD guide). */
export const jsonLdScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
