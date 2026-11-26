import { api } from "@/lib/api/client";
import type { Landmark, LandmarkCategory, LandmarkGroup } from "@/types/models";
import { cdnImage } from "./property-mapper";

/*
 * Localities and nearby landmarks from the Rezide backend, the same endpoints as
 * rezide.in's localityApiSlice (public reads, never mocked).
 * Contract: docs/API.md → Localities.
 */

/** The landmark tabs and the `category` the backend knows each by, as on rezide.in. */
const LANDMARK_CATEGORIES: [LandmarkCategory, string][] = [
  ["Schools", "school"],
  ["Railway Stations", "train_station"],
  ["Metro Stations", "subway_station"],
  ["Airports", "airport"],
  ["Malls", "mall"],
  ["Hospitals", "hospital"],
];

/** How many landmarks rezide.in asks for per category. */
const LANDMARKS_PER_CATEGORY = 4;

type BackendLandmark = { placeName?: string; latitude?: number | string; longitude?: number | string; distance?: number | string; icon?: string };

/** Google's place icon, over https only (the page is https, and the CSP allows Google's static hosts). */
const placeIcon = (icon: unknown) => {
  if (typeof icon !== "string") return undefined;
  const url = icon.trim().replace(/^http:\/\//i, "https://");
  return /^https:\/\/maps\.gstatic\.com\//i.test(url) ? url : undefined;
};

/** A finite number from a number or numeric string (the backend sends `distance` as a string), else null. */
const toNumber = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Null when the row can't be listed or put on the map. */
export function toLandmark(row: BackendLandmark): Landmark | null {
  const name = row.placeName?.trim();
  const latitude = toNumber(row.latitude);
  const longitude = toNumber(row.longitude);
  const distance = toNumber(row.distance);
  if (!name || latitude === null || longitude === null || distance === null) return null;
  const icon = placeIcon(row.icon);
  return { name, distanceKm: distance, coords: [latitude, longitude], ...(icon ? { icon } : {}) };
}

/** One row per place: the list is keyed by name, and the backend can repeat a place. */
const uniqueByName = (items: Landmark[]) => [...new Map(items.map((l) => [l.name, l])).values()];

/** Landmarks around a project, per category. Landmarks belong to projects, so a listing needs one. */
export async function fetchLandmarks(projectId: string): Promise<LandmarkGroup[]> {
  return Promise.all(
    LANDMARK_CATEGORIES.map(async ([category, backendCategory]) => {
      const { data } = await api.get<{ data?: BackendLandmark[] }>(`/repository/locality/landmark/${encodeURIComponent(projectId)}`, {
        params: { category: backendCategory, pageSize: LANDMARKS_PER_CATEGORY },
      });
      const items = (data.data ?? []).map(toLandmark).filter((l): l is Landmark => l !== null);
      return { category, items: uniqueByName(items) };
    }),
  );
}

type BackendLocality = {
  _id?: string;
  general_information?: {
    locality_name?: string;
    city?: string;
    description?: string;
    what_to_expect?: string;
    the_lifestyle?: string;
    unexpected_appeal?: string;
    the_market?: string;
  };
  media?: { images?: { url?: string }[] };
};

/**
 * A locality found by name: its id (for its page) and photo. The photo needs an exact name
 * match (another locality's photo would be wrong, and the caller has a fallback); the id, as
 * rezide.in's "Explore" link, falls back to the search's first result.
 */
export async function findLocality(name: string): Promise<{ id?: string; photo: string | null } | null> {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;
  const { data } = await api.post<{ data?: BackendLocality[] }>(
    "/Repository/Locality/filter",
    { sub_regions: null, regions: null, searchQuery: [name.trim()] },
    { params: { page: 1, pageSize: 5 } },
  );
  const rows = data.data ?? [];
  const match = rows.find((l) => l.general_information?.locality_name?.trim().toLowerCase() === wanted);
  const photo = match?.media?.images?.[0]?.url;
  const id = (match ?? rows[0])?._id;
  return { id: id && /^[a-f0-9]{24}$/i.test(id) ? id : undefined, photo: photo ? cdnImage(photo) : null };
}

/** A locality's photo, found by name (see findLocality). */
export async function fetchLocalityPhoto(name: string): Promise<string | null> {
  return (await findLocality(name))?.photo ?? null;
}

/** rezide.in's locality page: GET /Repository/Locality/{id}. */
export type LocalityDetail = {
  id: string;
  name: string;
  /** The city's name, for the "Properties for rent / sale" links and the map. */
  city?: string;
  description: string;
  whatToExpect: string;
  lifestyle: string;
  unexpectedAppeal: string;
  market: string;
  images: string[];
};

/** One locality, or null when the backend doesn't have it. */
export async function fetchLocality(id: string, cityName?: (cityId: string) => Promise<string | undefined>): Promise<LocalityDetail | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  const { data } = await api.get<BackendLocality>(`/Repository/Locality/${encodeURIComponent(id)}`);
  const g = data?.general_information;
  const name = g?.locality_name?.trim();
  if (!data?._id || !name) return null;
  const text = (s?: string) => s?.trim() ?? "";
  return {
    id: data._id,
    name,
    city: g?.city && cityName ? await cityName(g.city).catch(() => undefined) : undefined,
    description: text(g?.description),
    whatToExpect: text(g?.what_to_expect),
    lifestyle: text(g?.the_lifestyle),
    unexpectedAppeal: text(g?.unexpected_appeal),
    market: text(g?.the_market),
    images: (data.media?.images ?? []).map((i) => i.url?.trim() ?? "").filter(Boolean).map(cdnImage),
  };
}

/** A locality card in the properties page's Localities tab, as rezide.in's NeighborhoodCard. */
export type LocalityListItem = { id: string; name: string; images: string[]; rent: number; sale: number };
export type LocalityListPage = { items: LocalityListItem[]; total: number; page: number; pageSize: number };
export type LocalityListFilters = { cityId?: string; regionId?: string; subRegionId?: string; q?: string; page: number; pageSize?: number };

/**
 * rezide.in's /find-property/locality list: POST /Repository/Locality/filter (12 a page), filtered by
 * city, region, sub-region and a locality name (an exact name, as its search picks one).
 */
export async function fetchLocalityList({ cityId, regionId, subRegionId, q, page, pageSize = 12 }: LocalityListFilters): Promise<LocalityListPage> {
  const { data } = await api.post<{ data?: (BackendLocality & { total_listing_rental_count?: number; total_listing_sale_count?: number })[]; result_count?: number }>(
    "/Repository/Locality/filter",
    {
      sub_regions: subRegionId ? [subRegionId] : null,
      regions: regionId ? [regionId] : null,
      searchQuery: q?.trim() ? [q.trim()] : null,
      ...(cityId ? { city: cityId } : {}),
    },
    { params: { page, pageSize } },
  );
  const items = (data?.data ?? []).flatMap((l) => {
    const name = l.general_information?.locality_name?.trim();
    if (!l._id || !name) return [];
    return [
      {
        id: l._id,
        name,
        images: (l.media?.images ?? []).map((i) => i.url?.trim() ?? "").filter(Boolean).slice(0, 5).map(cdnImage),
        rent: Number(l.total_listing_rental_count) || 0,
        sale: Number(l.total_listing_sale_count) || 0,
      },
    ];
  });
  return { items, total: Number(data?.result_count) || 0, page, pageSize };
}
