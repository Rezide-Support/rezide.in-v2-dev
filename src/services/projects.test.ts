import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultProjectCriteria } from "@/features/search/criteria";
import { api } from "@/lib/api/client";
import { sendProjectEnquiry } from "@/services/mutations";
import type { ProjectSortKey } from "@/types/models";
import { projectMediaOf, toAreaRange, toBhkOptions, toProject, toListingProject, toProjectFilters, withProjectDetail } from "@/services/project-mapper";
import { findListingProject, findProjectsByNames, getProjectDetail, resetProjectCache, searchProjects } from "@/services/projects";
import { buildingFilters } from "@/features/search/building-criteria";
import { searchBuildingProjects } from "@/services/building-projects";

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
    media: { images: [{ url: "a", label: "Artist Impression - Project Elevation" }], sample_flats: [{ url: "b" }], amenities: [{ url: "c" }], videos: [{ url: "https://youtu.be/x" }] },
    configuration: [{ bhk: "2 BHK", unit_plan: "plan1" }, { bhk: "2 BHK", unit_plan: "plan1" }, { bhk: "3 BHK" }],
    price_range: [{ name: "2 BHK", minArea: "850", maxArea: "1,000" }],
    similar_projects: [{ value: "66f3ca67d7f5683ae57720fb" }],
  },
};

describe("mapping", () => {
  it("builds the buildings default and chooses only the most specific geographic names", () => {
    expect(buildingFilters(new URLSearchParams())).toEqual({ page: 1, pageSize: 9, project_names_localities_subRegions: [], listingExist: "exist", sortBy: "listingExist" });
    const query = new URLSearchParams("city=Mumbai&region=South+Mumbai&sub_region=Parel&locality=Lalbaug,Worli&searchQuery=Crescent,Bay&page=2&pageSize=18");
    expect(buildingFilters(query)).toEqual({ page: 2, pageSize: 18, city: ["Mumbai"], project_names_localities_subRegions: ["Crescent", "Bay", "Lalbaug", "Worli"], listingExist: "exist", sortBy: "listingExist" });
    query.delete("locality");
    expect(buildingFilters(query).project_names_localities_subRegions).toEqual(["Crescent", "Bay", "Parel"]);
    query.delete("sub_region");
    expect(buildingFilters(query).project_names_localities_subRegions).toEqual(["Crescent", "Bay", "South Mumbai"]);
  });
  it("preserves the listing project's entire photo gallery and its own logo", () => {
    const raw = { _id: "project-1", general_information: { project_name: "L&T Crescent Bay", logo: "project-logo" }, media: { images: [{ url: "exterior-1" }, { url: "exterior-2" }, { url: "exterior-3" }] } };
    const project = toListingProject(raw, "Mumbai");
    expect(project.images).toEqual(["exterior-1", "exterior-2", "exterior-3"].map(key => `https://cdn.rezide.in/images/${key}.jpeg`));
    expect(project.logo).toBe("https://api.rezide.in/v1/admin/file/upload/project-logo");
    expect(toListingProject({ ...raw, general_information: { ...raw.general_information, logo: "https://cdn.rezide.in/logo.png" } }, "Mumbai").logo).toBe("https://cdn.rezide.in/logo.png");
  });
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

  it("reads the card's video from the row, and the video and 360° tour from a detail record", () => {
    expect(toProject(row({ videoId: "https://youtu.be/fw8KovRUu74" }), "Mumbai").videoUrl).toBe("https://youtu.be/fw8KovRUu74");
    expect(toProject(row(), "Mumbai")).not.toHaveProperty("videoUrl");
    expect(
      projectMediaOf({ media: { videos: [{ url: "https://www.youtube.com/watch?v=uGFI3TfEpH4" }] }, general_information: { vr_tour_link: "http://storage.net-fs.com/hosting/6239072/96/" } }),
    ).toEqual({ videoUrl: "https://www.youtube.com/watch?v=uGFI3TfEpH4", vrTourUrl: "https://storage.net-fs.com/hosting/6239072/96/" });
    // A tour link that isn't a web page isn't framed.
    expect(projectMediaOf({ general_information: { vr_tour_link: "javascript:alert(1)" } })).toEqual({});
  });

  it("shows the developer's logo from its upload key, as rezide.in's card does", () => {
    expect(toProject(row({ logo: "25e75246cfd2828cf45f7f5d9b792a9f" }), "Mumbai").developerLogo).toBe(
      "https://api.rezide.in/v1/admin/file/upload/25e75246cfd2828cf45f7f5d9b792a9f",
    );
    expect(toProject(row({ logo: " " }), "Mumbai")).not.toHaveProperty("developerLogo");
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
      // rezide.in leaves the sample flats out of the photos; each photo keeps its label.
      images: ["https://cdn.rezide.in/images/a.jpeg"],
      imageCaptions: ["Artist Impression - Project Elevation"],
      amenityImages: ["https://cdn.rezide.in/images/c.jpeg"],
      amenities: ["Pool", "Gym", "Spa"],
      videoUrl: "https://youtu.be/x",
      configurationPlans: [{ bhk: "2 BHK", areaMin: 850, areaMax: 1000, unitPlans: ["https://cdn.rezide.in/images/plan1.jpeg"] }],
      brochureUrl: "https://cdn.rezide.in/images/doc2",
      developerProfile: { name: "Lodha Group", headquarters: "Bengaluru", description: "A developer." },
    });
    expect(JSON.stringify(project)).not.toMatch(/BANKSECRET|PANSECRET/);
  });

  it("puts site, location and township plans under Project Plans, not Photos (as rezide.in)", () => {
    const project = withProjectDetail(toProject(row(), ""), {
      project: {
        media: {
          images: [
            { url: "elev", label: "Artist Impression - Project Elevation" },
            { url: "site", label: "Site Plan" },
            { url: "loc", label: "Location Plan" },
            { url: "town", label: "Township Plan" },
          ],
        },
      },
    });
    expect(project.images).toEqual(["https://cdn.rezide.in/images/elev.jpeg"]);
    expect(project.planImages).toEqual(["site", "loc", "town"].map((k) => `https://cdn.rezide.in/images/${k}.jpeg`));
  });

  it("reads the Compare Project fields from the detail record", () => {
    const project = withProjectDetail(toProject(row(), ""), {
      project: {
        general_information: { project_type: { name: "Gated Amenities" }, completion_date: "2032-12-31T05:30:00.000Z" },
        locality_and_address: { address: { region: "South Mumbai", sub_region: "Extended Wadala", locality: "Sewri" } },
      },
    });
    expect(project).toMatchObject({ region: "South Mumbai", subRegion: "Extended Wadala", projectType: "Gated Amenities", completionDate: "2032-12-31T05:30:00.000Z" });
  });

  it("reads the Views tab from the detail record's apartment views", () => {
    const base = toProject(row(), "");
    expect(withProjectDetail(base, { project: { project_description: { apartment_views: [" city skyline ", "", "building / city"] } } }).views).toEqual(["city skyline", "building / city"]);
    expect(withProjectDetail(base, { project: { project_description: {} } }).views).toEqual(base.views);
  });

  it("reads rezide.in's plan ranges, RERA registrations and developer profile", () => {
    const rich = {
      project: {
        ...detail.project,
        general_information: {
          logo: "projlogo",
          reraIDs: [
            { rera_id: " P51800005229 ", rera_link: "https://maharerait.maharashtra.gov.in/public/project/view/7040", rera_image: "qr1" },
            { rera_id: "N/A" },
            { rera_id: "P2", rera_link: "javascript:alert(1)" },
          ],
          developer_id: {
            _id: "65116bbd32a52c26604a9511",
            general_information: { developer_name: "Oberoi Realty", description: "Founded 1998.", estd_year: "1998" },
            media: { images: [{ label: "Developer Logo", url: "devlogo" }] },
            contact_details: { address: [{ city: { label: "Mumbai" }, state: { label: "Maharashtra" } }, { city: { label: "Thane" } }, { city: { label: "Mumbai" } }] },
            account_details: { bank: "BANKSECRET" },
          },
        },
        price_range: [{ name: "3 BHK", minArea_search: "1367", maxArea_search: "1496", saleMin_search: 56100000, saleMax_search: 92000000, rentalMin_search: 200000, rentalMax_search: 0 }],
      },
    };
    const project = withProjectDetail(toProject(row(), ""), rich);
    expect(project.configurationPlans).toEqual([
      { bhk: "3 BHK", areaMin: 1367, areaMax: 1496, saleMin: 56100000, saleMax: 92000000, rentMin: 200000, rentMax: undefined, unitPlans: [] },
    ]);
    expect(project.reras).toEqual([
      { id: "P51800005229", link: "https://maharerait.maharashtra.gov.in/public/project/view/7040", qr: "https://api.rezide.in/v1/admin/file/upload/qr1" },
      // A link that isn't http(s) is dropped.
      { id: "P2", link: undefined, qr: undefined },
    ]);
    expect(project.developerProfile).toEqual({
      id: "65116bbd32a52c26604a9511",
      name: "Oberoi Realty",
      headquarters: "Mumbai, Maharashtra",
      description: "Founded 1998.",
      logo: "https://api.rezide.in/v1/admin/file/upload/devlogo",
      established: "1998",
      cities: ["Mumbai", "Thane"],
    });
    expect(JSON.stringify(project)).not.toMatch(/BANKSECRET/);
  });
});

describe("filters", () => {
  it("sends the Filters drawer as rezide.in's Project Filters do", () => {
    expect(
      toProjectFilters(defaultProjectCriteria({ projectTypes: ["650c6732a3021fab1835c045"], unitTypes: ["Villa"], bhk: ["5 BHK"], areaMin: 3000, areaMax: 10000, media: ["Video"] })),
    ).toMatchObject({ project_type: ["650c6732a3021fab1835c045"], building_type: ["Villa"], bhks: ["5 BHK"], area_min: ["3000"], area_max: ["10000"], project_with: ["Video"] });
    expect(toProjectFilters(defaultProjectCriteria())).not.toHaveProperty("bhks");
  });

  it("sends the backend's values", () => {
    expect(
      toProjectFilters(defaultProjectCriteria({ city: "Bengaluru", q: "Lodha", status: ["uc", "rtm", "nl"], views: ["Sea View"], budget: ["luxury"], perPage: 9 })),
    ).toEqual({
      page: 1,
      pageSize: 9,
      city: ["Bangalore"],
      project_names_localities_subRegions: ["Lodha"],
      subRegions: [],
      project_age: ["Under Construction", "Ready to Move", "New Launch"],
      views: ["Sea View"],
      budget_min: [100000000],
      budget_max: [250000000],
      sortBy: "Latest",
      ids: [],
    });
  });

  it("sends rezide.in's sort values", () => {
    const sortBy = (sort: ProjectSortKey) => toProjectFilters(defaultProjectCriteria({ sort })).sortBy;
    expect(sortBy("price-asc")).toBe("Sale Price Low to High");
    expect(sortBy("price-desc")).toBe("Sale Price High to Low");
    expect(sortBy("plot-asc")).toBe("Plot Area (Low to High)");
    expect(sortBy("plot-desc")).toBe("Plot Area (High to Low)");
    expect(sortBy("yield-asc")).toBe("Rental Yield (Low to High)");
    expect(sortBy("yield-desc")).toBe("Rental Yield (High to Low)");
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

  it("loads one filtered buildings page and its count without detail hydration", async () => {
    const body = buildingFilters(new URLSearchParams("city=Mumbai&page=3&locality=Lalbaug"));
    backend.onPost("/Inventory/project/filter/new", body).reply(200, { result_count: 37, data: [row({ rental_count: "4", sale_count: 7, logo: "logo-key", private_notes: "PRIVATE" })] });
    const result = await searchBuildingProjects(body);
    expect(result.result_count).toBe(37);
    expect(result.data[0]).toMatchObject({ rentalCount: 4, saleCount: 7, project: { id: "66f3ca67d7f5683ae57720fa", name: "Lodha Venezia", locality: "Lalbaug", subRegion: "Parel" } });
    expect(result.data[0].project.images).toEqual(["https://cdn.rezide.in/images/photo1.jpeg"]);
    expect(result.data[0].project.logo).toContain("/v1/admin/file/upload/logo-key");
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(backend.history.post).toHaveLength(1);
    expect(backend.history.get).toHaveLength(0);
  });

  it("lists Compare Project's picker as rezide.in asks for it: locality and name together", async () => {
    backend.onPost("/Inventory/project/filter/new").reply(200, { data: [row(), row({ _id: "b", project_name: " Lodha Park " })], result_count: 73 });
    await expect(findProjectsByNames(["Sewri", " Lodha ", ""])).resolves.toEqual([
      { id: "66f3ca67d7f5683ae57720fa", name: "Lodha Venezia" },
      { id: "b", name: "Lodha Park" },
    ]);
    expect(JSON.parse(backend.history.post[0].data)).toEqual({ project_names_localities_subRegions: ["Sewri", "Lodha"] });
  });

  it("searches with one page request, using the backend's total", async () => {
    backend.onPost("/Inventory/project/filter/new").reply(200, { data: [row()], result_count: 20 });
    await expect(searchProjects(defaultProjectCriteria({ city: "Mumbai", perPage: 9 }))).resolves.toMatchObject({ total: 20, pageCount: 3, items: [{ name: "Lodha Venezia" }] });
    // The page request, then one batched request for the cards' configuration ranges.
    expect(backend.history.post.map((r) => r.url)).toEqual(["/Inventory/project/filter/new", "/Inventory/project/ids"]);
  });

  it("adds each card's configuration ranges from one batched request, copying no private fields", async () => {
    backend.onPost("/Inventory/project/filter/new").reply(200, { data: [row()], result_count: 1 });
    backend.onPost("/Inventory/project/ids").reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ projectIds: ["66f3ca67d7f5683ae57720fa"] });
      return [
        200,
        {
          data: [
            {
              _id: "66f3ca67d7f5683ae57720fa",
              general_information: { developer_id: { account_details: { bank: "BANKSECRET" } } },
              price_range: [
                { name: "2 BHK", minArea_search: "688", maxArea_search: "688", saleMin_search: "8200000", saleMax_search: "9200000", rentalMin_search: "", rentalMax_search: "" },
                { name: "3 BHK", minArea_search: "811", maxArea_search: "1007", saleMin_search: "9202000", saleMax_search: "13700000" },
              ],
            },
          ],
        },
      ];
    });
    const { items } = await searchProjects(defaultProjectCriteria());
    expect(items[0].configurationPlans).toEqual([
      { bhk: "2 BHK", areaMin: 688, areaMax: 688, saleMin: 8200000, saleMax: 9200000, rentMin: undefined, rentMax: undefined, unitPlans: [] },
      { bhk: "3 BHK", areaMin: 811, areaMax: 1007, saleMin: 9202000, saleMax: 13700000, rentMin: undefined, rentMax: undefined, unitPlans: [] },
    ]);
    expect(JSON.stringify(items)).not.toMatch(/BANKSECRET/);
  });

  it("still lists the projects when the configuration ranges can't be loaded", async () => {
    backend.onPost("/Inventory/project/filter/new").reply(200, { data: [row()], result_count: 1 });
    backend.onPost("/Inventory/project/ids").reply(500);
    const { items } = await searchProjects(defaultProjectCriteria());
    expect(items).toHaveLength(1);
    expect(items[0].configurationPlans).toBeUndefined();
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

  it("sends the text and the Location dialog's localities separately, as rezide.in does", async () => {
    backend.onPost("/Inventory/project/filter/new").reply(200, { result_count: 1, data: [row({ _id: "a" })] });
    const result = await searchProjects(defaultProjectCriteria({ q: "Venezia", localities: ["Parel", "Worli"] }));
    expect(result).toMatchObject({ total: 1 });
    expect(backend.history.post).toHaveLength(1);
    const body = JSON.parse(backend.history.post[0].data);
    expect(body.project_names_localities_subRegions).toEqual(["Venezia"]);
    expect(body.subRegions).toEqual(["Parel", "Worli"]);
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
    backend.onPost("/Inventory/project/ids").reply(200, { data: [row({ _id: "p1" })] });
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

it("keeps a project's actual city when fetched under another search city",()=>{
  expect(toProject({_id:'pune-project',project_name:'Pune Project',city:'Pune'},'Mumbai').city).toBe('Pune');
  expect(toProject({_id:'old-project',city:'  '},'Mumbai').city).toBe('Mumbai');
});

it("retains loaded configuration ranges on project activity cards", () => {
 const project = toListingProject({_id:"507f1f77bcf86cd799439012",general_information:{project_name:"Example"},price_range:[{name:"1 BHK",minArea_search:373,maxArea_search:458},{name:"2 BHK",minArea_search:434,maxArea_search:720}],configuration:[]},"Mumbai");
 expect(project.configurationPlans).toMatchObject([{bhk:"1 BHK",areaMin:373,areaMax:458},{bhk:"2 BHK",areaMin:434,areaMax:720}]);
 expect(project.configurationPlans?.[0].saleMin).toBeUndefined();
});

it("maps project activity possession with the flat date taking priority over the nested date", () => {
 const raw={_id:"507f1f77bcf86cd799439012",status:"Backend Status",general_information:{project_name:"Example",possession_data:{possession_date:"2026-11-01"}}};
 expect(toListingProject(raw,"Mumbai")).toMatchObject({backendStatus:"Backend Status",possessionDate:"2026-11-01"});
 expect(toListingProject({...raw,possession:"2027-12-01"},"Mumbai").possessionDate).toBe("2027-12-01");
});
