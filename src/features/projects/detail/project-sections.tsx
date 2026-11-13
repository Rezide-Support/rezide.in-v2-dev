"use client";

import Image from "next/image";
import { ChevronDown, LayoutGrid, QrCode } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/common/feedback";
import { Segmented } from "@/components/common/segmented";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AmenityTile } from "@/features/properties/detail/amenity-icon";
import { Chip, NotYetButton, SectionHeading } from "@/features/properties/detail/detail-ui";
import { formatAreaRange, formatPriceRange, formatRupees } from "@/features/properties/detail/format";
import { PROJECT_STATUS_LABEL } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Project, ProjectConfiguration } from "@/types/models";

/** Radix builds element ids from tab values, so they must not contain spaces ("2 BHK" → "2-bhk"). */
const tabValue = (label: string) => label.toLowerCase().replace(/[^a-z0-9.]+/g, "-");

/* Sections of the v1 project page, top to bottom. */

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <dt className="text-[13px] text-rez-graphite">{label}</dt>
      <dd className="text-base font-semibold sm:text-xl">{value}</dd>
      {note && <dd className="text-[11px] font-semibold text-rez-graphite">{note}</dd>}
    </div>
  );
}

/** Possession badge text: "Apr 2029" style from the possession label. */
const possessionShort = (p: Project) => p.possessionLabel.replace(/^(Possession|Completed|Launch)\s+/i, "");

export function ProjectSummary({ project: p }: { project: Project }) {
  const yieldPct = p.rentFrom && p.priceFrom ? ((p.rentFrom * 12) / p.priceFrom) * 100 : undefined;
  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-6 sm:gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading id="summary-heading">Project summary</SectionHeading>
        <div className="flex gap-2">
          <Chip tone="dark">{PROJECT_STATUS_LABEL[p.status]}</Chip>
          <Chip tone="dark">{possessionShort(p)}</Chip>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-xl border border-rez-smoke px-4 py-8 sm:px-8 sm:py-10">
          <Stat label="Plot area" value={`${p.acres} Acre${p.acres === 1 ? "" : "s"}`} />
          <Stat label="Recreation" value={`${p.amenities.length} Amenities`} />
          <Stat label="No. of towers" value={`${p.towers} Tower${p.towers === 1 ? "" : "s"}`} />
          <Stat label="No. of units" value={`${formatNumber(p.units)} Units`} />
        </dl>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-xl border border-rez-smoke px-4 py-8 sm:px-8 sm:py-10">
          <Stat label="Unit config" value={p.configurations} />
          <Stat label="Size range" value={formatAreaRange(p.areaMin, p.areaMax)} />
          <Stat label="Sale range" value={formatPriceRange(p.priceFrom, p.priceTo)} note={`Rate: ${formatRupees(p.ratePerSqft)} psf`} />
          <Stat
            label="Rent range"
            value={p.rentFrom && p.rentTo ? formatPriceRange(p.rentFrom, p.rentTo, { monthly: true }) : "NA"}
            note={`Yield: ${yieldPct ? `${yieldPct.toFixed(1)}%` : "NA"}`}
          />
        </dl>
      </div>
    </section>
  );
}

export function ConfigurationPlans({ project: p }: { project: Project }) {
  const plans: ProjectConfiguration[] = p.configurationPlans ?? p.bhkOptions.map((b) => ({ bhk: b, areaMin: p.areaMin, areaMax: p.areaMax }));
  const [kind, setKind] = useState<"unit" | "floor">("unit");
  if (!plans.length) return null;
  return (
    <section aria-labelledby="config-heading" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading id="config-heading">Configuration plans</SectionHeading>
        <Segmented
          label="Plan type"
          appearance="solid"
          size="sm"
          value={kind}
          onChange={setKind}
          options={[
            { value: "unit", label: "Unit Plan" },
            { value: "floor", label: "Floor Plan" },
          ]}
          className="border border-black bg-white"
        />
      </div>
      <Tabs defaultValue={tabValue(plans[0].bhk)} className="gap-4">
        <TabsList aria-label="Configuration" className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
          {plans.map((c) => (
            <TabsTrigger
              key={c.bhk}
              value={tabValue(c.bhk)}
              className="h-10 flex-none rounded-md border-0 bg-rez-cloud px-4 text-sm font-medium text-rez-graphite after:hidden hover:text-black data-active:bg-black data-active:font-semibold data-active:text-rez-full-white data-active:shadow-none data-active:hover:text-rez-full-white"
            >
              {c.bhk}
            </TabsTrigger>
          ))}
        </TabsList>
        {plans.map((c) => {
          const images = kind === "unit" ? (c.unitPlans ?? []) : (c.floorPlans ?? []);
          return (
            <TabsContent key={c.bhk} value={tabValue(c.bhk)} className="grid grid-cols-1 items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
              <dl className="flex flex-col gap-1 self-start rounded-md border border-rez-smoke px-4 py-3">
                <dt className="text-[13px] text-rez-graphite">Area range</dt>
                <dd className="text-base font-semibold">{formatAreaRange(c.areaMin, c.areaMax)}</dd>
              </dl>
              {images.length ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((src, i) => (
                    <li key={src} className="relative aspect-[4/3] overflow-hidden rounded-md border border-rez-smoke bg-white">
                      <Image src={src} alt={`${c.bhk} ${kind} plan ${i + 1}`} fill sizes="(min-width: 768px) 25vw, 50vw" quality={70} className="object-contain" />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center md:items-end md:text-right">
                  <LayoutGrid className="size-6 text-rez-graphite md:hidden" aria-hidden />
                  <p className="text-lg font-medium sm:text-2xl">No {kind === "unit" ? "Unit" : "Floor"} Plans Available</p>
                  <p className="text-[13px] text-rez-graphite">The developer hasn&apos;t shared {kind} plans for {c.bhk} yet.</p>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}

const AMENITY_PREVIEW = 11;

export function ProjectAmenities({ project: p }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const all = p.amenities;
  const more = all.length - AMENITY_PREVIEW;
  const shown = open || more <= 0 ? all : all.slice(0, AMENITY_PREVIEW);
  return (
    <section aria-labelledby="amen-heading" className="flex flex-col gap-6 sm:gap-10">
      <SectionHeading id="amen-heading">Project amenities</SectionHeading>
      {all.length === 0 ? (
        <EmptyState icon="search" title="No amenities listed">
          The developer hasn&apos;t listed amenities for this project yet.
        </EmptyState>
      ) : (
        <ul id="project-amenities" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-8">
          {shown.map((a) => (
            <li key={a}>
              <AmenityTile name={a} />
            </li>
          ))}
          {more > 0 && (
            <li>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="project-amenities"
                className="flex h-full min-h-[112px] w-full flex-col items-center justify-center gap-1 rounded-lg border border-[#c9d8f5] bg-[#eef3fd] text-sm font-medium text-[#2a5bd7] focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/60 focus-visible:outline-none"
              >
                {open ? "Show less" : `${more} More`}
                <span className="flex items-center gap-1">
                  View <ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

export function ReraDetails({ project: p }: { project: Project }) {
  return (
    <section aria-labelledby="rera-heading" className="flex flex-col gap-6">
      <SectionHeading id="rera-heading">Project RERA details</SectionHeading>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rez-smoke px-4 py-3">
        <div className="flex items-center gap-4">
          {/* No QR: the backend's RERA records aren't mapped here yet. */}
          <span aria-hidden className="flex size-14 items-center justify-center rounded-md border border-dashed border-rez-steel text-rez-steel">
            <QrCode className="size-8" strokeWidth={1.25} />
          </span>
          <div>
            <p className="text-[15px] font-semibold">{p.reraId}</p>
            <p className="text-[15px] text-rez-graphite">{p.name}</p>
            <p className="text-xs text-rez-graphite">As provided by the developer.</p>
          </div>
        </div>
        <NotYetButton variant="ghost" className="font-semibold tracking-[0.04em] text-[#2a5bd7] uppercase" message="RERA verification isn't connected in this prototype, so there are no registration details to show.">
          View details
        </NotYetButton>
      </div>
    </section>
  );
}
