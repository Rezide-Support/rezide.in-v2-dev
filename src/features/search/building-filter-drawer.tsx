"use client";

import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { locationQueries } from "@/lib/queries";
import type { GeoPlace } from "@/services/locations";
import { ToggleChip } from "@/components/common/chip";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export type BuildingGeography = { region: string[]; sub_region: string[]; locality: string[] };
const sorted = (values: GeoPlace[]) => [...new Map(values.map(place => [place.id, place])).values()].sort((a, b) => a.name.localeCompare(b.name));

export function BuildingFilterDrawer({ open, onOpenChange, city, selected, update, total, localities = false }: {
  open: boolean; onOpenChange: (open: boolean) => void; city: string;
  selected: BuildingGeography; update: (patch: Partial<BuildingGeography>) => void; total?: number; localities?: boolean;
}) {
  const [regionSearch, setRegionSearch] = useState("");
  const cityId = useQuery({ ...locationQueries.cityId(city), enabled: open && !!city });
  const regions = useQuery({ ...locationQueries.regions(cityId.data ?? ""), enabled: open && (!city || cityId.isSuccess) });
  // Resolve URL names to internal IDs. When only a child is present, search the city's tree.
  const optionValue = (option: GeoPlace) => localities ? option.id : option.name;
  const regionParents = (regions.data ?? []).filter(option => selected.region.length ? selected.region.includes(optionValue(option)) : selected.sub_region.length || selected.locality.length);
  const subQueries = useQueries({ queries: regionParents.map(parent => ({ ...locationQueries.subRegions(parent.id), enabled: open })) });
  const subRegions = sorted(subQueries.flatMap(query => query.data ?? []));
  const localityParents = localities ? [] : subRegions.filter(option => selected.sub_region.length ? selected.sub_region.includes(option.name) : selected.locality.length);
  const localityQueries = useQueries({ queries: localityParents.map(parent => ({ ...locationQueries.localities(parent.id), enabled: open })) });
  const localityOptions = sorted(localityQueries.flatMap(query => query.data ?? []));
  const toggle = (key: keyof BuildingGeography, name: string) => {
    const values = selected[key].includes(name) ? selected[key].filter(value => value !== name) : [...selected[key], name];
    update({ [key]: values, ...(key === "region" ? { sub_region: [], locality: [] } : key === "sub_region" ? { locality: [] } : {}) });
  };
  const groups = [
    { key: "region" as const, title: "Region", options: regions.data ?? [], loading: cityId.isFetching || regions.isFetching, failed: cityId.isError || regions.isError, retry: () => { void cityId.refetch(); void regions.refetch(); }, hint: "No regions available for this city." },
    { key: "sub_region" as const, title: "Sub-region", options: subRegions, loading: subQueries.some(query => query.isFetching), failed: subQueries.some(query => query.isError), retry: () => subQueries.forEach(query => void query.refetch()), hint: "Select a region to load sub-regions." },
    { key: "locality" as const, title: "Locality", options: localityOptions, loading: localityQueries.some(query => query.isFetching), failed: localityQueries.some(query => query.isError), retry: () => localityQueries.forEach(query => void query.refetch()), hint: "Select a sub-region to load localities." },
  ];
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
      <SheetHeader className="border-b border-rez-smoke px-7 py-7">
        <span className="eyebrow text-rez-graphite">{localities ? "Locality filters" : "Project filters"}</span>
        <SheetTitle className="text-2xl font-semibold">{localities ? "Localities" : "Projects"} in {city}</SheetTitle>
        <SheetDescription className="sr-only">{localities ? "Filter localities by region and sub-region." : "Filter projects by region, sub-region and locality."}</SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
        {groups.filter(group => !localities || group.key !== "locality").map(group => <fieldset key={group.key} className="border-b border-rez-smoke py-6">
          <legend className="eyebrow float-left mb-4 w-full text-black">{group.title}</legend>
          {group.key === "region" && <input type="search" aria-label="Search regions" placeholder="Search regions" value={regionSearch} onChange={event => setRegionSearch(event.target.value)} className="mb-4 h-10 w-full rounded-lg border border-rez-smoke bg-white px-3 text-sm" />}
          <div className="clear-both flex flex-wrap gap-2">
            {group.loading ? <p role="status" className="text-sm text-rez-graphite">Loading options...</p> : null}
            {group.failed ? <p role="alert" className="text-sm">Couldn&apos;t load options. <button className="underline" onClick={group.retry}>Try again</button></p> : null}
            {!group.loading && !group.failed && !group.options.length ? <p className="text-sm text-rez-graphite">{group.hint}</p> : null}
            {group.key === "region" && !group.loading && !group.failed && group.options.length > 0 && !group.options.some(option => option.name.toLocaleLowerCase().includes(regionSearch.trim().toLocaleLowerCase())) ? <p className="text-sm text-rez-graphite">No matching regions.</p> : null}
            {sorted(group.options).filter(option => group.key !== "region" || option.name.toLocaleLowerCase().includes(regionSearch.trim().toLocaleLowerCase())).map(option => <ToggleChip key={option.id} size="lg" pressed={selected[group.key].includes(optionValue(option))} onClick={() => toggle(group.key, optionValue(option))}>{option.name}</ToggleChip>)}
          </div>
        </fieldset>)}
      </div>
      <SheetFooter className="flex-row items-center justify-between border-t border-rez-smoke px-7 py-5">
        <Button variant="secondary" onClick={() => update({ region: [], sub_region: [], locality: [] })}>Reset</Button>
        <Button onClick={() => onOpenChange(false)}>{total === undefined ? "Show results" : `Show ${total} results`}</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>;
}
