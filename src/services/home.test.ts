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
    backend.onGet("/inventory/project/home-page/locality").reply(200, localities);
  });
  afterEach(() => backend.restore());

  it("loads the Properties rails for the purpose, as rezide.in asks for them", async () => {
    const listing = (subType: string) => ({ params: { property: "rent", subType } });
    backend.onGet("/inventory/listing/home-page", listing("byBudget")).reply(200, [{ budgetCategory: "Under 50k", min: 0, max: 50000, totalListings: "19+ listings" }, { budgetCategory: "Above 10 Lacs", min: 1000000, max: null, totalListings: "41+ listings" }]);
    backend.onGet("/inventory/listing/home-page", listing("byType")).reply(200, [{ unitType: "Apartment", totalListings: "409+ listings" }]);
    backend.onGet("/inventory/listing/home-page", listing("byBhk")).reply(200, [{ id: "x", bhkType: "2.5 BHK", totalListings: "47+ listings" }]);

    const home = await fetchPropertyHome("rent");
    expect(home.localities[0].forRent).toBe(66);
    expect(home.budgets).toEqual([
      { label: "Under 50k", min: undefined, max: 50000, count: 19, plus: true },
      { label: "Above 10 Lacs", min: 1000000, max: undefined, count: 41, plus: true },
    ]);
    expect(home.unitTypes).toEqual([{ label: "Apartment", count: 409, plus: true }]);
    expect(home.bhks).toEqual([{ label: "2.5 BHK", count: 47, plus: true }]);
  });

  it("loads the Projects rails for a status with the backend's wording", async () => {
    backend.onGet("/inventory/project/home-page/budget", { params: { location: "Mumbai" } }).reply(200, [{ budgetCategory: "Luxury", min: 100000000, max: 250000000, totalProjects: "278+ projects" }]);
    backend
      .onGet("/inventory/project/home-page/possession", { params: { location: "Mumbai", status: "Under Construction" } })
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

  it("doesn't ask for possession on the statuses that don't show it", async () => {
    backend.onGet("/inventory/project/home-page/budget").reply(200, []);
    await expect(fetchProjectHome("Mumbai", "rtm")).resolves.toMatchObject({ possession: [] });
    expect(backend.history.get.some((r) => r.url?.includes("possession"))).toBe(false);
  });
});
