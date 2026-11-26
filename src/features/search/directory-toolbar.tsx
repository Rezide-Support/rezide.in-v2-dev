"use client";

import { useId } from "react";
import { Icon } from "@/components/brand/icon";
import { SearchSelect } from "@/components/common/search-select";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { ProjectSearchInput } from "@/features/projects/project-search-input";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** The property directory's existing header and search UI, shared by its API-backed tabs. */
export function DirectoryToolbar({ city, intent, category, view, search, setSearch, searchFor, filterCount, openFilters, changeView, changeIntent, changeCategory }: {
  city: string; intent: string; category: string; view: "proj" | "loc"; search: string;
  setSearch: (value: string) => void; searchFor: (value: string) => void; filterCount: number;
  openFilters: () => void; changeView: (value: string) => void; changeIntent: (value: string) => void; changeCategory: (value: string) => void;
}) {
  const inputId = useId();
  return <>
    <div className="flex min-w-0 flex-col gap-4 max-sm:gap-3 xl:flex-row xl:items-center xl:justify-between [--spacing:0.25rem] [--text-xs:0.75rem] [--text-sm:0.875rem]">
      <h1 className="text-[26px] leading-[1.1] font-semibold tracking-[-0.02em] break-words max-sm:text-xl md:text-[clamp(26px,1.83vw,32px)]"><span className="font-extrabold">{city}</span> Properties.</h1>
      <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center xl:flex-nowrap">
        <SearchSelect aria-label="Property type" value={category} onValueChange={changeCategory} className="w-full min-w-0 justify-between gap-2.5 border-rez-smoke bg-white pr-[clamp(12px,0.92vw,16px)] pl-[clamp(16px,1.26vw,22px)] text-[clamp(14px,0.86vw,15px)] font-medium data-[size=default]:h-[clamp(40px,2.75vw,48px)] short:data-[size=default]:h-9 max-sm:data-[size=default]:h-10 max-sm:text-sm sm:w-auto">
          {CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </SearchSelect>
        <SearchSelect aria-label="Buy or rent" value={intent} onValueChange={changeIntent} className="w-full min-w-0 justify-between gap-2.5 border-rez-smoke bg-white pr-[clamp(12px,0.92vw,16px)] pl-[clamp(16px,1.26vw,22px)] text-[clamp(14px,0.86vw,15px)] font-medium data-[size=default]:h-[clamp(40px,2.75vw,48px)] short:data-[size=default]:h-9 max-sm:data-[size=default]:h-10 max-sm:text-sm sm:w-auto"><option value="buy">To Buy</option><option value="rent">To Rent</option></SearchSelect>
        <span aria-hidden className="mx-1 hidden h-7 w-px bg-rez-smoke xl:block" />
        <div className="col-span-2 flex w-full min-w-0 items-center gap-2.5 sm:w-auto sm:flex-1 xl:flex-none">
        <span className="eyebrow hidden text-rez-graphite xl:inline">View</span>
        <Segmented size="md" className="w-full sm:w-auto" itemClassName="flex-1 px-2 text-[13px] sm:px-3 sm:text-sm" label="Results view" value={view} onChange={changeView} options={[{ value: "list", label: "List" }, { value: "map", label: "Map" }, { value: "proj", label: "Projects", disabled: category !== "homes" }, { value: "loc", label: "Location" }]} />
        </div>
      </div>
    </div>
    <div className="flex min-w-0 items-center gap-2 sm:gap-4 [--spacing:0.25rem] [--text-xs:0.75rem] [--text-sm:0.875rem]">
      <form role="search" className="flex min-w-0 flex-1 items-center rounded-md border border-rez-smoke bg-white focus-within:border-rez-mocaccino sm:rounded-full sm:py-1.5 sm:pr-1.5 sm:pl-3.5 sm:shadow-rez-sm" onSubmit={event => { event.preventDefault(); searchFor(search); }}>
        <Icon name="search" size={18} className="ml-3 shrink-0 text-rez-graphite sm:ml-1" />
        <label htmlFor={inputId} className="sr-only">Search project, developer or locality</label>
        <ProjectSearchInput id={inputId} value={search} onChange={setSearch} onPick={searchFor} city={city} scope="all" minimumLength={1} proxySuggestions className="h-10 w-full min-w-0 bg-transparent px-2.5 text-sm outline-none placeholder:text-[#767a88] sm:h-[clamp(40px,2.75vw,48px)] short:h-9 sm:px-3 sm:text-[clamp(14px,0.86vw,15px)] [&::-webkit-search-cancel-button]:hidden" />
        {search ? <button type="button" aria-label="Clear search" className="mr-1 flex size-9 items-center justify-center rounded-full text-rez-graphite hover:bg-rez-cloud hover:text-black" onClick={() => { setSearch(""); searchFor(""); }}><Icon name="x" size={14} /></button> : null}
        <Button type="submit" size="lg" className="h-[clamp(40px,2.75vw,48px)] short:h-9 px-[clamp(18px,1.37vw,24px)] text-[clamp(15px,0.92vw,16px)] max-sm:hidden"><Icon name="search" size={20} /> Search</Button>
      </form>
      <button type="button" aria-haspopup="dialog" aria-label={filterCount ? `Filters, ${filterCount} applied` : "Filters"} onClick={openFilters} className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-md border bg-white hover:border-black sm:size-[clamp(52px,3.55vw,62px)] short:size-12 sm:rounded-full sm:shadow-rez-sm", filterCount ? "border-black" : "border-rez-smoke")}>
        <Icon name="sliders" size={22} className="max-sm:size-[18px]" />
        {filterCount > 0 && <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rez-mocaccino px-1 text-[10px] leading-none font-bold text-black sm:-top-0.5 sm:-right-0.5 sm:h-[18px] sm:min-w-[18px] sm:px-1 sm:text-[10px]">{filterCount}</span>}
      </button>
    </div>
  </>;
}
