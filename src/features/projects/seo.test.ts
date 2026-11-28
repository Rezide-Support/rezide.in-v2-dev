import { describe, expect, it } from "vitest";
import { PROJECTS } from "@/mocks/fixtures/projects";
import { clip, jsonLdScript } from "@/lib/seo";
import type { Project } from "@/types/models";
import { isThinProject, projectDescription, projectJsonLd, projectMetadata, projectTitle } from "./seo";

const ID = "6b0682747304fc72e16b46f4";
const SLUG = "suraj-nova-1-2-bhk-under-construction-lady-jamsedji-road-mahim-mumbai";
const project: Project = {
  ...PROJECTS[0],
  id: ID,
  slug: SLUG,
  name: "Suraj Nova",
  developer: "Suraj Estate",
  locality: "Lady Jamsedji Rd.",
  subRegion: "Mahim",
  city: "Mumbai",
  configurations: "1 & 2 BHK",
  priceFrom: 21_000_000,
  priceTo: 34_000_000,
  areaMin: 450,
  areaMax: 720,
  status: "uc",
  possessionLabel: "Possession Dec 2027",
  reras: [{ id: "P51900012345" }],
  reraIds: ["P51900012345"],
  images: ["https://cdn.rezide.in/images/a.jpg", "https://cdn.rezide.in/images/b.jpg"],
  coords: [19.04, 72.84],
  units: 120,
  towers: 1,
  acres: 0,
  amenities: ["Gym", "Pool"],
  address: "Lady Jamsedji Road, Mahim West, Mumbai",
  description: "",
  configurationPlans: [
    { bhk: "1 BHK", areaMin: 450, areaMax: 480, unitPlans: [] },
    { bhk: "2 BHK", areaMin: 690, areaMax: 720, unitPlans: [] },
  ],
};

describe("project page metadata", () => {
  it("titles the page with name, area, city, BHKs and the price / floor plan intents", () => {
    expect(projectTitle(project)).toBe("Suraj Nova, Mahim, Mumbai: 1 & 2 BHK Price & Floor Plans");
    expect(projectTitle({ ...project, configurations: "Office", subRegion: undefined })).toBe("Suraj Nova, Lady Jamsedji Rd., Mumbai: Price & Floor Plans");
  });

  it("describes builder, location, BHKs, sizes, price, status, possession and RERA within 160 characters", () => {
    const d = projectDescription(project);
    expect(d).toContain("Suraj Nova by Suraj Estate in Lady Jamsedji Rd., Mahim, Mumbai.");
    expect(d).toContain("1 & 2 BHK, 450 – 720 sq ft at ₹ 2.1 Cr – 3.4 Cr.");
    expect(d).toContain("Possession Dec 2027.");
    expect(projectDescription({ ...project, status: "rtm", possessionLabel: "Completed Jul 2022" })).toContain("Ready to Move.");
    expect(d).toContain("RERA P51900012345.");
    expect(d.length).toBeLessThanOrEqual(160);
  });

  it("says only what the project has (no price, no possession date, no RERA)", () => {
    const d = projectDescription({ ...project, priceFrom: 0, priceTo: 0, possessionLabel: "Possession not stated", reras: [], reraIds: [] });
    expect(d).not.toMatch(/₹|not stated|RERA/);
  });

  it("sets the canonical URL, social previews with alt text, and indexing", () => {
    const m = projectMetadata(project);
    expect(m.alternates?.canonical).toBe(`/projects/${SLUG}-${ID}`);
    expect(m.openGraph).toMatchObject({ url: `/projects/${SLUG}-${ID}`, images: [{ url: "https://cdn.rezide.in/images/a.jpg", alt: "Suraj Nova, Mahim, Mumbai" }] });
    expect(m.robots).toBeUndefined();
  });

  it("keeps thin pages (no photos, configurations or price) out of search results", () => {
    const thin = { ...project, images: ["/images/listing-placeholder.jpg"], configurations: "", priceFrom: 0, priceTo: 0 };
    expect(isThinProject(thin)).toBe(true);
    expect(projectMetadata(thin).robots).toEqual({ index: false, follow: true });
    expect(isThinProject(project)).toBe(false);
  });
});

describe("project structured data", () => {
  it("describes an ApartmentComplex with floor plans, status, possession, RERA and location", () => {
    const [complex, breadcrumb] = projectJsonLd(project);
    expect(complex).toMatchObject({
      "@type": "ApartmentComplex",
      name: "Suraj Nova",
      url: `https://rezide.in/projects/${SLUG}-${ID}`,
      address: { streetAddress: "Lady Jamsedji Road, Mahim West, Mumbai", addressLocality: "Mahim", addressRegion: "Mumbai", addressCountry: "IN" },
      geo: { latitude: 19.04, longitude: 72.84 },
      containedInPlace: { name: "Mahim, Mumbai", containedInPlace: { "@type": "City", name: "Mumbai" } },
      numberOfAccommodationUnits: { value: 120 },
      accommodationFloorPlan: [
        { "@type": "FloorPlan", name: "1 BHK", numberOfBedrooms: 1, floorSize: { minValue: 450, maxValue: 480, unitCode: "FTK" } },
        { "@type": "FloorPlan", name: "2 BHK", numberOfBedrooms: 2, floorSize: { minValue: 690, maxValue: 720 } },
      ],
    });
    expect(complex.additionalProperty).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Status", value: "Under Construction" }),
        expect.objectContaining({ name: "Possession", value: "Dec 2027" }),
        expect.objectContaining({ name: "RERA registration", value: "P51900012345" }),
        expect.objectContaining({ name: "Developer", value: "Suraj Estate" }),
      ]),
    );
    expect(breadcrumb.itemListElement.map((c) => c.name)).toEqual(["Home", "Projects", "Mumbai", "Mahim", "Suraj Nova"]);
  });

  it("never adds prices as offers, ratings or reviews", () => {
    const json = JSON.stringify(projectJsonLd(project));
    expect(json).not.toMatch(/"offers"|aggregateRating|"review"/);
  });

  it("leaves out a 0,0 map position, zero units and missing possession", () => {
    const [complex] = projectJsonLd({ ...project, coords: [0, 0], units: 0, possessionLabel: "Possession not stated" });
    expect("geo" in complex).toBe(false);
    expect("numberOfAccommodationUnits" in complex).toBe(false);
    expect(complex.additionalProperty.some((f) => f.name === "Possession")).toBe(false);
  });

  it("escapes < so a value can't close the script tag, and clips at a word", () => {
    expect(jsonLdScript({ name: "</script><script>alert(1)</script>" })).not.toContain("<");
    expect(clip("one two three four", 12)).toBe("one two…");
  });
});
