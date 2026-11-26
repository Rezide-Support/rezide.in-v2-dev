"use client";
import { isBackendId } from "@/lib/ids";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { propertyHref } from "@/features/properties/property-card";
import { CITY_CENTRES } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { itemPrice, openableListingId, searchMap, type MapItem, type MapView, type MapFilters } from "@/services/map-search";
import type { LatLng } from "@/types/models";
import type { MapPoint } from "./leaflet-map";

/** Where the map opens: the city centre, else all of India. */
export function mapStartFor(city: string): { center: LatLng; zoom: number } {
  const centre = CITY_CENTRES[city];
  return centre ? { center: centre, zoom: 12 } : { center: [20.59, 78.96], zoom: 5 };
}

const short = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
const listings = (n: number) => `${n} ${n === 1 ? "listing" : "listings"}`;

/** A Spatial Search item as a map marker. Ids are only unique within one response. */
export function toMapPoint(item: MapItem, index: number): MapPoint {
  const position: LatLng = [item.lat, item.lng];
  // `label` is the hover tooltip, as GeoEstate shows it: the price, or "N listings · tap to zoom".
  if (item.type === "cluster") {
    const label = `${listings(item.count)} · tap to zoom`;
    return { id: `cluster-${item.clusterId}-${index}`, kind: "cluster", count: item.count, clusterId: item.clusterId, bounds: item.bounds, expansionZoom: item.expansionZoom, position, label, title: label };
  }
  if (item.type === "project") {
    // projectId is a raw id or, in some data, the project's name.
    const name = item.projectName?.trim() || (isBackendId(item.projectId) ? "" : item.projectId);
    const label = `${name ? `${short(name, 28)} · ` : ""}${listings(item.count)} · tap to zoom`;
    return { id: `project-${item.projectId}-${index}`, kind: "project", count: item.count, expansionZoom: item.expansionZoom, position, label, title: label };
  }
  const price = itemPrice(item.price);
  const id = openableListingId(item.listingId);
  return {
    id: item.listingId ?? `listing-${index}`,
    kind: "listing",
    position,
    label: price ? formatPrice(price) : "Price on request",
    title: price ? `${item.title}, ${formatPrice(price)}` : item.title,
    href: id ? propertyHref({ id }) : undefined,
  };
}

/**
 * Markers for the map view from the Spatial Search API, following the part of the
 * map in view (pass `onViewChange` to the map), as GeoEstate's useProperties does:
 * the previous markers stay while the next view loads, and "Try again" skips the cache.
 */
export function useMapMarkers(enabled: boolean, filters: MapFilters = {}) {
  const [view, setView] = useState<MapView | null>(null);
  const [attempt, setAttempt] = useState(0);
  const fresh = useRef(false);
  const markers = useQuery({
    // Bounds rounded to ~10 m so tiny jitters don't make a new request.
    queryKey: ["map", view?.bbox.map((v) => v.toFixed(4)).join(",") ?? "", view?.zoom ?? 0, view?.focus ?? "", filters.type ?? "", filters.intend ?? "", filters.minPrice ?? null, filters.maxPrice ?? null, attempt] as const,
    queryFn: ({ signal }) => {
      const skipCache = fresh.current;
      fresh.current = false;
      return searchMap({ ...view!, ...filters }, signal, { fresh: skipCache });
    },
    enabled: enabled && view !== null,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60_000,
  });
  const items = useMemo(() => markers.data?.items ?? [], [markers.data]);
  const points = useMemo(() => items.map(toMapPoint), [items]);

  const status: string | null = !view
    ? null
    : markers.isFetching
      ? "Updating properties…"
      : markers.isError
        ? markers.error instanceof Error
          ? markers.error.message
          : "Couldn't load map listings."
        : markers.data?.capped
          ? "Zoom in to see all listings."
          : markers.data && markers.data.items.length === 0
            ? "No properties in this area. Try zooming out or moving the map."
            : null;

  const retry = useCallback(() => {
    fresh.current = true;
    setAttempt((n) => n + 1);
  }, []);

  return { capped: markers.data?.capped ?? false, items, points, onViewChange: setView, status, isFetching: markers.isFetching, isError: markers.isError && !markers.isFetching, retry };
}
