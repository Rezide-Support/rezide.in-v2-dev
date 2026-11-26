"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RemovableChip } from "@/components/common/chip";
import { SearchSelect } from "@/components/common/search-select";
import { Pagination } from "@/components/common/pagination";
import { ErrorState, EmptyState } from "@/components/common/feedback";
import { DEFAULT_CITY } from "@/lib/constants";
import { usePreferencesStore } from "@/stores/preferences";
import type { BuildingPage } from "@/services/building-projects";
import { buildingFilters, selectionValues } from "./building-criteria";
import { BuildingFilterDrawer, type BuildingGeography } from "./building-filter-drawer";
import { BuildingProjectCard } from "./building-project-card";
import { DirectoryToolbar } from "./directory-toolbar";

export function BuildingDirectory() {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const filters = buildingFilters(params);
  const city = params.get("city") || DEFAULT_CITY;
  const intent = params.get("intent") === "rent" ? "rent" : "buy";
  const appliedSearch = (params.get("searchQuery") ?? params.get("q")) || "";
  const [search, setSearch] = useState(appliedSearch);
  const [lastSearch, setLastSearch] = useState(appliedSearch);
  if (lastSearch !== appliedSearch) { setLastSearch(appliedSearch); setSearch(appliedSearch); }
  const [drawerOpen, setDrawerOpen] = useState(false);
  const setCity = usePreferencesStore(state => state.setCity);
  useEffect(() => { setCity(city); }, [city, setCity]);
  const geography: BuildingGeography = { region: selectionValues(params, "region"), sub_region: selectionValues(params, "sub_region"), locality: selectionValues(params, "locality") };
  const filterCount = Object.values(geography).reduce((count, items) => count + items.length, 0);
  const update = (patch: Record<string, string | string[] | number | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      next.delete(key);
      if (value !== undefined && value !== "" && (!Array.isArray(value) || value.length)) next.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
    if (!("page" in patch)) next.set("page", "1");
    window.history.pushState(null, "", `/properties?${next}`);
  };
  const searchFor = (name: string) => update({ searchQuery: name, q: undefined });
  const results = useQuery({
    queryKey: ["building-projects", filters],
    queryFn: async ({ signal }): Promise<BuildingPage> => {
      const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(filters), signal });
      if (!response.ok) throw new Error("Couldn't load projects.");
      return response.json();
    }, staleTime: 60_000,
  });
  const total = results.data?.result_count ?? 0;
  const first = total ? (filters.page - 1) * filters.pageSize + 1 : 0;
  const last = Math.min(filters.page * filters.pageSize, total);
  const leaveProjects = (view: string) => {
    if (view === "proj") return;
    // Geography belongs to Projects; never silently apply its filters to sale/rental listings.
    update({ view, region: undefined, sub_region: undefined, locality: undefined, searchQuery: undefined, q: appliedSearch, pageSize: undefined });
  };
  return <div className="property-page property-directory min-w-0 flex-1 bg-white px-4 pt-5 pb-24 md:px-8 short:pt-3">
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[18px] sm:gap-[clamp(12px,0.8vw,18px)] short:gap-2.5">
      <DirectoryToolbar city={city} intent={intent} category={params.get("type") || "homes"} view="proj" search={search} setSearch={setSearch} searchFor={searchFor} filterCount={filterCount} openFilters={() => setDrawerOpen(true)} changeView={leaveProjects} changeIntent={intent => update({ intent })} changeCategory={type => update({ type, view: "list" })} />
      {filterCount > 0 && <div className="flex flex-wrap items-center gap-2 [--spacing:0.25rem] [--text-sm:0.875rem]">{Object.entries(geography).flatMap(([key, names]) => names.map(name => <RemovableChip size="sm" key={`${key}:${name}`} label={name} onRemove={() => update({ [key]: names.filter(value => value !== name), ...(key === "region" ? { sub_region: undefined, locality: undefined } : key === "sub_region" ? { locality: undefined } : {}) })}>{name}</RemovableChip>))}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rez-smoke pt-3 text-sm text-rez-graphite">
        <p aria-live="polite">{results.isPending ? "Loading projects..." : total ? <>Showing <b className="text-black">{first} – {last}</b> of <b className="text-black">{total}</b> projects</> : "No projects found"}</p>
        <label className="flex items-center gap-3">Per page<SearchSelect aria-label="Results per page" value={filters.pageSize} onValueChange={value => update({ pageSize: Number(value) })}>{[9, 18, 27, 36].map(size => <option key={size} value={size}>{size}</option>)}</SearchSelect></label>
      </div>
      {results.isError ? <ErrorState message="Couldn't load projects. Please try again." onRetry={() => void results.refetch()} /> : results.isPending ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading projects">{Array.from({ length: 9 }, (_, index) => <div key={index} className="h-[300px] animate-pulse rounded-xl bg-rez-cloud" />)}</div> : results.data.data.length ? <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.data.data.map((item, index) => <li key={item.project.id} className="min-w-0"><BuildingProjectCard item={item} priority={index < 3} /></li>)}</ul> : <EmptyState title="No projects match your search." />}
      {results.isSuccess && <Pagination page={filters.page} pageCount={Math.max(1, Math.ceil(total / filters.pageSize))} onChange={page => { update({ page }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
    </div>
    <BuildingFilterDrawer open={drawerOpen} onOpenChange={setDrawerOpen} city={city} selected={geography} update={update} total={results.isSuccess ? total : undefined} />
  </div>;
}
