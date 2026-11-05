"use client";

import { useCallback, useState } from "react";
import { CITY_CENTRES } from "@/lib/constants";

/** Haversine distance in km. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The closest supported city within `maxKm`, or null when none is near enough. */
export function nearestCity(lat: number, lng: number, maxKm = 80): string | null {
  let best: { city: string; km: number } | null = null;
  for (const [city, centre] of Object.entries(CITY_CENTRES)) {
    const km = distanceKm([lat, lng], centre);
    if (!best || km < best.km) best = { city, km };
  }
  return best && best.km <= maxKm ? best.city : null;
}

export type DetectState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "found"; city: string }
  | { status: "out-of-range" }
  | { status: "denied" }
  | { status: "unavailable"; reason: "unsupported" | "position" | "timeout" };

export const detectMessage = (s: DetectState): string | null => {
  switch (s.status) {
    case "locating":
      return "Finding your location…";
    case "found":
      return `Showing ${s.city}, based on your location.`;
    case "out-of-range":
      return "We don't have listings near your location yet. Pick a city below.";
    case "denied":
      return "Location access is blocked. Allow it in your browser settings, or pick a city below.";
    case "unavailable":
      return s.reason === "unsupported"
        ? "Your browser doesn't support location detection. Pick a city below."
        : s.reason === "timeout"
          ? "Finding your location took too long. Try again, or pick a city below."
          : "We couldn't determine your location. Try again, or pick a city below.";
    default:
      return null;
  }
};

/**
 * Uses the browser Geolocation API. Only the coarse position is used, locally,
 * to choose the nearest city; nothing is sent to a server.
 */
export function useDetectCity(onFound: (city: string) => void) {
  const [state, setState] = useState<DetectState>({ status: "idle" });

  const detect = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "unavailable", reason: "unsupported" });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const city = nearestCity(pos.coords.latitude, pos.coords.longitude);
        if (city) {
          setState({ status: "found", city });
          onFound(city);
        } else {
          setState({ status: "out-of-range" });
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setState({ status: "denied" });
        else if (err.code === err.TIMEOUT) setState({ status: "unavailable", reason: "timeout" });
        else setState({ status: "unavailable", reason: "position" });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, [onFound]);

  return { state, detect, reset: () => setState({ status: "idle" }) };
}
