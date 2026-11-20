"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, RED_PIN, type GoogleInfoWindow, type GoogleMap, type GoogleMaps, type GoogleMarker } from "@/lib/google-maps";
import { cn } from "@/lib/utils";
import type { Landmark, LatLng } from "@/types/models";

/** A popup's text, built as nodes so a place name is never read as HTML. */
function popup(l: Landmark) {
  const box = document.createElement("div");
  box.style.cssText = "font-size:14px;font-weight:600";
  const name = document.createElement("p");
  name.style.margin = "0";
  name.textContent = l.name;
  const distance = document.createElement("p");
  distance.style.cssText = "margin:0;font-size:12px";
  distance.textContent = `Distance: ${l.distanceKm.toFixed(2)} km`;
  box.append(name, distance);
  return box;
}

/**
 * rezide.in's landmark map: a Google map around the project with a red pin per landmark of the
 * chosen tab, zoomed to fit them. Clicking a pin opens its name and distance.
 */
export function LandmarksMap({ center, landmarks, className }: { center: LatLng; landmarks: Landmark[]; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const maps = useRef<GoogleMaps | null>(null);
  const map = useRef<GoogleMap | null>(null);
  const info = useRef<GoogleInfoWindow | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [lat, lng] = center;

  useEffect(() => {
    let live = true;
    loadGoogleMaps().then(
      (g) => {
        if (!live || !el.current) return;
        maps.current = g;
        map.current = new g.Map(el.current, { center: { lat, lng }, zoom: 14, clickableIcons: false });
        info.current = new g.InfoWindow();
        setState("ready");
      },
      () => live && setState("error"),
    );
    return () => {
      live = false;
    };
    // The map is made once; later centre changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = maps.current;
    const m = map.current;
    if (state !== "ready" || !g || !m) return;
    info.current?.close();
    const pins: GoogleMarker[] = landmarks.map((l) => {
      const pin = new g.Marker({ position: { lat: l.coords[0], lng: l.coords[1] }, map: m, icon: RED_PIN, title: l.name });
      pin.addListener("click", () => {
        info.current?.setContent(popup(l));
        info.current?.open({ map: m, anchor: pin });
      });
      return pin;
    });
    if (landmarks.length) {
      const bounds = new g.LatLngBounds();
      for (const l of landmarks) bounds.extend({ lat: l.coords[0], lng: l.coords[1] });
      m.fitBounds(bounds);
    } else {
      m.setCenter({ lat, lng });
      m.setZoom(14);
    }
    return () => pins.forEach((p) => p.setMap(null));
  }, [state, landmarks, lat, lng]);

  return (
    <div className={cn("relative bg-rez-cloud", className)}>
      <div ref={el} className="absolute inset-0" aria-label="Map of nearby landmarks" role="region" />
      {state !== "ready" && (
        <p role={state === "error" ? "alert" : "status"} className="absolute inset-0 flex items-center justify-center text-sm text-rez-graphite">
          {state === "error" ? "Error loading maps" : "Loading Map..."}
        </p>
      )}
    </div>
  );
}
