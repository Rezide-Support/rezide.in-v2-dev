import { describe, expect, it } from "vitest";
import type { MapItem } from "@/services/map-search";
import { clusterArea, clusterMembers, distanceMetres, mapItemId } from "./map-focus";
import { escapeHtml, popupHtml, toMapPoints } from "./map-popup";

const CONTEXT = { city: "Mumbai", intent: "buy", category: "homes" } as const;
// A real cell from the Spatial API, and a point inside it.
const CELL = "H3_87608b568ffffff";
const INSIDE = { lat: 19.0694, lng: 72.9119 };

describe("cluster circle", () => {
  it("encloses an H3 cluster's hexagon", () => {
    const area = clusterArea(CELL, [INSIDE.lat, INSIDE.lng], 12);
    expect(area).toMatchObject({ cell: "87608b568ffffff", resolution: 7 });
    expect(area.radius).toBeGreaterThan(1000);
    expect(area.radius).toBeLessThan(2000);
  });

  it("uses the server member bounds for an exact cluster focus", () => {
    const area = clusterArea("cluster-one", [19, 72], 12, [72.8, 19.0, 72.82, 19.02]);
    expect(area.exact).toBe(true);
    expect(area.center[0]).toBeCloseTo(19.01);
    expect(area.center[1]).toBeCloseTo(72.81);
    expect(area.radius).toBeGreaterThan(distanceMetres(area.center, [19, 72.8]));
  });

  it("falls back to the grouping radius for a Supercluster id", () => {
    const area = clusterArea("SC_123", [19, 72], 12);
    expect(area.cell).toBeUndefined();
    expect(area.center).toEqual([19, 72]);
    expect(area.radius).toBeGreaterThan(0);
    // One zoom in, each pixel covers half the ground.
    expect(clusterArea("SC_123", [19, 72], 13).radius).toBeCloseTo(area.radius / 2);
  });
});

describe("clusterMembers", () => {
  const inside: MapItem = { type: "listing", listingId: "IN", title: "In", ...INSIDE };
  const beside: MapItem = { type: "listing", listingId: "BESIDE", title: "Beside", ...INSIDE };
  const far: MapItem = { type: "listing", listingId: "FAR", title: "Far", lat: 19.3, lng: 72.9 };

  it("keeps what's in the cell, leaving out pins already separate when it was tapped", () => {
    const area = clusterArea(CELL, [INSIDE.lat, INSIDE.lng], 12);
    expect(clusterMembers([inside, far], area)).toEqual([inside]);
    expect(clusterMembers([inside, beside, far], area, { count: 1, separate: new Set([mapItemId(beside)]) })).toEqual([inside]);
  });

  it("without a cell, takes the nearest until they add up to the cluster's count", () => {
    const area = { center: [INSIDE.lat, INSIDE.lng] as [number, number], radius: 500 };
    const near: MapItem = { type: "listing", listingId: "NEAR", title: "Near", lat: INSIDE.lat + 0.001, lng: INSIDE.lng };
    expect(clusterMembers([near, inside, far], area, { count: 1, separate: new Set() })).toEqual([inside]);
    expect(clusterMembers([near, inside, far], area, { count: 5, separate: new Set() })).toEqual([inside, near]);
  });

  it("measures distance", () => {
    expect(distanceMetres([19, 72], [19.01, 72])).toBeCloseTo(1112, -1);
  });
});

describe("popups", () => {
  it("escapes what comes from the service", () => {
    expect(escapeHtml(`<img onerror="x">`)).toBe("&lt;img onerror=&quot;x&quot;&gt;");
    const html = popupHtml([{ type: "listing", title: "<script>x</script>", lat: 19, lng: 72 }], CONTEXT);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("links a listing only when its id can open the page", () => {
    const id = "6ae9d0a871b2b4f32b94283e";
    expect(popupHtml([{ type: "listing", listingId: id, title: "A", price: 28000000, bedrooms: 2, area: 900, area_unit: "SQFT", lat: 19, lng: 72 }], CONTEXT)).toMatch(new RegExp(`href="/properties/${id}"[^>]*>View property`));
    expect(popupHtml([{ type: "listing", listingId: "LST1", title: "A", lat: 19, lng: 72 }], CONTEXT)).not.toContain("View property");
    expect(popupHtml([{ type: "listing", title: "A", bedrooms: 2, area: 900, area_unit: "SQFT", lat: 19, lng: 72 }], CONTEXT)).toContain("2 beds · 900 sq.ft");
  });

  it("opens a project's listings, or searches for the project", () => {
    expect(popupHtml([{ type: "project", projectId: "Garodia Palace", count: 2, lat: 19, lng: 72 }], CONTEXT)).toMatch(/searchQuery=Garodia(\+|%20)Palace[^>]*>Explore listings/);
    expect(popupHtml([{ type: "project", projectId: "p", count: 1, lat: 19, lng: 72, listings: [{ listingId: "L", title: "Unit 4" }] }], CONTEXT)).toContain("Unit 4");
  });

  it("puts everything at one spot in one pin", () => {
    const a: MapItem = { type: "listing", listingId: "A", title: "First", lat: 19, lng: 72 };
    const b: MapItem = { type: "listing", listingId: "B", title: "Second", lat: 19, lng: 72 };
    const c: MapItem = { type: "listing", listingId: "C", title: "Third", lat: 20, lng: 72 };
    const points = toMapPoints([a, b, c], CONTEXT, false);
    expect(points).toHaveLength(2);
    expect(points[0].popupHtml).toContain("First");
    expect(points[0].popupHtml).toContain("Second");
  });

  it("says a cluster can't split at the deepest zoom", () => {
    const cluster: MapItem = { type: "cluster", clusterId: CELL, count: 3, lat: 19, lng: 72 };
    expect(toMapPoints([cluster], CONTEXT, false)[0]).toMatchObject({ label: "3 listings · tap to zoom", clusterId: CELL });
    expect(toMapPoints([cluster], CONTEXT, true)[0].label).toBe("3 listings · at this exact spot");
  });
});
