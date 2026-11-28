import type { Metadata } from "next";
import { formatPriceRange } from "@/features/properties/detail/format";
import { projectSearchHref } from "@/features/search/criteria";
import { PROJECT_STATUS_LABEL } from "@/lib/constants";
import { projectPath } from "@/lib/project-url";
import { absoluteUrl, clip } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { Project } from "@/types/models";

/*
 * Search-engine data for a project page, built only from the project's own data (nothing
 * invented): the <head> metadata (title, description, canonical URL, robots, Open Graph /
 * Twitter previews) and schema.org structured data (JSON-LD). Nothing here is shown on the page;
 * everything it describes already is. Server-only use (page.tsx).
 *
 * The title and description answer what people search for a project: its name and location,
 * BHK configurations, price, sizes and floor plans, possession and RERA registration.
 */

/** The project's area as people name it: the sub-region ("Mahim") when known, else the locality. */
const areaOf = (p: Pick<Project, "subRegion" | "locality">) => p.subRegion || p.locality;

/** "Mahim, Mumbai". */
const placeOf = (p: Pick<Project, "subRegion" | "locality" | "city">) => [areaOf(p), p.city].filter(Boolean).join(", ");

/** "₹ 1.2 Cr – 2.4 Cr", when both ends are known. */
const priceOf = (p: Pick<Project, "priceFrom" | "priceTo">) => (p.priceFrom > 0 && p.priceTo > 0 ? formatPriceRange(p.priceFrom, p.priceTo) : undefined);

/** "450 – 720 sq ft", when known. */
const sizeOf = (p: Pick<Project, "areaMin" | "areaMax">) =>
  p.areaMin > 0 && p.areaMax > 0 ? (p.areaMin === p.areaMax ? `${p.areaMin} sq ft` : `${p.areaMin} – ${p.areaMax} sq ft`) : undefined;

/** "1 & 2 BHK", when the project lists BHK configurations. */
const bhkOf = (p: Pick<Project, "configurations">) => (/\d\s*(\.\d+)?\s*bhk/i.test(p.configurations) ? p.configurations : undefined);

/** "Possession Dec 2027" / "Completed Jul 2022"; nothing when the backend has no date. */
const possessionOf = (p: Pick<Project, "possessionLabel">) => (/^(possession|completed) \w{3} \d{4}$/i.test(p.possessionLabel) ? p.possessionLabel : undefined);

/** RERA registration ids ("NA" and blanks left out). */
const reraOf = (p: Pick<Project, "reras" | "reraIds">) => (p.reras?.length ? p.reras.map((r) => r.id) : (p.reraIds ?? []));

/** A real photo (not the placeholder shown when the backend has none). */
const photosOf = (p: Pick<Project, "images">) => p.images.filter((src) => !src.includes("placeholder"));

/**
 * A page with almost nothing to show: no photos, configurations or price. It's kept out of
 * search results (noindex) and the sitemap, as Google asks for thin pages.
 */
export const isThinProject = (p: Pick<Project, "images" | "configurations" | "priceFrom">) =>
  photosOf(p).length === 0 && !p.configurations.trim() && !(p.priceFrom > 0);

/** "Suraj Nova, Mahim, Mumbai: 1 & 2 BHK Price & Floor Plans" (the layout adds " · Rezide"). */
export function projectTitle(p: Project): string {
  const where = placeOf(p);
  const bhk = bhkOf(p);
  return `${p.name}${where ? `, ${where}` : ""}: ${bhk ? `${bhk} ` : ""}Price & Floor Plans`;
}

/**
 * One line for search results, most useful facts first: builder and location, configurations
 * with sizes and price, status and possession, then RERA. Only what the project has.
 */
export function projectDescription(p: Project): string {
  const location = [p.locality !== areaOf(p) ? p.locality : undefined, placeOf(p)].filter(Boolean).join(", ");
  const bhk = bhkOf(p);
  const size = sizeOf(p);
  const price = priceOf(p);
  const possession = possessionOf(p);
  const rera = reraOf(p);
  const parts = [
    `${p.name}${p.developer ? ` by ${p.developer}` : ""}${location ? ` in ${location}` : ""}.`,
    bhk || size || price ? `${[bhk, size].filter(Boolean).join(", ")}${price ? `${bhk || size ? " at " : "Price "}${price}` : ""}.` : "",
    // A possession date says the project is still being built; otherwise its status ("Ready to Move").
    `${possession && !/completed/i.test(possession) ? possession : PROJECT_STATUS_LABEL[p.status]}.`,
    rera.length ? `RERA ${rera[0]}.` : "",
    "Floor plans, amenities and prices on Rezide.",
  ];
  return clip(parts.filter(Boolean).join(" "));
}

/** The image alt for previews: "Suraj Nova, Mahim, Mumbai". */
const imageAlt = (p: Project) => [p.name, placeOf(p)].filter(Boolean).join(", ");

/** The page's <head>: title, description, canonical URL, robots and social previews. */
export function projectMetadata(p: Project): Metadata {
  const title = projectTitle(p);
  const description = projectDescription(p);
  const path = projectPath(p);
  const image = photosOf(p)[0];
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(isThinProject(p) ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      url: path,
      title,
      description,
      ...(image ? { images: [{ url: absoluteUrl(image), alt: imageAlt(p) }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [absoluteUrl(image)] } : {}) },
  };
}

/** "2 BHK" → 2; "2.5 BHK" → 2.5; otherwise nothing. */
const bedrooms = (bhk: string) => {
  const n = Number(/^(\d+(?:\.\d+)?)\s*bhk/i.exec(bhk.trim())?.[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** A facts row for `additionalProperty`. */
const fact = (name: string, value: string | number) => ({ "@type": "PropertyValue", name, value });

/**
 * schema.org data for the project, from the facts the page shows: an ApartmentComplex (address,
 * map position, units, amenities, photos, a FloorPlan per configuration with its size range,
 * status, possession and RERA) and the page's breadcrumb trail
 * (Home › Projects › City › Area › Project). Prices aren't marked up as offers, and there are
 * no ratings or reviews: the page has none.
 */
export function projectJsonLd(p: Project) {
  const url = `${SITE_URL}${projectPath(p)}`;
  const [lat, lng] = p.coords;
  const images = photosOf(p).slice(0, 10).map(absoluteUrl);
  const possession = possessionOf(p);
  const rera = reraOf(p);
  const floorPlans = (p.configurationPlans ?? []).map((c) => {
    const beds = bedrooms(c.bhk);
    return {
      "@type": "FloorPlan",
      name: c.bhk,
      ...(beds !== undefined ? { numberOfBedrooms: beds } : {}),
      ...(c.areaMin > 0 || c.areaMax > 0
        ? { floorSize: { "@type": "QuantitativeValue", ...(c.areaMin > 0 ? { minValue: c.areaMin } : {}), ...(c.areaMax > 0 ? { maxValue: c.areaMax } : {}), unitCode: "FTK", unitText: "sq ft" } }
        : {}),
    };
  });
  const area = areaOf(p);
  const complex = {
    "@context": "https://schema.org",
    "@type": "ApartmentComplex",
    "@id": `${url}#project`,
    name: p.name,
    url,
    description: clip(p.description || projectDescription(p), 500),
    ...(images.length ? { image: images } : {}),
    address: {
      "@type": "PostalAddress",
      ...(p.address ? { streetAddress: p.address } : {}),
      ...(area ? { addressLocality: area } : {}),
      ...(p.city ? { addressRegion: p.city } : {}),
      addressCountry: "IN",
    },
    // The backend sends 0,0 for a project without a map position.
    ...(lat || lng ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng } } : {}),
    ...(area || p.city
      ? { containedInPlace: { "@type": "Place", name: [area, p.city].filter(Boolean).join(", "), ...(p.city ? { containedInPlace: { "@type": "City", name: p.city } } : {}) } }
      : {}),
    ...(p.units > 0 ? { numberOfAccommodationUnits: { "@type": "QuantitativeValue", value: p.units } } : {}),
    ...(floorPlans.length ? { accommodationFloorPlan: floorPlans } : {}),
    ...(p.amenities.length ? { amenityFeature: p.amenities.map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })) } : {}),
    additionalProperty: [
      fact("Status", PROJECT_STATUS_LABEL[p.status]),
      ...(possession ? [fact("Possession", possession.replace(/^(possession|completed)\s+/i, ""))] : []),
      ...rera.map((id) => fact("RERA registration", id)),
      ...(p.developer ? [fact("Developer", p.developer)] : []),
      ...(p.towers > 0 ? [fact("Towers", p.towers)] : []),
      ...(p.acres > 0 ? [fact("Land area (acres)", p.acres)] : []),
    ],
  };
  const crumbs = [
    { name: "Home", item: `${SITE_URL}/` },
    { name: "Projects", item: `${SITE_URL}/projects` },
    ...(p.city ? [{ name: p.city, item: `${SITE_URL}${projectSearchHref({ city: p.city })}` }] : []),
    ...(p.city && p.locality ? [{ name: area || p.locality, item: `${SITE_URL}${projectSearchHref({ city: p.city, localities: [p.locality] })}` }] : []),
    { name: p.name, item: url },
  ];
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
  };
  return [complex, breadcrumb] as const;
}
