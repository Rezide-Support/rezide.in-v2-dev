"use client";

import { Funnel } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/brand/icon";
import { RemovableChip } from "@/components/common/chip";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { MultiSelectDialog, type OptionGroup } from "@/components/common/multi-select-dialog";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/common/search-select";
import { PER_PAGE_OPTIONS, PROJECT_SORT_OPTIONS, parseProjectCriteria, serializeProjectCriteria } from "@/features/search/criteria";
import { useUrlCriteria } from "@/features/search/use-url-criteria";
import { BUDGET_TIERS, PROJECT_STATUS_LABEL, PROJECT_VIEWS } from "@/lib/constants";
import { pluralize } from "@/lib/format";
import { projectQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ProjectSearchCriteria, ProjectSortKey, ProjectStatus } from "@/types/models";
import { LocationDialog } from "./location-dialog";
import { ProjectCard } from "./project-card";
import { ProjectSearchInput } from "./project-search-input";
import { ProjectFilterDrawer, RESET_DRAWER, countDrawerFilters, drawerChips, drawerValues } from "./project-filter-drawer";

type FilterKey = "status" | "budget" | "localities" | "localityNames" | "views" | "years";

const LABELS: Record<FilterKey, string> = {
  status: "Status",
  budget: "Budget",
  localities: "Location",
  localityNames: "Location",
  views: "Views",
  years: "Possession",
};

function groupsFor(key: Exclude<FilterKey, "localities">): OptionGroup[] {
  switch (key) {
    case "status":
      return [{ label: "Status", options: (Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] })) }];
    case "budget":
      return [{ label: "Budget", options: BUDGET_TIERS.map((t) => ({ value: t.id, label: `${t.label} · ${t.range}` })) }];
    case "years":
      return [{ label: "Possession year", options: [2026, 2027, 2028, 2029, 2030].map((y) => ({ value: String(y), label: `Possession ${y}` })) }];
    default:
      return PROJECT_VIEWS.map((g) => ({ label: g.group, options: g.items.map((v) => ({ value: v, label: v })) }));
  }
}

const valuesOf = (c: ProjectSearchCriteria, key: FilterKey): string[] =>
  key === "years" ? c.years.map(String) : (c[key] as string[]);

const labelOf = (key: FilterKey, v: string) =>
  key === "status"
    ? PROJECT_STATUS_LABEL[v as ProjectStatus]
    : key === "budget"
      ? (BUDGET_TIERS.find((t) => t.id === v)?.label ?? v)
      : key === "years"
        ? `Possession ${v}`
        : v;

const withValues = (key: FilterKey, values: string[]): Partial<ProjectSearchCriteria> =>
  key === "years"
    ? { years: values.map(Number) }
    : key === "status"
      ? { status: values as ProjectStatus[] }
      : { [key]: values };

export function ProjectSearch() {
  const { criteria, update } = useUrlCriteria(parseProjectCriteria, serializeProjectCriteria);
  const query = useQuery(projectQueries.search(criteria));
  const [openKey, setOpenKey] = useState<FilterKey | null>(null);
  // The filter the dialog shows. It outlives openKey, so the dialog keeps its options and count while it closes.
  const [dialogKey, setDialogKey] = useState<FilterKey>("status");
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The Filters drawer's unapplied choices; they reach the search only on "Show N projects".
  const [drawerDraft, setDrawerDraft] = useState<Partial<ProjectSearchCriteria>>({});
  const [draft, setDraft] = useState<string[]>([]);
  const [q, setQ] = useState(criteria.q);
  const [lastQ, setLastQ] = useState(criteria.q);
  if (lastQ !== criteria.q) {
    setLastQ(criteria.q);
    setQ(criteria.q);
  }
  const inputId = useId();

  // Live count for the unapplied selection in the open dialog.
  const preview = useQuery({
    ...projectQueries.search({ ...criteria, ...withValues(dialogKey, draft), page: 1 }),
    enabled: openKey !== null,
  });

  // Live count for the Filters drawer's draft.
  const drawerCriteria: ProjectSearchCriteria = { ...criteria, ...drawerDraft, page: 1 };
  const drawerPreview = useQuery({ ...projectQueries.search(drawerCriteria), enabled: drawerOpen });
  const openDrawer = () => {
    setDrawerDraft(drawerValues(criteria));
    setDrawerOpen(true);
  };
  const applyDrawer = () => {
    update(drawerDraft);
    setDrawerOpen(false);
  };

  const applyLabel = () => (preview.isFetching || !preview.data ? "Apply" : `Apply (${pluralize(preview.data.total, "project")})`);
  // The Apply button spins while the count for the ticked options loads.
  const countLoading = openKey !== null && preview.isFetching;

  const keys: FilterKey[] = ["status", "budget", "localities", "localityNames", "views", "years"];
  // The filter buttons. Possession has none, and a home Location card's locality has none (the Location
  // button picks sub-regions): both still show as removable chips.
  const buttonKeys = keys.filter((k) => k !== "years" && k !== "localityNames");
  const data = query.data;
  const chips = keys.flatMap((k) => valuesOf(criteria, k).map((v) => ({ k, v })));
  // The Filters drawer's choices (project type, unit type, BHK, area, video / VR).
  const moreChips = drawerChips(criteria);
  const drawerCount = countDrawerFilters(criteria);
  const clearAll = () => update({ q: "", status: [], budget: [], localities: [], localityNames: [], views: [], years: [], ...RESET_DRAWER });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: q.trim() });
  };

  return (
    <div className="flex-1 px-4 pt-5 pb-24 md:px-8 short:pt-3">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-[18px] sm:gap-[clamp(12px,0.8vw,18px)] short:gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-4 max-sm:gap-3">
          {/* Sizes on this page follow the screen width: full size on big monitors, a bit smaller on laptops; phones unchanged. */}
          <h1 className="text-[26px] leading-[1.1] font-semibold tracking-[-0.02em] max-sm:text-xl md:text-[clamp(26px,1.83vw,32px)]">
            {/* Phones: rezide.in's "Projects (6063)". */}
            <span className="sm:hidden">Projects{data ? ` (${data.total})` : ""}</span>
            <span className="max-sm:hidden">
              <span className="font-extrabold">{criteria.city}</span> Projects.
            </span>
          </h1>
          {/* Phones: the same pills, smaller, in one row that scrolls sideways. */}
          <div className="flex items-center gap-2.5 max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:gap-2 max-sm:overflow-x-auto max-sm:px-4 max-sm:py-0.5 max-sm:scrollbar-none sm:flex-wrap">
            {buttonKeys.map((k) => {
              const vals = valuesOf(criteria, k);
              return (
                <button
                  key={k}
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setDraft(vals);
                    setDialogKey(k);
                    setOpenKey(k);
                  }}
                  className={cn(
                    "flex shrink-0 items-center rounded-full border whitespace-nowrap hover:border-black",
                    vals.length
                      ? "h-8 gap-1.5 border-black bg-rez-cloud pr-2.5 pl-3 text-[11px] font-semibold"
                      : "h-[clamp(40px,2.75vw,48px)] short:h-9 gap-2.5 border-rez-smoke bg-white pr-[clamp(12px,0.92vw,16px)] pl-[clamp(16px,1.26vw,22px)] text-[clamp(14px,0.86vw,15px)] font-medium max-sm:h-10 max-sm:gap-1.5 max-sm:pr-3 max-sm:pl-4 max-sm:text-sm",
                  )}
                >
                  {vals.length === 0 ? LABELS[k] : vals.length === 1 ? labelOf(k, vals[0]) : `${LABELS[k]} · ${vals.length}`}
                  <Icon name="chevron-left" size={14} className="-rotate-90" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
        <form
          role="search"
          onSubmit={submit}
          className="flex min-w-0 flex-1 items-center rounded-md border border-rez-smoke bg-white focus-within:border-rez-mocaccino sm:rounded-full sm:py-1.5 sm:pr-1.5 sm:pl-3.5 sm:shadow-rez-sm"
        >
          <label htmlFor={inputId} className="sr-only">
            Search project, developer or locality
          </label>
          <Icon name="search" size={18} className="ml-3 shrink-0 text-rez-graphite sm:ml-1" />
          {/* As rezide.in: suggests projects, builders and places from 3 letters, with hints before that. */}
          <ProjectSearchInput
            id={inputId}
            value={q}
            onChange={setQ}
            onPick={(name) => update({ q: name })}
            city={criteria.city}
            className="h-10 min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-[#767a88] sm:h-[clamp(40px,2.75vw,48px)] short:h-9 sm:px-3 sm:text-[clamp(14px,0.86vw,15px)] [&::-webkit-search-cancel-button]:hidden"
          />
          {/* Phones search from the keyboard's Search key, as on rezide.in. */}
          <Button type="submit" size="lg" className="h-[clamp(40px,2.75vw,48px)] short:h-9 px-[clamp(18px,1.37vw,24px)] text-[clamp(15px,0.92vw,16px)] max-sm:hidden">
            <Icon name="search" size={20} />
            Search
          </Button>
        </form>
        {/* As on the property search: the sliders button after the search bar opens the other filters (square on phones, as on rezide.in). */}
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={openDrawer}
          aria-label={drawerCount ? `Filters, ${drawerCount} applied` : "Filters"}
          className={cn(
            "relative flex size-10 shrink-0 items-center justify-center rounded-md border bg-white hover:border-black sm:size-[clamp(52px,3.55vw,62px)] short:size-12 sm:rounded-full sm:shadow-rez-sm",
            drawerCount ? "border-black" : "border-rez-smoke",
          )}
        >
          <Icon name="sliders" size={22} className="max-sm:size-[18px]" />
          {drawerCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rez-mocaccino px-1 text-[10px] leading-none font-bold text-black sm:-top-0.5 sm:-right-0.5 sm:h-[18px] sm:min-w-[18px] sm:px-1 sm:text-[10px]">
              {drawerCount}
            </span>
          )}
        </button>
        {/* Phones: rezide.in's funnel button picks the sort order (the sort select below is hidden there). */}
        <label className="relative flex size-10 shrink-0 items-center justify-center rounded-md border border-rez-smoke bg-white focus-within:border-black sm:hidden">
          <Funnel className="size-[18px]" aria-hidden />
          <span className="sr-only">Sort projects</span>
          <select
            value={criteria.sort}
            onChange={(e) => update({ sort: e.target.value as ProjectSortKey })}
            className="absolute inset-0 cursor-pointer appearance-none opacity-0"
          >
            {PROJECT_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        </div>

        {/* Phones: rezide.in's "Active Search:" line, its chips in one scrolling row. */}
        <div className="flex items-center gap-2 sm:hidden">
          <span className="shrink-0 text-xs font-medium">Active Search:</span>
          {!(chips.length > 0 || moreChips.length > 0 || criteria.q) && <span className="text-xs text-rez-graphite">None</span>}
        </div>
        {(chips.length > 0 || moreChips.length > 0 || criteria.q) && (
          <div className="flex items-center gap-2 max-sm:-mt-2 max-sm:overflow-x-auto max-sm:pb-1 max-sm:scrollbar-none sm:flex-wrap [&>*]:shrink-0">
            {criteria.q && (
              <RemovableChip size="sm" label={`“${criteria.q}”`} onRemove={() => update({ q: "" })}>
                “{criteria.q}”
              </RemovableChip>
            )}
            {chips.map(({ k, v }) => (
              <RemovableChip
                size="sm"
                key={`${k}:${v}`}
                label={labelOf(k, v)}
                onRemove={() => update(withValues(k, valuesOf(criteria, k).filter((x) => x !== v)))}
              >
                {labelOf(k, v)}
              </RemovableChip>
            ))}
            {moreChips.map((chip) => (
              <RemovableChip size="sm" key={chip.id} label={chip.label} onRemove={() => update(chip.remove)}>
                {chip.label}
              </RemovableChip>
            ))}
            <Button variant="link" className="text-[11px]" onClick={clearAll}>
              Clear all
            </Button>
          </div>
        )}

        {/* rezide.in leaves the count, per-page and sort bar off phones (sort is the funnel above). */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rez-smoke pt-2 max-sm:hidden short:pt-1.5">
          <p className="text-[clamp(14px,0.86vw,15px)] text-rez-graphite" aria-live="polite">
            {data ? (
              data.total ? (
                <>
                  Showing{" "}
                  <b className="text-black">
                    {(data.page - 1) * data.perPage + 1} – {Math.min(data.page * data.perPage, data.total)}
                  </b>{" "}
                  of <b className="text-black">{data.total}</b> {data.total === 1 ? "project" : "projects"}
                </>
              ) : (
                "No projects found"
              )
            ) : (
              "Loading projects…"
            )}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2.5 text-sm font-medium text-rez-graphite">
              Per page
              <SearchSelect size="sm" className="short:data-[size=default]:h-9" value={criteria.perPage} onValueChange={(value) => update({ perPage: Number(value) })} aria-label="Projects per page">
                {PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </SearchSelect>
            </label>
            <label className="flex items-center gap-2.5 text-sm font-medium text-rez-graphite">
              Sort by
              <SearchSelect size="sm" className="short:data-[size=default]:h-9" value={criteria.sort} onValueChange={(value) => update({ sort: value as ProjectSortKey })} aria-label="Sort projects">
                {PROJECT_SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SearchSelect>
            </label>
          </div>
        </div>

        <div aria-busy={query.isFetching} className={cn("transition-opacity", query.isFetching && data && "opacity-60")}>
          {query.isError && !data ? (
            <ErrorState message="The projects service didn't respond." onRetry={() => query.refetch()} />
          ) : !data ? (
            <div className="flex flex-col gap-5">
              {[0, 1].map((i) => (
                <div key={i} className="h-[300px] animate-pulse rounded-xl bg-rez-cloud" />
              ))}
            </div>
          ) : data.total === 0 ? (
            <EmptyState
              title="No projects match these filters."
              action={
                chips.length || moreChips.length || criteria.q ? (
                  <Button variant="secondary" onClick={clearAll}>
                    Clear search and filters
                  </Button>
                ) : null
              }
            >
              {chips.length || moreChips.length || criteria.q
                ? "Try a different search, or remove some filters."
                : `No projects are listed in ${criteria.city} yet.`}
            </EmptyState>
          ) : (
            <>
              <ul className="flex flex-col gap-5">
                {data.items.map((p, i) => (
                  <li key={p.id}>
                    <ProjectCard project={p} priority={i < 2} fluid />
                  </li>
                ))}
              </ul>
              <Pagination page={data.page} pageCount={data.pageCount} onChange={(page) => update({ page }, { scroll: true })} />
            </>
          )}
        </div>
      </div>

      <MultiSelectDialog
        open={openKey !== null && openKey !== "localities"}
        onOpenChange={(o) => !o && setOpenKey(null)}
        title={LABELS[dialogKey]}
        groups={dialogKey === "localities" ? [] : groupsFor(dialogKey)}
        selected={valuesOf(criteria, dialogKey)}
        onDraftChange={setDraft}
        onApply={(values) => update(withValues(dialogKey, values))}
        applyLabel={applyLabel}
        countLoading={countLoading}
      />
      <ProjectFilterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        criteria={drawerCriteria}
        update={(patch) => setDrawerDraft((d) => ({ ...d, ...patch }))}
        total={drawerPreview.data?.total}
        pending={drawerPreview.isFetching}
        onApply={applyDrawer}
      />
      {/* Location works as on rezide.in: region tabs, localities loaded from the backend as the list scrolls. */}
      <LocationDialog
        open={openKey === "localities"}
        onOpenChange={(o) => !o && setOpenKey(null)}
        city={criteria.city}
        selected={criteria.localities}
        onDraftChange={setDraft}
        onApply={(values) => update({ localities: values })}
        applyLabel={applyLabel}
        countLoading={countLoading}
      />
    </div>
  );
}
