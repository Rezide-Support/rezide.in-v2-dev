"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Icon } from "@/components/brand/icon";
import { CoverImage } from "@/components/common/cover-image";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { projectSearchHref, propertySearchHref } from "@/features/search/criteria";
import { BUDGET_TIERS, PROJECT_STATUS, categoryById } from "@/lib/constants";
import { homeQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { PHOTO_IDS, unsplash } from "@/content/media";
import { usePreferredCity } from "@/stores/preferences";
import type { Intent, ProjectStatus, PropertyCategory } from "@/types/models";

/** `plus` marks a count the backend words as "at least" ("326+ listings"); `image` overrides the stock photo. */
type RailCard = { label: string; href: string; count: number | undefined; plus?: boolean; image?: string };

/** "326+ listings", "1 listing", "No listings yet". */
export function countLabel(count: number | undefined, plus: boolean | undefined, noun: string) {
  if (!count) return `No ${noun}s yet`;
  return `${count}${plus ? "+" : ""} ${noun}${count === 1 ? "" : "s"}`;
}

function RailGrid({
  cards,
  pool,
  loading,
  noun = "listing",
  fluid = false,
}: {
  cards: RailCard[];
  pool: readonly string[];
  loading: boolean;
  /** Card text and gaps follow the screen width (the projects home); phones unchanged. */
  fluid?: boolean;
  noun?: string;
}) {
  return (
    <ul
      aria-busy={loading}
      className={cn("grid grid-cols-[repeat(auto-fill,minmax(min(100%,calc(300px*var(--property-space-scale,1))),1fr))]", fluid ? "gap-5 md:gap-[clamp(18px,1.2vw,20px)]" : "gap-5")}
    >
      {/* The cards themselves come from the API, so placeholders hold their place until it answers. */}
      {loading && cards.length === 0
        ? Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <span className="block aspect-[3/2] animate-pulse rounded-xl bg-rez-cloud" />
            </li>
          ))
        : null}
      {!loading && cards.length === 0 ? <li className="col-span-full py-10 text-center text-[max(12px,calc(15px*var(--property-type-scale,1)))] text-rez-graphite">Nothing to show here for this city yet.</li> : null}
      {cards.map((c, i) => (
        <li key={c.label}>
          <Link
            href={c.href}
            className="group relative block aspect-[3/2] overflow-hidden rounded-xl bg-rez-cloud transition-shadow duration-200 ease-rez hover:shadow-rez-md"
          >
            <CoverImage
              src={c.image ?? unsplash(pool[i % pool.length], 900)}
              alt=""
              sizes="(min-width: 1280px) 400px, (min-width: 700px) 50vw, 100vw"
              className="transition-transform duration-500 ease-rez group-hover:scale-[1.03]"
            />
            <span aria-hidden className="scrim-bottom absolute inset-0" />
            <span
              className={cn(
                "absolute inset-x-6 bottom-[22px] flex flex-col gap-1.5 text-rez-full-white",
                fluid && "md:inset-x-[clamp(20px,1.4vw,24px)] md:bottom-[clamp(18px,1.3vw,22px)] md:gap-[clamp(5px,0.35vw,6px)]",
              )}
            >
              <span className={cn("text-[max(12px,calc(15px*var(--property-type-scale,1)))]", fluid && "md:text-[clamp(14px,0.9vw,15px)]")}>{loading ? "Counting…" : countLabel(c.count, c.plus, noun)}</span>
              <span className={cn("text-[max(12px,calc(22px*var(--property-type-scale,1)))] leading-tight font-bold tracking-[-0.01em] text-balance", fluid && "md:text-[clamp(19px,1.3vw,22px)]")}>{c.label}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type RailTab = "loc" | "budget" | "type" | "size";

/** Rail tabs per category, in the prototype's order. */
const RAIL_ORDER: Record<PropertyCategory, RailTab[]> = {
  homes: ["loc", "budget", "type", "size"],
  offices: ["loc", "budget", "size"],
  retail: ["loc", "budget", "size"],
  industrial: ["loc", "budget", "size"],
  land: ["type", "budget", "size"],
};

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex justify-center">
      <Button asChild variant="secondary">
        <Link href={href} aria-label={label}>
          View All
          <Icon name="arrow-right" size={20} />
        </Link>
      </Button>
    </div>
  );
}

export function PropertyRails({ category, intent }: { category: PropertyCategory; intent: Intent }) {
  const { city } = usePreferredCity();
  const stats = useQuery(homeQueries.properties(intent, city, category));
  const cat = categoryById(category);
  const labels: Record<RailTab, string> = {
    loc: "Location",
    budget: "Budget",
    type: category === "land" ? "Type" : "Unit type",
    size: category === "homes" ? "BHK" : "Area",
  };
  const tabs = RAIL_ORDER[category].map((value) => ({ value, label: labels[value] }));
  const [tab, setTab] = useState<RailTab>(tabs[0].value);
  // Unique per instance: Next keeps the previous tab's page mounted (hidden) for Back.
  const headingId = useId();
  const base = { city, intent, category };
  const s = stats.data;
  const monthly = intent === "rent" ? " / mo" : "";

  // Localities link to the city they're in.
  const railCards = (): RailCard[] => {
    if (!s) return [];
    switch (tab) {
      case "loc":
        return s.localities.slice(0, 6).map((l) => ({
          label: l.name,
          image: l.image,
          count: intent === "rent" ? l.forRent : l.forSale,
          href: propertySearchHref({ ...base, city: s.localityCity, localities: [l.name] }),
        }));
      case "budget":
        return s.budgets.map((b) => ({
          label: b.label + monthly,
          count: b.count,
          plus: b.plus,
          href: propertySearchHref({ ...base, budgetMin: b.min, budgetMax: b.max }),
        }));
      case "type":
        return s.unitTypes.map((u) => ({ label: u.label, count: u.count, plus: u.plus, href: propertySearchHref({ ...base, unitTypes: [u.label] }) }));
      default:
        return category === "homes"
          ? s.bhks.map((b) => ({ label: b.label, count: b.count, plus: b.plus, href: propertySearchHref({ ...base, bhk: [b.label] }) }))
          : s.areas.map((a) => ({ label: a.label, count: a.count, href: propertySearchHref({ ...base, areaMin: a.min, areaMax: a.max }) }));
    }
  };

  const cards = railCards();

  const verb = intent === "buy" ? "Sale" : "Rent";

  return (
    <section aria-labelledby={headingId} className="property-discovery-rail px-4 pt-12 pb-16 md:px-8 md:pt-[clamp(56px,5.2vw,88px)] md:pb-[clamp(56px,5.2vw,88px)] [--property-space-scale:1] [--spacing:0.25rem]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 md:max-w-[clamp(1040px,74vw,1280px)] md:gap-[clamp(26px,1.9vw,32px)] md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6 max-lg:flex-col max-lg:items-center max-lg:gap-4">
          <h2 id={headingId} className="text-[max(12px,calc(28px*var(--property-type-scale,1)))] leading-[1.1] font-semibold tracking-[-0.02em] text-pretty max-lg:text-center max-sm:text-[max(12px,calc(22px*var(--property-type-scale,1)))] md:text-[max(12px,calc(36px*var(--property-type-scale,1)))]">
            <span className="text-rez-mocaccino-ink">{city}</span> {category === "offices" ? "Office" : cat.noun} for{" "}
            <span className={intent === "buy" ? "text-rez-burgundy" : "text-rez-timber"}>{verb}</span>
          </h2>
          <Segmented
            label="Browse by"
            value={tab}
            onChange={setTab}
            options={tabs}
            className="rounded-[14px] max-sm:flex max-sm:w-full max-sm:rounded-full"
            itemClassName="min-w-[112px] rounded-[10px] text-[13px] aria-checked:font-semibold max-sm:h-9 max-sm:min-w-0 max-sm:flex-1 max-sm:rounded-full max-sm:px-2 max-sm:text-[12px]"
          />
        </div>
        {stats.isError ? (
          <p role="alert" className="text-sm text-rez-graphite">
            Listing counts are unavailable right now.{" "}
            <button type="button" className="font-semibold underline" onClick={() => stats.refetch()}>
              Retry
            </button>
          </p>
        ) : null}
        <RailGrid cards={cards} pool={PHOTO_IDS[category]} loading={stats.isPending} fluid />
        <ViewAll href={propertySearchHref(base)} label={`View all ${cat.noun.toLowerCase()} for ${verb.toLowerCase()} in ${city}`} />
      </div>
    </section>
  );
}

export function ProjectRails({ status }: { status: ProjectStatus }) {
  const { city } = usePreferredCity();
  const stats = useQuery(homeQueries.projects(city, status));
  const tabs = [
    { value: "year", label: { uc: "Possession", rtm: "Age", nl: "Recency" }[status] },
    { value: "budget", label: "Budget" },
    { value: "loc", label: "Location" },
  ];
  const [tab, setTab] = useState(tabs[0].value);
  const headingId = useId();
  const s = stats.data;
  const statusLabel = PROJECT_STATUS.find((x) => x.id === status)?.label ?? "";

  const cards: RailCard[] = !s
    ? []
    : tab === "year"
      ? s.possession.map((p) => ({
          label: p.label,
          count: p.count,
          plus: p.plus,
          href: projectSearchHref({ city, status: [status], years: p.year ? [p.year] : [] }),
        }))
      : tab === "budget"
        ? s.budgets.map((b) => {
            // The same bands as the project search's tiers, matched by where they start.
            const tier = BUDGET_TIERS.find((t) => t.min === (b.min ?? 0));
            return {
              label: tier ? `${tier.label} (${tier.range})` : b.label,
              count: b.count,
              plus: b.plus,
              href: projectSearchHref({ city, status: [status], budget: tier ? [tier.id] : [] }),
            };
          })
        : s.localities.slice(0, 6).map((l) => ({
            label: l.name,
            image: l.image,
            count: l.projects,
            // A locality, not a sub-region: sent to the backend as `localities` (count-mismatch report F3).
            href: projectSearchHref({ city: s.localityCity, status: [status], localityNames: [l.name] }),
          }));

  return (
    <section aria-labelledby={headingId} className="px-4 pt-12 pb-16 md:px-8 md:pt-[clamp(56px,5.2vw,88px)] md:pb-[clamp(56px,5.2vw,88px)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 md:max-w-[clamp(1040px,74vw,1280px)] md:gap-[clamp(26px,1.9vw,32px)] md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6 max-lg:flex-col max-lg:items-center max-lg:gap-4">
          <h2 id={headingId} className="text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-pretty max-lg:text-center max-sm:text-[22px] md:text-[clamp(28px,2.1vw,36px)]">
            <span className="text-rez-mocaccino-ink">{city}</span>{" "}
            {status === "uc" ? (
              <>
                <span className="sm:hidden">Under Const.</span>
                <span className="max-sm:hidden">{statusLabel}</span>
              </>
            ) : (
              statusLabel
            )}
          </h2>
          <Segmented
            label="Browse by"
            value={tab}
            onChange={setTab}
            options={tabs}
            className="rounded-[14px] max-sm:flex max-sm:w-full max-sm:rounded-full"
            itemClassName="min-w-[112px] sm:h-[clamp(36px,2.4vw,40px)] sm:min-w-[clamp(100px,6.6vw,112px)] rounded-[10px] text-[13px] aria-checked:font-semibold max-sm:h-9 max-sm:min-w-0 max-sm:flex-1 max-sm:rounded-full max-sm:px-2 max-sm:text-[12px]"
          />
        </div>
        {stats.isError ? (
          <p role="alert" className="text-sm text-rez-graphite">
            Project counts are unavailable right now.{" "}
            <button type="button" className="font-semibold underline" onClick={() => stats.refetch()}>
              Retry
            </button>
          </p>
        ) : null}
        <RailGrid cards={cards} pool={PHOTO_IDS.projects} loading={stats.isPending} noun="project" fluid />
        <ViewAll href={projectSearchHref({ city, status: [status] })} label={`View all ${statusLabel.toLowerCase()} projects in ${city}`} />
      </div>
    </section>
  );
}
