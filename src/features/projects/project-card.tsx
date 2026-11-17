"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { CoverImage } from "@/components/common/cover-image";
import { PROJECT_STATUS_LABEL } from "@/lib/constants";
import { formatNumber, formatPrice, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/features/properties/share-button";
import type { Project, ProjectConfiguration } from "@/types/models";
import { shortInr } from "./detail/v1-ui";

/** rezide.in's configurations table on a project card: area, sale and rent range per configuration. */
function ConfigurationTable({ id, rows }: { id: string; rows: ProjectConfiguration[] }) {
  const range = (min: number | undefined, max: number | undefined, prefix: string, joiner: string) =>
    min && max ? `${prefix}${shortInr(min)} - ${joiner}${shortInr(max)}` : "-";
  return (
    // Above the card's stretched link, so the table can be read and selected without opening the project.
    <div id={id} className="relative z-10 mt-2 w-full overflow-x-auto">
      <table className="m-auto w-full border-collapse border border-[#F3F0F0] text-left">
        <thead>
          <tr className="border-b bg-gray-50 text-xs lg:text-sm">
            {["Config.", "Carpet Area", "Sale Range", "Rent Range"].map((h) => (
              <th key={h} scope="col" className="h-10 px-2 align-middle text-xs font-semibold whitespace-nowrap text-[#242424] lg:text-sm">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.bhk} className="border-b bg-white">
              <td className="p-2 text-xs whitespace-nowrap lg:text-sm">{r.bhk}</td>
              <td className="p-2 text-xs whitespace-nowrap lg:text-sm">{r.areaMin && r.areaMax ? `${r.areaMin} - ${r.areaMax}` : "-"}</td>
              <td className="p-2 text-xs whitespace-nowrap lg:text-sm">{range(r.saleMin, r.saleMax, "₹", "₹")}</td>
              <td className="p-2 text-xs whitespace-nowrap lg:text-sm">{range(r.rentMin, r.rentMax, "Rs ", "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const projectHref = (p: Pick<Project, "id">) => `/projects/${p.id}`;

export const statusTone = (s: Project["status"]) =>
  s === "rtm" ? "bg-rez-timber-tint text-rez-full-white" : s === "nl" ? "bg-rez-mocaccino text-black" : "bg-black text-rez-full-white";

/** Wide project card (prototype "project mode" layout). */
export function ProjectCard({ project: p, priority }: { project: Project; priority?: boolean }) {
  // rezide.in's "Details": the per-configuration table, opened from the Configurations row or the side panel.
  const [configOpen, setConfigOpen] = useState(false);
  const tableId = useId();
  const ranges = p.configurationPlans ?? [];
  const hasRanges = ranges.length > 0;
  const toggle = () => setConfigOpen((o) => !o);
  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl border border-rez-smoke bg-white transition-shadow hover:shadow-rez-md">
      <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_260px]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-rez-cloud">
          <CoverImage src={p.images[0]} alt={p.name} sizes="(min-width: 1280px) 300px, (min-width: 768px) 240px, 100vw" priority={priority} />
          <span className="absolute top-3 left-3 flex size-11 items-center justify-center rounded-full bg-white text-[13px] font-bold">
            {initials(p.developer)}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="text-2xl leading-tight font-semibold tracking-[-0.01em]">
                <Link href={projectHref(p)} className="after:absolute after:inset-0">
                  {p.name}
                </Link>
              </h3>
              <span className="text-sm text-rez-graphite">
                {p.developer} · {p.locality}, {p.city}
              </span>
            </div>
            <div className="relative z-10 flex-none">
              <ShareButton title={p.name} path={projectHref(p)} iconOnly />
            </div>
          </div>
          <dl className="flex flex-col">
            <div className="flex flex-col gap-1.5 border-t border-rez-smoke py-3">
              <dt className="text-xs text-rez-graphite">Project size</dt>
              <dd className="text-base leading-snug font-medium">
                {[p.acres ? `${p.acres} acres` : "", p.towers ? `${p.towers} towers` : "", p.units ? `${formatNumber(p.units)} units` : ""].filter(Boolean).join(" · ") || "Not provided"}
              </dd>
            </div>
            <div className="flex flex-col gap-1.5 border-t border-rez-smoke py-3">
              <dt className="flex items-center gap-4 text-xs text-rez-graphite">
                Configurations
                {hasRanges && (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={configOpen}
                    aria-controls={tableId}
                    aria-label={configOpen ? "Hide configuration details" : "Show configuration details"}
                    className="relative z-10 -m-1 rounded p-1 text-black hover:bg-black/[0.06] focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
                  >
                    {configOpen ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
                  </button>
                )}
              </dt>
              <dd className="text-base leading-snug font-medium">{configOpen && hasRanges ? <ConfigurationTable id={tableId} rows={ranges} /> : p.configurations}</dd>
            </div>
            <div className="flex flex-col gap-1.5 border-t border-rez-smoke py-3">
              <dt className="text-xs text-rez-graphite">Amenities</dt>
              <dd className="text-base leading-snug font-medium">{p.amenities.slice(0, 2).join(" · ") + (p.amenities.length > 2 ? ` +${p.amenities.length - 2}` : "")}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-col justify-center gap-4 rounded-lg bg-rez-cloud p-5 text-center md:col-span-2 xl:col-span-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-rez-graphite">Area range</span>
            <span className="text-[17px] font-bold">
              {p.areaMin ? `${formatNumber(p.areaMin)} – ${formatNumber(p.areaMax)} sq ft` : "Not provided"}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-rez-graphite">Price range</span>
            <span className="text-[17px] font-bold">
              {p.priceFrom ? `${formatPrice(p.priceFrom, { compact: true })} – ${formatPrice(p.priceTo, { compact: true })}` : "Price on request"}
            </span>
            {p.ratePerSqft > 0 && <span className="text-xs text-rez-graphite">₹ {formatNumber(p.ratePerSqft)} per sq ft</span>}
          </div>
          {hasRanges && (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={configOpen}
              aria-controls={tableId}
              className="relative z-10 self-center py-1 text-[13px] font-bold tracking-[0.08em] uppercase underline underline-offset-4 hover:text-rez-mocaccino-ink"
            >
              {configOpen ? "Hide Details" : "Details"}
              <span className="sr-only"> of {p.name}&apos;s configurations</span>
            </button>
          )}
        </div>
      </div>
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-rez-smoke bg-rez-cloud px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={cn("flex h-[30px] items-center rounded-full px-3.5 text-[13px] font-semibold", statusTone(p.status))}>
            {PROJECT_STATUS_LABEL[p.status]}
          </span>
          <span className="flex h-[30px] items-center rounded-full border border-black px-3.5 text-[13px] font-semibold">
            {p.possessionLabel}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Icon name="shield-check" size={16} /> {p.reraId ? `RERA ${p.reraId}` : "RERA not provided"}
          </span>
        </div>
        <Link
          href={`${projectHref(p)}#enquire`}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-rez-full-white hover:bg-rez-arsenic"
        >
          <Icon name="phone-outgoing" size={18} />
          Contact
        </Link>
      </div>
    </article>
  );
}
