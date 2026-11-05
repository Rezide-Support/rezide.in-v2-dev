import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { fetchLandmarks, fetchLocalityPhoto, toLandmark } from "@/services/localities";

/* The Rezide backend's locality endpoints, answered by a test double. Shapes follow live responses. */

const school = { placeName: "Podar School", latitude: 19.12, longitude: 72.91, distance: 0.16 };

describe("toLandmark", () => {
  it("maps a backend row", () => {
    expect(toLandmark(school)).toEqual({ name: "Podar School", distanceKm: 0.16, coords: [19.12, 72.91] });
  });

  it("drops rows that can't be listed or mapped", () => {
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
});
