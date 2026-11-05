import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapStartFor, toMapPoint } from "@/features/search/use-map-markers";
import { containsBbox, expandBbox, readCache, resetRequestPolicy, writeCache, type BBox } from "@/services/map-request-policy";
import { SPATIAL_API_URL, itemPrice, openableListingId, searchMap } from "@/services/map-search";

/* The Spatial Search API, answered by a stubbed fetch. Behaviour follows GeoEstate's map search. */

const view = { bbox: [72.9, 19.07, 72.92, 19.09] as BBox, zoom: 14 };
const items = [
  { type: "listing", listingId: "IN", title: "Inside", price: 15000000, lat: 19.08, lng: 72.91 },
  { type: "cluster", clusterId: "H3_X", count: 4, lat: 19.085, lng: 72.915 },
  { type: "listing", listingId: "OUTSIDE", title: "Outside", lat: 19.095, lng: 72.925 },
];
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

describe("searchMap", () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetRequestPolicy();
    fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ success: true, data: { zoom: 14, count: 3, items } }));
  });
  afterEach(() => fetchMock.mockRestore());

  it("calls /search-hybrid straight from the browser with a padded, grid-snapped bbox, and keeps only the view", async () => {
    const result = await searchMap(view);
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(`${url.origin}${url.pathname}`).toBe(`${SPATIAL_API_URL}/v1/locations/search-hybrid`);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ zoom: "14", radius: "64", limit: "5000" });
    const sent = url.searchParams.get("bbox")!.split(",").map(Number) as BBox;
    expect(containsBbox(sent, view.bbox)).toBe(true);
    expect(result.items.map((i) => (i.type === "cluster" ? i.clusterId : i.type === "listing" ? i.listingId : ""))).toEqual(["IN", "H3_X"]);
    expect(result.count).toBe(5);
  });

  it("reuses a cached response for a view inside it, and skips the cache when asked", async () => {
    await searchMap(view);
    await searchMap({ bbox: [72.905, 19.075, 72.915, 19.085], zoom: 14 });
    expect(fetchMock).toHaveBeenCalledOnce();
    await searchMap(view, undefined, { fresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("asks for the deepest split at the deepest map zoom", async () => {
    await searchMap({ bbox: view.bbox, zoom: 18 });
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("zoom")).toBe("24");
  });

  it("explains a rate limit and an error response", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("{}", { status: 429, headers: { "Retry-After": "1" } }));
    await expect(searchMap(view)).rejects.toThrow(/Too many map searches/);
    resetRequestPolicy();
    fetchMock.mockImplementationOnce(async () => ok({ success: false, message: "bbox must be west,south,east,north" }));
    await expect(searchMap(view)).rejects.toThrow("bbox must be west,south,east,north");
  });

  it("flags a view that hit the service's limit", async () => {
    fetchMock.mockImplementationOnce(async () => ok({ success: true, data: { count: 5000, items } }));
    await expect(searchMap(view)).resolves.toMatchObject({ capped: true });
  });
});

describe("request policy", () => {
  beforeEach(() => resetRequestPolicy());

  it("pads and snaps bounds so nearby views make the same request", () => {
    expect(expandBbox([72.9, 19.07, 72.92, 19.09], 14)).toEqual(expandBbox([72.901, 19.071, 72.921, 19.091], 14));
    expect(expandBbox([-179.9, -89.9, 179.9, 89.9], 2)).toEqual([-180, -90, 180, 90]);
  });

  it("serves a cached view only within the same endpoint and zoom", () => {
    writeCache("s|14", [72, 19, 73, 20], "hit");
    expect(readCache("s|14", [72.1, 19.1, 72.9, 19.9])).toBe("hit");
    expect(readCache("s|15", [72.1, 19.1, 72.9, 19.9])).toBeNull();
    expect(readCache("s|14", [71, 19, 73, 20])).toBeNull();
  });
});

describe("markers", () => {
  it("reads prices passed through as numbers or text, and links only openable listings", () => {
    expect(itemPrice("2,80,00,000")).toBe(28000000);
    expect(itemPrice("on request")).toBeUndefined();
    expect(openableListingId("6aeb0ac671b2b4f32bb95568")).toBe("6aeb0ac671b2b4f32bb95568");
    expect(openableListingId("LST5634248")).toBeUndefined();
  });

  it("shows clusters as counts, projects by name, listings by price", () => {
    expect(toMapPoint({ type: "cluster", clusterId: "H3_1", count: 6, lat: 19, lng: 72 }, 0)).toMatchObject({ kind: "cluster", count: 6, label: "6 listings · tap to zoom" });
    expect(toMapPoint({ type: "project", projectId: "Garodia Palace", count: 2, lat: 19, lng: 72 }, 1)).toMatchObject({ kind: "project", count: 2, label: "Garodia Palace · 2 listings · tap to zoom" });
    expect(toMapPoint({ type: "listing", listingId: "LST1", title: "2 BHK", price: 28000000, lat: 19, lng: 72 }, 2)).toMatchObject({
      kind: "listing",
      label: "₹ 2.8 Cr",
      href: undefined,
    });
  });

  it("opens the map on the city, or on India when the city is unknown", () => {
    expect(mapStartFor("Mumbai")).toEqual({ center: [19.076, 72.8777], zoom: 12 });
    expect(mapStartFor("Nowhere").zoom).toBe(5);
  });
});
