import { selectionValues } from "./building-criteria";

export function localityFilters(params: URLSearchParams, cityId?: string | null) {
  const values = (key: string) => { const selected = selectionValues(params, key); return selected.length ? selected : null; };
  const size = Number(params.get("pageSize") ?? params.get("per")) || 12;
  return {
    page: Math.max(1, Math.floor(Number(params.get("page")) || 1)),
    pageSize: [12, 24, 36, 48].includes(size) ? size : 12,
    body: {
      regions: values("region"),
      sub_regions: values("sub_region"),
      searchQuery: values(params.has("searchQuery") ? "searchQuery" : "q"),
      ...(cityId ? { city: cityId } : {}),
    },
  };
}
