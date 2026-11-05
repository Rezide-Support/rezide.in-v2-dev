"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Icon } from "@/components/brand/icon";
import { CoverImage } from "@/components/common/cover-image";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { projectSearchHref, propertySearchHref } from "@/features/search/criteria";
import { AREA_BANDS, BUDGET_POINTS, BUDGET_TIERS, PROJECT_STATUS, UNIT_TYPES, categoryById, localitiesFor } from "@/lib/constants";
import { homeQueries } from "@/lib/queries";
import { PHOTO_IDS, unsplash } from "@/content/media";
import { POPULAR_LOCALITIES_CITY } from "@/services/home";
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
}: {
  cards: RailCard[];
  pool: readonly string[];
  loading: boolean;
  noun?: string;
}) {
  return (
    <ul aria-busy={loading} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
      {/* The cards themselves come from the API, so placeholders hold their place until it answers. */}
      {loading && cards.length === 0
        ? Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <span className="block aspect-[3/2] animate-pulse rounded-xl bg-rez-cloud" />
            </li>
          ))
        : null}
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
            <span className="absolute inset-x-6 bottom-[22px] flex flex-col gap-1.5 text-rez-full-white">
              <span className="text-[15px]">{loading ? "Counting…" : countLabel(c.count, c.plus, noun)}</span>
              <span className="text-[22px] leading-tight font-bold tracking-[-0.01em] text-balance">{c.label}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function budgetRanges(intent: Intent) {
  const pts = BUDGET_POINTS[intent];
  const ranges = pts.map((pt, i) => ({
    label: i === 0 ? `Under ${pt.label}` : `${pts[i - 1].label} – ${pt.label}`,
    min: i === 0 ? undefined : pts[i - 1].value,
    max: pt.value,
    key: `${i === 0 ? 0 : pts[i - 1].value}-${pt.value}`,
  }));
  const last = pts[pts.length - 1];
  return [...ranges, { label: `Above ${last.label}`, min: last.value, max: undefined, key: `${last.value}-` }].slice(-6).reverse();
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
  // The backend only holds homes, so other categories have nothing to ask for.
  const isHomes = category === "homes";
  const stats = useQuery({ ...homeQueries.properties(intent), enabled: isHomes });
  const cat = categoryById(category);
  const labels: Record<RailTab, string> = {
    loc: "Location",
    budget: "Budget",
    type: category === "land" ? "Type" : "Unit Type",
    size: category === "homes" ? "BHK" : "Size",
  };
  const tabs = RAIL_ORDER[category].map((value) => ({ value, label: labels[value] }));
  const [tab, setTab] = useState<RailTab>(tabs[0].value);
  // Unique per instance: Next keeps the previous tab's page mounted (hidden) for Back.
  const headingId = useId();
  const base = { city, intent, category };
  const s = stats.data;
  const monthly = intent === "rent" ? " / mo" : "";

  // Homes come from the backend's home-page rails, as on rezide.in. Its popular localities are all in Mumbai.
  const homeCards = (): RailCard[] => {
    if (!s) return [];
    switch (tab) {
      case "loc":
        return s.localities.slice(0, 6).map((l) => ({
          label: l.name,
          image: l.image,
          count: intent === "rent" ? l.forRent : l.forSale,
          href: propertySearchHref({ ...base, city: POPULAR_LOCALITIES_CITY, localities: [l.name] }),
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
        return s.bhks.map((b) => ({ label: b.label, count: b.count, plus: b.plus, href: propertySearchHref({ ...base, bhk: [b.label] }) }));
    }
  };

  // Other categories keep their options, with no listings to count yet.
  const otherCards = (): RailCard[] => {
    switch (tab) {
      case "loc":
        return localitiesFor(city).slice(0, 6).map((l) => ({ label: l, count: 0, href: propertySearchHref({ ...base, localities: [l] }) }));
      case "budget":
        return budgetRanges(intent).map((b) => ({ label: b.label + monthly, count: 0, href: propertySearchHref({ ...base, budgetMin: b.min, budgetMax: b.max }) }));
      case "type":
        return UNIT_TYPES[category].slice(0, 6).map((u) => ({ label: u, count: 0, href: propertySearchHref({ ...base, unitTypes: [u] }) }));
      default:
        return AREA_BANDS.map((b) => ({ label: b.label, count: 0, href: propertySearchHref({ ...base, areaMin: b.min, areaMax: b.max }) }));
    }
  };

  const cards = isHomes ? homeCards() : otherCards();

  const verb = intent === "buy" ? "Sale" : cat.lease;

  return (
    <section aria-labelledby={headingId} className="px-4 pt-12 pb-16 md:px-8 md:pt-[88px] md:pb-[88px]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <h2 id={headingId} className="text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-pretty md:text-[40px]">
            <span className="font-extrabold">{city}</span> {cat.noun} for{" "}
            <span className="font-extrabold text-rez-mocaccino-ink">{verb}</span>.
          </h2>
          <Segmented label="Browse by" value={tab} onChange={setTab} options={tabs} appearance="outline" size="lg" />
        </div>
        {stats.isError ? (
          <p role="alert" className="text-sm text-rez-graphite">
            Listing counts are unavailable right now.{" "}
            <button type="button" className="font-semibold underline" onClick={() => stats.refetch()}>
              Retry
            </button>
          </p>
        ) : null}
        <RailGrid cards={cards} pool={PHOTO_IDS[category]} loading={isHomes && stats.isPending} />
        <ViewAll href={propertySearchHref(base)} label={`View all ${cat.noun.toLowerCase()} for ${verb.toLowerCase()} in ${city}`} />
      </div>
    </section>
  );
}

export function ProjectRails({ status }: { status: ProjectStatus }) {
  const { city } = usePreferredCity();
  const stats = useQuery(homeQueries.projects(city, status));
  // The prototype's Age (ready to move) and Recency (new launches) rails need
  // completion and launch dates the catalogue doesn't have yet; see README.
  const tabs = [
    ...(status === "uc" ? [{ value: "year", label: "Possession" }] : []),
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
            href: projectSearchHref({ city: POPULAR_LOCALITIES_CITY, status: [status], localities: [l.name] }),
          }));

  return (
    <section aria-labelledby={headingId} className="px-4 pt-12 pb-16 md:px-8 md:pt-[88px] md:pb-[88px]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <h2 id={headingId} className="text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[40px]">
            <span className="font-extrabold">{city}</span>{" "}
            <span className="font-extrabold text-rez-mocaccino-ink">{statusLabel}</span> Homes.
          </h2>
          <Segmented label="Browse by" value={tab} onChange={setTab} options={tabs} appearance="outline" size="lg" />
        </div>
        {stats.isError ? (
          <p role="alert" className="text-sm text-rez-graphite">
            Project counts are unavailable right now.{" "}
            <button type="button" className="font-semibold underline" onClick={() => stats.refetch()}>
              Retry
            </button>
          </p>
        ) : null}
        <RailGrid cards={cards} pool={PHOTO_IDS.projects} loading={stats.isPending} noun="project" />
        <ViewAll href={projectSearchHref({ city, status: [status] })} label={`View all ${statusLabel.toLowerCase()} projects in ${city}`} />
      </div>
    </section>
  );
}
