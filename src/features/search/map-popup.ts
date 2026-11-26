import { isBackendId } from "@/lib/ids";
import { escapeHtml } from "@/lib/html";
export { escapeHtml } from "@/lib/html";
import { propertyHref } from "@/features/properties/property-card";
import { formatPrice } from "@/lib/format";
import { itemPrice, openableListingId, type ListingItem, type MapItem, type ProjectItem } from "@/services/map-search";
import { propertySearchHref } from "./criteria";
import type { MapPoint } from "./leaflet-map";
import type { Intent, Property, PropertyCategory } from "@/types/models";
import { toMapPoint } from "./use-map-markers";

/* Pin popups, as in GeoEstate's map. Built as HTML for Leaflet, so everything from the service is escaped. */


/** What links in a popup need. */
export type PopupContext = { city: string; intent: Intent; category: PropertyCategory; properties?: Property[] };


/** A project's name. Its id is the name in some data and a raw id in the rest. */
export const projectNameOf = (p: ProjectItem) => p.projectName?.trim() || (isBackendId(p.projectId) ? "" : p.projectId);

const addressOf = (i: ListingItem) => [i.locality, i.city].filter(Boolean).join(", ") || i.address || "";

const AREA_UNITS: Record<string, string> = { SQFT: "sq.ft" };

function listingSpecs(i: ListingItem) {
  const beds = i.bedrooms ?? (i.bhk ? parseFloat(i.bhk) : undefined);
  const unit = i.area_unit ? (AREA_UNITS[i.area_unit] ?? i.area_unit.toLowerCase().replaceAll("_", " ")) : "";
  return `${beds ?? "—"} beds · ${i.area ?? "—"} ${unit}`.trim();
}

function article(image: string | undefined, kind: string, title: string, address: string, value: string, extra: string, action: string) {
  return `<article class="rez-map-popup-item">
    <img src="${escapeHtml(image?.trim() || "/images/empty.gif")}" alt="${escapeHtml(title)}" />
    <small>${kind} · MAP RESULT</small>
    <h3>${escapeHtml(title)}</h3>
    ${address ? `<p>${escapeHtml(address)}</p>` : ""}
    <strong>${escapeHtml(value)}</strong>
    ${extra}
    ${action}
  </article>`;
}

function listingArticle(i: ListingItem, context: PopupContext) {
  const property = context.properties?.find(property => property.id === i.listingId || property.listingCode === i.listingId);
  const price = itemPrice(i.price);
  const id = openableListingId(i.listingId);
  const action = id
    ? `<a href="${escapeHtml(propertyHref({ id }))}">View property</a>`
    : `<span class="rez-map-popup-note">Listing page isn't available for this pin yet.</span>`;
  return article(property?.images[0], "LISTING", i.title, addressOf(i), price ? formatPrice(price) : "Price on request", `<span class="rez-map-popup-specs">${escapeHtml(listingSpecs(i))}</span>`, action);
}

/** The listings a project pin carries, as listing items. */
export const projectListings = (p: ProjectItem): ListingItem[] => (p.listings ?? []).map((l) => ({ ...l, type: "listing" as const, lat: l.lat ?? p.lat, lng: l.lng ?? p.lng }));

/** Everything at one spot in one popup; a project with its listings shows those. */
export function popupHtml(items: MapItem[], context: PopupContext): string {
  const rows = items.flatMap((item) => {
    if (item.type === "listing") return [listingArticle(item, context)];
    if (item.type === "project") {
      const listings = projectListings(item);
      if (listings.length) return listings.map(l => listingArticle(l, context));
      const name = projectNameOf(item);
      const href = propertySearchHref({ ...context, q: name });
      return [article(undefined, "PROJECT", name || "Project", "", `${item.count} listings`, "", `<a href="${escapeHtml(href)}">Explore listings</a>`)];
    }
    return [article(undefined, "CLUSTER", `${item.count} listings nearby`, "Explore this area", `${item.count} listings`, "", "")];
  });
  return `<div class="rez-map-popup-list">${rows.join("")}</div>`;
}

/** Markers for the items, one per exact spot, with their popup. `atMaxZoom`: a cluster can't split further. */
export function toMapPoints(items: MapItem[], context: PopupContext, atMaxZoom: boolean): MapPoint[] {
  const spots = new Map<string, MapItem[]>();
  for (const item of items) {
    const key = `${item.lat}:${item.lng}`;
    spots.set(key, [...(spots.get(key) ?? []), item]);
  }
  return [...spots.values()].map((group, index) => {
    const point = toMapPoint(group[0], index);
    const label = atMaxZoom && point.kind === "cluster" ? `${point.count} listings · at this exact spot` : point.label;
    const listingIds = group.flatMap(item => item.type === "listing"
      ? item.listingId ? [item.listingId] : []
      : item.type === "project" ? (item.listings ?? []).flatMap(listing => listing.listingId ? [listing.listingId] : []) : []);
    return { ...point, listingIds, label, title: point.kind === "listing" ? point.title : label, popupHtml: popupHtml(group, context) };
  });
}
