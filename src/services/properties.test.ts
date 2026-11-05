import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPropertyCriteria } from "@/features/search/criteria";
import { api } from "@/lib/api/client";
import { PLACEHOLDER_IMAGE, toListingFilters, toProperty, toPropertyPage, type BackendListing } from "@/services/property-mapper";
import { localityOptions } from "@/features/search/filter-drawer";
import { clearListingIndex } from "@/services/listing-index";
import { getListingDetail, listingFacets, listingGroups, searchListings } from "@/services/properties";

/* The Rezide backend's listing search, answered here by a test double. Shapes follow live responses. */

const listing = (over: Partial<BackendListing> = {}): BackendListing => ({
  _id: "l1",
  listing_type: "home",
  createdAt: "2026-11-04T10:36:54.436Z",
  lastUpdate: "2026-11-04T16:08:19.031Z",
  firm_name: "Buildstone Realty",
  broker_and_agent: { broker_id: "b1", firm_id: "f1" },
  video: "vid1",
  key_features: ["Secure Gated Entry"],
  apartmentAmenities: ["Intercom"],
  images: { apartment: [{ url: "img1" }, { url: "img2" }], plans: [{ url: "plan1" }] },
  listing_address: { city: "Mumbai", subregion: "Powai", latitude: 19.12, longitude: 72.91 },
  listing_details: {
    listing_name: "C - 601,  Lodha Bellagio",
    listing_status: "approved",
    listing_city: "Mumbai",
    region: "Eastern Suburbs",
    subregion: "Powai",
    unit_type: "Apartment",
    project_type: "Gated Amenities",
    area: 1300,
    area_type: "total_usable_area",
    bhk: { _id: "x", name: "3 BHK" },
    no_of_bathrooms: "3",
    no_of_parkings: "2",
    exit_direction: "E",
    entry_direction: "W",
    priceHide: false,
    project: { _id: "p1", general_information: { project_name: "Lodha Bellagio" }, media: { images: [{ url: "proj1" }] } },
  },
  commercial_details: {
    property_purpose: "sale",
    property_price: 80000000,
    monthly_rent: 35000000,
    furnishing: { name: "Semi Furnished" },
    available_from: "2026-11-04 16:06:10.757625",
    visit_day: "Everyday",
    start_time: "2026-11-04 10:00:00.000",
    end_time: "2026-11-04 20:00:00.000",
    current_occupation_status: "Vacant with keys",
  },
  ...over,
});

describe("toProperty", () => {
  it("maps a sale listing to the card's fields", () => {
    const p = toProperty(listing());
    expect(p).toMatchObject({
      id: "l1",
      title: "C - 601, Lodha Bellagio",
      category: "homes",
      intent: "buy",
      unitType: "Apartment",
      city: "Mumbai",
      locality: "Powai",
      projectId: "p1",
      projectName: "Lodha Bellagio",
      // The sale price, not the stray monthly_rent some sale listings carry.
      price: 80000000,
      areaSqft: 1300,
      areaBasis: "Carpet",
      bhk: 3,
      bathrooms: 3,
      parking: 2,
      furnishing: "Semi Furnished",
      facing: "East",
      media: ["Photo", "Video"],
      images: ["https://cdn.rezide.in/images/img1.jpeg", "https://cdn.rezide.in/images/img2.jpeg"],
      coords: [19.12, 72.91],
      realtorId: "b1",
      realtorFirm: "Buildstone Realty",
      verification: "verified",
      availableFrom: "2026-11-04T16:06:10Z",
      visit: { days: "Everyday", timings: "10:00 AM – 8:00 PM", showingStatus: "Vacant with keys" },
      vastuEntry: "West",
      planImages: ["https://cdn.rezide.in/images/plan1.jpeg"],
      videoUrl: "https://cdn.rezide.in/images/vid1.mp4",
    });
    expect(p.specs.map((s) => s.value)).toEqual(["3 BHK", "3 Baths", "2 Park", "Semi"]);
    expect(p.priceHidden).toBeUndefined();
  });

  it("never passes on a withheld price", () => {
    const raw = listing();
    raw.listing_details!.priceHide = true;
    raw.commercial_details!.security_amount = 500000;
    const p = toProperty(raw);
    expect(p).toMatchObject({ price: 0, priceHidden: true, securityDeposit: undefined });
    expect(JSON.stringify(p)).not.toContain("80000000");
  });

  it("uses the monthly rent and deposit for rentals", () => {
    const raw = listing();
    raw.commercial_details = { property_purpose: "rent", monthly_rent: 150000, security_amount: 450000 };
    expect(toProperty(raw)).toMatchObject({ intent: "rent", price: 150000, securityDeposit: 450000 });
  });

  it("falls back to project sample flats, project photos, then a placeholder", () => {
    const raw = listing({ images: { apartment: [] } });
    expect(toProperty(raw).images).toEqual(["https://cdn.rezide.in/images/proj1.jpeg"]);
    raw.listing_details!.project!.media = { sample_flats: [{ url: "flat1" }], images: [{ url: "proj1" }] };
    expect(toProperty(raw).images).toEqual(["https://cdn.rezide.in/images/flat1.jpeg"]);
    raw.listing_details!.project!.media = {};
    expect(toProperty(raw).images).toEqual([PLACEHOLDER_IMAGE]);
  });

  it("shows the master's Bangalore as Bengaluru", () => {
    const raw = listing();
    raw.listing_details!.listing_city = "Bangalore";
    expect(toProperty(raw).city).toBe("Bengaluru");
  });
});

describe("toListingFilters", () => {
  it("writes the body rezide.in sends, with master ids and the backend's city name", () => {
    const body = toListingFilters(
      defaultPropertyCriteria({
        city: "Bengaluru",
        intent: "rent",
        q: " lodha ",
        unitTypes: ["Penthouse", "Villa"],
        localities: ["Powai"],
        bhk: ["3 BHK", "5+ BHK"],
        furnishing: ["Semi Furnished"],
        bathrooms: ["2", "5+"],
        parking: ["4+"],
        facing: ["North East"],
        budgetMin: 5000000,
        areaMax: 1500,
        sort: "price-desc",
        page: 2,
        perPage: 18,
      }),
    );
    expect(body).toEqual({
      city: ["Bangalore"],
      page: 2,
      pageSize: 18,
      property_purpose: ["rent"],
      project_names_localities: ["lodha", "Powai"],
      project_id: undefined,
      project_type: ["Pent House", "Villa"],
      bhk: ["64de06554f5f0ae6e6023292", "64de06664f5f0ae6e60232a2", "656730d08eb9d2295cb750ed"],
      furnishing: ["650eb6b2a1a78c56b3fac96e"],
      no_of_bathrooms: ["2", "5", ">"],
      no_of_parkings: ["4", ">"],
      exit_direction: ["NE"],
      minBudget: ["5000000"],
      maxBudget: undefined,
      minArea: undefined,
      maxArea: ["1500"],
      sortBy: "Price (High to Low)",
    });
  });

  it("leaves unused filters out", () => {
    const body = toListingFilters(defaultPropertyCriteria());
    expect(body).toMatchObject({ city: ["Mumbai"], property_purpose: ["sale"], page: 1, pageSize: 9, sortBy: "Latest" });
    expect(body.bhk).toBeUndefined();
    expect(body.project_names_localities).toBeUndefined();
  });
});

describe("listing search", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  it("returns the page with the total for the searched purpose", async () => {
    backend.onPost("/inventory/Listing/mobile/all").reply((config) => {
      expect(JSON.parse(config.data)).toMatchObject({ property_purpose: ["rent"], page: 3, pageSize: 9 });
      return [200, { data: [listing()], result_sale: 728, result_rent: 346 }];
    });
    const page = await searchListings(defaultPropertyCriteria({ intent: "rent", page: 3 }));
    expect(page).toMatchObject({ total: 346, page: 3, perPage: 9, pageCount: 39 });
    expect(page.items).toHaveLength(1);
  });

  it("has no listings outside homes, without asking the backend", async () => {
    await expect(searchListings(defaultPropertyCriteria({ category: "offices" }))).resolves.toMatchObject({ items: [], total: 0 });
    expect(backend.history.post).toHaveLength(0);
  });

  it("loads one listing with similar listings from its locality, never itself", async () => {
    const head = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    backend.onGet("/inventory/Listing/l1").reply(200, listing());
    backend.onPost("/inventory/Listing/mobile/all").reply((config) => {
      expect(JSON.parse(config.data)).toMatchObject({ city: ["Mumbai"], property_purpose: ["sale"], project_names_localities: ["Powai"] });
      return [200, { data: [listing(), listing({ _id: "l2" }), listing({ _id: "l3" })], result_sale: 3 }];
    });
    const d = await getListingDetail("l1");
    expect(d.property).toMatchObject({ id: "l1", title: "C - 601, Lodha Bellagio", price: 80000000 });
    expect(d.similar.map((s) => s.id)).toEqual(["l2", "l3"]);
    expect(d).toMatchObject({ realtor: null, project: null });
    // The brochure exists on the CDN, where rezide.in links it.
    expect(d.property.brochureUrl).toBe("https://cdn.rezide.in/images/l1_brochure.pdf");
    expect(head).toHaveBeenCalledWith("https://cdn.rezide.in/images/l1_brochure.pdf", expect.objectContaining({ method: "HEAD" }));
  });

  it("still shows the listing when similar listings fail, and without a brochure when there's none", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    backend.onGet("/inventory/Listing/l1").reply(200, listing());
    backend.onPost("/inventory/Listing/mobile/all").reply(500, { message: "down" });
    const d = await getListingDetail("l1");
    expect(d).toMatchObject({ property: { id: "l1" }, similar: [] });
    expect(d.property.brochureUrl).toBeUndefined();
  });

  it("passes on the backend's 404 for an unknown listing", async () => {
    backend.onGet("/inventory/Listing/nope").reply(404, { message: "Error: Listing not found!", stack: null });
    await expect(getListingDetail("nope")).rejects.toMatchObject({ status: 404 });
  });

  it("maps an empty page", () => {
    expect(toPropertyPage({}, { intent: "buy", page: 1, perPage: 9 })).toEqual({ items: [], total: 0, page: 1, perPage: 9, pageCount: 1 });
  });
});

describe("filter counts and groups (from the city's listings)", () => {
  let backend: MockAdapter;
  const powai3 = listing({ _id: "a" });
  const powai2 = (() => {
    const l = listing({ _id: "b" });
    l.listing_details!.bhk = { name: "2 BHK" };
    l.commercial_details!.property_price = 30000000;
    return l;
  })();
  const parelHidden = (() => {
    const l = listing({ _id: "c" });
    l.listing_details!.subregion = "Parel";
    l.listing_details!.priceHide = true;
    return l;
  })();

  beforeEach(() => {
    clearListingIndex();
    backend = new MockAdapter(api);
    backend.onPost("/inventory/Listing/mobile/all").reply(200, { data: [powai3, powai2, parelHidden], result_sale: 3, result_rent: 0 });
  });
  afterEach(() => backend.restore());

  it("counts each option with every other group's choices kept", async () => {
    const f = await listingFacets(defaultPropertyCriteria({ bhk: ["3 BHK"] }));
    expect(f.total).toBe(2);
    expect(f.facets.bhk).toMatchObject({ "3 BHK": 2, "2 BHK": 1 });
    expect(f.facets.localities).toEqual({ Powai: 1, Parel: 1 });
  });

  it("summarises listings per locality, leaving withheld prices out of the range", async () => {
    const { groups } = await listingGroups(defaultPropertyCriteria(), "locality");
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "Powai", count: 2, minPrice: 30000000, maxPrice: 80000000 }),
        expect.objectContaining({ key: "Parel", count: 1, minPrice: null, maxPrice: null }),
      ]),
    );
  });

  it("downloads a city once and reuses it", async () => {
    await listingFacets(defaultPropertyCriteria());
    await listingGroups(defaultPropertyCriteria(), "project");
    expect(backend.history.post).toHaveLength(1);
  });

  it("fetches the remaining pages in parallel", async () => {
    clearListingIndex();
    backend.reset();
    backend.onPost("/inventory/Listing/mobile/all").reply((config) => {
      const { page } = JSON.parse(config.data);
      return [200, { data: [listing({ _id: `p${page}` })], result_sale: 600 }];
    });
    const f = await listingFacets(defaultPropertyCriteria());
    expect(backend.history.post.map((r) => JSON.parse(r.data).page).sort()).toEqual([1, 2, 3]);
    expect(f.total).toBe(3);
  });

  it("has nothing to count outside homes", async () => {
    await expect(listingFacets(defaultPropertyCriteria({ category: "retail" }))).resolves.toMatchObject({ total: 0 });
    expect(backend.history.post).toHaveLength(0);
  });
});

describe("drawer locality options", () => {
  it("lists localities with listings, busiest first, keeping chosen ones", () => {
    const c = defaultPropertyCriteria({ localities: ["Juhu"] });
    expect(localityOptions(c, { localities: { Parel: 1, Powai: 5, Worli: 1 } } as never)).toEqual(["Juhu", "Powai", "Parel", "Worli"]);
    expect(localityOptions(c, undefined)).toEqual(["Juhu"]);
  });
});
