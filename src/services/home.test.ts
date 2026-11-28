import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { countLabel } from "@/features/home/rails";
import { api } from "@/lib/api/client";
import { fetchProjectHome, fetchPropertyHome, parseCount, toLocality } from "@/services/home";

/* The Rezide backend's home-page endpoints, answered by a test double. Shapes follow live responses. */

const localities = [
  {
    _id: "l1",
    locality: "Lower Parel",
    media: [{ url: "photo1" }, { url: "photo2" }],
    totalProjects: 35,
    totalPropertiesForSale: 88,
    totalPropertiesForRent: 66,
  },
];

describe("counts", () => {
  it("reads the backend's worded counts", () => {
    expect(parseCount("326+ listings")).toEqual({ count: 326, plus: true });
    expect(parseCount("7 listings")).toEqual({ count: 7, plus: false });
    expect(parseCount("3380+ projects")).toEqual({ count: 3380, plus: true });
    expect(parseCount(undefined)).toEqual({ count: 0, plus: false });
  });

  it("words them for a card", () => {
    expect(countLabel(326, true, "listing")).toBe("326+ listings");
    expect(countLabel(1, false, "listing")).toBe("1 listing");
    expect(countLabel(0, false, "project")).toBe("No projects yet");
  });
});

describe("toLocality", () => {
  it("uses the first photo on the CDN", () => {
    expect(toLocality(localities[0])).toEqual({
      name: "Lower Parel",
      image: "https://cdn.rezide.in/images/photo1.jpeg",
      forSale: 88,
      forRent: 66,
      projects: 35,
    });
    expect(toLocality({ locality: "X" }).image).toBeUndefined();
  });
});

describe("home rails", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
    backend.onGet("/inventory/project/home-page/locality/city").reply(200, localities);
  });
  afterEach(() => backend.restore());

  it("loads the Properties rails for the purpose, as rezide.in asks for them", async () => {
    const listing = (subType: string) => ({ params: { property: "rent", subType } });
    backend.onGet("/inventory/listing/home-page", { params: { property: "rent", subType: "byBudget", city: "Mumbai", property_type: "home" } }).reply(200, [{ budgetCategory: "Under 50k", min: 0, max: 50000, totalListings: "19+ listings" }, { budgetCategory: "Above 10 Lacs", min: 1000000, max: null, totalListings: "41+ listings" }]);
    backend.onGet("/inventory/listing/home-page", listing("byType")).reply(200, [{ unitType: "Apartment", totalListings: "409+ listings" }]);
    backend.onGet("/inventory/listing/home-page", listing("byBhk")).reply(200, [{ id: "x", bhkType: "2.5 BHK", totalListings: "47+ listings" }]);

    const home = await fetchPropertyHome("rent", "Mumbai");
    expect(home.localities[0].forRent).toBe(66);
    expect(home.localityCity).toBe("Mumbai");
    expect(home.budgets).toEqual([
      { label: "Under 50k", min: undefined, max: 50000, count: 19, plus: true },
      { label: "Above 10 Lacs", min: 1000000, max: undefined, count: 41, plus: true },
    ]);
    expect(home.unitTypes).toEqual([{ label: "Apartment", count: 409, plus: true }]);
    expect(home.bhks).toEqual([{ label: "2.5 BHK", count: 47, plus: true }]);
  });

  it("sends the open tab to the Budget and Location calls too (count-mismatch report F1/F2)", async () => {
    backend.onGet("/inventory/project/home-page/budget").reply(200, []);
    backend.onGet("/inventory/project/home-page/possession").reply(200, []);
    for (const [tab, status] of [["uc", "Under Construction"], ["rtm", "Ready to Move"], ["nl", "New Launches"]] as const) {
      backend.resetHistory();
      await fetchProjectHome("Mumbai", tab);
      const sent = Object.fromEntries(backend.history.get.map((r) => [r.url?.replace("/inventory/project/home-page/", ""), r.params.status]));
      expect(sent).toEqual({ budget: status, "locality/city": status, possession: status });
    }
  });

  it("asks for each rail by the backend's city name", async () => {
    backend.onGet("/inventory/project/home-page/budget").reply(200, []);
    backend.onGet("/inventory/project/home-page/possession").reply(200, []);
    await fetchProjectHome("Bengaluru", "nl");
    expect(backend.history.get.map((r) => r.params.city)).toEqual(["Bangalore", "Bangalore", "Bangalore"]);
  });

  it("loads a city's localities, and returns none for one the backend doesn't know", async () => {
    backend.reset();
    backend.onGet("/inventory/project/home-page/budget").reply(200, []);
    backend.onGet("/inventory/project/home-page/possession").reply(200, []);
    backend.onGet("/inventory/project/home-page/locality/city", { params: { city: "Nowhere", status: "New Launches" } }).reply(200, []);
    await expect(fetchProjectHome("Nowhere", "nl")).resolves.toMatchObject({ localities: [], localityCity: "Nowhere" });
  });

  it("falls back to the popular localities until the per-city endpoint is deployed", async () => {
    backend.reset();
    backend.onGet("/inventory/project/home-page/locality/city").reply(404);
    backend.onGet("/inventory/project/home-page/locality").reply(200, localities);
    backend.onGet("/inventory/project/home-page/budget").reply(200, []);
    backend.onGet("/inventory/project/home-page/possession").reply(200, []);
    await expect(fetchProjectHome("Pune", "nl")).resolves.toMatchObject({ localities: [{ name: "Lower Parel" }], localityCity: "Mumbai" });
  });

  it("copes with the old endpoint's object when it has no data", async () => {
    backend.reset();
    backend.onGet("/inventory/project/home-page/locality/city").reply(404);
    backend.onGet("/inventory/project/home-page/locality").reply(200, { message: "none" });
    backend.onGet("/inventory/project/home-page/budget").reply(200, []);
    backend.onGet("/inventory/project/home-page/possession").reply(200, []);
    await expect(fetchProjectHome("Pune", "nl")).resolves.toMatchObject({ localities: [] });
  });

  describe("other categories", () => {
    beforeEach(() => {
      backend.reset();
      backend.onGet("/api/properties/groups").reply(200, { groupBy: "locality", groups: [
        { key: "Khar West", count: 2, projectCount: 0, minPrice: 1, maxPrice: 2, image: "a.jpeg" },
        { key: "Bandra West", count: 9, projectCount: 1, minPrice: 1, maxPrice: 2, image: null },
      ] });
      backend.onGet("/api/properties/facets").reply(200, { total: 11, facets: { unitTypes: { Shop: 2, Showroom: 9 } } });
      backend.onGet("/api/properties").reply((config) => [200, { items: [], total: Number(config.params.areaMin ?? 0) === 10000 ? 3 : 1, page: 1, perPage: 1, pageCount: 1 }]);
    });

    it("gets budgets by type, and counts locations, types and sizes from real listings", async () => {
      backend.onGet("/inventory/listing/home-page", { params: { property: "sale", subType: "byBudget", city: "Mumbai", property_type: "office" } }).reply(200, [{ budgetCategory: "5 - 10 Cr", min: 50000000, max: 100000000, totalListings: "18+ listings" }]);
      const home = await fetchPropertyHome("buy", "Mumbai", "offices");
      expect(home).toMatchObject({ localityCity: "Mumbai", budgets: [{ label: "5 - 10 Cr", count: 18, plus: true }], bhks: [] });
      expect(home.localities.map((l) => [l.name, l.forSale, l.image])).toEqual([["Bandra West", 9, undefined], ["Khar West", 2, "a.jpeg"]]);
      expect(home.unitTypes).toEqual([{ label: "Showroom", count: 9, plus: false }, { label: "Shop", count: 2, plus: false }]);
      expect(home.areas[0]).toMatchObject({ label: "Above 10,000 sq ft", count: 3 });
      expect(home.areas).toHaveLength(6);
    });

    it("asks for no budgets where the doc has no type", async () => {
      await expect(fetchPropertyHome("buy", "Mumbai", "industrial")).resolves.toMatchObject({ budgets: [] });
      expect(backend.history.get.some((r) => r.url === "/inventory/listing/home-page")).toBe(false);
    });
  });

  it("loads the Projects rails for a status with the backend's wording", async () => {
    backend.onGet("/inventory/project/home-page/budget", { params: { city: "Mumbai", status: "Under Construction" } }).reply(200, [{ budgetCategory: "Luxury", min: 100000000, max: 250000000, totalProjects: "278+ projects" }]);
    backend
      .onGet("/inventory/project/home-page/possession", { params: { city: "Mumbai", status: "Under Construction" } })
      .reply(200, [
        { period: "Possession in '26", possessionYear: 2026, totalProjects: "1064+ projects" },
        { period: "Possession Beyond '29", possessionYear: "3+ yr", totalProjects: "698+ projects" },
      ]);

    const home = await fetchProjectHome("Mumbai", "uc");
    expect(home.budgets[0]).toMatchObject({ label: "Luxury", min: 100000000, count: 278, plus: true });
    // The open-ended row has no year to search by.
    expect(home.possession).toEqual([
      { label: "Possession in '26", year: 2026, count: 1064, plus: true },
      { label: "Possession Beyond '29", year: undefined, count: 698, plus: true },
    ]);
    expect(home.localities[0].projects).toBe(35);
  });

  it("loads the age rail for Ready to Move", async () => {
    backend.onGet("/inventory/project/home-page/budget").reply(200, []);
    backend
      .onGet("/inventory/project/home-page/possession", { params: { city: "Mumbai", status: "Ready to Move" } })
      .reply(200, [{ period: "Ready 1-3 years", startYear: 1, endYear: 3, totalProjects: "957+ projects" }]);
    const home = await fetchProjectHome("Mumbai", "rtm");
    expect(home.possession).toEqual([{ label: "Ready 1-3 years", year: undefined, count: 957, plus: true }]);
  });

  it("loads the recency rail for New Launches", async () => {
    backend.onGet("/inventory/project/home-page/budget").reply(200, []);
    backend
      .onGet("/inventory/project/home-page/possession", { params: { city: "Mumbai", status: "New Launches" } })
      .reply(200, [{ period: "Launched 1-3 Months ago", startMonth: 1, endMonth: 3, totalProjects: "25+ projects" }]);
    const home = await fetchProjectHome("Mumbai", "nl");
    expect(home.possession).toEqual([{ label: "Launched 1-3 Months ago", year: undefined, count: 25, plus: true }]);
  });
});
