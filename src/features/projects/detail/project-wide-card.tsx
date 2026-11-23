"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { Building2, ChevronDown, ChevronUp, House, LayoutGrid } from "lucide-react";
import { ConfigurationTable, ProjectCardFooter } from "@/features/projects/project-card";
import { ShareButton } from "@/features/properties/share-button";
import { formatAreaRange, formatPriceRange, formatRupees } from "@/features/properties/detail/format";
import { SaveIconButton } from "@/features/properties/detail/save-actions";
import { formatNumber } from "@/lib/format";
import type { Project } from "@/types/models";

function Row({ icon: IconCmp, label, children }: { icon: typeof Building2; label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-rez-smoke py-3 last:border-b-0">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rez-cloud">
        <IconCmp className="size-5" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-rez-graphite">{label}</div>
        <div className="text-[15px]">{children}</div>
      </div>
    </div>
  );
}

/** Wide project card for account activity and the Similar / Nearby rails. */
export function ProjectWideCard({ project: p }: { project: Project }) {
  const amen = p.amenities.slice(0, 2).join(" · ");
  const extra = p.amenities.length - 2;
  // rezide.in's "Details": the per-configuration table, opened from the Configurations row or the side panel.
  const [configOpen, setConfigOpen] = useState(false);
  const tableId = useId();
  const ranges = p.configurationPlans ?? [];
  const hasRanges = ranges.length > 0;
  const toggle = () => setConfigOpen((o) => !o);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-rez-smoke bg-white">
      <div className="grid grid-cols-1 flex-1 gap-5 p-4 md:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_200px]">
        <Link href={`/project/${p.id}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${p.name}`} className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-rez-cloud md:aspect-auto md:min-h-[240px]">
          <Image src={p.images[0]} alt={p.name} fill sizes="(min-width: 768px) 300px, 100vw" quality={70} className="object-cover" />
        </Link>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xl leading-tight font-semibold">
                <Link href={`/project/${p.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {p.name}
                </Link>
              </h3>
              <p className="text-sm text-rez-graphite">
                {p.developer} · {p.locality}, {p.city}
              </p>
            </div>
            <div className="flex shrink-0 gap-1 [&_button]:size-9">
              <SaveIconButton list="shortlist" kind="project" id={p.id} title={p.name} />
              <SaveIconButton list="compare" kind="project" id={p.id} title={p.name} />
              <ShareButton iconOnly title={p.name} path={`/projects/${p.id}`} className="size-9 border-transparent" />
            </div>
          </div>
          <div className="mt-2">
            <Row icon={Building2} label="Project Size">
              {/* Singular for 1: "1 Tower", "2 Towers". */}
              {p.acres} {p.acres === 1 ? "Acre" : "Acres"} · {p.towers} {p.towers === 1 ? "Tower" : "Towers"} · {formatNumber(p.units)} {p.units === 1 ? "Unit" : "Units"}
            </Row>
            <Row
              icon={LayoutGrid}
              label={
                <span className="flex items-center gap-4">
                  Configurations
                  {hasRanges && (
                    <button
                      type="button"
                      onClick={toggle}
                      aria-expanded={configOpen}
                      aria-controls={tableId}
                      aria-label={configOpen ? "Hide configuration details" : "Show configuration details"}
                      className="-m-1 rounded p-1 text-black hover:bg-black/[0.06] focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
                    >
                      {configOpen ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
                    </button>
                  )}
                </span>
              }
            >
              {configOpen && hasRanges ? <ConfigurationTable id={tableId} rows={ranges} /> : p.configurations}
            </Row>
            <Row icon={House} label="Amenities">
              {amen}
              {extra > 0 && ` +${extra}`}
            </Row>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-rez-cloud px-4 py-5 text-center md:col-span-2 md:flex-row md:justify-around xl:col-span-1 xl:flex-col">
          <dl>
            <dt className="text-[13px] text-rez-graphite">Area range</dt>
            <dd className="text-base font-semibold">{formatAreaRange(p.areaMin, p.areaMax)}</dd>
          </dl>
          <dl>
            <dt className="text-[13px] text-rez-graphite">Sale range</dt>
            <dd className="text-base font-semibold">{formatPriceRange(p.priceFrom, p.priceTo)}</dd>
            <dd className="text-[11px] text-rez-graphite">({formatRupees(p.ratePerSqft)} psf)</dd>
          </dl>
          {hasRanges && (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={configOpen}
              aria-controls={tableId}
              className="text-[13px] font-semibold tracking-[0.02em] uppercase underline underline-offset-4 hover:text-rez-mocaccino-ink"
            >
              {configOpen ? "Hide Details" : "Details"}
              <span className="sr-only"> of {p.name}&apos;s configurations</span>
            </button>
          )}

        </div>
      </div>
      <ProjectCardFooter project={p} backendBadges />
    </article>
  );
}
