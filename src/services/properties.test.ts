import { GET as getPropertyDirectory } from "@/app/api/properties/route";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPropertyCriteria } from "@/features/search/criteria";
import { api } from "@/lib/api/client";
import { PLACEHOLDER_IMAGE, toListingFilters, toProperty, toPropertyPage, type BackendListing } from "@/services/property-mapper";
import { keepOrder, localityOptions } from "@/features/search/filter-drawer";
import { clearListingIndex } from "@/services/listing-index";
import { getListingDetail, listingFacets, listingGroups, searchListings, searchListingsInArea } from "@/services/properties";
import { listingMedia, youtubeEmbed } from "@/lib/listing-media";

/* The Rezide backend's listing search, answered here by a test double. Shapes follow live responses. */

const listing = (over: Partial<BackendListing> = {}): BackendListing => ({
  _id: "67f0e8445817e6ef8d80f822",
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
  it("labels unit and floor plan keys when their source has no caption", () => {
    const raw = listing({ images: { plans: [] } });
    raw.listing_details!.unit_no = { config_id: "configuration", levelName: "Level 1" };
    raw.listing_details!.project!.configuration = [{ _id: "configuration", unit_plan: "unit-plan" }];
    raw.listing_details!.tower = { zones: [{ range: [{ label: "Level 1" }], floorPlan: { url: "floor-plan", label: "  " } }] };
    expect(toProperty(raw).planPhotos).toEqual([
      { url: "https://cdn.rezide.in/images/unit-plan.jpeg", label: "Unit Plan" },
      { url: "https://cdn.rezide.in/images/floor-plan.jpeg", label: "Floor Plan" },
    ]);
  });

  it("preserves complex and plan captions, including matching configuration and floor drawings", () => {
    const raw = listing();
    raw.images!.plans = [{ url: "unit-plan", label: "Apartment Layout" }, { url: "", label: "Invalid plan" }];
    raw.listing_details!.unit_no = { config_id: "configuration", levelName: "Level 1" };
    raw.listing_details!.tower = { zones: [{ range: [{ label: "level 1" }], floorPlan: { url: "floor-plan", label: "First Floor" } }] };
    raw.listing_details!.project!.configuration = [{ _id: "configuration", unit_plan: "unit-plan" }];
    raw.listing_details!.project!.media = { images: [{ url: "exterior", label: "Exterior" }], amenities: [{ url: "pool", label: "Swimming Pool" }] };
    const result = toProperty(raw);
    expect(result.complexPhotos).toEqual([
      { url: "https://cdn.rezide.in/images/exterior.jpeg", label: "Exterior" },
      { url: "https://cdn.rezide.in/images/pool.jpeg", label: "Swimming Pool" },
    ]);
    expect(result.planPhotos).toEqual([
      { url: "https://cdn.rezide.in/images/unit-plan.jpeg", label: "Apartment Layout" },
      { url: "https://cdn.rezide.in/images/floor-plan.jpeg", label: "First Floor" },
    ]);
    expect(result.complexImages).toEqual(result.complexPhotos!.map(photo => photo.url));
    expect(result.planImages).toEqual(result.planPhotos!.map(photo => photo.url));
  });

  it("keeps each gallery URL paired with its API label after filtering invalid photos", () => {
    const raw = listing({ images: { apartment: [
      { url: "kitchen", label: "Kitchen" },
      { url: "", label: "Missing photo" },
      { url: "bedroom", label: "Bedroom" },
      { url: "balcony", label: "   " },
    ] } });
    const result = toProperty(raw);
    expect(result.galleryPhotos).toEqual([
      { url: "https://cdn.rezide.in/images/kitchen.jpeg", label: "Kitchen" },
      { url: "https://cdn.rezide.in/images/bedroom.jpeg", label: "Bedroom" },
      { url: "https://cdn.rezide.in/images/balcony.jpeg", label: "   " },
    ]);
    expect(result.images).toEqual(result.galleryPhotos!.map(photo => photo.url));
  });

  it("preserves labels through the sample-flat and project-photo fallbacks without inventing captions", () => {
    const raw = listing({ images: { apartment: [] } });
    raw.listing_details!.project!.media = { sample_flats: [{ url: "sample", label: "Living Room" }], images: [{ url: "project" }] };
    expect(toProperty(raw).galleryPhotos).toEqual([{ url: "https://cdn.rezide.in/images/sample.jpeg", label: "Living Room" }]);
    raw.listing_details!.project!.media.sample_flats = [];
    expect(toProperty(raw).galleryPhotos).toEqual([{ url: "https://cdn.rezide.in/images/project.jpeg", label: "" }]);
    raw.listing_details!.project!.media.images = [];
    expect(toProperty(raw).galleryPhotos).toEqual([]);
  });

  it("uses the selected configuration as a fallback while retaining explicit zero values", () => {
    const raw = listing();
    Object.assign(raw.listing_details!, {
      unit_no: { config_id: "config-1", levelName: "Level 2" },
      area: undefined, unit_type: undefined, no_of_bathrooms: 0, no_of_parkings: undefined,
      tower: { zones: [{ range: [{ label: "level 2" }], floorPlan: "floor.jpeg" }] },
    });
    raw.listing_details!.project!.configuration = [{ _id: "config-1", config_type: "Duplex", carpet_area: 1400, no_of_bathrooms: 3, no_of_parkings: 0, no_of_balconies: 2, flooring: "Marble", unit_plan: "unit.jpeg", partitions: [{ name: "Living", length: "20", breadth: "12" }] }];
    expect(toProperty(raw)).toMatchObject({ unitType: "Duplex", areaSqft: 1400, bathrooms: 0, parking: 0, balconies: 2, flooring: "Marble", rooms: [{ name: "Living", length: 20, width: 12 }] });
    expect(toProperty(raw).planImages).toContain("https://cdn.rezide.in/images/floor.jpeg");
    expect(toProperty(raw).planImages).toContain("https://cdn.rezide.in/images/unit.jpeg");
  });

  it("handles invalid media arrays and withholds rental amounts and derived rates", () => {
    const raw = listing();
    raw.images = { apartment: null as unknown as [] };
    raw.key_features = {} as unknown as [];
    raw.commercial_details = { property_purpose: "rent", priceHide: "true", monthly_rent: 123456, security_amount: 654321, avg_rate_per_sqft: 789 };
    const result = toProperty(raw);
    expect(result).toMatchObject({ price: 0, priceHidden: true, securityDeposit: undefined, ratePerSqft: undefined, keyFeatures: [] });
    expect(JSON.stringify(result)).not.toContain("123456");
    expect(JSON.stringify(result)).not.toContain("654321");
  });

  it("uses sale_consideration without using internal discount prices", () => {
    const raw = listing();
    raw.commercial_details = { property_purpose: "sale", sale_consideration: "11000000" };
    expect(toProperty(raw).price).toBe(11000000);
  });

  it("resolves media keys, complete URLs and YouTube embeds safely", () => {
    expect(listingMedia("image.jpeg")).toBe("https://cdn.rezide.in/images/image.jpeg");
    expect(listingMedia("https://example.com/image.png")).toBe("https://example.com/image.png");
    expect(listingMedia("javascript:alert(1)")).toBeUndefined();
    expect(youtubeEmbed("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(youtubeEmbed("https://example.com/watch?v=dQw4w9WgXcQ")).toBeUndefined();
  });
  it("reads the unit and floor unless the owner hides them", () => {
    const shown = listing();
    Object.assign(shown.listing_details!, { unit_no: { unit: "1902", floor: 19 }, floor_no: "19", total_floor: "40", building_age: 16 });
    expect(toProperty(shown)).toMatchObject({ unitNo: "1902", floor: 19, totalFloors: 40, ageYears: 16 });
    const hidden = listing();
    Object.assign(hidden.listing_details!, { unit_no: { unit: "1902" }, floor_no: "19", unitHide: true, floorHide: "true", building_age: -1 });
    expect(toProperty(hidden)).toMatchObject({ unitNo: undefined, floor: undefined, ageYears: undefined });
  });

  it("reads the unit's room sizes from its configuration, as rezide.in's Dimensions tab", () => {
    const l = listing();
    l.listing_details!.unit_no = { unit: "601", config_id: "c2" };
    l.listing_details!.project!.configuration = [
      { _id: "c1", layout: "Habitable", partitions: [{ name: "Other", length: "1", breadth: "1", TotalArea: 1 }] },
      {
        _id: "c2",
        layout: "Habitable",
        partitions: [
          { name: "Entrance Lobby", length: "18.58", breadth: "6.58", TotalArea: 122.34 },
          { name: "Kitchen", length: "16.75", breadth: "8.25", total_area: 138.19 },
          { name: " ", length: "1", breadth: "1" },
        ],
      },
    ];
    expect(toProperty(l).rooms).toEqual([
      { name: "Entrance Lobby", length: 18.58, width: 6.58, area: 122.34 },
      { name: "Kitchen", length: 16.75, width: 8.25, area: 138.19 },
    ]);
    // Only a "Habitable" layout lists rooms, and a unit with no configuration has none.
    l.listing_details!.project!.configuration![1].layout = "Commercial";
    expect(toProperty(l).rooms).toBeUndefined();
    expect(toProperty(listing()).rooms).toBeUndefined();
  });

  it("places a listing at its project when it has no coordinates of its own", () => {
    const l = listing({ listing_address: { city: "Mumbai" } });
    l.listing_details!.project!.locality_and_address = { coordinates: { latitude: "19.2", longitude: 72.8 } };
    expect(toProperty(l).coords).toEqual([19.2, 72.8]);
    l.listing_details!.project!.locality_and_address = undefined;
    expect(toProperty(l).coords).toEqual([0, 0]);
    expect(toProperty(listing()).coords).toEqual([19.12, 72.91]);
  });

  it("maps a sale listing to the card's fields", () => {
    const p = toProperty(listing());
    expect(p).toMatchObject({
      id: "67f0e8445817e6ef8d80f822",
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

  it("reads a listing whose project is null (the backend sends some)", () => {
    const raw = listing({ images: { apartment: [] } });
    (raw.listing_details as Record<string, unknown>).project = null;
    const p = toProperty(raw);
    expect(p.images).toEqual([PLACEHOLDER_IMAGE]);
    expect(p.projectName).toBeUndefined();
  });

  it("shows the master's Bangalore as Bengaluru", () => {
    const raw = listing();
    raw.listing_address!.city = "Bangalore";
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

  it("asks for other categories by listing type, and leaves homes as they were", async () => {
    backend.onPost("/inventory/Listing/mobile/all").reply(200, { data: [], result_sale: 0, result_rent: 0 });
    await searchListings(defaultPropertyCriteria({ category: "offices" }));
    await searchListings(defaultPropertyCriteria());
    const [offices, homes] = backend.history.post.map((r) => JSON.parse(r.data));
    expect(offices.listing_type).toEqual(["office"]);
    expect(homes.listing_type).toBeUndefined();
  });

  it("reads a commercial record that has no listing_address", () => {
    const office = toProperty({
      _id: "o1",
      listing_type: "office",
      listing_details: { listing_location: "Santacruz West, Daulat Nagar STC", property_sub_type: "Ready to Move", address_details: { city: [{ label: "Mumbai" }], region: [{ label: "Western Suburbs" }], sub_region: [{ label: "Santacruz West" }], locality: [{ label: "Daulat Nagar STC" }] } },
      commercial_details: { property_purpose: "sale", property_price: 5 },
    });
    expect(office).toMatchObject({ category: "offices", city: "Mumbai", locality: "Santacruz West", unitType: "Office", price: 5 });
    expect(toProperty({ listing_type: "retail", listing_details: { unit_type: "Shop" } })).toMatchObject({ category: "retail", unitType: "Shop" });
  });

  it("filters offices by Independent Office or Independent Building", () => {
    const body = toListingFilters(defaultPropertyCriteria({ category: "offices", unitTypes: ["Independent Office", "Independent Building"] }));
    expect(body).toMatchObject({ listing_type: ["office"], project_type: ["Independent Office", "Independent Building"] });
    expect(toProperty({ listing_type: "office", listing_details: { unit_type: "Independent Building" } })).toMatchObject({ category: "offices", unitType: "Independent Building" });
  });

  it("loads one listing with similar listings from its project, never itself", async () => {
    const head = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    backend.onGet("/inventory/Listing/67f0e8445817e6ef8d80f822").reply(200, listing());
    backend.onPost("/inventory/Listing/mobile/all").reply((config) => {
      expect(JSON.parse(config.data)).toMatchObject({ bhk: "x", property_purpose: "sale", pageSize: 10 });
      return [200, { data: [listing(), listing({ _id: "l2" }), listing({ _id: "l3" })], result_sale: 3 }];
    });
    const d = await getListingDetail("67f0e8445817e6ef8d80f822");
    expect(d.property).toMatchObject({ id: "67f0e8445817e6ef8d80f822", title: "C - 601, Lodha Bellagio", price: 80000000 });
    expect(d.similar.map((s) => s.id)).toEqual(["l2", "l3"]);
    expect(d).toMatchObject({ realtor: null, project: null });
    // The brochure exists on the CDN, where rezide.in links it.
    expect(d.property.brochureUrl).toBe("https://cdn.rezide.in/images/67f0e8445817e6ef8d80f822_brochure.pdf");
    expect(head).toHaveBeenCalledWith("https://cdn.rezide.in/images/67f0e8445817e6ef8d80f822_brochure.pdf", expect.objectContaining({ method: "HEAD" }));
  });

  it("still shows the listing when similar listings fail, and without a brochure when there's none", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    backend.onGet("/inventory/Listing/67f0e8445817e6ef8d80f822").reply(200, listing());
    backend.onPost("/inventory/Listing/mobile/all").reply(500, { message: "down" });
    const d = await getListingDetail("67f0e8445817e6ef8d80f822");
    expect(d).toMatchObject({ property: { id: "67f0e8445817e6ef8d80f822" }, similar: [] });
    expect(d.property.brochureUrl).toBeUndefined();
  });

  it("loads combined units only when present and includes their plans and dimensions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    const raw = listing();
    raw.listing_details!.unit_no = { config_id: "one", combineWith: ["602"], project_id: "p1", tower_name: "C" };
    raw.listing_details!.project!.configuration = [
      { _id: "one", config_name: "T1-2BHK Premier", unit_plan: "one", partitions: [{ name: "Living", length: 10, breadth: 12 }] },
      { _id: "two", config_name: "T1-3BHK Premier", unit_plan: "two", partitions: [{ name: "Bedroom", length: 11, breadth: 12 }] },
    ];
    backend.onGet("/inventory/Listing/67f0e8445817e6ef8d80f822").reply(200, raw);
    backend.onPost("/Inventory/unit/specific").reply(config => {
      expect(JSON.parse(config.data)).toEqual({ project_id: "p1", tower_name: "C", unit_number: "602" });
      return [200, { data: { config_id: "two" } }];
    });
    const result = await getListingDetail("67f0e8445817e6ef8d80f822");
    expect(result.property.rooms).toContainEqual({ name: "Unit 602 · Bedroom", length: 11, width: 12 });
    expect(result.property.planImages).toContain("https://cdn.rezide.in/images/two.jpeg");
    expect(result.configurations).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "one", name: "T1-2BHK Premier" }),
      expect.objectContaining({ id: "two", name: "T1-3BHK Premier" }),
    ]));
    expect(backend.history.post.filter(request => request.url === "/Inventory/unit/specific")).toHaveLength(1);
  });

  it("keeps the current configuration when a combined-unit lookup fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    const raw = listing();
    raw.listing_details!.unit_no = { config_id: "one", combineWith: ["602"], project_id: "p1", tower_name: "C" };
    raw.listing_details!.project!.configuration = [{ _id: "one", config_name: "T1-2BHK Premier" }];
    backend.onGet("/inventory/Listing/67f0e8445817e6ef8d80f822").reply(200, raw);
    backend.onPost("/Inventory/unit/specific").reply(503);

    const result = await getListingDetail("67f0e8445817e6ef8d80f822");
    expect(result.configurations).toEqual([
      expect.objectContaining({ id: "one", name: "T1-2BHK Premier" }),
    ]);
  });

  it("includes the current configuration when combineWith is empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    const raw = listing();
    raw.listing_details!.unit_no = { config_id: "one", combineWith: [] };
    raw.listing_details!.project!.configuration = [{ _id: "one", config_name: "T1-2BHK Premier" }];
    backend.onGet("/inventory/Listing/67f0e8445817e6ef8d80f822").reply(200, raw);

    const result = await getListingDetail("67f0e8445817e6ef8d80f822");
    expect(result.configurations).toEqual([
      expect.objectContaining({ id: "one", name: "T1-2BHK Premier" }),
    ]);
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
    l.listing_address!.subregion = "Parel";
    l.listing_details!.priceHide = true;
    return l;
  })();

  beforeEach(() => {
    clearListingIndex();
    backend = new MockAdapter(api);
    backend.onPost("/inventory/Listing/mobile/all").reply(200, { data: [powai3, powai2, parelHidden], result_sale: 3, result_rent: 0 });
  });
  afterEach(() => backend.restore());

  it("sorts by area here, since the backend sorts area as text", async () => {
    const small = listing({ _id: "small" });
    small.listing_details!.area = "998.0";
    const large = listing({ _id: "large" });
    large.listing_details!.area = "5432";
    backend.onPost("/inventory/Listing/mobile/all").reply(200, { data: [small, large], result_sale: 2, result_rent: 0 });
    const down = await searchListings(defaultPropertyCriteria({ sort: "area-desc" }));
    expect(down.items.map((p) => p.id)).toEqual(["large", "small"]);
    const up = await searchListings(defaultPropertyCriteria({ sort: "area-asc" }));
    expect(up.items.map((p) => p.id)).toEqual(["small", "large"]);
    expect(up.total).toBe(2);
  });

  it("asks the backend to sort by rate per sq ft", () => {
    expect(toListingFilters(defaultPropertyCriteria({ sort: "rate-asc" })).sortBy).toBe("Avg. Rate psf. (Low to High)");
    expect(toListingFilters(defaultPropertyCriteria({ sort: "rate-desc" })).sortBy).toBe("Avg. Rate psf. (High to Low)");
  });

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

  it("counts other categories from their own listings", async () => {
    backend.reset();
    backend.onPost("/inventory/Listing/mobile/all").reply((config) => {
      expect(JSON.parse(config.data).listing_type).toEqual(["retail"]);
      return [200, { data: [listing({ listing_type: "retail" })], result_sale: 1, result_rent: 0 }];
    });
    await expect(listingFacets(defaultPropertyCriteria({ category: "retail" }))).resolves.toMatchObject({ total: 1 });
  });
});

describe("the map view's list", () => {
  let backend: MockAdapter;
  const inView = listing({ _id: "in", listing_address: { city: "Mumbai", subregion: "Powai", latitude: 19.12, longitude: 72.91 } });
  const elsewhere = listing({ _id: "out", listing_address: { city: "Mumbai", subregion: "Parel", latitude: 18.99, longitude: 72.83 } });
  const nowhere = listing({ _id: "none", listing_address: { city: "Mumbai", subregion: "Powai" } });
  nowhere.listing_details!.project = undefined;
  const twoBhk = (() => {
    const l = listing({ _id: "two", listing_address: { city: "Mumbai", subregion: "Powai", latitude: 19.13, longitude: 72.9 } });
    l.listing_details!.bhk = { name: "2 BHK" };
    return l;
  })();
  const powai: [number, number, number, number] = [72.85, 19.05, 72.95, 19.2];

  beforeEach(() => {
    clearListingIndex();
    backend = new MockAdapter(api);
    backend.onPost("/inventory/Listing/mobile/all").reply(200, { data: [inView, elsewhere, nowhere, twoBhk], result_sale: 4, result_rent: 0 });
  });
  afterEach(() => backend.restore());

  it("keeps only the listings in that part of the map", async () => {
    const page = await searchListingsInArea(defaultPropertyCriteria(), powai);
    expect(page.items.map((p) => p.id).sort()).toEqual(["in", "two"]);
    expect(page.total).toBe(2);
  });

  it("joins focused spatial member codes to full listing cards without dropping other cluster members", async () => {
    const member = { ...twoBhk, listing_id: "PUBLIC-MEMBER" };
    backend.onPost("/inventory/Listing/mobile/all").reply(200, { data: [inView, member], result_sale: 2 });
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, data: { count: 1, items: [{ type: "listing", listingId: "PUBLIC-MEMBER", title: "Spatial summary", lat: 19.13, lng: 72.9 }] } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    try {
      const result = await searchListingsInArea(defaultPropertyCriteria({ bhk: ["2 BHK"] }), powai, "focused-regression-cluster");
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe("two");
      expect(result.items[0].title).toBe(toProperty(member).title);
      expect(result.items[0].images).toEqual(toProperty(member).images);
      expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get("focus")).toBe("focused-regression-cluster");
      await expect(searchListingsInArea(defaultPropertyCriteria({ bhk: ["4 BHK"] }), powai, "focused-regression-cluster")).resolves.toMatchObject({ total: 1, items: [{ id: "two" }] });
    } finally { fetch.mockRestore(); }
  });

  it("retains all three members when a cluster mixes intents/types and full records are missing", async () => {
    backend.onPost("/inventory/Listing/mobile/all").reply(200, { data: [{ ...inView, listing_id: "FULL" }], result_sale: 1 });
    const items = [{ type: "listing", listingId: "FULL", title: "First", listingType: "home", lat: 19.12, lng: 72.91 }, { type: "listing", listingId: "SPARSE", title: "Second", listingType: "retail", price: 250000, lat: 19.12, lng: 72.91 }, { type: "project", projectId: "org", count: 1, lat: 19.12, lng: 72.91, listings: [{ listingId: "RENT", title: "Third", listingType: "home", price: 375000 }] }];
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, data: { count: 3, items } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    try {
      const result = await searchListingsInArea(defaultPropertyCriteria(), powai, "mixed-three-members-regression");
      expect(result.total).toBe(3);
      expect(result.items.find(p => p.listingCode === "FULL")).toMatchObject({ id: "in", images: toProperty(inView).images });
      expect(result.items.find(p => p.listingCode === "SPARSE")).toMatchObject({ mapSummary: true, title: "Second", images: [] });
      expect(result.items.find(p => p.listingCode === "RENT")).toMatchObject({ mapSummary: true, title: "Third" });
    } finally { fetch.mockRestore(); }
  });

  it("accepts nested cluster focus IDs and returns the child cluster members through the directory API", async () => {
    const focus = "parent-cluster>child-cluster>nested-child";
    const items = [{ type: "listing", listingId: "CHILD-A", title: "Child A", listingType: "home", lat: 19.12, lng: 72.91 }, { type: "listing", listingId: "CHILD-B", title: "Child B", listingType: "home", lat: 19.12, lng: 72.91 }];
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, data: { count: 2, items } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    try {
      const params = new URLSearchParams({ city: "Mumbai", intent: "buy", type: "homes", per: "10", bbox: powai.join(","), focus });
      const response = await getPropertyDirectory(new Request("http://localhost/api/properties?" + params));
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.total).toBe(2);
      expect(result.items.map((p: { listingCode: string }) => p.listingCode).sort()).toEqual(["CHILD-A", "CHILD-B"]);
      const paramsSent = new URL(String(fetch.mock.calls[0][0])).searchParams;
      expect(paramsSent.get("focus")).toBe(focus);
      expect(paramsSent.get("type")).toBe("home");
      expect(paramsSent.get("intend")).toBe("buy");
      const invalid = await getPropertyDirectory(new Request("http://localhost/api/properties?focus=parent%3E%3Echild"));
      expect(invalid.status).toBe(400);
    } finally { fetch.mockRestore(); }
  });

  it("shows only visible pins at the current zoom and excludes unopened cluster members", async () => {
    const items = [{ type: "listing", listingId: "VISIBLE", title: "Visible pin", listingType: "home", lat: 19.12, lng: 72.91 }, { type: "project", projectId: "org", count: 1, lat: 19.12, lng: 72.91, listings: [{ listingId: "ORG-MEMBER", title: "Organisation listing", listingType: "home" }] }, { type: "cluster", clusterId: "unopened", count: 3, lat: 19.12, lng: 72.91, listings: [{ listingId: "HIDDEN", title: "Still clustered", listingType: "home" }] }];
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, data: { count: 5, items } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    try {
      const result = await searchListingsInArea(defaultPropertyCriteria(), powai, undefined, 12);
      expect(result.total).toBe(2);
      expect(result.items.map(p => p.listingCode).sort()).toEqual(["ORG-MEMBER", "VISIBLE"]);
      expect(result.items.some(p => p.title === "Still clustered")).toBe(false);
      const request = new URL(String(fetch.mock.calls[0][0]));
      expect(request.searchParams.get("zoom")).toBe("12");
      expect(request.searchParams.has("focus")).toBe(false);
    } finally { fetch.mockRestore(); }
  });

  it("still applies the search filters, and answers an empty area", async () => {
    await expect(searchListingsInArea(defaultPropertyCriteria({ bhk: ["2 BHK"] }), powai)).resolves.toMatchObject({ total: 1, items: [{ id: "two" }] });
    await expect(searchListingsInArea(defaultPropertyCriteria(), [80, 10, 81, 11])).resolves.toMatchObject({ total: 0, items: [], pageCount: 1 });
  });

  it("finds a chosen locality as the list view does: by sub-region or by the finer locality", async () => {
    const inParel = (id: string, locality?: string) => {
      const l = listing({ _id: id, listing_address: { city: "Mumbai", subregion: "Parel", locality, latitude: 19.006, longitude: 72.828 } });
      l.listing_details!.subregion = "Parel";
      return l;
    };
    backend.onPost("/inventory/Listing/mobile/all").reply(200, { data: [inParel("lp", "Lower Parel"), inParel("p"), inView], result_sale: 3, result_rent: 0 });
    const parelArea: [number, number, number, number] = [72.8, 18.95, 72.86, 19.02];
    // "Lower Parel" is the first listing's locality; both have the sub-region "Parel".
    await expect(searchListingsInArea(defaultPropertyCriteria({ localities: ["Lower Parel"] }), parelArea)).resolves.toMatchObject({ total: 1, items: [{ id: "lp" }] });
    const parel = await searchListingsInArea(defaultPropertyCriteria({ localities: ["parel"] }), parelArea);
    expect(parel.items.map((p) => p.id).sort()).toEqual(["lp", "p"]);
  });
});

describe("drawer locality options", () => {
  it("lists localities with listings, busiest first, keeping chosen ones in place", () => {
    const c = defaultPropertyCriteria({ localities: ["Juhu", "Parel"] });
    // Parel stays where its count puts it; Juhu, outside the list, goes at the end.
    expect(localityOptions(c, { localities: { Parel: 1, Powai: 5, Worli: 1 } } as never)).toEqual(["Powai", "Parel", "Worli", "Juhu"]);
    expect(localityOptions(c, undefined)).toEqual(["Juhu", "Parel"]);
  });

  it("keeps chips where they were shown when counts re-rank them", () => {
    expect(keepOrder(["Parel", "Dadar West", "Worli"], ["Worli", "Parel", "Juhu"])).toEqual(["Parel", "Dadar West", "Worli", "Juhu"]);
    expect(keepOrder([], ["Worli", "Parel"])).toEqual(["Worli", "Parel"]);
  });
});

it("rejects malformed listing IDs before making backend calls", async () => {
  const get=vi.spyOn(api,"get");
  await expect(getListingDetail("../invalid")).rejects.toMatchObject({status:404});
  expect(get).not.toHaveBeenCalled();
});

it("maps locality coordinates from the populated project separately from the listing address", () => {
 const property = toProperty(listing({listing_details: {project: {_id:"67f0e8445817e6ef8d80f822", locality_and_address:{address:{locality:"Lalbaug"}, coordinates:{latitude:"19.2",longitude:"72.8"}}}}}));
 expect(property.projectLocality).toEqual({name:"Lalbaug",coords:[19.2,72.8]});
 expect(property.coords).toEqual([19.12,72.91]);
 expect(toProperty(listing()).projectLocality).toBeUndefined();
});

it("handles a missing unit record without failing the listing or its room dimensions", () => {
 const property = toProperty(listing({listing_details:{unit_no:null}}));
 expect(property.id).toBe("67f0e8445817e6ef8d80f822");
 expect(property.rooms).toBeUndefined();
});
