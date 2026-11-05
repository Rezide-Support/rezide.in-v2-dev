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

type BackendLandmark = { placeName?: string; latitude?: number; longitude?: number; distance?: number };

/** Null when the row can't be listed or put on the map. */
export function toLandmark(row: BackendLandmark): Landmark | null {
  const name = row.placeName?.trim();
  const { latitude, longitude, distance } = row;
  if (!name || typeof latitude !== "number" || typeof longitude !== "number" || typeof distance !== "number") return null;
  return { name, distanceKm: distance, coords: [latitude, longitude] };
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
  general_information?: { locality_name?: string };
  media?: { images?: { url?: string }[] };
};

/**
 * A locality's photo, found by name. Only an exact match counts: another
 * locality's photo would be wrong, and the caller has a fallback.
 */
export async function fetchLocalityPhoto(name: string): Promise<string | null> {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;
  const { data } = await api.post<{ data?: BackendLocality[] }>(
    "/Repository/Locality/filter",
    { sub_regions: null, regions: null, searchQuery: [name.trim()] },
    { params: { page: 1, pageSize: 5 } },
  );
  const match = data.data?.find((l) => l.general_information?.locality_name?.trim().toLowerCase() === wanted);
  const photo = match?.media?.images?.[0]?.url;
  return photo ? cdnImage(photo) : null;
}
