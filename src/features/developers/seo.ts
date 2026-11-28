import type { Metadata } from "next";
import { developerPath } from "@/lib/developer-url";
import { projectPath } from "@/lib/project-url";
import { absoluteUrl, clip } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { DeveloperPage } from "@/services/developers";
import type { DeveloperProjects } from "@/services/projects";

/*
 * Search-engine data for a developer (builder) page, built only from what the page shows: the
 * <head> metadata (title, description, canonical URL, robots, Open Graph / Twitter previews) and
 * schema.org structured data (JSON-LD). Nothing here is shown on the page. Server-only use (page.tsx).
 *
 * The counts are the page's own ("All Projects", "Ready to Move", "Under Const."), so search
 * results never promise more than the page has.
 */

type Developer = Pick<DeveloperPage, "id" | "slug" | "name" | "logo" | "place" | "description" | "established" | "addresses" | "cities">;
type Projects = Pick<DeveloperProjects, "total" | "all" | "rtm" | "uc" | "nl">;

/** The head office's city ("Mumbai"), from "Mumbai, Maharashtra" or the first office. */
const cityOf = (d: Developer) => d.place?.split(",")[0]?.trim() || d.cities[0];

/**
 * A page with nothing to say: no About text and no projects. It's kept out of search results
 * (noindex), as Google asks for thin pages.
 */
export const isThinDeveloper = (d: Pick<Developer, "description">, projects: Pick<Projects, "total">) => !d.description.trim() && projects.total === 0;

/** "Lodha Group, Builder in Mumbai: 61 Projects & Company Profile" (the layout adds " · Rezide"). */
export function developerTitle(d: Developer, projects: Projects): string {
  const city = cityOf(d);
  return `${d.name}${city ? `, Builder in ${city}` : ""}: ${projects.total > 0 ? `${projects.total} Projects & ` : ""}Company Profile`;
}

/** "61 projects (21 ready to move, 29 under construction)", as the page counts them. */
function projectSummary(p: Projects): string | undefined {
  if (p.total <= 0) return undefined;
  const parts = [
    p.rtm.length ? `${p.rtm.length} ready to move` : "",
    p.uc.length ? `${p.uc.length} under construction` : "",
    p.nl.length ? `${p.nl.length} new launch${p.nl.length === 1 ? "" : "es"}` : "",
  ].filter(Boolean);
  return `${p.total} project${p.total === 1 ? "" : "s"}${parts.length ? ` (${parts.join(", ")})` : ""}`;
}

/** Who it is, since when and how many projects, then its own words. */
export function developerDescription(d: Developer, projects: Projects): string {
  const city = cityOf(d);
  const summary = projectSummary(projects);
  const lead = `${d.name}, real estate developer${city ? ` in ${city}` : ""}${d.established ? ` since ${d.established}` : ""}${summary ? `, with ${summary} on Rezide` : ""}.`;
  return clip([lead, d.description].filter(Boolean).join(" "));
}

/** The page's <head>: title, description, canonical URL, robots and social previews (the logo as the image). */
export function developerMetadata(d: Developer, projects: Projects): Metadata {
  const title = developerTitle(d, projects);
  const description = developerDescription(d, projects);
  const path = developerPath(d);
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(isThinDeveloper(d, projects) ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_IN",
      url: path,
      title,
      description,
      ...(d.logo ? { images: [{ url: absoluteUrl(d.logo), alt: `${d.name} logo` }] } : {}),
    },
    // A logo is small and square: the summary card shows it best.
    twitter: { card: "summary", title, description, ...(d.logo ? { images: [absoluteUrl(d.logo)] } : {}) },
  };
}

/**
 * schema.org data for the developer: an Organization (name, logo, description, year founded,
 * head office, cities it operates in), the list of its projects the page shows (each linking to
 * its project page), and the page's breadcrumb trail (Home › Projects › Developer).
 */
export function developerJsonLd(d: Developer, projects: Projects) {
  const url = `${SITE_URL}${developerPath(d)}`;
  const office = d.addresses[0];
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url}#organization`,
    name: d.name,
    url,
    ...(d.logo ? { logo: absoluteUrl(d.logo) } : {}),
    ...(d.description ? { description: clip(d.description, 500) } : {}),
    ...(d.established ? { foundingDate: d.established } : {}),
    ...(office
      ? {
          address: {
            "@type": "PostalAddress",
            ...([office.line1, office.line2].filter(Boolean).length ? { streetAddress: [office.line1, office.line2].filter(Boolean).join(", ") } : {}),
            ...(office.city ? { addressLocality: office.city } : {}),
            ...(office.pincode ? { postalCode: office.pincode } : {}),
            addressCountry: "IN",
          },
        }
      : {}),
    ...(d.cities.length ? { areaServed: [...new Set(d.cities)].map((name) => ({ "@type": "City", name })) } : {}),
  };
  const list = projects.all.length
    ? [
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Projects by ${d.name}`,
          numberOfItems: projects.all.length,
          itemListElement: projects.all.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: `${SITE_URL}${projectPath(p)}` })),
        },
      ]
    : [];
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Home", item: `${SITE_URL}/` },
      { name: "Projects", item: `${SITE_URL}/projects` },
      { name: d.name, item: url },
    ].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
  };
  return [organization, ...list, breadcrumb];
}
