"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Pagination } from "@/components/common/pagination";
import { SearchSelect } from "@/components/common/search-select";
import { RemovableChip } from "@/components/common/chip";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { DEFAULT_CITY } from "@/lib/constants";
import { locationQueries } from "@/lib/queries";
import { usePreferencesStore } from "@/stores/preferences";
import type { LocalityDirectoryPage } from "@/services/directory-localities";
import { selectionValues } from "./building-criteria";
import { BuildingFilterDrawer, type BuildingGeography } from "./building-filter-drawer";
import { DirectoryToolbar } from "./directory-toolbar";
import { localityFilters } from "./locality-criteria";
import { LocalityDirectoryCard } from "./locality-directory-card";

const grid = "grid grid-cols-1 gap-[12px] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function LocalityDirectory() {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const city = params.get("city") || DEFAULT_CITY;
  const intent = params.get("intent") === "rent" ? "rent" : "buy";
  const appliedSearch = params.get("searchQuery") ?? params.get("q") ?? "";
  const [search, setSearch] = useState(appliedSearch);
  const [previousSearch, setPreviousSearch] = useState(appliedSearch);
  if (previousSearch !== appliedSearch) { setPreviousSearch(appliedSearch); setSearch(appliedSearch); }
  const [drawerOpen, setDrawerOpen] = useState(false);
  const setCity = usePreferencesStore(state => state.setCity);
  useEffect(() => { setCity(city); }, [city, setCity]);
  // The shared master/ID cache avoids a separate city lookup on every filter change.
  const cityId = useQuery({ ...locationQueries.cityId(city), enabled: !!city });
  const filters = localityFilters(params, cityId.data);
  const selected: BuildingGeography = { region: selectionValues(params, "region"), sub_region: selectionValues(params, "sub_region"), locality: [] };
  const filterCount = selected.region.length + selected.sub_region.length;
  const regions = useQuery({ ...locationQueries.regions(cityId.data ?? ""), enabled: !!cityId.data && filterCount > 0 });
  const parentRegions = (regions.data ?? []).filter(region => !selected.region.length || selected.region.includes(region.id));
  const subQueries = useQueries({ queries: selected.sub_region.length ? parentRegions.map(region => locationQueries.subRegions(region.id)) : [] });
  const labels = new Map([...(regions.data ?? []), ...subQueries.flatMap(query => query.data ?? [])].map(place => [place.id, place.name]));
  const update = (patch: Record<string, string | string[] | number | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      next.delete(key);
      if (value !== undefined && value !== "" && (!Array.isArray(value) || value.length)) next.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
    if (!("page" in patch)) next.set("page", "1");
    window.history.pushState(null, "", `/properties?${next}`);
  };
  const results = useQuery({
    queryKey: ["locality-directory", filters], enabled: cityId.isSuccess, staleTime: 60_000,
    queryFn: async ({ signal }): Promise<LocalityDirectoryPage> => {
      const response = await fetch(`/api/localities?page=${filters.page}&pageSize=${filters.pageSize}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(filters.body), signal });
      if (!response.ok) throw new Error("Couldn't load localities.");
      return response.json();
    },
  });
  const total = results.data?.result_count ?? 0;
  const loading = cityId.isPending || results.isPending;
  const failed = cityId.isError || results.isError;
  const leaveLocalities = (view: string) => {
    if (view === "loc") return;
    // Locality filters are IDs; the Projects view uses names instead.
    update({ view, region: undefined, sub_region: undefined, locality: undefined, pageSize: undefined, searchQuery: undefined, q: appliedSearch });
  };
  const searchFor = (value: string) => update({ searchQuery: value, q: undefined });
  return <div className="property-page property-directory min-w-0 flex-1 bg-white px-4 pt-5 pb-24 md:px-8 short:pt-3">
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[18px] sm:gap-[clamp(12px,0.8vw,18px)] short:gap-2.5">
      <DirectoryToolbar city={city} intent={intent} category={params.get("type") || "homes"} view="loc" search={search} setSearch={setSearch} searchFor={searchFor} filterCount={filterCount} openFilters={() => setDrawerOpen(true)} changeView={leaveLocalities} changeIntent={intent => update({ intent })} changeCategory={type => update({ type })} />
      {filterCount > 0 && <div className="flex flex-wrap items-center gap-2 [--spacing:0.25rem] [--text-sm:0.875rem]">{(["region", "sub_region"] as const).flatMap(key => selected[key].map(id => <RemovableChip size="sm" key={`${key}:${id}`} label={labels.get(id) ?? (key === "region" ? "Region" : "Sub-region")} onRemove={() => update({ [key]: selected[key].filter(value => value !== id), ...(key === "region" ? { sub_region: undefined } : {}) })}>{labels.get(id) ?? (key === "region" ? "Region" : "Sub-region")}</RemovableChip>))}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rez-smoke pt-3 text-sm text-rez-graphite">
        <p aria-live="polite">{failed ? "Couldn't load localities." : loading ? "Loading localities..." : total ? <>Showing <b className="text-black">{(filters.page - 1) * filters.pageSize + 1} – {Math.min(filters.page * filters.pageSize, total)}</b> of <b className="text-black">{total}</b> localities</> : "No localities found"}</p>
        <label className="flex items-center gap-3">Per page<SearchSelect aria-label="Results per page" value={filters.pageSize} onValueChange={value => update({ pageSize: Number(value) })}>{[12, 24, 36, 48].map(size => <option key={size} value={size}>{size}</option>)}</SearchSelect></label>
      </div>
      {failed ? <ErrorState message="Couldn't load localities. Please try again." onRetry={() => { if (cityId.isError) void cityId.refetch(); else void results.refetch(); }} /> : loading ? <div className={grid} aria-label="Loading localities">{Array.from({ length: 12 }, (_, index) => <div key={index} className="h-[220px] animate-pulse rounded-xl bg-rez-cloud" />)}</div> : results.data?.data.length ? <ul className={grid}>{results.data.data.map((locality, index) => <li key={locality.id} className="min-w-0"><LocalityDirectoryCard locality={locality} city={city} priority={index < 4} /></li>)}</ul> : <EmptyState title="No localities match your search." />}
      {!failed && !loading && <Pagination page={filters.page} pageCount={Math.max(1, Math.ceil(total / filters.pageSize))} onChange={page => { update({ page }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
    </div>
    <BuildingFilterDrawer localities open={drawerOpen} onOpenChange={setDrawerOpen} city={city} selected={selected} update={update} total={results.isSuccess ? total : undefined} />
  </div>;
}
