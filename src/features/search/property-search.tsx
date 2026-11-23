"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/brand/icon";
import { RemovableChip } from "@/components/common/chip";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { SearchSelect } from "@/components/common/search-select";
import { Pagination } from "@/components/common/pagination";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import {
  PropertyCard,
  PropertyCardSkeleton,
  PropertyPhotoCard,
  PropertyRow,
} from "@/features/properties/property-card";
import { BUDGET_POINTS, CATEGORIES, categoryById } from "@/lib/constants";
import { formatPrice, pluralize } from "@/lib/format";
import { projectQueries, propertyQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/stores/preferences";
import type { Intent, PropertyCategory, PropertySearchCriteria, ResultsView } from "@/types/models";
import {
  PER_PAGE_OPTIONS,
  sortOptionsFor,
  areaRangeLabel,
  countActiveFilters,
  parsePropertyCriteria,
  serializePropertyCriteria,
} from "./criteria";
import { FilterDrawer, filterGroups } from "./filter-drawer";
import { LocalityGrid, ProjectGrid, groupByLocality, groupByProject } from "./grouped-views";
import { matchesText, type MapArea } from "./match";
import type { MapView } from "./leaflet-map";
import { LoadMore } from "./load-more";
import { MapExplorer } from "./results-map";
import { useUrlCriteria } from "./use-url-criteria";
import { useSearchSuggestions } from "./use-search-suggestions";
import type { SearchSuggestion, SuggestionKind } from "@/services/locations";

type MapCard = "compact" | "photo" | "full";
const PROPERTY_SUGGESTION_KINDS = ["locality", "subRegion", "project", "developer"] as const satisfies readonly SuggestionKind[];

/**
 * Card used beside the map. The prototype offered three designs (A/B/C) as a
 * viewer toggle; the chosen design is A. All three stay implemented, so a
 * different choice is a one-word change here:
 *   "compact" (A) small photo + title, locality, price, then sale/rental and key-fact pills (PropertyRow)
 *   "photo"   (B) larger photo with key facts (PropertyPhotoCard)
 *   "full"    (C) the full list card (PropertyCard)
 */
const MAP_CARD: MapCard = "compact";

function activeChips(c: PropertySearchCriteria, update: (p: Partial<PropertySearchCriteria>) => void) {
  const chips: { key: string; label: string; remove: () => void }[] = [];
  for (const g of filterGroups(c)) {
    for (const v of c[g.key]) {
      chips.push({
        key: `${g.key}:${v}`,
        label: g.format ? g.format(v) : v,
        remove: () => update({ [g.key]: c[g.key].filter((x) => x !== v) }),
      });
    }
  }
  for (const id of c.projects) {
    chips.push({
      key: `projects:${id}`,
      label: `Project: ${id.replace(/-/g, " ")}`,
      remove: () => update({ projects: c.projects.filter((x) => x !== id) }),
    });
  }
  const monthly = c.intent === "rent";
  if (c.budgetMin !== undefined) {
    chips.push({ key: "min", label: `Min ${formatPrice(c.budgetMin, { monthly })}`, remove: () => update({ budgetMin: undefined }) });
  }
  if (c.budgetMax !== undefined) {
    chips.push({ key: "max", label: `Max ${formatPrice(c.budgetMax, { monthly })}`, remove: () => update({ budgetMax: undefined }) });
  }
  if (c.areaMin !== undefined || c.areaMax !== undefined) {
    chips.push({
      key: "area",
      label: areaRangeLabel(c.areaMin, c.areaMax),
      remove: () => update({ areaMin: undefined, areaMax: undefined }),
    });
  }
  return chips;
}

const CLEARED: Partial<PropertySearchCriteria> = {
  q: "",
  localities: [],
  unitTypes: [],
  bhk: [],
  furnishing: [],
  bathrooms: [],
  parking: [],
  media: [],
  facing: [],
  projects: [],
  availability: [],
  buildingTypes: [],
  balconies: [],
  buildingAges: [],
  preferredApartment: [],
  floorRanges: [],
  timeOnRezide: [],
  budgetMin: undefined,
  budgetMax: undefined,
  areaMin: undefined,
  areaMax: undefined,
};

function Summary({ from, to, total, noun }: { from: number; to: number; total: number; noun: string }) {
  return (
    <p className="text-[max(12px,calc(15px*var(--property-type-scale,1)))] text-rez-graphite" aria-live="polite">
      {total === 0 ? (
        `No ${noun} found`
      ) : (
        <>
          Showing{" "}
          <b className="text-black">
            {from} – {to}
          </b>{" "}
          of <b className="text-black">{total}</b> {noun}
        </>
      )}
    </p>
  );
}

export function PropertySearch() {
  const { criteria, update } = useUrlCriteria(parsePropertyCriteria, serializePropertyCriteria);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [q, setQ] = useState(criteria.q);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(-1);
  const inputId = useId();
  const suggestionListId = useId();
  const { suggestions, isFetching: suggestionsFetching, isError: suggestionsError, refetch: refetchSuggestions } =
    useSearchSuggestions(q, { city: criteria.city, kinds: PROPERTY_SUGGESTION_KINDS });
  const setPreferredCity = usePreferencesStore((s) => s.setCity);

  // Keep the box in sync when the query changes through navigation (back/forward, chips).
  const [lastQ, setLastQ] = useState(criteria.q);
  if (lastQ !== criteria.q) {
    setLastQ(criteria.q);
    setQ(criteria.q);
  }

  useEffect(() => {
    setPreferredCity(criteria.city);
  }, [criteria.city, setPreferredCity]);

  const cat = categoryById(criteria.category);
  const rent = criteria.intent === "rent";
  const view = criteria.view;
  const isMap = view === "map";
  // Map markers come from the Spatial Search API and follow the part of the map in view.
  // "Location" / "Projects" views group listings; picking a group drills into its listings.
  const drilledLoc = view === "loc" && criteria.localities.length === 1 ? criteria.localities[0] : null;
  const drilledProj = view === "proj" && criteria.projects.length === 1 ? criteria.projects[0] : null;
  const showGroups = (view === "loc" || view === "proj") && !drilledLoc && !drilledProj;

  // The map view lists what's in the part of the map being searched, once the map has reported it.
  const [mapArea, setMapArea] = useState<{ city: string; area: MapArea } | null>(null);
  const mapList = useRef<HTMLDivElement>(null);
  const area = isMap && mapArea?.city === criteria.city ? mapArea.area : undefined;
  const query = useQuery({ ...propertyQueries.search(criteria, area), enabled: !showGroups && !isMap });
  // The map's list loads 10 at a time as it scrolls, rather than in numbered pages.
  const mapQuery = useInfiniteQuery({ ...propertyQueries.mapList(criteria, area ?? [0, 0, 0, 0]), enabled: isMap && !!area });
  const mapPages = mapQuery.data?.pages;
  const mapData = useMemo(() => {
    if (!mapPages?.length) return undefined;
    const items = mapPages.flatMap((p) => p.items);
    // Everything loaded so far reads as one page: "Showing 1 – 30 of 606".
    return { items, total: mapPages[0].total, page: 1, perPage: Math.max(1, items.length), pageCount: 1 };
  }, [mapPages]);
  const grouped = useQuery({
    ...propertyQueries.groups(
      { ...criteria, q: "", localities: view === "loc" ? [] : criteria.localities, projects: [] },
      view === "proj" ? "project" : "locality",
    ),
    enabled: showGroups,
  });
  // The busiest projects among the listings, by id.
  const groupedProjectIds = useMemo(() => {
    const ids = [...(grouped.data?.groups ?? [])].sort((a, b) => b.count - a.count).map((g) => g.key);
    return [...new Set([...(drilledProj ? [drilledProj] : []), ...ids])].slice(0, 36);
  }, [grouped.data, drilledProj]);
  const projects = useQuery({
    ...projectQueries.byIds(groupedProjectIds, criteria.city),
    enabled: view === "proj" && !!grouped.data,
  });
  // Per-option counts for the filter drawer, computed by the API.
  const facets = useQuery({ ...propertyQueries.facets(criteria), enabled: drawerOpen });
  const homeCount = useQuery({
    ...propertyQueries.count(criteria),
    enabled: drawerOpen && criteria.category === "homes",
  });

  const data = isMap ? mapData : query.data;
  const listQuery = isMap ? mapQuery : query;
  const filterCount = countActiveFilters(criteria) - (drilledLoc ? 1 : 0) - (drilledProj ? 1 : 0);
  const chips = activeChips(criteria, update).filter(
    (c) => !(drilledLoc && c.key === `localities:${drilledLoc}`) && !(drilledProj && c.key === `projects:${drilledProj}`),
  );
  // Loading the next 10 on the map doesn't dim the list already shown.
  const pending = (showGroups ? grouped.isFetching : isMap ? mapQuery.isFetching && !mapQuery.isFetchingNextPage : query.isFetching);


  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (searchOpen && searchActive >= 0 && suggestions[searchActive]) {
      pickSuggestion(suggestions[searchActive]);
      return;
    }
    setSearchOpen(false);
    update({ q: q.trim() });
  };
  const pickSuggestion = (suggestion: SearchSuggestion) => {
    setQ(suggestion.name);
    setSearchOpen(false);
    setSearchActive(-1);
    update({ q: suggestion.name });
  };
  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setSearchOpen(false);
      return;
    }
    if (!suggestions.length || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
    event.preventDefault();
    setSearchOpen(true);
    const step = event.key === "ArrowDown" ? 1 : -1;
    setSearchActive((active) => active < 0
      ? step === 1 ? 0 : suggestions.length - 1
      : (active + step + suggestions.length) % suggestions.length);
  };
  const suggestionPopup = searchOpen && q.trim() ? (
    <div
      id={suggestionListId}
      role="listbox"
      aria-label="Search suggestions"
      className="absolute top-full right-0 left-0 z-30 mt-2 max-h-[min(360px,50vh)] overflow-y-auto rounded-[20px] border border-rez-smoke bg-white p-1.5 shadow-rez-lg"
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.kind}:${suggestion.id || suggestion.name}`}
          id={`${suggestionListId}-${index}`}
          type="button"
          role="option"
          aria-selected={searchActive === index}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => pickSuggestion(suggestion)}
          className={cn(
            "flex min-h-11 w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm hover:bg-rez-cloud",
            searchActive === index && "bg-rez-cloud",
          )}
        >
          <span>{suggestion.name}</span>
          <span className="ml-3 text-xs capitalize text-rez-graphite">
            {suggestion.kind === "subRegion" ? "Sub-region" : suggestion.kind}
          </span>
        </button>
      ))}
      {suggestionsFetching && suggestions.length === 0 && <p role="status" className="p-3 text-sm text-rez-graphite">Searching…</p>}
      {suggestionsError ? (
        <p role="status" className="p-3 text-sm text-rez-graphite">
          Suggestions unavailable.{" "}
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => void refetchSuggestions()} className="underline">
            Retry
          </button>
        </p>
      ) : !suggestionsFetching && suggestions.length === 0 ? (
        <p role="status" className="p-3 text-sm text-rez-graphite">No suggestions. Submit to search this text.</p>
      ) : null}
    </div>
  ) : null;

  const changeIntent = (intent: Intent) =>
    update({
      intent,
      budgetMin: undefined,
      budgetMax: undefined,
      availability: [],
      buildingTypes: [],
      balconies: [],
      buildingAges: [],
      preferredApartment: [],
      floorRanges: [],
      timeOnRezide: [],
    });
  const changeCategory = (category: PropertyCategory) =>
    update({
      category,
      unitTypes: [],
      bhk: [],
      furnishing: [],
      bathrooms: [],
      parking: [],
      facing: [],
      projects: [],
      availability: [],
      buildingTypes: [],
      balconies: [],
      buildingAges: [],
      preferredApartment: [],
      floorRanges: [],
      timeOnRezide: [],
      // Land uses plot-size bands; carpet-area bands don't carry across categories.
      areaMin: undefined,
      areaMax: undefined,
      // The projects view is for homes only.
      view: category !== "homes" && view === "proj" ? "list" : view,
    });
  const changeView = (next: ResultsView) => {
    const patch: Partial<PropertySearchCriteria> = { view: next, page: 1 };
    // Leaving a drilled group (or entering a grouped view) drops the group's own filter.
    if (drilledLoc || next === "loc") patch.localities = [];
    if (drilledProj || next === "proj") patch.projects = [];
    update(patch);
  };
  const clearAll = () => update(CLEARED);
  const onMapView = ({ bbox }: MapView) => {
    // Rounded to ~10 m, as the map's own requests are, so tiny jitters don't reload the list.
    const next = bbox.map((v) => Number(v.toFixed(4))) as MapArea;
    if (area && next.join() === area.join()) return;
    // A shared link keeps its page on load; moving the map starts the new list from the top.
    if (area && criteria.page > 1) update({ page: 1 });
    setMapArea({ city: criteria.city, area: next });
  };

  const placeholder =
    view === "loc" && !drilledLoc
      ? "Search locality"
      : view === "proj" && !drilledProj
        ? "Search project or developer"
        : criteria.category === "homes"
          ? "Search locality, project or landmark"
          : "Search locality or landmark";

  /* ---------- Grouped views ---------- */
  const localityGroups = useMemo(() => {
    if (view !== "loc" || !grouped.data) return [];
    // The localities that have listings, busiest first.
    const names = [...grouped.data.groups]
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
      .map((g) => g.key)
      .filter((l) => matchesText(criteria.q, [l]));
    return groupByLocality(names, grouped.data.groups, criteria.category);
  }, [view, grouped.data, criteria.q, criteria.category]);
  const projectGroups = useMemo(() => {
    if (view !== "proj" || !grouped.data || !projects.data) return [];
    const list = projects.data.items.filter((p) => matchesText(criteria.q, [p.name, p.developer, p.locality]));
    return groupByProject(list, grouped.data.groups);
  }, [view, grouped.data, projects.data, criteria.q]);
  const drilledProject = drilledProj ? projects.data?.items.find((p) => p.id === drilledProj) : undefined;
  const drilledName = drilledLoc ?? drilledProject?.name ?? (drilledProj ? "Project" : null);

  const rangeStart = data && data.total ? (data.page - 1) * data.perPage + 1 : 0;
  const rangeEnd = data ? Math.min(data.page * data.perPage, data.total) : 0;

  const summary = showGroups ? (
    grouped.data && (view === "loc" || projects.data) ? (
      <Summary
        from={(view === "loc" ? localityGroups : projectGroups).length ? 1 : 0}
        to={(view === "loc" ? localityGroups : projectGroups).length}
        total={(view === "loc" ? localityGroups : projectGroups).length}
        noun={view === "loc" ? "localities" : "projects"}
      />
    ) : (
      <p className="text-[max(12px,calc(15px*var(--property-type-scale,1)))] text-rez-graphite">Loading…</p>
    )
  ) : data ? (
    <Summary
      from={rangeStart}
      to={rangeEnd}
      total={data.total}
      noun={drilledName ? `${data.total === 1 ? "listing" : "listings"} in ${drilledName}` : data.total === 1 ? "listing" : "listings"}
    />
  ) : (
    <p className="text-[max(12px,calc(15px*var(--property-type-scale,1)))] text-rez-graphite">Loading listings…</p>
  );

  const emptyState = () => {
    if (isMap) {
      return (
        <EmptyState
          title="No listings in this part of the map."
          action={
            (filterCount > 0 || criteria.q) && (
              <Button variant="secondary" onClick={clearAll}>
                Clear search and filters
              </Button>
            )
          }
        >
          <p>
            Move the map or zoom out to see {rent ? `${cat.noun.toLowerCase()} for ${cat.lease.toLowerCase()}` : `${cat.noun.toLowerCase()} for sale`} in {criteria.city}.
          </p>
        </EmptyState>
      );
    }
    const budgetPoints = BUDGET_POINTS[criteria.intent];
    return (
      <EmptyState
        title="No listings match your search."
        action={
          filterCount > 0 || criteria.q ? (
            <Button variant="secondary" onClick={clearAll}>
              Clear search and filters
            </Button>
          ) : undefined
        }
      >
        <p>
          We searched {rent ? `${cat.noun.toLowerCase()} for ${cat.lease.toLowerCase()}` : `${cat.noun.toLowerCase()} for sale`} in{" "}
          <b className="text-black">{drilledName ?? criteria.city}</b>
          {criteria.q ? (
            <>
              {" "}
              matching “<b className="text-black">{criteria.q}</b>”
            </>
          ) : null}
          {filterCount ? ` with ${pluralize(filterCount, "filter")}` : ""}. Try removing a filter
          {criteria.budgetMax !== undefined && criteria.budgetMax < budgetPoints[budgetPoints.length - 1].value
            ? ", raising your budget"
            : ""}{" "}
          or searching another locality.
        </p>
        <p className="mt-2 text-xs">Sample inventory covers a limited set of cities and localities.</p>
      </EmptyState>
    );
  };

  const listResults = (variant: "grid" | MapCard): ReactNode => {
    if (listQuery.isError && !data) {
      return <ErrorState message="The listings service didn't respond." onRetry={() => listQuery.refetch()} />;
    }
    if (!data) {
      return (
        <div className={cn("grid gap-4", variant === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
          {Array.from({ length: variant === "grid" ? 6 : 3 }, (_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      );
    }
    if (data.total === 0) return emptyState();
    return (
      <>
        <ul className={cn("grid grid-cols-1", variant === "grid" ? "gap-4 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 gap-4")}>
          {data.items.map((p, i) => (
            <li key={p.id} className="flex">
              <div className="w-full">
                {variant === "compact" ? (
                  <PropertyRow property={p} highlighted={highlighted === p.id} onHover={setHighlighted} priority={i < 3} />
                ) : variant === "photo" ? (
                  <PropertyPhotoCard property={p} highlighted={highlighted === p.id} onHover={setHighlighted} priority={i < 2} />
                ) : (
                  <PropertyCard property={p} priority={i < 3} />
                )}
              </div>
            </li>
          ))}
        </ul>
        {isMap ? (
          <LoadMore
            hasMore={!!mapQuery.hasNextPage}
            loading={mapQuery.isFetchingNextPage}
            failed={mapQuery.isFetchNextPageError}
            onLoad={() => void mapQuery.fetchNextPage()}
            shown={data.items.length}
            total={data.total}
          />
        ) : (
          <Pagination
            page={data.page}
            pageCount={data.pageCount}
            onChange={(page) => {
              update({ page });
              window.scrollTo({ top: 0, behavior: "smooth" });
              mapList.current?.scrollTo({ top: 0 });
            }}
          />
        )}
      </>
    );
  };

  const groupResults = () => {
    const err = view === "loc" ? grouped.isError : grouped.isError || projects.isError;
    if (err && !grouped.data) {
      return <ErrorState message="The listings service didn't respond." onRetry={() => grouped.refetch()} />;
    }
    if (!grouped.data || (view === "proj" && !projects.data)) {
      return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-[260px] animate-pulse rounded-[20px] bg-rez-cloud" />
          ))}
        </div>
      );
    }
    const pick = (patch: Partial<PropertySearchCriteria>) => {
      update({ ...patch, q: "" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    if (view === "loc") {
      return localityGroups.length ? (
        <LocalityGrid groups={localityGroups} rent={rent} onSelect={(l) => pick({ localities: [l] })} />
      ) : (
        <EmptyState title="No localities match your search." />
      );
    }
    return projectGroups.length ? (
      <ProjectGrid groups={projectGroups} rent={rent} onSelect={(id) => pick({ projects: [id] })} />
    ) : (
      <EmptyState title="No projects match your search.">
        <p>Sample projects cover a limited set of cities.</p>
      </EmptyState>
    );
  };

  const filtersButton = (
    <button
      type="button"
      onClick={() => setDrawerOpen(true)}
      aria-label={filterCount ? `Filters, ${filterCount} applied` : "Filters"}
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
  );

  const drawer = (
    <FilterDrawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      criteria={criteria}
      update={update}
      total={criteria.category === "homes"
        ? homeCount.data
        : showGroups ? undefined : data?.total}
      pending={criteria.category === "homes"
        ? homeCount.isFetching || homeCount.data === undefined
        : pending}
      countError={criteria.category === "homes" && homeCount.isError}
      onRetryCount={() => void homeCount.refetch()}
      facets={facets.data?.facets}
      unavailableCounts={facets.data?.unavailable}
    />
  );

  /* ---------- Map view: full-bleed map with a results panel (prototype layout) ---------- */
  if (isMap) {
    return (
      <div className="property-page min-w-0 flex-1 bg-white">
        <h1 className="sr-only">
          {criteria.city} {cat.noun} {rent ? `for ${cat.lease.toLowerCase()}` : "for sale"}, map view
        </h1>
        {/* Desktop: map and results fill the screen below the header (64px + 1px border); the results scroll in their panel. */}
        {/* Dual-screen: map on one screen, results on the other (see fold-x / fold-y in globals.css). */}
        <div className="grid grid-cols-1 lg:h-[calc(100dvh-65px)] lg:grid-cols-[minmax(0,1fr)_clamp(300px,28vw,340px)] lg:grid-rows-[minmax(0,1fr)] fold-x:h-auto! fold-x:grid-cols-[var(--seg-0-width)_var(--seg-1-width)]! fold-x:grid-rows-none! fold-x:gap-x-(--hinge-width) fold-y:h-auto! fold-y:grid-cols-1! fold-y:grid-rows-none!">
          <div className="relative isolate h-[60svh] min-h-[360px] overflow-hidden bg-rez-cloud lg:h-full lg:min-h-0 fold-x:sticky fold-x:top-0 fold-x:h-dvh! fold-x:self-start fold-y:sticky fold-y:top-0 fold-y:z-10 fold-y:h-(--seg-0-height)! fold-y:min-h-0">
            {/* Keyed by city so choosing another city re-centres the map. */}
            <MapExplorer key={criteria.city} city={criteria.city} intent={criteria.intent} category={criteria.category} onViewChange={onMapView} highlightedId={highlighted} highlightedProperty={data?.items.find(property => property.id === highlighted)} onHover={setHighlighted} renderToolbar={({ focused, clearFocus }) => (
            <div className="pointer-events-none absolute inset-x-4 top-4 z-[500] flex flex-col gap-2 sm:gap-2.5">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <form
                role="search"
                onSubmit={submit}
                className="pointer-events-auto flex h-[52px] max-sm:h-11 max-w-[520px] min-w-0 flex-1 items-center gap-1 rounded-full bg-white pr-1.5 pl-[18px] shadow-rez-md focus-within:ring-2 focus-within:ring-rez-mocaccino"
              >
                <Icon name="search" size={18} />
                <label htmlFor={inputId} className="sr-only">
                  {placeholder}
                </label>
                <div className="relative min-w-0 flex-1">
                  <input
                    id={inputId}
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setSearchOpen(true);
                      setSearchActive(-1);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setSearchOpen(false)}
                    onKeyDown={onSearchKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={searchOpen && q.trim() !== ""}
                    aria-controls={searchOpen && q.trim() !== "" ? suggestionListId : undefined}
                    aria-activedescendant={searchOpen && searchActive >= 0 ? `${suggestionListId}-${searchActive}` : undefined}
                    className="h-full w-full min-w-0 bg-transparent px-2.5 text-[max(12px,calc(15px*var(--property-type-scale,1)))] outline-none placeholder:text-[#767a88]"
                  />
                  {suggestionPopup}
                </div>
                <button type="submit" className="sr-only">
                  Search
                </button>
              </form>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={filterCount ? `Filters, ${filterCount} applied` : "Filters"}
                className="pointer-events-auto flex h-[52px] shrink-0 items-center gap-2 rounded-full bg-white px-5 max-sm:size-11 max-sm:justify-center max-sm:px-0 text-sm font-semibold shadow-rez-md hover:bg-rez-cloud"
              >
                <Icon name="sliders" size={18} />
                <span className="max-sm:sr-only">Filters</span>
                {filterCount > 0 && (
                  <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-rez-mocaccino px-1.5 text-xs font-bold text-black max-sm:hidden">
                    {filterCount}
                  </span>
                )}
              </button>
              <Button
                onClick={() => changeView("list")}
                aria-label="List View" className="pointer-events-auto h-[52px] shrink-0 rounded-full px-5 text-[max(12px,calc(15px*var(--property-type-scale,1)))] shadow-rez-md max-sm:size-11 max-sm:px-0"
              >
                <Icon name="file-text" size={18} />
                <span className="max-sm:sr-only">List View</span>
              </Button>
              {focused && <button type="button" onClick={clearFocus} aria-label="Exit area" className="pointer-events-auto flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold shadow-rez-md hover:bg-rez-cloud max-sm:size-11 max-sm:px-0"><span aria-hidden>×</span><span className="max-sm:sr-only">Exit area</span></button>}
            </div>
            {/* The applied filters, kept on the map (Homes / To Buy are at the top of the results panel). */}
            <div className="flex flex-wrap items-center gap-2 empty:hidden">
              {criteria.q && (
                <RemovableChip label={`“${criteria.q}”`} onRemove={() => update({ q: "" })} className="pointer-events-auto h-10 shadow-rez-md">
                  “{criteria.q}”
                </RemovableChip>
              )}
              {chips.map((c) => (
                <RemovableChip key={c.key} label={c.label} onRemove={c.remove} className="pointer-events-auto h-10 shadow-rez-md">
                  {c.label}
                </RemovableChip>
              ))}
              {(chips.length > 0 || criteria.q) && (
                <button type="button" onClick={clearAll} className="pointer-events-auto h-10 rounded-full bg-white px-4 text-[13px] font-semibold underline underline-offset-4 shadow-rez-md hover:bg-rez-cloud">
                  Clear all
                </button>
              )}
            </div>
            </div>
            )} />
          </div>
          <div
            ref={mapList}
            aria-busy={pending}
            className={cn(
              "min-w-0 border-rez-smoke p-4 transition-opacity sm:p-5 lg:overflow-y-auto lg:border-l fold-x:overflow-visible! fold-x:border-l-0 fold-y:overflow-visible!",
              pending && data && "opacity-60",
            )}
          >
            {/* The list view's Homes / To Buy choice, at the top of the map's results. */}
            <div className="flex flex-wrap items-center gap-2.5 pb-3">
              <label className="sr-only" htmlFor={`${inputId}-map-type`}>
                Property type
              </label>
              <SearchSelect
                id={`${inputId}-map-type`}
                size="sm"
                value={criteria.category}
                onValueChange={(value) => changeCategory(value as PropertyCategory)}
                className="border-black pl-[18px] text-sm font-bold"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </SearchSelect>
              <label className="sr-only" htmlFor={`${inputId}-map-intent`}>
                Buy or rent
              </label>
              <SearchSelect
                id={`${inputId}-map-intent`}
                size="sm"
                value={criteria.intent}
                onValueChange={(value) => changeIntent(value as Intent)}
                className="border-black pl-[18px] text-sm font-bold"
              >
                <option value="buy">To Buy</option>
                <option value="rent">To {cat.lease}</option>
              </SearchSelect>
            </div>
            <div className="px-0.5 pt-1 pb-4 text-sm [&_p]:text-sm">{summary}</div>
            {listResults(MAP_CARD)}
            <p className="mt-4 text-xs text-rez-graphite">
              This list shows {criteria.city} listings in the part of the map in view that match your search and filters. Map pins show every listing there, including sale, rental and nearby cities.
            </p>
          </div>
        </div>
        {drawer}
      </div>
    );
  }

  /* ---------- List and grouped views ---------- */
  return (
    <div className="property-page property-directory min-w-0 flex-1 bg-white px-4 pt-5 pb-24 md:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-[18px]">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <h1 className="text-[max(12px,calc(26px*var(--property-type-scale,1)))] leading-tight font-semibold tracking-[-0.02em] break-words sm:text-[max(12px,calc(30px*var(--property-type-scale,1)))] xl:text-[max(12px,calc(32px*var(--property-type-scale,1)))]">
            <span className="font-extrabold">{criteria.city}</span> Properties.
            <span className="sr-only">
              {" "}
              {cat.noun} {rent ? `for ${cat.lease.toLowerCase()}` : "for sale"}
            </span>
          </h1>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center xl:flex-nowrap">
            <label className="sr-only" htmlFor={`${inputId}-type`}>
              Property type
            </label>
            <SearchSelect
              id={`${inputId}-type`}
              value={criteria.category}
              onValueChange={(value) => changeCategory(value as PropertyCategory)}
              className="w-full min-w-0 justify-between gap-2 border-black px-4 text-sm font-semibold data-[size=default]:h-11 sm:w-auto sm:min-w-[140px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </SearchSelect>
            <label className="sr-only" htmlFor={`${inputId}-intent`}>
              Buy or rent
            </label>
            <SearchSelect
              id={`${inputId}-intent`}
              value={criteria.intent}
              onValueChange={(value) => changeIntent(value as Intent)}
              className="w-full min-w-0 justify-between gap-2 border-black px-4 text-sm font-semibold data-[size=default]:h-11 sm:w-auto sm:min-w-[140px]"
            >
              <option value="buy">To Buy</option>
              <option value="rent">To {cat.lease}</option>
            </SearchSelect>
            <span aria-hidden className="mx-1 hidden h-7 w-px bg-rez-smoke xl:block" />
            <div className="col-span-2 flex w-full min-w-0 items-center gap-2.5 sm:w-auto sm:flex-1 xl:flex-none">
              <span aria-hidden className="eyebrow hidden text-rez-graphite xl:inline">
                View
              </span>
              <Segmented
                label="Results view"
                value={view}
                onChange={changeView}
                options={[
                  { value: "list", label: "List" },
                  { value: "map", label: "Map" },
                  {
                    value: "proj",
                    label: "Projects",
                    disabled: criteria.category !== "homes",
                    title: criteria.category !== "homes" ? "Projects view is for Homes" : undefined,
                  },
                  { value: "loc", label: "Location" },
                ]}
                size="md"
                className="w-full sm:w-auto"
                itemClassName="flex-1 px-2 text-[13px] sm:px-3 sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2.5 [&>button]:size-11 [&>button]:rounded-md [&>button]:text-rez-graphite [&>button]:shadow-sm">
          <form
            role="search"
            onSubmit={submit}
            className="flex h-11 min-w-0 flex-1 items-center rounded-md border border-rez-smoke bg-white shadow-sm focus-within:border-rez-mocaccino"
          >
            <button type="submit" aria-label="Search" className="flex h-full w-12 shrink-0 items-center justify-center border-r border-rez-smoke text-rez-graphite hover:bg-rez-cloud focus-visible:outline-2 focus-visible:outline-rez-mocaccino">
              <Icon name="search" size={18} />
            </button>
            <label htmlFor={inputId} className="sr-only">
              {placeholder}
            </label>
            <div className="relative min-w-0 flex-1">
              <input
                id={inputId}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSearchOpen(true);
                  setSearchActive(-1);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setSearchOpen(false)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search for location or building"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={searchOpen && q.trim() !== ""}
                aria-controls={searchOpen && q.trim() !== "" ? suggestionListId : undefined}
                aria-activedescendant={searchOpen && searchActive >= 0 ? `${suggestionListId}-${searchActive}` : undefined}
                className="h-10 w-full min-w-0 bg-transparent px-3 text-[13px] outline-none placeholder:text-[#767a88] sm:text-sm"
              />
              {suggestionPopup}
            </div>
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  if (criteria.q) update({ q: "" });
                }}
                aria-label="Clear search text"
                className="mr-1 flex size-9 items-center justify-center rounded-full text-rez-graphite hover:bg-rez-cloud hover:text-black"
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </form>
          {filtersButton}
        </div>

        {(chips.length > 0 || criteria.q) && (
          <div className="flex flex-wrap items-center gap-2">
            {criteria.q && (
              <RemovableChip label={`“${criteria.q}”`} onRemove={() => update({ q: "" })}>
                “{criteria.q}”
              </RemovableChip>
            )}
            {chips.map((c) => (
              <RemovableChip key={c.key} label={c.label} onRemove={c.remove}>
                {c.label}
              </RemovableChip>
            ))}
            <Button variant="link" className="text-[13px]" onClick={clearAll}>
              Clear all
            </Button>
          </div>
        )}

        {drilledName && (
          <div className="flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={() => update(drilledLoc ? { localities: [] } : { projects: [] })}
              className="flex h-9 items-center gap-2 rounded-full border border-rez-smoke bg-white pr-3.5 pl-2.5 text-[13px] font-semibold hover:border-black"
            >
              <Icon name="arrow-right" size={16} className="rotate-180" />
              {drilledLoc ? "All locations" : "All projects"}
            </button>
            <h2 className="text-[max(12px,calc(22px*var(--property-type-scale,1)))] leading-tight font-semibold tracking-[-0.01em] md:text-[max(12px,calc(26px*var(--property-type-scale,1)))]">{drilledName}</h2>
            {data && <span className="text-sm font-medium text-rez-graphite">{pluralize(data.total, "listing")}</span>}
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-3 border-t border-rez-smoke pt-3 lg:flex-row lg:items-center lg:justify-between [&>p]:text-sm">
          {summary}
          {!showGroups && (
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 sm:flex sm:items-center sm:gap-4">
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-rez-graphite sm:flex-row sm:items-center sm:gap-2.5 sm:text-sm">
                Per page
                <SearchSelect size="sm" value={criteria.perPage} onValueChange={(value) => update({ perPage: Number(value) })} aria-label="Results per page" className="w-full min-w-0 justify-between gap-2 px-3 sm:w-auto sm:min-w-20">
                  {PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </SearchSelect>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-rez-graphite sm:flex-row sm:items-center sm:gap-2.5 sm:text-sm">
                Sort by
                <SearchSelect
                  size="sm"
                  className="w-full min-w-0 justify-between gap-2 px-3 sm:w-auto"
                  value={criteria.sort}
                  onValueChange={(value) => update({ sort: value as PropertySearchCriteria["sort"] })} aria-label="Sort results"
                >
                  {sortOptionsFor(criteria.intent).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SearchSelect>
              </label>
            </div>
          )}
        </div>

        <div aria-busy={pending} className={cn("relative transition-opacity", pending && (data || grouped.data) && "opacity-60")}>
          {showGroups ? groupResults() : listResults("grid")}
        </div>
      </div>
      {drawer}
    </div>
  );
}
