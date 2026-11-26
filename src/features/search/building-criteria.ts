import { toBackendCity } from "@/services/locations";

export const selectionValues = (params: URLSearchParams, key: string) =>
  [...new Set(params.getAll(key).flatMap(value => value.split(",")).map(value => value.trim()).filter(Boolean))];

export function buildingFilters(params: URLSearchParams) {
  const regions = selectionValues(params, "region");
  const subRegions = selectionValues(params, "sub_region");
  const localities = selectionValues(params, "locality");
  const geography = localities.length ? localities : subRegions.length ? subRegions : regions;
  const search = selectionValues(params, params.has("searchQuery") ? "searchQuery" : "q");
  const city = selectionValues(params, "city").map(toBackendCity);
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const size = Number(params.get("pageSize") ?? params.get("perPage") ?? params.get("per")) || 9;
  return {
    page,
    pageSize: [9, 18, 27, 36].includes(size) ? size : 9,
    project_names_localities_subRegions: [...new Set([...search, ...geography])],
    listingExist: "exist" as const,
    sortBy: "listingExist" as const,
    ...(city.length ? { city } : {}),
  };
}
