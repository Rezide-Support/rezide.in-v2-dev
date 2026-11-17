"use client";

import L from "leaflet";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MAX_MAP_ZOOM, type MapItem } from "@/services/map-search";
import type { Intent, LatLng, Property, PropertyCategory } from "@/types/models";
import LeafletMap, { type MapPoint, type MapView } from "./leaflet-map";
import { clusterArea, clusterMembers, distanceMetres, mapItemId, type ClusterFocus } from "./map-focus";
import { escapeHtml, toMapPoints } from "./map-popup";
import { mapStartFor, useMapMarkers } from "./use-map-markers";

type ToolbarControls = { focused: boolean; clearFocus: () => void };
function MapToolbar({ render, ...controls }: ToolbarControls & { render: (controls: ToolbarControls) => ReactNode }) {
  return render(controls);
}

/** The search center: the city or a tapped spot. */
type SearchCenter = { name: string; position: LatLng };

const CENTER_ICON = () =>
  L.divIcon({ className: "rez-center-marker", html: '<span class="rez-center-halo"><span></span></span>', iconSize: [44, 44], iconAnchor: [22, 22] });

const CIRCLE_STYLE: L.PathOptions = { color: "#2f7fb2", weight: 2.5, opacity: 0.9, dashArray: "7 6", fillColor: "#2f7fb2", fillOpacity: 0.12, interactive: false };

/** The properties map, with the behaviour of GeoEstate's map. Loaded on demand (see results-map.tsx). */
export default function MapExplorer({
  city,
  intent,
  category,
  onViewChange,
  highlightedId, highlightedProperty, onHover, renderToolbar,
}: {
  highlightedId?: string | null;
  highlightedProperty?: Property;
  onHover?: (id: string | null) => void;
  renderToolbar?: (controls: ToolbarControls) => ReactNode;
  city: string;
  intent: Intent;
  category: PropertyCategory;
  /** The part of the map being searched: the view, or the square around a focused cluster. */
  onViewChange?: (view: MapView) => void;
}) {
  const start = useMemo(() => mapStartFor(city), [city]);
  const context = useMemo(() => ({ city, intent, category }), [city, intent, category]);
  const markers = useMapMarkers(true);
  const { onViewChange: setMarkerView, items } = markers;
  const onViewChangeRef = useRef(onViewChange);
  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  });
  const searchView = useCallback(
    (view: MapView) => {
      setMarkerView(view);
      onViewChangeRef.current?.(view);
    },
    [setMarkerView],
  );

  const [map, setMap] = useState<L.Map | null>(null);
  const [center, setCenter] = useState<SearchCenter>({ name: city, position: start.center });
  const [zoom, setZoom] = useState(start.zoom);
  const [focus, setFocus] = useState<ClusterFocus | null>(null);
  // While a cluster is focused, every search uses the square around its circle instead of the map bounds.
  const focusBbox = useRef<MapView["bbox"] | null>(null);
  const focusRef = useRef<ClusterFocus | null>(null);

  const reportView = useCallback(
    (view: MapView) => {
      setZoom(view.zoom);
      searchView(focusBbox.current ? { ...view, bbox: focusBbox.current } : view);
    },
    [searchView],
  );

  const clearFocus = useCallback(() => {
    if (!focusRef.current) return;
    focusRef.current = null;
    focusBbox.current = null;
    setFocus(null);
    if (map) {
      const b = map.getBounds();
      searchView({ bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: Math.round(map.getZoom()) });
    }
  }, [map, searchView]);

  const visible = useMemo(() => (focus ? clusterMembers(items, focus, focus) : items), [items, focus]);
  const points = useMemo(() => toMapPoints(visible, context, zoom >= MAX_MAP_ZOOM), [visible, context, zoom]);
  // Spatial clusters omit their members. Reveal the hovered result at its known
  // coordinates without zooming or changing the search bounds.
  const displayPoints = useMemo(() => {
    const property = highlightedProperty;
    if (!property || points.some(point => point.id === property.id || point.listingIds?.includes(property.id))) return points;
    const [lat, lng] = property.coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return points;
    return [...points, ...toMapPoints([{
      type: "listing", listingId: property.id, title: property.title,
      price: property.price, lat, lng, locality: property.locality, city: property.city,
    }], context, false)];
  }, [points, highlightedProperty, context]);

  const focusCluster = useCallback(
    (point: MapPoint) => {
      if (!map) return;
      const area = clusterArea(point.clusterId, point.position, map.getZoom());
      const square = L.latLng(area.center).toBounds(area.radius * 2);
      const others = items.filter((i: MapItem) => i.type !== "cluster");
      const next: ClusterFocus = { ...area, count: point.count ?? 0, separate: new Set(clusterMembers(others, area).map(mapItemId)) };
      focusRef.current = next;
      focusBbox.current = [square.getWest(), square.getSouth(), square.getEast(), square.getNorth()];
      setFocus(next);
      map.closePopup();
      searchView({ bbox: focusBbox.current, zoom: Math.round(map.getZoom()) });
      map.fitBounds(square, { padding: [28, 28], maxZoom: MAX_MAP_ZOOM, animate: true });
    },
    [map, items, searchView],
  );

  const onPointClick = (point: MapPoint) => {
    if (!map) return;
    // At the deepest zoom a cluster can't split further, so its popup shows instead.
    if (point.kind === "cluster" && map.getZoom() < MAX_MAP_ZOOM) focusCluster(point);
    if (point.kind === "project") map.setView(point.position, Math.min(MAX_MAP_ZOOM, map.getZoom() + 2), { animate: true });
  };

  const moveCenter = useCallback(
    (next: SearchCenter) => {
      focusRef.current = null;
      focusBbox.current = null;
      setFocus(null);
      setCenter(next);
      map?.setView(next.position, map.getZoom());
    },
    [map],
  );

  // Tapping outside the circle restores the normal search, and tapping inside does nothing. With no circle, a tap moves the search pin.
  const onBackgroundClick = (position: LatLng) => {
    const current = focusRef.current;
    if (current) {
      if (distanceMetres(current.center, position) > current.radius) clearFocus();
      return;
    }
    moveCenter({ name: "You", position });
  };

  // The search pin.
  useEffect(() => {
    if (!map) return;
    const [lat, lng] = center.position;
    const marker = L.marker(center.position, { icon: CENTER_ICON(), zIndexOffset: 1000, title: "Search center" })
      .bindTooltip(escapeHtml(center.name), { permanent: true, direction: "top", offset: [0, -20], className: "rez-center-tooltip" })
      .bindPopup(`<strong>Search center</strong><p>${escapeHtml(center.name)}</p><small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small>`)
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, center]);

  // The highlighted circle.
  useEffect(() => {
    if (!map || !focus) return;
    const circle = L.circle(focus.center, { radius: focus.radius, ...CIRCLE_STYLE }).addTo(map);
    return () => {
      circle.remove();
    };
  }, [map, focus]);

  const message =
    !markers.isFetching && !markers.isError && focus && visible.length === 0
      ? "No properties in this area. Tap outside the circle to go back."
      : markers.status;

  return (
    <div role="region" aria-label="Property map" className="absolute inset-0 flex flex-col bg-white">
      <div className="relative min-h-0 flex-1">
        <LeafletMap
          points={displayPoints}
          highlightedId={highlightedId}
          onHover={onHover}
          initialView={start}
          fit={false}
          onViewChange={reportView}
          onMapReady={setMap}
          onPointClick={onPointClick}
          onBackgroundClick={onBackgroundClick}
          className="rez-map absolute inset-0 z-0"
        />

        {renderToolbar && <MapToolbar render={renderToolbar} focused={!!focus} clearFocus={clearFocus} />}

        {message && (
          <div
            role="status"
            aria-live="polite"
            className="absolute bottom-[22px] left-1/2 z-[500] max-w-[calc(100%-100px)] -translate-x-1/2 rounded-lg border border-[#dee7d5] bg-[#fffffff5] px-[18px] py-[11px] text-center text-xs text-[#5c7051] shadow-[0_4px_18px_#203e2426]"
          >
            {message}
            {markers.isError && (
              <button type="button" onClick={markers.retry} className="ml-1.5 text-[#2e6746] underline">
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-rez-smoke bg-white px-4 py-2 text-[11px] text-rez-graphite">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <i aria-hidden className="size-2.5 rounded-full bg-[#3677d0]" />
            Search center
          </span>
          <span className="flex items-center gap-1.5">
            <i aria-hidden className="size-2.5 rounded-full bg-[#326448]" />
            Property pin
          </span>
        </div>
        <span>
          {focus ? "Tap outside the circle to show all clusters" : "Tap the map to move the search pin"} · Zoom {zoom}
        </span>
      </div>
    </div>
  );
}
