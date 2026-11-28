import { describe, expect, it } from "vitest";
import { developerIdFromParam, developerPath, developerRecordSlug } from "@/lib/developer-url";
import type { Project } from "@/types/models";
import { developerDescription, developerJsonLd, developerMetadata, developerTitle, isThinDeveloper } from "./seo";

const ID = "658eaf4b07130a3f09bc3801";
const developer = {
  id: ID,
  slug: "lodha-group-mumbai",
  name: "Lodha Group",
  logo: "https://api.rezide.in/v1/admin/file/upload/logo",
  place: "Mumbai, Maharashtra",
  description: "Lodha or Lodha Developers Limited is an Indian multinational real estate company and construction company headquartered in Mumbai.",
  established: "1995",
  addresses: [{ type: "Corporate Office", line1: "Lodha Excelus", line2: "Mahalaxmi", city: "Mumbai", pincode: "400011" }],
  cities: ["Mumbai", "Mumbai", "Thane"],
};
const project = (id: string, name: string, slug: string) => ({ id, name, slug }) as Project;
const projects = {
  total: 61,
  all: [project("6ad30922092060280eff75ef", "Lodha Park", "lodha-park-3-4-bhk-ready-to-move-worli-mumbai")],
  rtm: Array.from({ length: 21 }, () => project("x", "x", "x")),
  uc: Array.from({ length: 29 }, () => project("y", "y", "y")),
  nl: [],
};

describe("developer SEO URLs", () => {
  it("builds the name and head-office city from the record (as the page, list and project record carry them)", () => {
    // The live record of Lodha Group (Nov 2026): its name has a trailing space.
    const record = { general_information: { developer_name: "Lodha Group " }, contact_details: { address: [{ city: { label: "Mumbai" } }, { city: { label: "Pune" } }] } };
    expect(developerRecordSlug(record)).toBe("lodha-group-mumbai");
    expect(developerPath({ id: ID, slug: developerRecordSlug(record) })).toBe(`/developers/lodha-group-mumbai-${ID}`);
    expect(developerRecordSlug({ general_information: { developer_name: "Prestige" }, contact_details: { address: [{ city: { label: "Bangalore" } }] } })).toBe("prestige-bengaluru");
    expect(developerRecordSlug({ general_information: { developer_name: "Mumbai Realty" }, contact_details: { address: [{ city: { label: "Mumbai" } }] } })).toBe("mumbai-realty");
    expect(developerRecordSlug({ general_information: { developer_name: "Empire Realty" } })).toBe("empire-realty");
  });

  it("reads the id back, with or without the words", () => {
    expect(developerIdFromParam(`lodha-group-mumbai-${ID}`)).toBe(ID);
    expect(developerIdFromParam(ID)).toBe(ID);
    expect(developerIdFromParam("lodha-group")).toBeUndefined();
    expect(developerPath({ id: ID, slug: "" })).toBe(`/developers/${ID}`);
  });
});

describe("developer page metadata", () => {
  it("titles the page with the name, city and project count", () => {
    expect(developerTitle(developer, projects)).toBe("Lodha Group, Builder in Mumbai: 61 Projects & Company Profile");
    expect(developerTitle({ ...developer, place: undefined, cities: [] }, { ...projects, total: 0 })).toBe("Lodha Group: Company Profile");
  });

  it("describes who it is, since when, and the page's own project counts, then its own words", () => {
    const d = developerDescription(developer, projects);
    expect(d.startsWith("Lodha Group, real estate developer in Mumbai since 1995, with 61 projects (21 ready to move, 29 under construction) on Rezide. Lodha")).toBe(true);
    expect(d.length).toBeLessThanOrEqual(160);
  });

  it("sets the canonical URL and uses the logo for previews", () => {
    const m = developerMetadata(developer, projects);
    expect(m.alternates?.canonical).toBe(`/developers/lodha-group-mumbai-${ID}`);
    expect(m.openGraph).toMatchObject({ images: [{ url: developer.logo, alt: "Lodha Group logo" }] });
    expect(m.robots).toBeUndefined();
  });

  it("keeps a developer with no About text and no projects out of search results", () => {
    const none = { ...projects, total: 0, all: [], rtm: [], uc: [] };
    expect(isThinDeveloper({ description: "" }, none)).toBe(true);
    expect(developerMetadata({ ...developer, description: "" }, none).robots).toEqual({ index: false, follow: true });
    expect(isThinDeveloper({ description: "" }, projects)).toBe(false);
  });
});

describe("developer structured data", () => {
  it("describes the Organization, lists its projects at their SEO URLs, and the breadcrumb trail", () => {
    const [organization, list, breadcrumb] = developerJsonLd(developer, projects) as unknown as [Record<string, unknown>, Record<string, unknown>, { itemListElement: { name: string }[] }];
    expect(organization).toMatchObject({
      "@type": "Organization",
      name: "Lodha Group",
      url: `https://rezide.in/developers/lodha-group-mumbai-${ID}`,
      foundingDate: "1995",
      address: { streetAddress: "Lodha Excelus, Mahalaxmi", addressLocality: "Mumbai", postalCode: "400011" },
      areaServed: [{ name: "Mumbai" }, { name: "Thane" }],
    });
    expect(list).toMatchObject({
      "@type": "ItemList",
      name: "Projects by Lodha Group",
      itemListElement: [{ position: 1, name: "Lodha Park", url: "https://rezide.in/projects/lodha-park-3-4-bhk-ready-to-move-worli-mumbai-6ad30922092060280eff75ef" }],
    });
    expect(breadcrumb.itemListElement.map((c) => c.name)).toEqual(["Home", "Projects", "Lodha Group"]);
  });

  it("has no project list when the developer has none on Rezide", () => {
    const blocks = developerJsonLd(developer, { total: 0, all: [], rtm: [], uc: [], nl: [] });
    expect(blocks.map((b) => b["@type"])).toEqual(["Organization", "BreadcrumbList"]);
  });
});
