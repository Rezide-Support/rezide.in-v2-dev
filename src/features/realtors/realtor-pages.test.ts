import { describe, expect, it } from "vitest";
import { FIRMS } from "@/mocks/fixtures/firms";
import { PROPERTIES } from "@/mocks/fixtures/properties";
import { ALL_REALTORS } from "@/mocks/fixtures/realtors";
import { firmHref, realtorFirmHref, realtorHref } from "./links";
import { listingQuery, paginateListings, parseListingParams } from "./listings";

describe("firm and agent URLs", () => {
  it("builds /realtors/<firm> and /realtors/<firm>/<agent>", () => {
    expect(firmHref({ id: "assetpro" })).toBe("/realtors/assetpro");
    expect(realtorHref({ firmId: "assetpro", slug: "rukmani-iyer" })).toBe("/realtors/assetpro/rukmani-iyer");
    expect(realtorFirmHref({ firmId: "skyline" })).toBe("/realtors/skyline");
  });

  it("gives every profile a unique URL under an existing firm", () => {
    const urls = ALL_REALTORS.map(realtorHref);
    expect(new Set(urls).size).toBe(urls.length);
    for (const r of ALL_REALTORS) expect(FIRMS.some((f) => f.id === r.firmId)).toBe(true);
    // Firm slugs must not collide with old realtor ids, which share the /realtors/<x> segment.
    for (const f of FIRMS) expect(ALL_REALTORS.some((r) => r.id === f.id)).toBe(false);
  });
});

describe("listing toggle and pagination", () => {
  const sale = PROPERTIES.filter((p) => p.intent === "buy").slice(0, 11);
  const rent = PROPERTIES.filter((p) => p.intent === "rent").slice(0, 3);
  const all = [...sale, ...rent];

  it("reads intent and page from the URL with safe fallbacks", () => {
    expect(parseListingParams(new URLSearchParams("intent=rent&page=2"))).toEqual({ intent: "rent", page: 2 });
    expect(parseListingParams(new URLSearchParams("intent=lease&page=-4"))).toEqual({ intent: "buy", page: 1 });
    expect(listingQuery({ intent: "buy", page: 1 })).toBe("");
    expect(listingQuery({ intent: "rent", page: 2 })).toBe("?intent=rent&page=2");
  });

  it("splits by intent with real counts and pages of nine", () => {
    const first = paginateListings(all, { intent: "buy", page: 1 });
    expect(first).toMatchObject({ saleCount: 11, rentCount: 3, page: 1, pageCount: 2 });
    expect(first.items).toEqual(sale.slice(0, 9));
    expect(paginateListings(all, { intent: "buy", page: 2 }).items).toEqual(sale.slice(9));
    expect(paginateListings(all, { intent: "rent", page: 1 }).items).toEqual(rent);
  });

  it("clamps out-of-range pages and handles an empty side", () => {
    expect(paginateListings(all, { intent: "buy", page: 9 }).page).toBe(2);
    const none = paginateListings(sale, { intent: "rent", page: 3 });
    expect(none).toMatchObject({ rentCount: 0, page: 1, pageCount: 1, items: [] });
  });
});
