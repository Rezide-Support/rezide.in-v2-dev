import { describe, expect, it } from "vitest";
import { PROJECTS } from "@/mocks/fixtures/projects";
import { PROPERTIES } from "@/mocks/fixtures/properties";
import { REALTORS } from "@/mocks/fixtures/realtors";
import { defaultProjectCriteria, defaultPropertyCriteria } from "./criteria";
import { matchesText, paginate, parseMapArea, searchProjects, searchProperties, searchRealtors } from "./match";

const search = (o: Parameters<typeof defaultPropertyCriteria>[0]) =>
  searchProperties(PROPERTIES, defaultPropertyCriteria({ perPage: 36, ...o }));

describe("parseMapArea", () => {
  it("reads west,south,east,north", () => {
    expect(parseMapArea("72.8,18.9,73,19.3")).toEqual([72.8, 18.9, 73, 19.3]);
  });

  it.each([null, "", "72.8,18.9,73", "a,b,c,d", "72.8,,73,19.3", "73,18.9,72.8,19.3", "72.8,19.3,73,18.9"])("ignores %s", (value) => {
    expect(parseMapArea(value)).toBeUndefined();
  });
});

describe("property matching over the fixed inventory", () => {
  it("returns only listings for the requested city, intent and category", () => {
    const r = search({ city: "Mumbai", intent: "rent", category: "homes" });
    expect(r.total).toBeGreaterThan(0);
    for (const p of r.items) {
      expect(p).toMatchObject({ city: "Mumbai", intent: "rent", category: "homes" });
    }
  });

  it("applies the text query to title, locality and project", () => {
    const r = search({ q: "lodha" });
    expect(r.items.map((p) => p.id)).toEqual(["mum-worli-lodha-park-b1702"]);
    expect(search({ q: "worli powai" }).total).toBe(0); // every token must match some field
    expect(search({ q: "Worli Omkar" }).items[0].id).toBe("mum-worli-omkar-a3104");
  });

  it("returns an empty result for a query that matches nothing, never fabricated listings", () => {
    const r = search({ q: "Atlantis Palm Jumeirah" });
    expect(r).toMatchObject({ total: 0, items: [], page: 1, pageCount: 1 });
    expect(search({ city: "Agra" }).total).toBe(0);
  });

  it("does not change the inventory when filters change", () => {
    const before = JSON.stringify(PROPERTIES);
    search({ bhk: ["5+ BHK"], budgetMin: 1, q: "anything" });
    expect(JSON.stringify(PROPERTIES)).toBe(before);
  });

  it("treats '5+ BHK' as five or more and ORs values within a filter", () => {
    const big = search({ bhk: ["5+ BHK"] });
    expect(big.items.every((p) => (p.bhk ?? 0) >= 5)).toBe(true);
    const twoOrThree = search({ bhk: ["2 BHK", "3 BHK"] });
    expect(twoOrThree.items.every((p) => p.bhk === 2 || p.bhk === 3)).toBe(true);
    expect(twoOrThree.total).toBe(search({ bhk: ["2 BHK"] }).total + search({ bhk: ["3 BHK"] }).total);
  });

  it("ANDs different filter groups together", () => {
    const r = search({ localities: ["Worli"], bhk: ["3 BHK"] });
    expect(r.items.every((p) => p.locality === "Worli" && p.bhk === 3)).toBe(true);
  });

  it("respects inclusive budget bounds", () => {
    const r = search({ budgetMin: 2_00_00_000, budgetMax: 8_00_00_000 });
    expect(r.total).toBeGreaterThan(0);
    expect(r.items.every((p) => p.price >= 2_00_00_000 && p.price <= 8_00_00_000)).toBe(true);
  });

  it("filters by area band with an inclusive min and exclusive max", () => {
    const r = search({ areaMin: 1_000, areaMax: 2_000 });
    expect(r.total).toBeGreaterThan(0);
    expect(r.items.every((p) => p.areaSqft >= 1_000 && p.areaSqft < 2_000)).toBe(true);
    const all = search({}).total;
    expect(search({ areaMax: 1_000 }).total + search({ areaMin: 1_000 }).total).toBe(all);
  });

  it("filters by project id", () => {
    const r = search({ projects: ["lodha-park"] });
    expect(r.total).toBeGreaterThan(0);
    expect(r.items.every((p) => p.projectId === "lodha-park")).toBe(true);
  });

  it("sorts by price and area", () => {
    const asc = search({ sort: "price-asc" }).items.map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const area = search({ sort: "area-desc" }).items.map((p) => p.areaSqft);
    expect(area).toEqual([...area].sort((a, b) => b - a));
    const areaUp = search({ sort: "area-asc" }).items.map((p) => p.areaSqft);
    expect(areaUp).toEqual([...areaUp].sort((a, b) => a - b));
  });

  it("sorts by rate per sq ft, putting listings without a rate last", () => {
    const rate = (p: { price: number; areaSqft: number }) => p.price / p.areaSqft;
    const up = search({ sort: "rate-asc" }).items.map(rate);
    expect(up).toEqual([...up].sort((a, b) => a - b));
    const down = search({ sort: "rate-desc" }).items.map(rate);
    expect(down).toEqual([...down].sort((a, b) => b - a));

    const withRate = { ...PROPERTIES[0], id: "z-rated", price: 1000, areaSqft: 10 };
    const noArea = { ...PROPERTIES[0], id: "a-no-area", price: 1000, areaSqft: 0 };
    const hidden = { ...PROPERTIES[0], id: "b-hidden", price: 0, areaSqft: 10 };
    const c = defaultPropertyCriteria({ city: PROPERTIES[0].city, intent: PROPERTIES[0].intent, category: PROPERTIES[0].category, sort: "rate-asc" });
    const ids = searchProperties([noArea, hidden, withRate], c).items.map((p) => p.id);
    expect(ids).toEqual(["z-rated", "a-no-area", "b-hidden"]);
  });

  it("paginates and clamps out-of-range pages", () => {
    const all = search({}).total;
    const page2 = searchProperties(PROPERTIES, defaultPropertyCriteria({ perPage: 9, page: 2 }));
    expect(page2.items.length).toBe(Math.min(9, all - 9));
    const far = searchProperties(PROPERTIES, defaultPropertyCriteria({ perPage: 9, page: 99 }));
    expect(far.page).toBe(far.pageCount);
    expect(paginate([], 3, 9)).toEqual({ items: [], total: 0, page: 1, perPage: 9, pageCount: 1 });
  });
});

describe("text matching", () => {
  it("is case-insensitive and token-based", () => {
    expect(matchesText("THANE west", ["Thane West"])).toBe(true);
    expect(matchesText("thane pune", ["Thane West"])).toBe(false);
    expect(matchesText("   ", ["anything"])).toBe(true);
  });
});

describe("project and realtor matching", () => {
  it("filters projects by status, possession year and budget tier", () => {
    const uc2028 = searchProjects(PROJECTS, defaultProjectCriteria({ status: ["uc"], years: [2028] }));
    expect(uc2028.items.map((p) => p.id)).toEqual(["oberoi-elysian"]);
    const luxury = searchProjects(PROJECTS, defaultProjectCriteria({ budget: ["luxury"] }));
    expect(luxury.items.every((p) => p.priceFrom >= 10_00_00_000)).toBe(true);
    expect(searchProjects(PROJECTS, defaultProjectCriteria({ q: "no such project" })).total).toBe(0);
  });

  it("filters realtors by name or firm, specialisation and language", () => {
    const base = { city: "Mumbai", by: "name" as const, q: "", specializations: [], locality: "", language: "", gender: "" };
    expect(searchRealtors(REALTORS, { ...base, q: "sana" }).map((r) => r.name)).toEqual(["Sana Qureshi"]);
    expect(searchRealtors(REALTORS, { ...base, by: "firm", q: "sana" })).toHaveLength(0);
    const auctions = searchRealtors(REALTORS, { ...base, specializations: ["Bank Auctions"] });
    expect(auctions.map((r) => r.id)).toEqual(["crest-priya-nair"]);
    expect(searchRealtors(REALTORS, { ...base, language: "Telugu" }).map((r) => r.name)).toEqual(["Vikram Rao"]);
    expect(searchRealtors(REALTORS, { ...base, city: "Pune" })).toHaveLength(0);
  });
});
