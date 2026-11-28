import { validCoordinates, httpsImage, localityDirectionsUrl } from "@/lib/listing-locality";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { fetchLandmarks, fetchLocality, fetchLocalityPhoto, findLocality, toLandmark } from "@/services/localities";
import { searchLocalityDirectory } from "@/services/directory-localities";
import { localityFilters } from "@/features/search/locality-criteria";

/* The Rezide backend's locality endpoints, answered by a test double. Shapes follow live responses. */

const school = { placeName: "Podar School", latitude: 19.12, longitude: 72.91, distance: 0.16 };

describe("toLandmark", () => {
  it("keeps locality region IDs and sub-region IDs separate, with null absent filters", () => {
    expect(localityFilters(new URLSearchParams())).toEqual({ page: 1, pageSize: 12, body: { regions: null, sub_regions: null, searchQuery: null } });
    const query = new URLSearchParams("region=region-one,region-two&sub_region=sub-one&searchQuery=Parel,Worli&page=3&pageSize=24");
    expect(localityFilters(query, "city-id")).toEqual({ page: 3, pageSize: 24, body: { regions: ["region-one", "region-two"], sub_regions: ["sub-one"], searchQuery: ["Parel", "Worli"], city: "city-id" } });
    query.set("page", "4");
    expect(localityFilters(query, "city-id").body).toEqual(localityFilters(new URLSearchParams("region=region-one,region-two&sub_region=sub-one&searchQuery=Parel,Worli"), "city-id").body);
  });
  it("maps a backend row", () => {
    expect(toLandmark(school)).toEqual({ name: "Podar School", distanceKm: 0.16, coords: [19.12, 72.91] });
  });

  it("reads the distance the live backend sends as a string", () => {
    expect(toLandmark({ ...school, distance: "0.3493883511453041" })?.distanceKm).toBeCloseTo(0.349, 3);
  });

  it("keeps Google's place icon, over https", () => {
    const icon = "http://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/school-71.png";
    expect(toLandmark({ ...school, icon })?.icon).toBe(icon.replace("http:", "https:"));
    expect(toLandmark({ ...school, icon: "https://evil.example/x.png" })).not.toHaveProperty("icon");
  });

  it("drops rows that can't be listed or mapped", () => {
    expect(toLandmark({ ...school, distance: "" })).toBeNull();
    expect(toLandmark({ ...school, distance: "far" })).toBeNull();
    expect(toLandmark({ ...school, placeName: " " })).toBeNull();
    expect(toLandmark({ ...school, latitude: undefined })).toBeNull();
  });
});

describe("locality endpoints", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  it("loads one locality directory page, maps counts and five photos, and uses the response count", async () => {
    const body = { regions: ["r1"], sub_regions: ["s1"], searchQuery: null, city: "c1" };
    backend.onPost("/Repository/Locality/filter", body).reply(config => {
      expect(config.params).toEqual({ page: 2, pageSize: 12 });
      return [200, { result_count: 29, data: [{ _id: "l1", general_information: { locality_name: "Lalbaug", private_notes: "PRIVATE" }, media: { images: Array.from({ length: 7 }, (_, index) => ({ url: `image${index}` })) }, total_listing_rental_count: "8" }] }];
    });
    const result = await searchLocalityDirectory(body, 2, 12);
    expect(result.result_count).toBe(29);
    expect(result.data[0]).toMatchObject({ id: "l1", name: "Lalbaug", rentalCount: 8, saleCount: 0 });
    expect(result.data[0].images).toHaveLength(5);
    expect(result.data[0].images[0]).toBe("https://cdn.rezide.in/images/image0.jpeg");
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(backend.history.post).toHaveLength(1);
    expect(backend.history.get).toHaveLength(0);
  });

  it("asks for each landmark tab by the backend's category, as rezide.in does", async () => {
    backend.onGet("/repository/locality/landmark/p1").reply((config) => [
      200,
      { data: config.params.category === "school" ? [school, school] : [] },
    ]);

    const groups = await fetchLandmarks("p1");

    expect(backend.history.get.map((r) => r.params)).toEqual(
      ["school", "train_station", "subway_station", "airport", "mall", "hospital"].map((category) => ({ category, pageSize: 4 })),
    );
    expect(groups.map((g) => g.category)).toEqual(["Schools", "Railway Stations", "Metro Stations", "Airports", "Malls", "Hospitals"]);
    // A repeated place appears once.
    expect(groups[0].items).toHaveLength(1);
    expect(groups[1].items).toEqual([]);
  });

  it("finds a locality's photo by its exact name", async () => {
    backend.onPost("/Repository/Locality/filter").reply(200, {
      data: [
        { general_information: { locality_name: "Lower Parel East" }, media: { images: [{ url: "other" }] } },
        { general_information: { locality_name: "Lower Parel" }, media: { images: [{ url: "photo1" }, { url: "photo2" }] } },
      ],
    });

    await expect(fetchLocalityPhoto("lower parel")).resolves.toBe("https://cdn.rezide.in/images/photo1.jpeg");
    expect(JSON.parse(backend.history.post[0].data)).toEqual({ sub_regions: null, regions: null, searchQuery: ["lower parel"] });
  });

  it("has no photo without an exact match, and doesn't ask without a name", async () => {
    backend.onPost("/Repository/Locality/filter").reply(200, {
      data: [{ general_information: { locality_name: "Lower Parel East" }, media: { images: [{ url: "other" }] } }],
    });

    await expect(fetchLocalityPhoto("Lower Parel")).resolves.toBeNull();
    await expect(fetchLocalityPhoto(" ")).resolves.toBeNull();
    expect(backend.history.post).toHaveLength(1);
  });

  it("finds the locality's id for its page, falling back to the first result as rezide.in", async () => {
    const exact = "697c9c74f42f1f6ffa8d2387";
    const first = "6932702cb5e53b94e8821eaf";
    backend.onPost("/Repository/Locality/filter").replyOnce(200, {
      data: [
        { _id: first, general_information: { locality_name: "Lower Parel East" } },
        { _id: exact, general_information: { locality_name: "Lower Parel", sub_region: { name: "Parel" }, city: { name: "Mumbai" } }, media: { images: [{ url: "p" }] } },
      ],
    });
    // The slug is the linked locality's SEO URL words, from the same row as its id.
    await expect(findLocality("Lower Parel")).resolves.toEqual({ id: exact, slug: "lower-parel-mumbai", photo: "https://cdn.rezide.in/images/p.jpeg" });

    backend.onPost("/Repository/Locality/filter").replyOnce(200, { data: [{ _id: first, general_information: { locality_name: "Lower Parel East" } }] });
    await expect(findLocality("Lower Parel")).resolves.toEqual({ id: first, slug: "lower-parel-east", photo: null });
  });

  it("reads one locality for its page, with its city's name", async () => {
    const id = "697c9c74f42f1f6ffa8d2387";
    backend.onGet(`/Repository/Locality/${id}`).reply(200, {
      _id: id,
      general_information: {
        locality_name: " Jackeria Bunder ",
        city: "c1",
        description: "A dock.",
        what_to_expect: "Docks\n\nTrucks",
        the_lifestyle: "Practical",
        unexpected_appeal: "Flamingos",
        the_market: "Affordable",
      },
      media: { images: [{ url: "a" }] },
    });
    // Its list row names its sub-region, region and city (the detail record only has their ids).
    backend.onPost("/Repository/Locality/filter").reply(200, {
      data: [{ _id: id, general_information: { locality_name: "Jackeria Bunder", sub_region: { name: "Sewri" }, region: { name: "South Mumbai" }, city: { name: "Mumbai" } } }],
    });
    await expect(fetchLocality(id, async (c) => (c === "c1" ? "Mumbai" : undefined))).resolves.toEqual({
      id,
      slug: "jackeria-bunder-sewri-mumbai",
      name: "Jackeria Bunder",
      city: "Mumbai",
      subRegion: "Sewri",
      region: "South Mumbai",
      description: "A dock.",
      whatToExpect: "Docks\n\nTrucks",
      lifestyle: "Practical",
      unexpectedAppeal: "Flamingos",
      market: "Affordable",
      images: ["https://cdn.rezide.in/images/a.jpeg"],
    });
  });

  it("doesn't ask for a locality whose id isn't the backend's", async () => {
    await expect(fetchLocality("../x")).resolves.toBeNull();
    expect(backend.history.get).toHaveLength(0);
  });
});

describe("listing locality map inputs", () => {
  it("rejects missing and out-of-range coordinates while accepting explicit zero", () => {
    expect(validCoordinates(undefined, 72)).toBe(false);
    expect(validCoordinates("", 72)).toBe(false);
    expect(validCoordinates(91, 72)).toBe(false);
    expect(validCoordinates(19, -181)).toBe(false);
    expect(validCoordinates("19.1", "72.9")).toBe(true);
    expect(validCoordinates(0, 0)).toBe(true);
  });
  it("uses HTTPS for remote icons and rejects unsafe protocols", () => {
    expect(httpsImage("http://maps.gstatic.com/icon.png")).toBe("https://maps.gstatic.com/icon.png");
    expect(httpsImage("javascript:alert(1)")).toBe("");
  });
  it("encodes directions credentials and preserves origin and destination coordinates", () => {
    const url = new URL(localityDirectionsUrl("key&value", [19.12,72.91], [19.3,72.8]));
    expect(url.origin).toBe("https://www.google.com");
    expect(url.searchParams.get("key")).toBe("key&value");
    expect(url.searchParams.get("origin")).toBe("19.12,72.91");
    expect(url.searchParams.get("destination")).toBe("19.3,72.8");
    expect(url.searchParams.get("mode")).toBe("driving");
  });
});
