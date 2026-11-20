export const localityCategories = [["Schools", "school"], ["Railway Stations", "train_station"], ["Metro Stations", "subway_station"], ["Airports", "airport"], ["Malls", "mall"], ["Hospitals", "hospital"]] as const;
export type LocalityLandmark = { _id: string; placeName: string; latitude: number; longitude: number; distance: number; icon: string; placeId?: string; projectId?: string; category?: string; icon_background_color?: string };
export function validCoordinates(lat: unknown, lng: unknown): boolean {
  return lat != null && lng != null && String(lat).trim() !== "" && String(lng).trim() !== "" && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;
}
export function httpsImage(value: unknown): string {
  if (typeof value !== "string") return "";
  try { const url = new URL(value); if (!/^https?:$/.test(url.protocol)) return ""; url.protocol = "https:"; return url.href; } catch { return ""; }
}

export function localityDirectionsUrl(key: string, origin: [number, number], destination: [number, number]) {
  return `https://www.google.com/maps/embed/v1/directions?${new URLSearchParams({ key, origin: origin.join(","), destination: destination.join(","), mode: "driving" })}`;
}
