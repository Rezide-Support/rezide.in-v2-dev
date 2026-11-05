"use client";

import L from "leaflet";
import { Building2, Crosshair, LocateFixed, Maximize2, Minimize2, Rows3, Scan, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MAX_MAP_ZOOM, itemPrice, openableListingId, type ListingItem, type MapItem, type ProjectItem } from "@/services/map-search";
import { propertyHref } from "@/features/properties/property-card";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Intent, LatLng, PropertyCategory } from "@/types/models";
import { propertySearchHref } from "./criteria";
import LeafletMap, { type MapPoint, type MapView } from "./leaflet-map";
import { clusterArea, clusterMembers, distanceMetres, mapItemId, type ClusterFocus } from "./map-focus";
import { escapeHtml, projectListings, projectNameOf, toMapPoints } from "./map-popup";
import { mapStartFor, useMapMarkers } from "./use-map-markers";

/** The search center: the city, a tapped spot, or the user's location. */
type SearchCenter = { name: string; position: LatLng; isCurrent?: boolean };

const CENTER_ICON = () =>
  L.divIcon({ className: "rez-center-marker", html: '<span class="rez-center-halo"><span></span></span>', iconSize: [44, 44], iconAnchor: [22, 22] });

const CIRCLE_STYLE: L.PathOptions = { color: "#2f7fb2", weight: 2.5, opacity: 0.9, dashArray: "7 6", fillColor: "#2f7fb2", fillOpacity: 0.12, interactive: false };

function ToolButton({ onClick, icon, children, pressed, label }: { onClick: () => void; icon: ReactNode; children: ReactNode; pressed?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-lg border border-rez-smoke bg-white px-2.5 text-xs font-semibold shadow-rez-sm hover:border-black"
    >
      {icon}
      {children}
    </button>
  );
}

/** The properties map, with the behaviour of GeoEstate's map. Loaded on demand (see results-map.tsx). */
export default function MapExplorer({ city, intent, category }: { city: string; intent: Intent; category: PropertyCategory }) {
  const start = useMemo(() => mapStartFor(city), [city]);
  const context = useMemo(() => ({ city, intent, category }), [city, intent, category]);
  const markers = useMapMarkers(true);
  const { onViewChange: searchView, items } = markers;

  const [map, setMap] = useState<L.Map | null>(null);
  const [center, setCenter] = useState<SearchCenter>({ name: city, position: start.center });
  const [zoom, setZoom] = useState(start.zoom);
  const [focus, setFocus] = useState<ClusterFocus | null>(null);
  const [showListings, setShowListings] = useState(true);
  const [openProject, setOpenProject] = useState<ProjectItem | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const wrapper = useRef<HTMLDivElement>(null);
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
  const railItems = useMemo(() => visible.filter((i): i is ListingItem | ProjectItem => i.type !== "cluster").slice(0, 20), [visible]);

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
      setOpenProject(null);
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
    setLocationError("");
    moveCenter({ name: "You", position });
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        moveCenter({ name: "your location", isCurrent: true, position: [coords.latitude, coords.longitude] });
      },
      (error) => {
        setLocating(false);
        setLocationError(error.code === 1 ? "Location access was denied. Enable it in your browser." : "We couldn't find your location. Please try again.");
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  // The search pin.
  useEffect(() => {
    if (!map) return;
    const [lat, lng] = center.position;
    const marker = L.marker(center.position, { icon: CENTER_ICON(), zIndexOffset: 1000, title: center.isCurrent ? "Your current location" : "Search center" })
      .bindTooltip(escapeHtml(center.isCurrent ? "You are here" : center.name), { permanent: true, direction: "top", offset: [0, -20], className: "rez-center-tooltip" })
      .bindPopup(`<strong>${center.isCurrent ? "Your current location" : "Search center"}</strong><p>${escapeHtml(center.name)}</p><small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small>`)
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

  // Fullscreen, falling back to filling the window where the browser refuses it.
  useEffect(() => {
    const update = () => setExpanded(document.fullscreenElement === wrapper.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) setExpanded(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", escape);
    };
  }, [expanded]);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (wrapper.current?.requestFullscreen) await wrapper.current.requestFullscreen();
      else setExpanded((v) => !v);
    } catch {
      setExpanded((v) => !v);
    }
  };

  const recenter = () => {
    clearFocus();
    map?.setView(center.position, map.getZoom());
  };
  const showAll = () => {
    clearFocus();
    map?.fitBounds(L.latLngBounds([center.position, ...visible.map((i): LatLng => [i.lat, i.lng])]), { padding: [65, 65], maxZoom: 16 });
  };

  const message = locationError
    ? locationError
    : !markers.isFetching && !markers.isError && focus && visible.length === 0
      ? "No properties in this area. Tap outside the circle to go back."
      : markers.status;

  const count = visible.reduce((sum, i) => sum + (i.type === "listing" ? 1 : i.count), 0);

  return (
    <div
      ref={wrapper}
      role="region"
      aria-label="Property map"
      className={cn("absolute inset-0 flex flex-col bg-white", expanded && "fixed z-[1000]")}
    >
      <div className="relative min-h-0 flex-1">
        <LeafletMap
          points={points}
          initialView={start}
          fit={false}
          onViewChange={reportView}
          onMapReady={setMap}
          onPointClick={onPointClick}
          onBackgroundClick={onBackgroundClick}
          className="rez-map absolute inset-0 z-0"
        />

        {/* Below the search bar over the map. */}
        <div className="pointer-events-none absolute inset-x-4 top-[72px] z-[500] flex flex-wrap items-start justify-between gap-2">
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-rez-smoke bg-white px-3 py-2 shadow-rez-sm">
            <Crosshair aria-hidden className="size-4 shrink-0 text-[#3677d0]" />
            <span className="flex min-w-0 flex-col">
              <strong className="text-xs leading-tight">{center.isCurrent ? "Your current location" : center.name}</strong>
              <small className="text-[11px] leading-tight text-rez-graphite">
                {center.isCurrent ? "Searching around you" : "Selected search center"} · {focus ? `${visible.length} results in focused area` : `${count} viewport results`}
              </small>
            </span>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {focus && (
              <ToolButton onClick={clearFocus} icon={<X aria-hidden className="size-4" />}>
                Exit area
              </ToolButton>
            )}
            <ToolButton onClick={locate} icon={<LocateFixed aria-hidden className="size-4" />}>
              {locating ? "Locating…" : "Use my location"}
            </ToolButton>
            <ToolButton onClick={recenter} icon={<Crosshair aria-hidden className="size-4" />}>
              Recenter
            </ToolButton>
            <ToolButton onClick={showAll} icon={<Scan aria-hidden className="size-4" />}>
              Show all homes
            </ToolButton>
            <ToolButton onClick={() => setShowListings((v) => !v)} pressed={showListings} icon={<Rows3 aria-hidden className="size-4" />}>
              {showListings ? "Hide listings" : "Show listings"}
            </ToolButton>
            <ToolButton
              onClick={() => void toggleFullscreen()}
              pressed={expanded}
              label={expanded ? "Exit fullscreen map" : "Open fullscreen map"}
              icon={expanded ? <Minimize2 aria-hidden className="size-4" /> : <Maximize2 aria-hidden className="size-4" />}
            >
              {expanded ? "Exit fullscreen" : "Fullscreen"}
            </ToolButton>
          </div>
        </div>

        {showListings && railItems.length > 0 && (
          <div aria-label="Listings in this map area" className="absolute inset-x-0 bottom-0 z-[500] flex snap-x gap-2.5 overflow-x-auto bg-gradient-to-t from-[#18261fd9] to-transparent px-3.5 pt-2.5 pb-3 pr-16 scrollbar-none">
            {railItems.map((item, i) => (
              <RailCard key={`${mapItemId(item)}-${i}`} item={item} onOpenProject={setOpenProject} context={context} />
            ))}
          </div>
        )}

        {openProject && (
          <div className="absolute top-[128px] left-4 z-[510] flex max-h-[50%] w-[280px] max-w-[calc(100%-32px)] flex-col overflow-hidden rounded-lg border border-rez-smoke bg-white shadow-rez-md">
            <div className="flex items-center justify-between gap-2 border-b border-rez-smoke px-3 py-2.5">
              <strong className="text-sm">{projectNameOf(openProject) || "Project"}</strong>
              <button type="button" aria-label="Close project listings" onClick={() => setOpenProject(null)}>
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <div className="flex flex-col overflow-y-auto">
              {projectListings(openProject).map((l, i) => {
                const id = openableListingId(l.listingId);
                const price = itemPrice(l.price);
                const body = (
                  <>
                    <strong className="block text-[13px] font-semibold">{l.title}</strong>
                    <small className="text-xs text-rez-graphite">{price ? formatPrice(price) : "Price on request"}</small>
                  </>
                );
                return id ? (
                  <a key={i} href={propertyHref({ id })} className="border-b border-rez-smoke px-3 py-2.5 last:border-b-0 hover:bg-rez-cloud">
                    {body}
                  </a>
                ) : (
                  <div key={i} className="border-b border-rez-smoke px-3 py-2.5 last:border-b-0">
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {message && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "absolute left-1/2 z-[500] max-w-[calc(100%-100px)] -translate-x-1/2 rounded-lg border border-[#dee7d5] bg-[#fffffff5] px-[18px] py-[11px] text-center text-xs text-[#5c7051] shadow-[0_4px_18px_#203e2426]",
              showListings && railItems.length > 0 ? "bottom-[104px]" : "bottom-[22px]",
            )}
          >
            {message}
            {markers.isError && !locationError && (
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
            {center.isCurrent ? "Your location" : "Search center"}
          </span>
          <span className="flex items-center gap-1.5">
            <i aria-hidden className="size-2.5 rounded-full bg-[#326448]" />
            Property pin
          </span>
        </div>
        <span>
          {focus ? "Tap outside the circle to show all clusters" : "Tap the map to move the search pin"} · Zoom {zoom}
          {expanded ? " · Esc to exit" : ""}
        </span>
      </div>
    </div>
  );
}

/** A card in the rail along the bottom of the map. */
function RailCard({
  item,
  onOpenProject,
  context,
}: {
  item: ListingItem | ProjectItem;
  onOpenProject: (p: ProjectItem) => void;
  context: { city: string; intent: Intent; category: PropertyCategory };
}) {
  const className = "grid flex-[0_0_205px] snap-start gap-1 rounded-lg border border-white/30 bg-white px-3 py-2.5 text-left shadow-rez-sm";
  const head = (type: string, title: string, sub: string) => (
    <>
      <span className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.06em] text-rez-graphite uppercase">
        {type === "Project" && <Building2 aria-hidden className="size-3" />}
        {type}
      </span>
      <strong className="truncate text-[13px] leading-tight font-semibold">{title}</strong>
      <small className="text-xs text-rez-graphite">{sub}</small>
    </>
  );
  if (item.type === "project") {
    const name = projectNameOf(item);
    const content = head("Project", name || "Project", `${item.count} listings · tap to view`);
    if (projectListings(item).length) {
      return (
        <button type="button" className={className} onClick={() => onOpenProject(item)}>
          {content}
        </button>
      );
    }
    return (
      <a className={className} href={propertySearchHref({ ...context, q: name })}>
        {content}
      </a>
    );
  }
  const price = itemPrice(item.price);
  const id = openableListingId(item.listingId);
  const content = head("Listing", item.title, price ? formatPrice(price) : "Price on request");
  return id ? (
    <a className={className} href={propertyHref({ id })}>
      {content}
    </a>
  ) : (
    <div className={className} title="Listing page isn't available for this pin yet.">
      {content}
    </div>
  );
}
