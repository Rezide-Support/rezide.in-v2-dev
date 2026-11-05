"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/brand/icon";
import { RemovableChip } from "@/components/common/chip";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { MultiSelectDialog, type OptionGroup } from "@/components/common/multi-select-dialog";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/common/native-select";
import { PER_PAGE_OPTIONS, parseProjectCriteria, serializeProjectCriteria } from "@/features/search/criteria";
import { useUrlCriteria } from "@/features/search/use-url-criteria";
import { BUDGET_TIERS, PROJECT_STATUS_LABEL, PROJECT_VIEWS, localitiesFor } from "@/lib/constants";
import { pluralize } from "@/lib/format";
import { projectQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ProjectSearchCriteria, ProjectStatus } from "@/types/models";
import { ProjectCard } from "./project-card";

type FilterKey = "status" | "budget" | "localities" | "views" | "years";

const LABELS: Record<FilterKey, string> = {
  status: "Status",
  budget: "Budget",
  localities: "Location",
  views: "Views",
  years: "Possession",
};

function groupsFor(key: FilterKey, city: string): OptionGroup[] {
  switch (key) {
    case "status":
      return [{ label: "Status", options: (Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] })) }];
    case "budget":
      return [{ label: "Budget", options: BUDGET_TIERS.map((t) => ({ value: t.id, label: `${t.label} · ${t.range}` })) }];
    case "localities":
      return localityGroups(city).map((g) => ({ label: g.label, options: g.items.map((l) => ({ value: l, label: l })) }));
    case "years":
      return [{ label: "Possession year", options: [2026, 2027, 2028, 2029, 2030].map((y) => ({ value: String(y), label: `Possession ${y}` })) }];
    default:
      return PROJECT_VIEWS.map((g) => ({ label: g.group, options: g.items.map((v) => ({ value: v, label: v })) }));
  }
}

/** Locality tabs in the Location dialog, as in the prototype (named regions for Mumbai). */
const LOCALITY_REGIONS: Record<string, { label: string; items: string[] }[]> = {
  Mumbai: [
    { label: "Western Suburbs", items: ["Andheri West", "Goregaon East", "Bandra East"] },
    { label: "Eastern Suburbs", items: ["Powai", "Chembur"] },
    { label: "South Mumbai", items: ["Worli", "Mahalaxmi"] },
    { label: "Thane", items: ["Thane West"] },
  ],
};

function localityGroups(city: string) {
  const all = localitiesFor(city);
  const regions = LOCALITY_REGIONS[city]?.map((r) => ({ ...r, items: r.items.filter((l) => all.includes(l)) }));
  const covered = new Set(regions?.flatMap((r) => r.items));
  if (regions && all.every((l) => covered.has(l))) return regions.filter((r) => r.items.length);
  return [{ label: "Localities", items: all }];
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
  const { criteria, update, isNavigating } = useUrlCriteria(parseProjectCriteria, serializeProjectCriteria);
  const query = useQuery(projectQueries.search(criteria));
  const [openKey, setOpenKey] = useState<FilterKey | null>(null);
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
    ...projectQueries.search({ ...criteria, ...(openKey ? withValues(openKey, draft) : {}), page: 1 }),
    enabled: openKey !== null,
  });

  const keys: FilterKey[] = ["status", "budget", "localities", "views", "years"];
  const data = query.data;
  const chips = keys.flatMap((k) => valuesOf(criteria, k).map((v) => ({ k, v })));
  const clearAll = () => update({ q: "", status: [], budget: [], localities: [], views: [], years: [] });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: q.trim() });
  };

  return (
    <div className="flex-1 px-4 pt-5 pb-24 md:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[26px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[32px]">
            <span className="font-extrabold">{criteria.city}</span> Projects.
          </h1>
          <div className="flex flex-wrap items-center gap-2.5">
            {keys.map((k) => {
              const vals = valuesOf(criteria, k);
              return (
                <button
                  key={k}
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setDraft(vals);
                    setOpenKey(k);
                  }}
                  className={cn(
                    "flex h-12 items-center gap-2.5 rounded-full border pr-4 pl-[22px] text-[15px] hover:border-black",
                    vals.length ? "border-black bg-rez-cloud font-bold" : "border-rez-smoke bg-white font-medium",
                  )}
                >
                  {vals.length === 0 ? LABELS[k] : vals.length === 1 ? labelOf(k, vals[0]) : `${LABELS[k]} · ${vals.length}`}
                  <Icon name="chevron-left" size={14} className="-rotate-90" />
                </button>
              );
            })}
            {chips.length > 0 && (
              <Button variant="link" className="px-1.5 text-[13px]" onClick={() => update({ status: [], budget: [], localities: [], views: [], years: [] })}>
                Clear
              </Button>
            )}
          </div>
        </div>

        <form
          role="search"
          onSubmit={submit}
          className="flex items-center rounded-full border border-rez-smoke bg-white py-1.5 pr-1.5 pl-3.5 shadow-rez-sm focus-within:border-rez-mocaccino"
        >
          <label htmlFor={inputId} className="sr-only">
            Search project, developer or locality
          </label>
          <Icon name="search" size={18} className="ml-1 text-rez-graphite" />
          <input
            id={inputId}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search project, developer or locality"
            className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-[#767a88]"
          />
          <Button type="submit" size="lg" className="px-4 sm:px-6">
            <Icon name="search" size={20} />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </form>

        {(chips.length > 0 || criteria.q) && (
          <div className="flex flex-wrap items-center gap-2">
            {criteria.q && (
              <RemovableChip label={`“${criteria.q}”`} onRemove={() => update({ q: "" })}>
                “{criteria.q}”
              </RemovableChip>
            )}
            {chips.map(({ k, v }) => (
              <RemovableChip
                key={`${k}:${v}`}
                label={labelOf(k, v)}
                onRemove={() => update(withValues(k, valuesOf(criteria, k).filter((x) => x !== v)))}
              >
                {labelOf(k, v)}
              </RemovableChip>
            ))}
            <Button variant="link" className="text-[13px]" onClick={clearAll}>
              Clear all
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rez-smoke pt-2">
          <p className="text-[15px] text-rez-graphite" aria-live="polite">
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
          <label className="flex items-center gap-2.5 text-sm font-medium text-rez-graphite">
            Per page
            <NativeSelect size="sm" value={criteria.perPage} onChange={(e) => update({ perPage: Number(e.target.value) })}>
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>

        <div aria-busy={query.isFetching || isNavigating} className={cn("transition-opacity", (query.isFetching || isNavigating) && data && "opacity-60")}>
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
                chips.length || criteria.q ? (
                  <Button variant="secondary" onClick={clearAll}>
                    Clear search and filters
                  </Button>
                ) : null
              }
            >
              Sample projects cover Mumbai, Bengaluru, Pune, Hyderabad, Gurugram and Noida.
            </EmptyState>
          ) : (
            <>
              <ul className="flex flex-col gap-5">
                {data.items.map((p, i) => (
                  <li key={p.id}>
                    <ProjectCard project={p} priority={i < 2} />
                  </li>
                ))}
              </ul>
              <Pagination page={data.page} pageCount={data.pageCount} onChange={(page) => update({ page }, { scroll: true })} />
            </>
          )}
        </div>
      </div>

      <MultiSelectDialog
        open={openKey !== null}
        onOpenChange={(o) => !o && setOpenKey(null)}
        title={openKey ? LABELS[openKey] : ""}
        groups={openKey ? groupsFor(openKey, criteria.city) : []}
        selected={openKey ? valuesOf(criteria, openKey) : []}
        onDraftChange={setDraft}
        onApply={(values) => openKey && update(withValues(openKey, values))}
        applyLabel={() =>
          preview.isFetching || !preview.data ? "Apply" : `Apply (${pluralize(preview.data.total, "project")})`
        }
      />
    </div>
  );
}
