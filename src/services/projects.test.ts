import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultProjectCriteria } from "@/features/search/criteria";
import { api } from "@/lib/api/client";
import { sendProjectEnquiry } from "@/services/mutations";
import { toAreaRange, toBhkOptions, toProject, toProjectFilters, withProjectDetail } from "@/services/project-mapper";
import { findListingProject, getProjectDetail, resetProjectCache, searchProjects } from "@/services/projects";

/* The Rezide backend's project endpoints, answered by a test double. Shapes follow live responses. */

const row = (over = {}) => ({
  _id: "66f3ca67d7f5683ae57720fa",
  project_name: "Lodha Venezia",
  developer_name: "Lodha Group ",
  locality: "Lalbaug",
  sub_region: "Parel",
  status: "Under Construction",
  possession: "2027-06-07T05:30:00.000Z",
  bhk: "1, 2, 3 & 4 BHK",
  area: "472 - 1416 sqft.",
  acres: "3.18 Acre",
  tower_count: 3,
  no_of_units: 684,
  amenities: "Adult Swimming Pool, Cafe",
  apartment_view_groups: "city skyline,sea view",
  rera_id: "P519,P520",
  images: [{ url: "photo1" }],
  saleRange: { minimumPriceRange: 16191928, maximumPriceRange: 65000000, avgRate: 34305.4 },
  rentRange: { minimumPriceRange: 50000, maximumPriceRange: 177867 },
  projectBrochureId: "doc1",
  ...over,
});

const detail = {
  project: {
    general_information: {
      projectBrochure_fileID: "doc2",
      developer_id: { general_information: { description: "A developer." }, account_details: { bank: "BANKSECRET", pan_number: "PANSECRET" } },
    },
    locality_and_address: { coordinates: { latitude: "18.99", longitude: "72.84" }, address: { line_1: "GD Ambekar Marg", city: "Bangalore", locality: "Lalbaug", sub_region: "Parel" } },
    project_description: { description: "About it.", highlights: [" Near the sea "] },
    amenities: ["Pool", " Gym ", "Spa"],
    media: { images: [{ url: "a" }], sample_flats: [{ url: "b" }], amenities: [{ url: "c" }], videos: [{ url: "https://youtu.be/x" }] },
    configuration: [{ bhk: "2 BHK", unit_plan: "plan1" }, { bhk: "2 BHK", unit_plan: "plan1" }, { bhk: "3 BHK" }],
    price_range: [{ name: "2 BHK", minArea: "850", maxArea: "1,000" }],
    similar_projects: [{ value: "66f3ca67d7f5683ae57720fb" }],
  },
};

describe("mapping", () => {
  it("reads the backend's worded values", () => {
    expect(toBhkOptions("1, 2, 3 & 4 BHK")).toEqual(["1 BHK", "2 BHK", "3 BHK", "4 BHK"]);
    expect(toBhkOptions("Studio & 1 BHK")).toEqual(["Studio", "1 BHK"]);
    expect(toAreaRange("472 - 1416 sqft.")).toEqual([472, 1416]);
    expect(toAreaRange(undefined)).toEqual([0, 0]);
  });

  it("maps a row", () => {
    expect(toProject(row(), "Mumbai")).toMatchObject({
      id: "66f3ca67d7f5683ae57720fa",
      name: "Lodha Venezia",
      developer: "Lodha Group",
      city: "Mumbai",
      locality: "Lalbaug",
      status: "uc",
      possessionYear: 2027,
      possessionLabel: "Possession Jun 2027",
      priceFrom: 16191928,
      ratePerSqft: 34305,
      acres: 3.18,
      towers: 3,
      amenities: ["Adult Swimming Pool", "Cafe"],
      views: ["city skyline", "sea view"],
      reraId: "P519",
      images: ["https://cdn.rezide.in/images/photo1.jpeg"],
      brochureUrl: "https://cdn.rezide.in/images/doc1",
    });
  });

  it("has no possession year once ready, and copes with missing values", () => {
    expect(toProject(row({ status: "Ready to Move", possession: "2019-01-07T05:30:00.000Z" }), "Mumbai")).toMatchObject({ status: "rtm", possessionYear: undefined, possessionLabel: "Completed Jan 2019" });
    expect(toProject({ _id: "x" }, "Mumbai")).toMatchObject({ priceFrom: 0, possessionLabel: "Possession not stated", images: ["/images/listing-placeholder.jpg"] });
  });

  it("adds the detail record, and copies no private fields", () => {
    const project = withProjectDetail(toProject(row(), ""), detail);
    expect(project).toMatchObject({
      city: "Bengaluru",
      address: "GD Ambekar Marg",
      coords: [18.99, 72.84],
      description: "About it.",
      highlights: ["Near the sea"],
      images: ["https://cdn.rezide.in/images/a.jpeg", "https://cdn.rezide.in/images/b.jpeg"],
      amenityImages: ["https://cdn.rezide.in/images/c.jpeg"],
      amenities: ["Pool", "Gym", "Spa"],
      videoUrl: "https://youtu.be/x",
      configurationPlans: [{ bhk: "2 BHK", areaMin: 850, areaMax: 1000, unitPlans: ["https://cdn.rezide.in/images/plan1.jpeg"] }],
      brochureUrl: "https://cdn.rezide.in/images/doc2",
      developerProfile: { name: "Lodha Group", headquarters: "Bengaluru", description: "A developer." },
    });
    expect(JSON.stringify(project)).not.toMatch(/BANKSECRET|PANSECRET/);
  });
});

describe("filters", () => {
  it("sends the backend's values", () => {
    expect(
      toProjectFilters(defaultProjectCriteria({ city: "Bengaluru", q: "Lodha", status: ["uc", "rtm", "nl"], views: ["Sea View"], budget: ["luxury"], perPage: 9 })),
    ).toEqual({
      page: 1,
      pageSize: 9,
      city: ["Bangalore"],
      project_names_localities_subRegions: ["Lodha"],
      project_age: ["Under Construction", "Ready to Move", "New Launch"],
      views: ["Sea View"],
      budget_min: [100000000],
      budget_max: [250000000],
      ids: [],
    });
  });

  it("leaves out an open-ended budget's missing bound", () => {
    expect(toProjectFilters(defaultProjectCriteria({ budget: ["ultra-luxury"] }))).toMatchObject({ budget_min: [250000000] });
    expect(toProjectFilters(defaultProjectCriteria({ budget: ["ultra-luxury"] }))).not.toHaveProperty("budget_max");
    expect(toProjectFilters(defaultProjectCriteria({ budget: ["value"] }))).not.toHaveProperty("budget_min");
  });
});

describe("backend reads", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    resetProjectCache();
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  it("searches with one page request, using the backend's total", async () => {
    backend.onPost("/Inventory/project/filter/new").reply(200, { data: [row()], result_count: 20 });
    await expect(searchProjects(defaultProjectCriteria({ city: "Mumbai", perPage: 9 }))).resolves.toMatchObject({ total: 20, pageCount: 3, items: [{ name: "Lodha Venezia" }] });
    expect(backend.history.post).toHaveLength(1);
  });

  it("marks results as New Launch only when that's all that was asked for", async () => {
    backend.onPost("/Inventory/project/filter/new").reply(200, { data: [row()], result_count: 1 });
    await expect(searchProjects(defaultProjectCriteria({ status: ["nl"] }))).resolves.toMatchObject({ items: [{ status: "nl" }] });
    await expect(searchProjects(defaultProjectCriteria({ status: ["nl", "uc"] }))).resolves.toMatchObject({ items: [{ status: "uc" }] });
  });

  it("filters possession years itself, across every page", async () => {
    backend.onPost("/Inventory/project/filter/new").reply((config) => {
      const page = JSON.parse(config.data).page;
      return [200, { result_count: 300, data: page === 1 ? [row({ _id: "a" }), row({ _id: "b", possession: "2029-01-07T05:30:00.000Z" })] : [row({ _id: "c" })] }];
    });
    const result = await searchProjects(defaultProjectCriteria({ years: [2027], perPage: 9 }));
    expect(result.items.map((p) => p.id)).toEqual(["a", "c"]);
    expect(result.total).toBe(2);
    expect(backend.history.post).toHaveLength(2);
  });

  it("requires both the text and the locality", async () => {
    backend.onPost("/Inventory/project/filter/new").reply(200, { result_count: 2, data: [row({ _id: "a" }), row({ _id: "b", project_name: "Other" })] });
    const result = await searchProjects(defaultProjectCriteria({ q: "Venezia", localities: ["Parel"] }));
    expect(result.items.map((p) => p.id)).toEqual(["a"]);
    expect(JSON.parse(backend.history.post[0].data).project_names_localities_subRegions).toEqual(["Parel"]);
  });

  it("checks separate budget tiers itself", async () => {
    const lo = row({ _id: "lo", saleRange: { minimumPriceRange: 5000000, maximumPriceRange: 8000000 } });
    const mid = row({ _id: "mid", saleRange: { minimumPriceRange: 60000000, maximumPriceRange: 80000000 } });
    const hi = row({ _id: "hi", saleRange: { minimumPriceRange: 300000000, maximumPriceRange: 400000000 } });
    backend.onPost("/Inventory/project/filter/new").reply(200, { result_count: 3, data: [lo, mid, hi] });
    const result = await searchProjects(defaultProjectCriteria({ budget: ["value", "ultra-luxury"] }));
    expect(result.items.map((p) => p.id)).toEqual(["lo", "hi"]);
  });

  it("builds the detail page, and a failed extra doesn't fail it", async () => {
    const id = "66f3ca67d7f5683ae57720fa";
    backend.onGet(`/Inventory/project/${id}`).reply(200, detail);
    backend.onPost("/Inventory/project/filter/new").reply((config) => {
      const body = JSON.parse(config.data);
      if (body.ids?.[0] === id) return [200, { data: [row()] }];
      if (body.ids?.length) return [200, { data: [row({ _id: "similar", project_name: "Similar" })] }];
      return [200, { data: [row(), row({ _id: "near", project_name: "Near" })] }];
    });
    const result = await getProjectDetail(id);
    expect(result.project.name).toBe("Lodha Venezia");
    expect(result.similar?.map((p) => p.id)).toEqual(["similar"]);
    expect(result.nearby?.map((p) => p.id)).toEqual(["near"]);
    expect(result.listings).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(/BANKSECRET|PANSECRET/);
  });

  it("finds a project's listings by name, and keeps only its own", async () => {
    const id = "66f3ca67d7f5683ae57720fa";
    const listing = (listingId: string, projectId: string) => ({ _id: listingId, listing_details: { project: { _id: projectId } }, commercial_details: { property_purpose: "sale" } });
    backend.onGet(`/Inventory/project/${id}`).reply(200, detail);
    backend.onPost("/Inventory/project/filter/new").reply(200, { data: [row()] });
    backend.onPost("/inventory/Listing/mobile/all").reply(200, { data: [listing("mine", id), listing("other", "someone-else")] });
    const { listings } = await getProjectDetail(id);
    expect(new Set(listings.map((l) => l.id))).toEqual(new Set(["mine"]));
    const body = JSON.parse(backend.history.post.find((r) => r.url === "/inventory/Listing/mobile/all")!.data);
    expect(body.project_names_localities).toEqual(["Lodha Venezia"]);
    expect(body).not.toHaveProperty("project_id");
  });

  it("answers 404 for an unknown project", async () => {
    backend.onPost("/Inventory/project/filter/new").reply(200, { data: [] });
    await expect(getProjectDetail("nope")).rejects.toMatchObject({ status: 404 });
    await expect(getProjectDetail("000000000000000000000000")).rejects.toMatchObject({ status: 404 });
    expect(backend.history.get).toHaveLength(0);
  });

  it("finds a listing's project with its stock, and never fails the listing", async () => {
    backend.onPost("/Inventory/project/filter/new").reply(200, { data: [row({ _id: "p1" })] });
    backend.onPost("/inventory/Listing/mobile/filter/count").reply(200, { result_sale: 4, result_rent: 2 });
    await expect(findListingProject("p1", "Mumbai")).resolves.toMatchObject({ project: { id: "p1", city: "Mumbai" }, projectStock: { sale: 4, rent: 2 } });
    backend.reset();
    backend.onAny().reply(500);
    await expect(findListingProject("p1", "Mumbai")).resolves.toEqual({ project: null, projectStock: undefined });
    await expect(findListingProject(undefined, "Mumbai")).resolves.toEqual({ project: null, projectStock: undefined });
  });

  it("sends rezide.in's lead for a project", async () => {
    backend.onPost("/lead/developer-contact").reply(200, {});
    await sendProjectEnquiry({ name: "Asha Rao", phone: "9820012345", intent: "I want to visit the site", developerName: "Lodha", projectName: "Park", location: "Worli", budgetMin: 1000, budgetMax: 2000, pageUrl: "https://x/p" });
    expect(JSON.parse(backend.history.post[0].data)).toEqual({
      name: "Asha Rao",
      mobile: "9820012345",
      email: "",
      developerName: "Lodha",
      projectName: "Park",
      location: "Worli",
      budgetMin: 1000,
      budgetMax: 2000,
      siteVisitInterest: true,
      homeLoanInterest: false,
      message: "I want to visit the site",
      pageUrl: "https://x/p",
      source: "Rezide.in contact widget",
    });
  });
});
