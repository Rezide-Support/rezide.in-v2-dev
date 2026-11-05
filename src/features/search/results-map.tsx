"use client";

import dynamic from "next/dynamic";

/** Leaflet is ~150 kB and browser-only, so it loads only when the map view opens. */
const loading = () => (
  <div className="flex h-full w-full items-center justify-center bg-rez-cloud text-sm text-rez-graphite">
    Loading map…
  </div>
);

export const ResultsMap = dynamic(() => import("./leaflet-map"), { ssr: false, loading });

/** The properties map view: the same map with search center, cluster focus and popups. */
export const MapExplorer = dynamic(() => import("./map-explorer"), { ssr: false, loading });
