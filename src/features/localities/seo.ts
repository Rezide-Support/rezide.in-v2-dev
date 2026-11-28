import type { Metadata } from "next";
import { propertySearchHref } from "@/features/search/criteria";
import { localityPath } from "@/lib/locality-url";
import { absoluteUrl, clip } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { LocalityDetail } from "@/services/localities";

/*
 * Search-engine data for a locality page, built only from the locality's own data: the <head>
 * metadata (title, description, canonical URL, robots, Open Graph / Twitter previews) and
 * schema.org structured data (JSON-LD). Nothing here is shown on the page; everything it
 * describes already is. Server-only use (page.tsx).
 */

type Locality = Pick<
  LocalityDetail,
  "id" | "slug" | "name" | "city" | "subRegion" | "region" | "description" | "whatToExpect" | "lifestyle" | "unexpectedAppeal" | "market" | "images"
>;

/** The locality's write-up, in the page's order. */
const texts = (l: Pick<Locality, "description" | "whatToExpect" | "lifestyle" | "unexpectedAppeal" | "market">) =>
  [l.description, l.whatToExpect, l.lifestyle, l.unexpectedAppeal, l.market].map((t) => t.trim()).filter(Boolean);

/**
 * A locality page with nothing to read or see: no write-up and no photos (about half the
 * backend's localities in Nov 2026). It's kept out of search results (noindex) and the sitemap,
 * as Google asks for thin pages.
 */
export const isThinLocality = (l: Pick<Locality, "description" | "whatToExpect" | "lifestyle" | "unexpectedAppeal" | "market" | "images">) =>
  texts(l).length === 0 && l.images.length === 0;

/** "Indiraji Nagar, Juhu, Mumbai" (a sub-region the name already says is left out). */
const placeOf = (l: Pick<Locality, "name" | "subRegion" | "city">) =>
  [l.name, l.subRegion && !l.name.toLowerCase().includes(l.subRegion.toLowerCase()) ? l.subRegion : undefined, l.city].filter(Boolean).join(", ");

/** "Indiraji Nagar, Juhu, Mumbai: Area Guide, Lifestyle & Property Market" (the layout adds " · Rezide"). */
export const localityTitle = (l: Locality) => `${placeOf(l)}: Area Guide, Lifestyle & Property Market`;

/** The locality's own words (its description first), else what the page covers. */
export function localityDescription(l: Locality): string {
  const own = texts(l)[0];
  return clip(own || `Living in ${placeOf(l)}: what to expect, the lifestyle and the property market, with homes for sale and rent on Rezide.`);
}

/** The page's <head>: title, description, canonical URL, robots and social previews. */
export function localityMetadata(l: Locality): Metadata {
  const title = localityTitle(l);
  const description = localityDescription(l);
  const path = localityPath(l);
  const image = l.images[0];
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(isThinLocality(l) ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      url: path,
      title,
      description,
      ...(image ? { images: [{ url: absoluteUrl(image), alt: placeOf(l) }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [absoluteUrl(image)] } : {}) },
  };
}

/**
 * schema.org data for the locality: a Place within its sub-region, region and city (as the
 * backend files it), with its write-up and photos, and the page's breadcrumb trail
 * (Home › Properties in City › Locality). Only facts the page shows.
 */
export function localityJsonLd(l: Locality) {
  const url = `${SITE_URL}${localityPath(l)}`;
  const images = l.images.slice(0, 10).map(absoluteUrl);
  // Innermost first: sub-region, in region, in city.
  const city = l.city ? { "@type": "City", name: l.city } : undefined;
  const region = l.region ? { "@type": "Place", name: l.region, ...(city ? { containedInPlace: city } : {}) } : city;
  const within = l.subRegion && l.subRegion !== l.name ? { "@type": "Place", name: l.subRegion, ...(region ? { containedInPlace: region } : {}) } : region;
  const place = {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": `${url}#place`,
    name: l.name,
    url,
    description: clip(texts(l)[0] || localityDescription(l), 500),
    ...(images.length ? { image: images } : {}),
    address: {
      "@type": "PostalAddress",
      ...(l.subRegion ? { addressLocality: [l.name, l.subRegion].filter((v, i, a) => a.indexOf(v) === i).join(", ") } : { addressLocality: l.name }),
      ...(l.city ? { addressRegion: l.city } : {}),
      addressCountry: "IN",
    },
    ...(within ? { containedInPlace: within } : {}),
  };
  const crumbs = [
    { name: "Home", item: `${SITE_URL}/` },
    ...(l.city ? [{ name: `Properties in ${l.city}`, item: `${SITE_URL}${propertySearchHref({ city: l.city })}` }] : []),
    { name: l.name, item: url },
  ];
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
  };
  return [place, breadcrumb] as const;
}
