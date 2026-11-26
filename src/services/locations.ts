import { getQueryClient } from "@/lib/query-client";
import { responseArray } from "@/lib/arrays";
import { api } from "@/lib/api/client";

/*
 * Cities and search suggestions from the Rezide backend, the same endpoints the
 * rezide.in web app uses (its city picker and search bars). Both are public
 * reads and are never mocked. Contract: docs/API.md → Locations and search.
 */

/**
 * Cities the backend's city master spells differently from how we show them,
 * keyed by the master's name (as rezide.in shows "Bangalore" as Bengaluru).
 */
const DISPLAY_NAMES: Record<string, string> = { Bangalore: "Bengaluru" };
const BACKEND_NAMES = Object.fromEntries(Object.entries(DISPLAY_NAMES).map(([backend, shown]) => [shown, backend]));

/** How a city master name is shown: Bangalore → Bengaluru. */
export const cityLabel = (name: string) => DISPLAY_NAMES[name] ?? name;

/** The city master's name for a shown city, for requests that filter by city: Bengaluru → Bangalore. */
export const toBackendCity = (name: string) => BACKEND_NAMES[name] ?? name;

type CityMasterRow = { _id?: string; value?: string; label?: string; name?: string };
/** Names and ID lookups share one raw city-master query and in-flight request. */
export function fetchCityMaster(): Promise<CityMasterRow[]> {
  return getQueryClient().ensureQueryData({queryKey:["locations","city-master"],staleTime:5*60_000,queryFn:async()=>{
    const {data}=await api.get("/master/city/search",{params:{page:1,pageSize:5000}});
    return responseArray<CityMasterRow>(data);
  }});
}
/** A city's shown name from its city-master id (localities name their city by id). */
export async function fetchCityName(cityId: string): Promise<string | undefined> {
  const row = (await fetchCityMaster()).find((r) => r._id === cityId);
  const name = row?.label?.trim();
  return name ? cityLabel(name) : undefined;
}
export async function fetchCities(): Promise<string[]> {
  return [...new Set((await fetchCityMaster()).map(row=>cityLabel(row.label?.trim() || "")).filter(Boolean))];
}
/** A place the backend knows by id, in the region → sub-region → locality tree. */
export type GeoPlace = { id: string; name: string };

/** A–Z, as rezide.in lists them, one row per name (the pickers choose by name). */
const toPlaces = (rows: { id?: string; name?: string }[]): GeoPlace[] => {
  const places = rows.flatMap((r) => {
    const name = r.name?.trim();
    return r.id && name ? [{ id: r.id, name }] : [];
  });
  return [...new Map(places.map((p) => [p.name, p])).values()].sort((a, b) => a.name.localeCompare(b.name));
};

/** The city master's id for a shown city, or null when it isn't in the master. */
export async function fetchCityId(city: string): Promise<string | null> {
  const name=toBackendCity(city);
  const row=(await fetchCityMaster()).find(row=>[row.label, row.name, row.value].some(value => value?.trim() === name));
  return row?._id ?? (row?.value?.trim() !== name ? row?.value : null) ?? null;
}
type BackendPlace = { _id?: string; name?: string };

/** A city's regions. Many cities have none yet. */
export async function fetchRegions(cityId?: string): Promise<GeoPlace[]> {
  const { data } = await api.get<{ data?: BackendPlace[] }>("/master/region", { params: cityId ? { city: cityId } : undefined });
  return [...new Map(responseArray<BackendPlace>(data).flatMap(r => r._id && r.name?.trim() ? [[r._id, { id: r._id, name: r.name.trim() }]] as const : [])).values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** One page of a region's localities (sub-regions), searched by name, as rezide.in's project Location filter loads them. */
export type RegionLocalityPage = { items: GeoPlace[]; total: number; page: number };

export async function fetchRegionLocalities(regionId: string, searchQuery: string, page: number, pageSize = 10): Promise<RegionLocalityPage> {
  const { data } = await api.get<{ totalCount?: number; data?: BackendPlace[] }>("/repository/sub_region/by-region", {
    params: { region: regionId, page, pageSize, searchQuery },
  });
  // Kept in the backend's order (pages must line up); empty names are dropped.
  const items = responseArray<BackendPlace>(data).flatMap((r) => (r._id && r.name?.trim() ? [{ id: r._id, name: r.name.trim() }] : []));
  return { items, total: Number(data?.totalCount) || 0, page };
}

export async function fetchSubRegions(regionId: string): Promise<GeoPlace[]> {
  const { data } = await api.post<BackendPlace[]>("/repository/sub_region/regions", { regions: [regionId] });
  return toPlaces(responseArray<BackendPlace>(data).map((r) => ({ id: r._id, name: r.name })));
}

export async function fetchSubRegionLocalities(subRegionId: string): Promise<GeoPlace[]> {
  const { data } = await api.post<{ _id?: string; general_information?: { locality_name?: string } }[]>("/repository/locality/sub-regions", {
    subRegions: [subRegionId],
  });
  return toPlaces(responseArray<{ _id?: string; general_information?: { locality_name?: string } }>(data).map((l) => ({ id: l._id, name: l.general_information?.locality_name })));
}

/** What a suggestion points at. The backend's `source` values, normalised. */
export type SuggestionKind = "locality" | "subRegion" | "project" | "developer" | "realtor" | "other";

export type SearchSuggestion = {
  id: string;
  name: string;
  kind: SuggestionKind;
  /** City the place or project is in, when the backend says. */
  city?: string;
};

/** Which directory the typeahead searches, as rezide.in's search bars choose. */
export type SuggestionScope = "all" | "broker" | "developer";

const SCOPE_SUFFIX: Record<SuggestionScope, string> = { all: "", broker: "/broker", developer: "/developer" };

const KINDS: Record<string, SuggestionKind> = {
  locality: "locality",
  "sub region": "subRegion",
  project: "project",
  developer: "developer",
  broker: "realtor",
  agent: "realtor",
};

/** A suggestion row as the backend returns it. */
type BackendSuggestion = { _id?: string; id?: string; name?: string; label?: string; source?: string; city?: string };

export const toSuggestion = (row: BackendSuggestion): SearchSuggestion => ({
  id: String(row._id ?? row.id ?? ""),
  name: (row.name ?? row.label ?? "").trim(),
  kind: KINDS[(row.source ?? "").trim().toLowerCase()] ?? "other",
  city: row.city ? cityLabel(row.city) : undefined,
});

/**
 * Typeahead suggestions for the search bars (localities, sub-regions, projects…).
 * The text is encoded into the path, so "/" and "#" can't break the request.
 */
export async function fetchSearchSuggestions(
  query: string,
  { city, scope = "all" }: { city?: string; scope?: SuggestionScope } = {},
): Promise<SearchSuggestion[]> {
  const text = query.trim();
  if (text === "") return [];
  const { data } = await api.get<{ result?: BackendSuggestion[] }>(
    `/repository/locality/search/list/${encodeURIComponent(text)}${SCOPE_SUFFIX[scope]}`,
    { params: city ? { city: toBackendCity(city) } : undefined },
  );
  return responseArray<BackendSuggestion>(data?.result).map(toSuggestion).filter((s) => s.name !== "");
}
