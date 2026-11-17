"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useRouter } from "next/navigation";
import { escapeHtml } from "@/lib/html";
import { useEffect, useRef } from "react";
import type { LatLng } from "@/types/models";

/**
 * A marker. Without a `kind` it's a price label; with one it's a GeoEstate-style pin
 * whose `label` shows on hover. "cluster" and "project" are groups showing `count`,
 * and clicking one zooms in on it.
 */
export type MapPoint = {
  id: string;
  /** Listing IDs represented by this pin, including grouped listings. */
  listingIds?: string[];
  position: LatLng;
  label: string;
  title: string;
  href?: string;
  kind?: "listing" | "cluster" | "project";
  /** Listings behind a cluster or project pin. */
  count?: number;
  /** The service's id for a cluster pin. */
  clusterId?: string;
  /** A popup on click, as HTML. Whoever builds it must escape what it shows. */
  popupHtml?: string;
};

/** The part of the map in view: [west, south, east, north], and the whole zoom level. */
export type MapView = { bbox: [number, number, number, number]; zoom: number };


/** Wait for the map to settle (a zoom fires zoomend and moveend; wheel zooms fire several) before reporting the view. */
const SETTLE_MS = 400;
/** Clicking a group zooms in this many levels; the next view change loads what's inside. */
const GROUP_ZOOM_STEP = 2;
const MAX_ZOOM = 18;

const HOUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/></svg>';
const BUILDING_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5.5L14 3v18M14 8h6v13M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1M2 21h20"/></svg>';

/**
 * Markers with a `kind` use GeoEstate's pins (styles in globals.css): a green house pin per
 * listing, a blue count circle per cluster, a green building pin with a count badge per project.
 * Markers without one keep the price label (the listing page's map).
 */
function markerIcon(p: MapPoint): L.DivIcon {
  if (p.kind) {
    const count = escapeHtml(p.count === undefined ? "" : String(p.count));
    const html =
      p.kind === "project"
        ? `<span class="rez-project-pin"><span>${BUILDING_ICON}</span><b>${count}</b></span>`
        : p.kind === "cluster"
          ? `<span class="rez-pin rez-pin--cluster"><span>${count}</span></span>`
          : `<span class="rez-pin"><span>${HOUSE_ICON}</span></span>`;
    return L.divIcon({ className: "rez-pin-marker", html, iconSize: [36, 44], iconAnchor: [18, 44] });
  }
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<span data-marker="${escapeHtml(p.id)}" style="transform:translate(-50%,-100%);display:inline-block;white-space:nowrap;padding:7px 11px;border-radius:999px;background:#000;color:#E0E0E0;font:600 12px/1 var(--font-montserrat),sans-serif;box-shadow:0 4px 12px rgba(2,17,12,.25);cursor:pointer">${escapeHtml(p.label)}</span>`,
  });
}

/** Leaflet map with price-label markers. Loaded on demand (see results-map.tsx). */
export default function LeafletMap({
  points,
  highlightedId,
  onSelect,
  onHover,
  onViewChange,
  initialView,
  fit = true,
  onMapReady,
  onPointClick,
  onBackgroundClick,
  className,
}: {
  points: MapPoint[];
  highlightedId?: string | null;
  onSelect?: (point: MapPoint) => void;
  /** Pin hovered or focused (id), or left (null): lets the results list highlight the matching card. */
  onHover?: (id: string | null) => void;
  /** Reported once the map is ready and after each pan or zoom settles (markers that follow the view). */
  onViewChange?: (view: MapView) => void;
  /** Where the map starts, instead of fitting the first points. */
  initialView?: { center: LatLng; zoom: number };
  /** Fit the map to the points whenever they change (off for markers that follow the view). */
  fit?: boolean;
  /** The map, once it exists, for callers that draw on it or move it. */
  onMapReady?: (map: L.Map | null) => void;
  /** Replaces what a pin click does (zoom into a group, or `onSelect`). A `popupHtml` still opens. */
  onPointClick?: (point: MapPoint) => void;
  /** A click on the map itself, not on a pin, popup or control. */
  onBackgroundClick?: (position: LatLng) => void;
  className?: string;
}) {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const onViewChangeRef = useRef(onViewChange);
  const initialViewRef = useRef(initialView);
  const onMapReadyRef = useRef(onMapReady);
  const onPointClickRef = useRef(onPointClick);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
    onViewChangeRef.current = onViewChange;
    onMapReadyRef.current = onMapReady;
    onPointClickRef.current = onPointClick;
    onBackgroundClickRef.current = onBackgroundClick;
  }, [onSelect, onHover, onViewChange, onMapReady, onPointClick, onBackgroundClick]);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { scrollWheelZoom: true, zoomControl: false, maxZoom: MAX_ZOOM });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    // Delegate only ordinary same-origin link activations; modified clicks keep browser behavior.
    const navigatePopup = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(".leaflet-popup a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || !["http:", "https:"].includes(url.protocol)) return;
      event.preventDefault();
      routerRef.current.push(`${url.pathname}${url.search}${url.hash}`);
    };
    m.getContainer().addEventListener("click", navigatePopup);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const start = initialViewRef.current;
    if (start) m.setView(start.center, start.zoom);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const report = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const b = m.getBounds();
        onViewChangeRef.current?.({ bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: Math.round(m.getZoom()) });
      }, SETTLE_MS);
    };
    m.on("moveend", report);
    if (start) report();
    m.on("click", (event: L.LeafletMouseEvent) => {
      const point = event.latlng.wrap();
      if (Math.abs(point.lat) <= 90) {
        m.closePopup();
        onBackgroundClickRef.current?.([point.lat, point.lng]);
      }
    });
    // Fullscreen and layout changes resize the map without a window resize.
    const observer = new ResizeObserver(() => m.invalidateSize({ pan: false }));
    observer.observe(el.current);
    onMapReadyRef.current?.(m);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      onMapReadyRef.current?.(null);
      m.off("moveend", report);
      m.getContainer().removeEventListener("click", navigatePopup);
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const group = layer.current;
    if (!m || !group) return;
    group.clearLayers();
    markers.current.clear();
    for (const p of points) {
      const marker = L.marker(p.position, {
        title: p.title,
        alt: p.title,
        keyboard: true,
        riseOnHover: true,
        icon: markerIcon(p),
      });
      // GeoEstate shows the price (or "N listings · tap to zoom") above the pin on hover.
      if (p.kind) marker.bindTooltip(escapeHtml(p.label), { direction: "top", offset: [0, -40] });
      if (p.popupHtml) marker.bindPopup(p.popupHtml, { className: "rez-map-popup", minWidth: 240, maxWidth: 290, offset: [0, -40] });
      marker.on("click", () => {
        if (onPointClickRef.current) onPointClickRef.current(p);
        else if (p.kind === "cluster" || p.kind === "project") m.setView(p.position, Math.min(m.getZoom() + GROUP_ZOOM_STEP, MAX_ZOOM));
        else onSelectRef.current?.(p);
      });
      marker.on("mouseover", () => onHoverRef.current?.(p.id));
      marker.on("mouseout", () => onHoverRef.current?.(null));
      marker.addTo(group);
      // Keyboard users get the same card highlight as mouse users.
      const node = marker.getElement();
      // Leaflet maps Enter to click; Space needs its own button-style activation.
      node?.addEventListener("keydown", event => {
        if (event.key !== " ") return;
        event.preventDefault();
        if (!event.repeat) marker.fire("click");
      });
      node?.addEventListener("focus", () => onHoverRef.current?.(p.id));
      node?.addEventListener("blur", () => onHoverRef.current?.(null));
      markers.current.set(p.id, marker);
    }
    if (fit) {
      if (points.length) {
        m.fitBounds(L.latLngBounds(points.map((p) => p.position)), { padding: [60, 60], maxZoom: 14 });
      } else {
        m.setView([20.59, 78.96], 4);
      }
    }
    const t = setTimeout(() => m.invalidateSize(), 50);
    return () => clearTimeout(t);
  }, [points, fit]);

  useEffect(() => {
    const activeIds = new Set(points.filter(point => point.id === highlightedId || point.listingIds?.includes(highlightedId ?? "")).map(point => point.id));
    markers.current.forEach((marker, id) => {
      const element = marker.getElement();
      const on = activeIds.has(id);
      element?.classList.toggle("is-active", on);
      marker.setZIndexOffset(on ? 1000 : 0);
      if (on) marker.openTooltip();
      else marker.closeTooltip();
      const node = element?.querySelector<HTMLElement>("[data-marker]");
      if (!node) return;
      node.style.background = on ? "#A3835F" : "#000";
      node.style.color = on ? "#000" : "#E0E0E0";
      marker.setZIndexOffset(on ? 1000 : 0);
    });
  }, [highlightedId, points]);

  return <div ref={el} className={className} role="region" aria-label="Map of results" />;
}
