/**
 * Google Maps, as rezide.in's "Connectivity & Landmarks" uses it: the JavaScript API for the
 * landmark map and the Embed API for driving directions. Credentials come from
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in the deployment environment.
 */
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

/** rezide.in's landmark pin. */
export const RED_PIN = "https://maps.google.com/mapfiles/ms/icons/red-dot.png";

type LatLngLiteral = { lat: number; lng: number };

/** The few pieces of the Maps JavaScript API this app uses. */
export type GoogleMaps = {
  Map: new (el: HTMLElement, opts: { center: LatLngLiteral; zoom: number; clickableIcons?: boolean }) => GoogleMap;
  Marker: new (opts: { position: LatLngLiteral; map: GoogleMap; icon?: string; title?: string }) => GoogleMarker;
  InfoWindow: new () => GoogleInfoWindow;
  LatLngBounds: new () => { extend(p: LatLngLiteral): void };
};
export type GoogleMap = { fitBounds(bounds: unknown): void; setCenter(p: LatLngLiteral): void; setZoom(z: number): void };
export type GoogleMarker = { setMap(map: GoogleMap | null): void; addListener(event: "click", fn: () => void): void };
export type GoogleInfoWindow = { setContent(content: HTMLElement): void; open(opts: { map: GoogleMap; anchor: GoogleMarker }): void; close(): void };

type MapsWindow = Window & { google?: { maps?: GoogleMaps }; __rezideMapsReady?: () => void };

let loading: Promise<GoogleMaps> | null = null;

/** Loads the Maps JavaScript API once per page. Rejects (and lets a later call retry) if the script fails. */
export function loadGoogleMaps(): Promise<GoogleMaps> {
  // Through unknown: @types/google.maps (installed for the listing map) types window.google differently.
  const w = window as unknown as MapsWindow;
  if (w.google?.maps?.Map) return Promise.resolve(w.google.maps);
  loading ??= new Promise<GoogleMaps>((resolve, reject) => {
    w.__rezideMapsReady = () => (w.google?.maps ? resolve(w.google.maps) : reject(new Error("Google Maps did not load")));
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&callback=__rezideMapsReady`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Google Maps did not load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Google's driving route from `from` to `to`, for an iframe (rezide.in shows it in place of the map). */
export function directionsEmbedUrl(from: [number, number], to: [number, number]): string {
  const params = new URLSearchParams({
    key: GOOGLE_MAPS_API_KEY,
    origin: `${from[0]},${from[1]}`,
    destination: `${to[0]},${to[1]}`,
    mode: "driving",
  });
  return `https://www.google.com/maps/embed/v1/directions?${params}`;
}
