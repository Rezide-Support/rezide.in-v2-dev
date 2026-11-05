"use client";

import { CoverImage } from "@/components/common/cover-image";
import { PHOTO_IDS, unsplash } from "@/content/media";
import { PROJECT_STATUS_LABEL } from "@/lib/constants";
import { formatPrice, initials } from "@/lib/format";
import type { Project, PropertyCategory } from "@/types/models";

/** Cards whose photos load eagerly: the short cards here show about two rows on a desktop screen. */
const ABOVE_FOLD = 6;
import type { PropertyGroupSummary } from "./match";

/* Grouped result views from the prototype's "Location" and "Projects" view tabs. */

export type LocalityGroup = { name: string; count: number; projects: number; image?: string };
export type ProjectGroup = { project: Project; count: number; min?: number; max?: number };

/** One card per locality (in the given order), with counts from GET /properties/groups?groupBy=locality. */
export function groupByLocality(localities: string[], summaries: PropertyGroupSummary[], category: PropertyCategory): LocalityGroup[] {
  const pool = PHOTO_IDS[category];
  const byKey = new Map(summaries.map((g) => [g.key, g]));
  return localities.map((name, i) => {
    const g = byKey.get(name);
    return {
      name,
      count: g?.count ?? 0,
      projects: g?.projectCount ?? 0,
      image: g?.image ?? unsplash(pool[i % pool.length], 800),
    };
  });
}

/** Projects with matching listings first; otherwise the catalogue order is kept. */
export function groupByProject(projects: Project[], summaries: PropertyGroupSummary[]): ProjectGroup[] {
  const byKey = new Map(summaries.map((g) => [g.key, g]));
  const groups = projects.map((project) => {
    const g = byKey.get(project.id);
    return {
      project,
      count: g?.count ?? 0,
      min: g?.minPrice ?? undefined,
      max: g?.maxPrice ?? undefined,
    };
  });
  return groups.map((g, i) => ({ g, i })).sort((a, b) => b.g.count - a.g.count || a.i - b.i).map(({ g }) => g);
}

const GRID = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function LocalityGrid({
  groups,
  rent,
  onSelect,
}: {
  groups: LocalityGroup[];
  rent: boolean;
  onSelect: (name: string) => void;
}) {
  return (
    <ul className={GRID}>
      {groups.map((g, i) => (
        <li key={g.name} className="flex">
          <button
            type="button"
            onClick={() => onSelect(g.name)}
            className="flex w-full flex-col overflow-hidden rounded-[20px] border border-rez-smoke bg-white text-left transition-shadow duration-200 ease-rez hover:shadow-rez-md"
          >
            <span className="relative block aspect-[16/10] w-full bg-rez-cloud">
              {g.image && <CoverImage src={g.image} alt="" sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw" priority={i < ABOVE_FOLD} />}
            </span>
            <span className="flex flex-col gap-3.5 px-5 pt-[18px] pb-5">
              <span className="text-[19px] leading-tight font-semibold tracking-[-0.01em]">{g.name}</span>
              <span className="flex justify-between gap-3 text-[13px] text-rez-graphite">
                <span>
                  {rent ? "For rent" : "For sale"} <b className="ml-1.5 text-base text-black">{g.count}</b>
                </span>
                <span>
                  Projects <b className="ml-1.5 text-base text-black">{g.projects}</b>
                </span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ProjectGrid({
  groups,
  rent,
  onSelect,
}: {
  groups: ProjectGroup[];
  rent: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(({ project: p, count, min, max }, i) => (
        <li key={p.id} className="flex">
          <button
            type="button"
            onClick={() => onSelect(p.id)}
            className="flex w-full flex-col overflow-hidden rounded-[20px] border border-rez-smoke bg-white text-left transition-shadow duration-200 ease-rez hover:shadow-rez-md"
          >
            <span className="relative block aspect-[16/10] w-full bg-rez-cloud">
              <CoverImage src={p.images[0]} alt="" sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" priority={i < ABOVE_FOLD} />
              <span className="absolute top-3.5 left-3.5 flex h-7 items-center rounded-full bg-black px-3 text-xs font-semibold text-rez-full-white">
                {PROJECT_STATUS_LABEL[p.status]}
              </span>
            </span>
            <span className="flex flex-col gap-3.5 px-[22px] pt-[18px] pb-[22px]">
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[19px] leading-tight font-semibold tracking-[-0.01em]">{p.name}</span>
                  <span className="text-sm text-rez-graphite">
                    {p.locality} · {p.developer}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="flex size-11 flex-none items-center justify-center rounded-full border border-rez-smoke text-sm font-bold"
                >
                  {initials(p.developer)}
                </span>
              </span>
              <span className="grid grid-cols-2 gap-1 rounded-2xl bg-rez-cloud px-2 py-3 text-center">
                <span className="flex min-w-0 flex-col gap-1">
                  <b className="text-[15px] leading-tight">{count}</b>
                  <span className="text-[11px] text-rez-graphite">{count === 1 ? "Listing" : "Listings"}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <b className="text-[15px] leading-tight">
                    {min === undefined || max === undefined
                      ? "—"
                      : min === max
                        ? formatPrice(min, { compact: true, monthly: rent })
                        : `${formatPrice(min, { compact: true })} – ${formatPrice(max, { compact: true, monthly: rent })}`}
                  </b>
                  <span className="text-[11px] text-rez-graphite">{rent ? "Rent range" : "Sale range"}</span>
                </span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
