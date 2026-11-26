import { cellToBoundary, cellToLatLng, getResolution, isValidCell, latLngToCell } from "h3-js";
import type { MapItem } from "@/services/map-search";
import type { LatLng } from "@/types/models";

/* The highlighted circle around a tapped cluster, as in GeoEstate's map. No Leaflet here, so it can be tested. */

export type ClusterArea = {
  center: LatLng;
  /** Metres. */
  radius: number;
  /** An H3 cluster's cell: membership is exact. Supercluster ids carry no geometry, so those have none. */
  exact?: boolean;
  cell?: string;
  resolution?: number;
};

export type ClusterFocus = ClusterArea & {
  /** How many listings the cluster stands for. */
  count: number;
  /** Pins already beside the cluster when it was tapped: they belong to the area, not to the cluster. */
  separate: Set<string>;
};

const EARTH_RADIUS_M = 6_371_000;

export function distanceMetres([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** An item's id, the same across responses, for telling which pins were already separate. */
export function mapItemId(item: MapItem): string {
  const id = item.type === "cluster" ? item.clusterId : item.type === "project" ? item.projectId : item.listingId;
  return `${item.type}:${id ?? `${item.lat}:${item.lng}`}`;
}

/**
 * The area a cluster covers. An H3 cluster is a whole cell, so it's the circle enclosing that
 * hexagon; otherwise about 1.5× the 64 px grouping radius at the tapped zoom.
 */
export function clusterArea(clusterId: string | undefined, [lat, lng]: LatLng, zoom: number, bounds?: [number, number, number, number]): ClusterArea {
  if (bounds && bounds.every(Number.isFinite)) {
    const [west, south, east, north] = bounds;
    const center: LatLng = [(south + north) / 2, (west + east) / 2];
    return { center, radius: Math.max(150, distanceMetres(center, [south, west]), distanceMetres(center, [north, east])) * 1.15, exact: true };
  }
  const cell = /^H3_([0-9a-f]{15})$/i.exec(clusterId ?? "")?.[1];
  if (cell && isValidCell(cell)) {
    const center = cellToLatLng(cell) as LatLng;
    const radius = Math.max(...cellToBoundary(cell).map((vertex) => distanceMetres(center, vertex as LatLng)));
    return { cell, resolution: getResolution(cell), center, radius };
  }
  const metresPerPixel = (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / (256 * 2 ** zoom);
  return { center: [lat, lng], radius: metresPerPixel * 96 };
}

/** The items inside a focused cluster's area. */
export function clusterMembers<T extends MapItem>(items: T[], area: ClusterArea, focus?: Pick<ClusterFocus, "count" | "separate">): T[] {
  const located = items.filter((i) => !focus?.separate.has(mapItemId(i)));
  if (area.cell && area.resolution !== undefined) {
    return located.filter((i) => latLngToCell(i.lat, i.lng, area.resolution as number) === area.cell);
  }
  // Without a cell, take the nearest markers in the circle until they add up to the cluster's count.
  let remaining = focus?.count ?? Infinity;
  return located
    .map((item) => ({ item, distance: distanceMetres(area.center, [item.lat, item.lng]) }))
    .filter(({ distance }) => distance <= area.radius)
    .sort((a, b) => a.distance - b.distance)
    .filter(({ item }) => {
      const count = item.type === "listing" ? 1 : item.count;
      if (count > remaining) return false;
      remaining -= count;
      return true;
    })
    .map(({ item }) => item);
}
