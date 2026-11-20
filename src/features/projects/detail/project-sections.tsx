"use client";

import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "@/features/properties/detail/detail-ui";
import { formatAreaRange, formatPriceRange, formatRupees } from "@/features/properties/detail/format";
import { PROJECT_STATUS_LABEL } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/models";
import { V1Title } from "./v1-ui";

export { ConfigurationPlans } from "./configuration-plans";

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
const possessionShort = (p: Pick<Project, "possessionLabel">) => p.possessionLabel.replace(/^(Possession|Completed|Launch)\s+/i, "");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * rezide.in's Project summary badges: the status read from the completion date (past: "Ready to
 * Move", else "Under Construction") and that date as "Jan, 2024", both in the status's colour.
 */
export function summaryBadges(p: Pick<Project, "completionDate" | "status" | "possessionLabel">, now = new Date()) {
  const date = p.completionDate ? new Date(p.completionDate.replace(" ", "T")) : null;
  if (date && !Number.isNaN(date.getTime())) {
    const ready = date.getTime() < now.getTime();
    return { ready, status: ready ? "Ready to Move" : "Under Construction", date: `${MONTHS[date.getMonth()]}, ${date.getFullYear()}` };
  }
  // No completion date on the record: the listed status and possession.
  return { ready: p.status === "rtm", status: PROJECT_STATUS_LABEL[p.status], date: possessionShort(p) };
}

/** rezide.in's status colours (green for Ready to Move, slate for Under Construction). */
const SUMMARY_GRADIENT = { ready: "from-[#2ECC71] to-[#17A855]", building: "from-[#5D6D7E] to-[#3E5063]" };

export function ProjectSummary({ project: p }: { project: Project }) {
  const yieldPct = p.rentFrom && p.priceFrom ? ((p.rentFrom * 12) / p.priceFrom) * 100 : undefined;
  const badges = summaryBadges(p);
  const badge = cn("w-auto rounded-lg bg-gradient-to-r px-3 py-1 text-sm font-medium text-white", badges.ready ? SUMMARY_GRADIENT.ready : SUMMARY_GRADIENT.building);
  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-6 sm:gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading id="summary-heading">Project summary</SectionHeading>
        <div className="flex h-fit gap-2">
          <span className={badge}>{badges.status}</span>
          <span className={badge}>{badges.date}</span>
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

/** How many amenities show before "N More" (rezide.in shows 11, then the "More" tile). */
const AMENITY_PREVIEW = 11;

/** The amenity's icon, from the Rezide backend's icon set (by amenity name), as rezide.in shows it. */
export const amenityIcon = (name: string) => `https://api.rezide.in/v1/admin/repository/amenities/icon/${encodeURIComponent(name)}.svg`;

/** "Project Amenities", as on rezide.in: icon cards, the first 11, then "N More / View". */
export function ProjectAmenities({ project: p }: { project: Project }) {
  const [showAll, setShowAll] = useState(false);
  const all = p.amenities;
  const hasMore = all.length > AMENITY_PREVIEW;
  const shown = showAll ? all : all.slice(0, AMENITY_PREVIEW);
  return (
    <section aria-labelledby="amen-heading" className="flex flex-col">
      <V1Title id="amen-heading" className="mb-2 lg:my-10">
        Project Amenities
      </V1Title>
      <ul id="project-amenities" className="grid grid-cols-3 gap-4 lg:grid-cols-6 lg:gap-8">
        {shown.map((a) => (
          <li key={a} className="rounded-xl bg-white text-black shadow">
            <div className="grid items-center justify-center gap-4 p-5 text-center">
              {/* The icons are SVGs served by the backend; the image optimiser doesn't take SVG. */}
              <Image src={amenityIcon(a)} alt="" width={32} height={32} unoptimized className="m-auto size-8" />
              <p className="text-xs lg:text-sm">{a}</p>
            </div>
          </li>
        ))}
        {hasMore && (
          <li>
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              aria-expanded={showAll}
              aria-controls="project-amenities"
              className="flex size-full min-h-[104px] cursor-pointer flex-col items-center justify-center rounded-lg border border-gray-300 bg-blue-50 text-blue-600 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              <span className="text-sm font-medium">{showAll ? "Show Less" : `${all.length - AMENITY_PREVIEW} More`}</span>
              <span className="flex items-center gap-1 text-sm font-medium">
                {showAll ? (
                  <ChevronUp size={16} aria-hidden />
                ) : (
                  <>
                    View <ChevronDown size={16} aria-hidden />
                  </>
                )}
              </span>
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}

/** "Project RERA Details", as on rezide.in: one card per registration, with its QR code and the regulator's page. */
export function ReraDetails({ project: p }: { project: Project }) {
  const reras = p.reras ?? [];
  if (reras.length === 0) return null;
  return (
    <section aria-labelledby="rera-heading" className="flex flex-col">
      <V1Title id="rera-heading" className="mb-2 lg:my-10">
        <span className="lg:hidden">RERA Details</span>
        <span className="hidden lg:inline">Project RERA Details</span>
      </V1Title>
      <ul>
        {reras.map((r) => (
          <li key={r.id} className="mb-2 rounded-xl border border-gray-300 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 p-2">
              <div className="flex min-w-0 items-center gap-2">
                {r.qr && <Image src={r.qr} alt={`QR code for RERA ${r.id}`} width={64} height={64} className="size-16 shrink-0 rounded object-contain" />}
                <div className="min-w-0">
                  <p className="text-base font-semibold break-all">{r.id}</p>
                  <p className="text-base font-semibold text-gray-500">{p.name}</p>
                </div>
              </div>
              {r.link && (
                <a href={r.link} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm font-semibold text-blue-600 sm:text-lg">
                  <span className="hidden sm:inline">VIEW DETAILS</span>
                  <span className="sm:hidden">VIEW</span>
                  <span className="sr-only"> of RERA {r.id} (opens the regulator&apos;s site)</span>
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
