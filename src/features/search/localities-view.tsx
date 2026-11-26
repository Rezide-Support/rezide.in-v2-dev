"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/brand/icon";
import { RemovableChip } from "@/components/common/chip";
import { NativeSelect } from "@/components/common/native-select";
import { Pagination } from "@/components/common/pagination";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Viewer } from "@/features/properties/detail/media-gallery";
import { propertySearchHref } from "@/features/search/criteria";
import { localityQueries, locationQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { LocalityListItem } from "@/services/localities";

/** rezide.in's picture for a locality without photos (its /assets/image/empty.gif). */
const NO_PHOTO = "/images/locality-empty.gif";

/** rezide.in's locality list: 12 a page. */
const PAGE_SIZE = 12;

/**
 * rezide.in's NeighborhoodCard: the locality's photos (they open its page), its name, and how many
 * listings are for rent and for sale there (each opens that search).
 */
function LocalityCard({ locality: l, city, priority = false }: { locality: LocalityListItem; city: string; priority?: boolean }) {
  const href = `/locality/${l.id}`;
  const count = (label: string, n: number, intent: "rent" | "buy") => {
    const inner = (
      <>
        {label}
        <span className="ml-2 text-sm font-medium text-[#0803FF]">{n}</span>
      </>
    );
    return n > 0 ? (
      <Link href={propertySearchHref({ city, intent, localities: [l.name] })} target="_blank" className="text-xs text-rez-graphite hover:underline">
        {inner}
      </Link>
    ) : (
      <span className="text-xs text-rez-graphite">{inner}</span>
    );
  };
  return (
    <li className="overflow-hidden rounded-xl border border-rez-smoke bg-white">
      <div className="relative aspect-[2/1] bg-rez-cloud">
        {/* As rezide.in: the arrows show while the photo is hovered (or an arrow has keyboard focus). */}
        <Viewer
          // No photos: rezide.in's animated "empty" picture.
          images={l.images.length ? l.images : [NO_PHOTO]}
          label={l.name}
          cardHref={href}
          // The first two rows are on screen at once: load it straight away (Next.js warns when it loads lazily).
          priority={priority}
          arrowClassName="opacity-0 transition-opacity group-hover/photo:opacity-100 focus-visible:opacity-100"
        />
      </div>
      <div className="flex flex-col gap-2 px-4 py-3">
        <h3 className="truncate text-base font-semibold">
          <Link href={href} target="_blank" className="hover:underline">
            {l.name}
          </Link>
        </h3>
        <div className="flex flex-wrap justify-between gap-x-3">
          {count("Available Rent", l.rent, "rent")}
          {count("Available Sale", l.sale, "buy")}
        </div>
      </div>
    </li>
  );
}

/**
 * The properties page's Localities tab, as rezide.in's /find-property/locality: search a locality by
 * name, narrow by region and sub-region, "Showing 1 to 12 of N results", a grid of localities and pages.
 */
export function LocalitiesView({ city }: { city: string }) {
  const inputId = useId();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regionId, setRegionId] = useState("");
  const [subRegionId, setSubRegionId] = useState("");
  const [page, setPage] = useState(1);
  // The filters popup edits a draft; Apply sets it.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftRegion, setDraftRegion] = useState("");
  const [draftSubRegion, setDraftSubRegion] = useState("");

  const cityId = useQuery(locationQueries.cityId(city)).data ?? undefined;
  const regions = useQuery({ ...locationQueries.regions(cityId ?? ""), enabled: !!cityId });
  const subRegions = useQuery({ ...locationQueries.subRegions(regionId), enabled: !!regionId });
  const draftSubRegions = useQuery({ ...locationQueries.subRegions(draftRegion), enabled: filtersOpen && !!draftRegion });
  const regionName = regionId ? (regions.data?.find((r) => r.id === regionId)?.name ?? "") : "";
  const subRegionName = subRegionId ? (subRegions.data?.find((r) => r.id === subRegionId)?.name ?? "") : "";
  const filterCount = (regionId ? 1 : 0) + (subRegionId ? 1 : 0);
  const openFilters = () => {
    setDraftRegion(regionId);
    setDraftSubRegion(subRegionId);
    setFiltersOpen(true);
  };
  const applyFilters = (region: string, subRegion: string) => {
    setRegionId(region);
    setSubRegionId(subRegion);
    setPage(1);
  };
  // As rezide.in: the list isn't limited to the city (its search bar drops the city before the list reads
  // it), so it shows every locality (3439); the region and sub-region filters still narrow it.
  const list = useQuery(localityQueries.list({ regionId, subRegionId, q, page, pageSize: PAGE_SIZE }));

  const data = list.data;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setQ(text.trim());
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Same search bar as the other views; the location filters (region, sub-region) sit behind the filters button. */}
      <div className="flex items-center gap-3">
        <form
          role="search"
          aria-label="Search localities"
          onSubmit={submit}
          className="flex min-w-0 flex-1 items-center rounded-full border border-rez-smoke bg-white py-1.5 pr-1.5 pl-3.5 shadow-rez-sm focus-within:border-rez-mocaccino"
        >
          <label htmlFor={inputId} className="sr-only">
            Search by locality name
          </label>
          <input
            id={inputId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search by locality name"
            className="h-12 min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none placeholder:text-[#767a88]"
          />
          {text && (
            <button
              type="button"
              onClick={() => {
                setText("");
                if (q) {
                  setQ("");
                  setPage(1);
                }
              }}
              aria-label="Clear search text"
              className="mr-1 flex size-9 items-center justify-center rounded-full text-rez-graphite hover:bg-rez-cloud hover:text-black"
            >
              <Icon name="x" size={14} />
            </button>
          )}
          <Button type="submit" size="lg" aria-label="Search" className="px-4 sm:px-6">
            <Icon name="search" size={20} />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </form>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={openFilters}
          aria-label={filterCount ? `Location filters, ${filterCount} applied` : "Location filters"}
          className={cn(
            "relative flex size-[62px] shrink-0 items-center justify-center rounded-full border bg-white shadow-rez-sm hover:border-black",
            filterCount ? "border-black" : "border-rez-smoke",
          )}
        >
          <Icon name="sliders" size={22} />
          {filterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-rez-mocaccino px-1.5 text-xs font-bold text-black">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {(q || regionName || subRegionName) && (
        <div className="flex flex-wrap items-center gap-2">
          {q && (
            <RemovableChip
              label={`“${q}”`}
              onRemove={() => {
                setText("");
                setQ("");
                setPage(1);
              }}
            >
              “{q}”
            </RemovableChip>
          )}
          {regionName && (
            <RemovableChip label={regionName} onRemove={() => applyFilters("", "")}>
              {regionName}
            </RemovableChip>
          )}
          {subRegionName && (
            <RemovableChip label={subRegionName} onRemove={() => applyFilters(regionId, "")}>
              {subRegionName}
            </RemovableChip>
          )}
          <Button
            variant="link"
            className="text-[13px]"
            onClick={() => {
              setText("");
              setQ("");
              applyFilters("", "");
            }}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* The location filters, from the right like the other views' filters: region, then its sub-regions. */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" showCloseButton={false} className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
          <SheetHeader className="flex-row items-center justify-between gap-4 border-b border-rez-smoke px-7 py-6">
            <div className="flex flex-col gap-1.5">
              <span className="eyebrow text-rez-graphite">Location filters</span>
              <SheetTitle>
                Localities<span className="sr-only"> in {city}</span>
              </SheetTitle>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close filters">
                <Icon name="x" size={20} />
              </Button>
            </SheetClose>
            <SheetDescription className="sr-only">Narrow the localities by region and sub-region.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-7 pb-6">
            <fieldset className="border-b border-rez-smoke py-[22px]">
              <legend className="eyebrow float-left mb-3.5 w-full text-black">Region</legend>
              <label className="clear-both flex flex-col gap-1.5">
                <span className="sr-only">Region</span>
                <NativeSelect
                  size="lg"
                  value={draftRegion}
                  onChange={(e) => {
                    setDraftRegion(e.target.value);
                    setDraftSubRegion("");
                  }}
                  wrapperClassName="w-full"
                  className="w-full"
                >
                  <option value="">All regions</option>
                  {(regions.data ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </fieldset>
            <fieldset className="py-[22px]">
              <legend className="eyebrow float-left mb-3.5 w-full text-black">Sub-region</legend>
              <label className="clear-both flex flex-col gap-1.5">
                <span className="sr-only">Sub-region</span>
                <NativeSelect
                  size="lg"
                  value={draftSubRegion}
                  disabled={!draftRegion}
                  onChange={(e) => setDraftSubRegion(e.target.value)}
                  wrapperClassName="w-full"
                  className="w-full"
                >
                  <option value="">{draftRegion ? "All sub-regions" : "Choose a region first"}</option>
                  {(draftSubRegions.data ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </fieldset>
          </div>
          <SheetFooter className="flex-row items-center justify-between gap-3 border-t border-rez-smoke px-7 py-[18px]">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setDraftRegion("");
                setDraftSubRegion("");
              }}
            >
              Reset
            </Button>
            <Button
              size="lg"
              onClick={() => {
                applyFilters(draftRegion, draftSubRegion);
                setFiltersOpen(false);
              }}
            >
              Apply
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <p className="text-[15px] text-rez-graphite" aria-live="polite">
        {data ? (
          <>
            Showing <b className="text-black">{from}</b> to <b className="text-black">{to}</b> of <b className="text-black">{data.total}</b> results
          </>
        ) : (
          "Loading localities…"
        )}
      </p>

      {list.isError && !data ? (
        <ErrorState message="The localities couldn't be loaded." onRetry={() => list.refetch()} />
      ) : !data ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy>
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="h-[230px] animate-pulse rounded-xl bg-rez-cloud" />
          ))}
        </ul>
      ) : data.items.length === 0 ? (
        <EmptyState title="No localities match your search." />
      ) : (
        <>
          <ul className={cn("grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-opacity", list.isFetching && "opacity-60")}>
            {data.items.map((l, i) => (
              <LocalityCard key={l.id} locality={l} city={city} priority={i < 8} />
            ))}
          </ul>
          <Pagination
            page={data.page}
            pageCount={Math.max(1, Math.ceil(data.total / data.pageSize))}
            onChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0 });
            }}
          />
        </>
      )}
    </div>
  );
}
