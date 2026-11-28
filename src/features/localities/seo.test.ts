import { describe, expect, it } from "vitest";
import { localityIdFromParam, localityPath, localityRowSlug } from "@/lib/locality-url";
import { isThinLocality, localityDescription, localityJsonLd, localityMetadata, localityTitle } from "./seo";

const ID = "65310013e577f28d600a13a5";
const locality = {
  id: ID,
  slug: "indiraji-nagar-juhu-mumbai",
  name: "Indiraji Nagar",
  city: "Mumbai",
  subRegion: "Juhu",
  region: "Western Suburbs",
  description:
    "Indiraji Nagar, nestled away in the heart of Juhu, offers a unique blend of tranquil living and proximity to Juhu's vibrant beaches and bustling attractions. Known for its quiet streets.",
  whatToExpect: "",
  lifestyle: "",
  unexpectedAppeal: "",
  market: "",
  images: ["https://cdn.rezide.in/images/a.jpeg"],
};

describe("locality SEO URLs", () => {
  it("builds name, sub-region and city from the list row, and keeps the id last", () => {
    // The live list row of Indiraji Nagar (Nov 2026).
    const row = { general_information: { locality_name: "Indiraji Nagar", sub_region: { name: "Juhu" }, region: { name: "Western Suburbs" }, city: { name: "Mumbai" } } };
    expect(localityRowSlug(row)).toBe("indiraji-nagar-juhu-mumbai");
    expect(localityPath({ id: ID, slug: localityRowSlug(row) })).toBe(`/locality/indiraji-nagar-juhu-mumbai-${ID}`);
    expect(localityIdFromParam(`indiraji-nagar-juhu-mumbai-${ID}`)).toBe(ID);
    expect(localityIdFromParam(ID)).toBe(ID);
    expect(localityPath({ id: ID, slug: "" })).toBe(`/locality/${ID}`);
  });

  it("shows the city as people know it, never repeats a place, and ignores ids", () => {
    expect(localityRowSlug({ general_information: { locality_name: "Whitefield", sub_region: { name: "Whitefield" }, city: { name: "Bangalore" } } })).toBe("whitefield-bengaluru");
    expect(localityRowSlug({ general_information: { locality_name: "Worli", sub_region: "652f8108e8970d4f09aef505", city: "64f6424f48386fc8e0767c15" } })).toBe("worli");
  });
});

describe("locality page metadata", () => {
  it("titles the page with locality, sub-region and city, and the guide / market intents", () => {
    expect(localityTitle(locality)).toBe("Indiraji Nagar, Juhu, Mumbai: Area Guide, Lifestyle & Property Market");
    expect(localityTitle({ ...locality, name: "Juhu Tara Road", subRegion: "Juhu" })).toBe("Juhu Tara Road, Mumbai: Area Guide, Lifestyle & Property Market");
  });

  it("describes it in its own words within 160 characters, else with a summary", () => {
    const d = localityDescription(locality);
    expect(d.startsWith("Indiraji Nagar, nestled away in the heart of Juhu")).toBe(true);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(localityDescription({ ...locality, description: "", market: "Prices are rising." })).toBe("Prices are rising.");
    expect(localityDescription({ ...locality, description: "" })).toContain("Living in Indiraji Nagar, Juhu, Mumbai");
  });

  it("sets the canonical URL and previews, and keeps empty localities out of search results", () => {
    const m = localityMetadata(locality);
    expect(m.alternates?.canonical).toBe(`/locality/indiraji-nagar-juhu-mumbai-${ID}`);
    expect(m.openGraph).toMatchObject({ images: [{ url: "https://cdn.rezide.in/images/a.jpeg", alt: "Indiraji Nagar, Juhu, Mumbai" }] });
    expect(m.robots).toBeUndefined();
    const empty = { ...locality, description: "", images: [] };
    expect(isThinLocality(empty)).toBe(true);
    expect(localityMetadata(empty).robots).toEqual({ index: false, follow: true });
    expect(isThinLocality({ ...empty, images: ["x"] })).toBe(false);
  });
});

describe("locality structured data", () => {
  it("describes a Place within its sub-region, region and city, with a breadcrumb trail", () => {
    const [place, breadcrumb] = localityJsonLd(locality);
    expect(place).toMatchObject({
      "@type": "Place",
      name: "Indiraji Nagar",
      url: `https://rezide.in/locality/indiraji-nagar-juhu-mumbai-${ID}`,
      address: { addressLocality: "Indiraji Nagar, Juhu", addressRegion: "Mumbai", addressCountry: "IN" },
      containedInPlace: { name: "Juhu", containedInPlace: { name: "Western Suburbs", containedInPlace: { "@type": "City", name: "Mumbai" } } },
    });
    expect(breadcrumb.itemListElement.map((c) => c.name)).toEqual(["Home", "Properties in Mumbai", "Indiraji Nagar"]);
  });

  it("works with only a city", () => {
    const [place] = localityJsonLd({ ...locality, subRegion: undefined, region: undefined });
    expect(place.containedInPlace).toEqual({ "@type": "City", name: "Mumbai" });
  });
});
