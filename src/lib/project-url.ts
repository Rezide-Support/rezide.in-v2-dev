/*
 * SEO-friendly project URLs, built from what each project's search row says:
 *   /projects/<name>-<BHKs>-<status>-<locality / road>-<sub-region>-<city>-<backend id>
 *   /projects/suraj-nova-1-2-bhk-under-construction-lady-jamsedji-road-mahim-mumbai-6b0682747304fc72e16b46f4
 *
 * Only the 24-character backend id at the end identifies the project. The words are for people
 * and search engines, so a project whose name or status changes keeps working at its old URL
 * (the page then names its new URL as canonical). Words come only from the search row (and the
 * city that search files it under), never invented: there's no property type or state on a row,
 * and the road appears only when the backend's locality is a road. The same row gives the same
 * URL to the cards, the detail page, the sitemap and the old-URL redirect (src/proxy.ts).
 *
 * Kept free of app imports: src/proxy.ts uses it.
 */

/** Longest set of words before the id; longer ones are cut at a word boundary. */
const MAX_SLUG_LENGTH = 110;

/** A backend id at the end of a URL segment, alone or after a dash. */
const ID_AT_END = /(?:^|-)([a-f0-9]{24})$/i;

/** Abbreviations spelled out, as people search for them ("Rd." → "road"). */
const WORDS: Record<string, string> = { rd: "road", st: "street", nr: "near", opp: "opposite" };

/** "Lady Jamsedji Rd." → "lady-jamsedji-road"; "Andheri (W)" → "andheri-west". Accents are dropped. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(\s*w\s*\)/g, " west ")
    .replace(/\(\s*e\s*\)/g, " east ")
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter(Boolean)
    .map((w) => WORDS[w] ?? w)
    .join("-");
}

/**
 * The words of a URL from its parts, in order. A part already said by an earlier one is left out
 * ("Lodha Park Worli" in "Worli" → "lodha-park-worli"), so no keyword repeats.
 */
export function slugFromParts(parts: (string | null | undefined)[]): string {
  const kept: string[] = [];
  for (const part of parts.map((p) => slugify(p ?? "")).filter(Boolean)) {
    if (kept.some((k) => `-${k}-`.includes(`-${part}-`))) continue;
    kept.push(part);
  }
  const slug = kept.join("-");
  if (slug.length <= MAX_SLUG_LENGTH) return slug;
  const cut = slug.slice(0, MAX_SLUG_LENGTH + 1);
  return cut.slice(0, Math.max(cut.lastIndexOf("-"), 1)).replace(/-+$/, "");
}

/** The fields of a backend project search row (POST /Inventory/project/filter/new) its URL is made from. */
export type ProjectSlugRow = {
  project_name?: string | null;
  /** "1 & 2 BHK" */
  bhk?: string | null;
  /** "Under Construction" / "Ready to Move" */
  status?: string | null;
  /** The locality, sometimes a road ("Lady Jamsedji Rd."). */
  locality?: string | null;
  sub_region?: string | null;
};

/** "1, 2 & 3 BHK" → "1 2 3 BHK"; text without a BHK count is left out (it isn't a configuration). */
const bhkWords = (bhk: string | null | undefined) => (/\d\s*(\.\d+)?\s*bhk/i.test(bhk ?? "") ? bhk : undefined);

/**
 * A search row's slug: name, BHKs, status, locality, sub-region, city. The only place a project
 * slug is made, so every source agrees. `city` is the city its search files it under (see
 * src/services/project-city-index.ts); without one the URL simply leaves it out.
 */
export const projectRowSlug = (row: ProjectSlugRow, city?: string) =>
  slugFromParts([row.project_name, bhkWords(row.bhk), row.status, row.locality, row.sub_region, city]);

/** What a project link needs. `slug` is set on every project from the backend; sample data has only the id. */
export type ProjectLinkable = { id: string; slug?: string };

/** The project's canonical path: "/projects/suraj-nova-…-6b06…". Just the id when there are no words. */
export function projectPath(p: ProjectLinkable): string {
  return `/projects/${p.slug ? `${p.slug}-` : ""}${p.id}`;
}

/** The backend id from a project URL segment (with or without the words), or undefined when it has none. */
export function projectIdFromParam(param: string): string | undefined {
  return ID_AT_END.exec(param)?.[1];
}
