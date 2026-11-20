"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { ChevronDown, ChevronUp, Download, Info, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BrochureButton, projectBrochureFileName } from "@/features/properties/detail/brochure-button";
import { LeadDialog } from "@/features/properties/detail/lead-dialog";
import { PROJECT_INTENTS } from "@/features/properties/detail/lead-form";
import { Viewer } from "@/features/properties/detail/media-gallery";
import { PROJECT_STATUS_LABEL } from "@/lib/constants";
import { formatNumber, formatPrice, initials, possessive } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProjectMediaButtons } from "./project-media";
import { ShareProjectButton } from "./share-project";
import { SaveIconButton } from "@/features/properties/detail/save-actions";
import type { Project, ProjectConfiguration } from "@/types/models";
import { shortInr } from "./detail/v1-ui";

/** rezide.in's configurations table on a project card: area, sale and rent range per configuration. */
export function ConfigurationTable({ id, rows }: { id: string; rows: ProjectConfiguration[] }) {
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
            <tr key={r.bhk} className="border-b border-gray-200 odd:bg-white even:bg-[#f8f8fa]">
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

/** rezide.in's footer badge colours per status (New Launch falls back to its green, as there). */
const STATUS_GRADIENT: Record<Project["status"], string> = {
  rtm: "from-[#2ECC71] to-[#17A855]",
  uc: "from-[#5D6D7E] to-[#3E5063]",
  nl: "from-[#2ECC71] to-[#17A855]",
};

/** The card's grey round action buttons; smaller on phones, where they sit on the photo. */
// rezide.in's size: a 36px circle with a 16px icon (smaller on phones).
const ACTION = "size-9 rounded-full bg-gray-50 p-2 text-gray-500 hover:text-black [&_svg]:size-4 max-sm:size-7 max-sm:p-1.5";

/** Wide project card (prototype "project mode" layout). */
export function ProjectCard({ project: p, priority }: { project: Project; priority?: boolean }) {
  // rezide.in's "Details": the per-configuration table, opened from the Configurations row or the side panel.
  const [configOpen, setConfigOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const tableId = useId();
  const ranges = p.configurationPlans ?? [];
  const hasRanges = ranges.length > 0;
  const toggle = () => setConfigOpen((o) => !o);
  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl border border-rez-smoke bg-white transition-shadow hover:shadow-rez-md">
      <div className="grid grid-cols-1 gap-6 p-5 max-sm:gap-0 max-sm:p-0 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_260px]">
        <div className="flex min-w-0 flex-col gap-2 max-sm:gap-0">
        {/* Above the card's stretched link, so the photo arrows and dots work (rezide.in shows up to 5 photos).
            Phones, as rezide.in: a full-width darkened photo (swipe to change it), no arrows or dots. */}
        <div className="relative z-10 aspect-[4/3] overflow-hidden rounded-lg bg-rez-cloud max-sm:aspect-auto max-sm:h-[15.5rem] max-sm:rounded-t-xl max-sm:rounded-b-2xl max-sm:[&_button]:hidden">
          <Viewer key={p.id} images={p.images.slice(0, 5)} label={p.name} cardHref={projectHref(p)} priority={priority} />
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-black/40 sm:hidden" />
          {p.priceFrom > 0 && (
            <span className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col text-white sm:hidden">
              <span className="text-sm text-gray-100">Sale Range</span>
              <span className="text-base font-semibold">
                {formatPrice(p.priceFrom, { compact: true })} – {formatPrice(p.priceTo, { compact: true })}
              </span>
            </span>
          )}
          <span className="pointer-events-none absolute top-3 left-3 flex size-11 items-center justify-center overflow-hidden rounded-full border border-rez-smoke bg-white text-[13px] font-bold max-sm:top-2 max-sm:left-2 max-sm:size-10">
            {p.developerLogo && !logoFailed ? (
              <Image src={p.developerLogo} alt={`${p.developer} logo`} width={44} height={44} className="size-full object-contain" onError={() => setLogoFailed(true)} />
            ) : (
              initials(p.developer)
            )}
          </span>
        </div>
        {/* rezide.in's video and 360 buttons under the photo. */}
        <ProjectMediaButtons project={p} className="max-sm:px-2 max-sm:pt-2" />
        </div>
        <div className="flex min-w-0 flex-col gap-4 max-sm:gap-3 max-sm:px-4 max-sm:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="text-2xl leading-tight font-semibold tracking-[-0.01em] max-sm:text-lg">
                <Link href={projectHref(p)} className="after:absolute after:inset-0">
                  {p.name}
                </Link>
              </h3>
              <span className="text-sm text-rez-graphite max-sm:text-xs max-sm:font-medium">
                {p.developer} · {p.locality}, {p.city}
              </span>
              <MobileStatusLine project={p} />
            </div>
            {/* rezide.in's card actions: Shortlist · Compare · Share, as light grey circles (small, on the photo, on phones). */}
            <div className="relative z-20 flex flex-none gap-4 max-sm:absolute max-sm:top-2 max-sm:right-2 max-sm:gap-3">
              <SaveIconButton
                list="shortlist"
                kind="project"
                id={p.id}
                title={p.name}
                className={cn(ACTION, "aria-pressed:text-red-500")}
              />
              <SaveIconButton
                list="compare"
                kind="project"
                id={p.id}
                title={p.name}
                className={cn(ACTION, "aria-pressed:text-green-500 aria-pressed:[&_svg]:fill-green-500")}
              />
              {/* rezide.in's "Share this project" popup (Copy Link · Email · Whatsapp). */}
              <ShareProjectButton project={p} className={ACTION} />
            </div>
          </div>
          {/* Phones, as rezide.in: a grey label over a bold value underlined by a hairline. */}
          <dl className="flex flex-col max-sm:gap-4 max-sm:pb-4">
            <div className="flex flex-col gap-1.5 border-t border-rez-smoke py-3 max-sm:border-t-0 max-sm:py-0">
              <dt className="text-xs text-rez-graphite max-sm:text-sm">Project size</dt>
              <dd className="text-base leading-snug font-medium max-sm:border-b max-sm:border-rez-smoke max-sm:pb-1 max-sm:text-sm max-sm:font-semibold">
                {[p.acres ? `${p.acres} acres` : "", p.towers ? `${p.towers} towers` : "", p.units ? `${formatNumber(p.units)} units` : ""].filter(Boolean).join(" · ") || "Not provided"}
              </dd>
            </div>
            <div className="flex flex-col gap-1.5 border-t border-rez-smoke py-3 max-sm:border-t-0 max-sm:py-0">
              <dt className="flex items-center gap-4 text-xs text-rez-graphite max-sm:text-sm">
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
              <dd className="text-base leading-snug font-medium max-sm:border-b max-sm:border-rez-smoke max-sm:pb-1 max-sm:text-sm max-sm:font-semibold">
                {configOpen && hasRanges ? (
                  <ConfigurationTable id={tableId} rows={ranges} />
                ) : (
                  <>
                    {p.configurations}
                    {/* Phones have no side panel: rezide.in adds the area range here. */}
                    {p.areaMin > 0 && <span className="sm:hidden"> • {formatNumber(p.areaMin)} – {formatNumber(p.areaMax)} sq ft</span>}
                  </>
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-1.5 border-t border-rez-smoke py-3 max-sm:hidden">
              <dt className="text-xs text-rez-graphite">Amenities</dt>
              <dd className="text-base leading-snug font-medium">{p.amenities.slice(0, 2).join(" · ") + (p.amenities.length > 2 ? ` +${p.amenities.length - 2}` : "")}</dd>
            </div>
          </dl>
        </div>
        {/* Phones show the sale range on the photo and the area under Configurations, as rezide.in does. */}
        <div className="flex flex-col justify-center gap-4 rounded-lg bg-rez-cloud p-5 text-center max-sm:hidden md:col-span-2 xl:col-span-1">
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
      <ProjectCardFooter project={p} />
    </article>
  );
}

/** A status / possession badge. */
const BADGE = "inline-block rounded-lg bg-gradient-to-r px-4 py-1 text-sm font-medium text-white shadow-sm";

/** "Possession Dec 2027" / "Completed Dec 2020" → "Dec 2027" (rezide.in shows only the date), and the RERA ids. */
function statusInfo(p: Project) {
  const possessionDate = /^(Possession|Completed) (.+)$/.exec(p.possessionLabel)?.[2];
  const reraIds = p.reraIds ?? (p.reraId && !/^na$/i.test(p.reraId) ? [p.reraId] : []);
  return { possessionDate, reraIds };
}

/**
 * Phones only: rezide.in's "Ready to Move | Completed: Dec '23 | RERA ⓘ" line under the name.
 * The RERA ids open on tap (a hover tooltip can't), in rezide.in's black popover.
 */
function MobileStatusLine({ project: p }: { project: Project }) {
  const { possessionDate, reraIds } = statusInfo(p);
  // "Dec 2023" → "Dec '23".
  const shortDate = possessionDate?.replace(/ (\d{2})(\d{2})$/, " '$2");
  const bar = <span aria-hidden className="h-3.5 border-l border-gray-300" />;
  return (
    <p className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-medium text-[#0E0E0E] sm:hidden">
      <span>{PROJECT_STATUS_LABEL[p.status]}</span>
      {shortDate && (
        <>
          {bar}
          <span>
            {p.status === "rtm" ? "Completed" : "Possession"}: {shortDate}
          </span>
        </>
      )}
      {reraIds.length > 0 && (
        <>
          {bar}
          <span className="relative z-10 flex items-center gap-1">
            RERA
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label={`Show RERA ids of ${p.name}`} className="-m-1 rounded-full p-1 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none">
                  <Info className="size-4" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto max-w-[80vw] rounded-lg bg-black text-white ring-0">{reraIds.join(", ")}</PopoverContent>
            </Popover>
          </span>
        </>
      )}
    </p>
  );
}

/** rezide.in's project card footer: status and possession badges, RERA ids in a tooltip, Brochure and Contact. */
export function ProjectCardFooter({ project: p, backendBadges = false }: { project: Project; backendBadges?: boolean }) {
  const { possessionDate: labelDate, reraIds } = statusInfo(p);
  const statusLabel = backendBadges ? p.backendStatus?.trim() : PROJECT_STATUS_LABEL[p.status];
  const parsedDate = p.possessionDate?.trim() ? new Date(p.possessionDate) : null;
  const possessionDate = backendBadges ? (parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : undefined) : labelDate;
  return (
  <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-gray-300 bg-gray-100 p-4 max-sm:p-3">
    {/* Phones show this as a text line under the name instead (MobileStatusLine), as rezide.in does. */}
    <div className="flex flex-wrap items-center gap-4 max-sm:hidden">
      {statusLabel && <span className={cn(BADGE, backendBadges ? "rounded-[6px] from-[#2ECC71] to-[#17A855]" : STATUS_GRADIENT[p.status])}>
        {statusLabel}
      </span>}
      {possessionDate && (
        <>
          {statusLabel && <span aria-hidden className="h-6 border border-gray-300" />}
          <span className={cn(BADGE, backendBadges ? "rounded-[6px] from-[#2ECC71] to-[#17A855]" : STATUS_GRADIENT[p.status])}>
            <span className="sr-only">{p.status === "rtm" ? "Completed " : "Possession "}</span>
            {possessionDate}
          </span>
        </>
      )}
      {reraIds.length > 0 && (
        <>
          <span aria-hidden className="h-6 border border-gray-300" />
          <span className="flex items-center gap-2 text-base font-medium">
            RERA
            <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={`RERA ids of ${p.name}`} className="rounded-full focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none">
                  <Info className="size-4" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent>{reraIds.join(", ")}</TooltipContent>
            </Tooltip>
            </TooltipProvider>
          </span>
        </>   
      )}
    </div>
    <div className="flex items-center gap-4 max-sm:w-full max-sm:gap-2 max-sm:[&>*]:flex-1">
      <BrochureButton
        variant="outline"
        className="h-10 rounded-md border-black bg-white px-10 text-black hover:bg-white max-sm:w-full max-sm:px-3"
        url={p.brochureUrl}
        fileName={projectBrochureFileName(p.name)}
        path={projectHref(p)}
        icon={<Download className="size-4" aria-hidden />}
      />
      <LeadDialog
        mode="contact"
        title={`Enquire about ${p.name}`}
        description={`${p.developer} · ${p.locality}, ${p.city}`}
        target={{ projectId: p.id }}
        project={{ developerName: p.developer, projectName: p.name, location: `${p.locality}, ${p.city}`, budgetMin: p.priceFrom, budgetMax: p.priceTo }}
        recipient={`${possessive(p.developer)} sales team`}
        intents={PROJECT_INTENTS}
        submitLabel="Send request"
      >
        <Button className="h-10 rounded-md px-10 max-sm:w-full max-sm:px-3">
          <Phone className="size-4" aria-hidden /> Contact
        </Button>
      </LeadDialog>
    </div>
  </div>
  );
}
