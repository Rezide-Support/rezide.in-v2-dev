import { formatPrice } from "@/lib/format";
import type { RoomDimension } from "@/types/models";

/** "0.82 km", "12.4 km", "38 km" */
export function formatKm(km: number): string {
  if (km < 10) return `${km.toFixed(2).replace(/0$/, "")} km`;
  if (km < 100) return `${km.toFixed(1).replace(/\.0$/, "")} km`;
  return `${Math.round(km)} km`;
}

/** Decimal feet to feet-and-inches: 15.25 → `15' 3"`, 12 → `12'`. */
export function formatFeet(ft: number): string {
  let whole = Math.floor(ft);
  let inches = Math.round((ft - whole) * 12);
  if (inches === 12) {
    whole += 1;
    inches = 0;
  }
  return inches ? `${whole}' ${inches}"` : `${whole}'`;
}

/** Room floor area in sq ft, rounded to two decimals. */
export const roomArea = (r: Pick<RoomDimension, "length" | "width">) => Math.round(r.length * r.width * 100) / 100;

/** "₹ 6.1 Cr – 14 Cr", "₹ 92 L – 1.9 Cr", or "N/A" when either end is missing. */
export function formatPriceRange(from?: number, to?: number, opts: { monthly?: boolean } = {}): string {
  if (!from || !to) return "N/A";
  const a = formatPrice(from);
  const b = formatPrice(to).replace(/^₹\s?/, "");
  const range = from === to ? a : `${a} – ${b}`;
  return opts.monthly ? `${range} / mo` : range;
}

/** "728 – 794 sq ft" */
export const formatAreaRange = (min: number, max: number) =>
  min === max ? `${min.toLocaleString("en-IN")} sq ft` : `${min.toLocaleString("en-IN")} – ${max.toLocaleString("en-IN")} sq ft`;

/** "₹ 91,613" */
export const formatRupees = (n: number) => `₹ ${Math.round(n).toLocaleString("en-IN")}`;

/** OpenStreetMap directions between two points (opens in a new tab; no Google Maps). */
export const directionsHref = (from: [number, number], to: [number, number]) =>
  `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from[0].toFixed(5)}%2C${from[1].toFixed(5)}%3B${to[0].toFixed(5)}%2C${to[1].toFixed(5)}`;
