import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";

import { realtorsOf, toFirm, type BackendFirm } from "@/services/realtor-mapper";
import type { RealtorSearchCriteria } from "@/types/models";
import { findRealtor, getFirmAgentDetail, getFirmDetail, matchesDirectory, resetRealtorCaches, searchRealtors } from "@/services/realtors";

/* The Rezide backend's broker endpoints, answered by a test double. Shapes follow live responses. */

const SECRET = { pan_no: "PANSECRET1", aadhaar_no: "AADHAARSECRET", mobile_no: "919999999999", full_mobile_no: "+919999999999", email: "private@example.com" };

const firm = {
  _id: "f1",
  general_information: {
    firm_name: "Asset Pro",
    firm_type: { name: "Proprietorship" },
    operating_since: { value: "1994" },
    specialization: [{ label: "Residential Outright" }],
    allSubRegions: [{ label: "Worli" }],
    logo: "firmlogo",
  },
  documents: { rera_no: "RERA1", gst_no: "", pan_no: "PANSECRET1" },
  financial: { account_no: "BANKSECRET" },
  addresses: [{ line1: "1 Road", line2: "Bandra", pincode: "400050", city: "Mumbai", address_type: "registered" }],
  total_listing_sale_count: 7,
  total_listing_rental_count: 3,
  managers: [
    { ...SECRET, _id: "m2", fname: "Asha", lname: "Rao", salutation: { label: "Ms." }, logo: "asha", language: [{ label: "Gujrati" }], cities: [{ label: "Pune" }] },
    { ...SECRET, _id: "m1", fname: "Gautam", lname: "Iyer", salutation: { label: "Mr." }, isOwner: true, certification_no: "A518" },
  ],
  agents: [{ ...SECRET, _id: "a1", fname: "Ravi", lname: "Shah", salutation: { label: "" } }],
} as BackendFirm;

const blank: RealtorSearchCriteria = { city: "Mumbai", by: "name", q: "", specializations: [], locality: "", language: "", gender: "" };

describe("mapping", () => {
  it("copies public fields only, so private ones can't reach the browser", () => {
    const text = JSON.stringify([toFirm(firm), realtorsOf(firm)]);
    for (const secret of ["PANSECRET1", "AADHAARSECRET", "BANKSECRET", "999999", "private@example.com"]) expect(text).not.toContain(secret);
  });

  it("maps a firm", () => {
    expect(toFirm(firm)).toMatchObject({
      id: "f1",
      name: "Asset Pro",
      entityType: "Proprietorship",
      initials: "AP",
      since: 1994,
      teamSize: 3,
      city: "Mumbai",
      reraId: "RERA1",
      specializations: ["Residential Sales"],
      address: { lines: ["1 Road", "Bandra"], city: "Mumbai", pincode: "400050" },
      logo: "https://cdn.rezide.in/images/firmlogo.jpeg",
    });
  });

  it("maps people: owner first, and what's missing falls back to the firm", () => {
    const [owner, manager, agent] = realtorsOf(firm);
    expect(owner).toMatchObject({ id: "m1", name: "Gautam Iyer", role: "Owner", gender: "Male", reraId: "A518", cities: ["Mumbai"], firmId: "f1", slug: "m1", photo: "https://cdn.rezide.in/images/firmlogo.jpeg" });
    expect(manager).toMatchObject({ role: "Manager", gender: "Female", languages: ["Gujarati"], cities: ["Pune"], photo: "https://cdn.rezide.in/images/asha.jpeg" });
    expect(agent).toMatchObject({ role: "Agent", gender: undefined, specializations: ["Residential Sales"], subRegions: ["Worli"], credentials: ["RERA"] });
  });
});

describe("matchesDirectory", () => {
  const [owner, manager] = realtorsOf(firm);

  it("filters by the cities a person works in", () => {
    expect(matchesDirectory(manager, { ...blank, city: "Pune" })).toBe(true);
    expect(matchesDirectory(manager, blank)).toBe(false);
  });

  it("lists someone with no stated city under every city", () => {
    expect(matchesDirectory({ ...owner, cities: [] }, { ...blank, city: "Delhi" })).toBe(true);
  });

  it("finds a locality in the areas a person serves", () => {
    expect(matchesDirectory(owner, { ...blank, locality: "Worli" })).toBe(true);
    expect(matchesDirectory(owner, { ...blank, locality: "Powai" })).toBe(false);
  });
});

describe("backend reads", () => {
  let backend: MockAdapter;
  const listing = (id: string, purpose: string) => ({ _id: id, commercial_details: { property_purpose: purpose } });

  beforeEach(() => {
    resetRealtorCaches();
    backend = new MockAdapter(api);
    backend.onPost("/brokers/filter/web").reply(200, { data: [firm], broker_count: 1 });
    backend.onPost("/inventory/Listing/mobile/filter/count").reply(200, { result_sale: 5, result_rent: 2 });
  });
  afterEach(() => backend.restore());

  it("asks for active firms, as rezide.in does", async () => {
    await searchRealtors(blank);
    const request = backend.history.post[0];
    expect(request.params).toEqual({ page: 1, pageSize: 100, status: "complete" });
    expect(JSON.parse(request.data)).toEqual({ status: "complete", active_status: "active", sortBy: [1] });
  });

  it("uses firm counts without per-person requests, and keeps the directory", async () => {
    const { items, total } = await searchRealtors(blank);
    expect(total).toBe(2);
    expect(items.map((r) => [r.id, r.saleListings, r.rentalListings])).toEqual([["m1", 7, 3], ["a1", 7, 3]]);
    expect(backend.history.post.some((r) => r.url?.includes("filter/count"))).toBe(false);
    await searchRealtors(blank);
    expect(backend.history.post.filter((r) => r.url === "/brokers/filter/web")).toHaveLength(1);
  });

  it("finds firms once each, with the firm's own counts", async () => {
    const { items } = await searchRealtors({ ...blank, by: "firm" });
    expect(items.map((r) => [r.firm, r.saleListings, r.rentalListings])).toEqual([["Asset Pro", 7, 3]]);
  });

  it("retains firm counts without depending on count endpoint", async () => {
    backend.onPost("/inventory/Listing/mobile/filter/count").reply(500);
    await expect(searchRealtors(blank)).resolves.toMatchObject({ items: [{ saleListings: 7 }, { saleListings: 7 }] });
  });

  it("loads a firm with its team and listings", async () => {
    backend.onPost("/inventory/Listing/mobile/all").reply((config) => [200, { data: [listing(JSON.parse(config.data).property_purpose[0], JSON.parse(config.data).property_purpose[0])] }]);
    const detail = await getFirmDetail("f1");
    expect(detail.firm.name).toBe("Asset Pro");
    expect(detail.team.map((t) => t.realtor.id)).toEqual(["m1", "m2", "a1"]);
    expect(detail.listings.map((l) => l.intent)).toEqual(["buy", "rent"]);
    expect(backend.history.post.find((r) => r.url === "/inventory/Listing/mobile/all")?.params).toEqual({ firm_id: "f1" });
  });

  it("loads an agent with colleagues, and answers 404 for strangers", async () => {
    backend.onPost("/inventory/Listing/mobile/all").reply(200, { data: [] });
    const detail = await getFirmAgentDetail("f1", "a1");
    expect(detail.realtor.name).toBe("Ravi Shah");
    expect(detail.others?.map((o) => o.realtor.id)).toEqual(["m1", "m2"]);
    await expect(getFirmAgentDetail("f1", "nobody")).rejects.toMatchObject({ status: 404 });
    await expect(getFirmDetail("nobody")).rejects.toMatchObject({ status: 404 });
  });

  it("finds a listing's realtor, and never fails the listing", async () => {
    await expect(findRealtor("a1")).resolves.toMatchObject({ name: "Ravi Shah" });
    await expect(findRealtor("nobody")).resolves.toBeNull();
    resetRealtorCaches();
    backend.onPost("/brokers/filter/web").reply(500);
    await expect(findRealtor("a1")).resolves.toBeNull();
  });
});

