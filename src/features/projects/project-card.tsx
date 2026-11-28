"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useId, useState } from "react";
import { Building, ChevronDown, ChevronUp, Download, House, Info, LayoutGrid, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BrochureButton, projectBrochureFileName } from "@/features/properties/detail/brochure-button";
import { LeadDialog } from "@/features/properties/detail/lead-dialog";
import { PROJECT_INTENTS } from "@/features/properties/detail/lead-form";
import { Viewer } from "@/features/properties/detail/media-gallery";
import { PROJECT_STATUS_LABEL } from "@/lib/constants";
import { projectPath, type ProjectLinkable } from "@/lib/project-url";
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

/** The project's page, at its SEO URL (src/lib/project-url.ts). */
export const projectHref = (p: ProjectLinkable) => projectPath(p);

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
/** A backend upload's logo, through this site's /api/files (which sends the right image type); other URLs as they are. */
export function logoSrc(url: string): string {
  const key = url.match(/\/v1\/admin\/file\/upload\/([a-f0-9]{16,64})$/i)?.[1];
  return key ? `/api/files/${key}` : url;
}

/** Sizes for a card whose sizes follow the screen width (the project search): full size on big monitors, a bit smaller on laptops. */
const FLUID = {
  grid: "xl:grid-cols-[clamp(236px,15.6vw,300px)_minmax(0,1fr)_clamp(228px,14.9vw,260px)] sm:gap-[clamp(18px,1.37vw,24px)] sm:p-[clamp(16px,1.15vw,20px)] short:py-3",
  title: "sm:text-[clamp(20px,1.37vw,24px)]",
  value: "sm:text-[clamp(15px,0.92vw,16px)]",
  range: "text-[clamp(16px,0.97vw,17px)]",
  button: "sm:px-[clamp(28px,2.29vw,40px)] short:h-9",
  /** Tighter rows on laptops (tighter still on short windows), so the whole first card fits on the first screen. */
  row: "sm:gap-1 sm:py-[clamp(7px,0.62vw,12px)] short:gap-0.5 short:py-1.5",
  body: "sm:gap-[clamp(10px,0.83vw,16px)] short:gap-2",
  footer: "sm:py-[clamp(10px,0.83vw,16px)] short:py-2",
  photo: "short:aspect-[16/10]",
  media: "short:[&_button>span:first-child]:h-10 short:[&_svg]:size-8",
};

export function ProjectCard({ project: p, priority, fluid = false }: { project: Project; priority?: boolean; fluid?: boolean }) {
  // rezide.in's "Details": the per-configuration table, opened from the Configurations row or the side panel.
  const [configOpen, setConfigOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const tableId = useId();
  const ranges = p.configurationPlans ?? [];
  const hasRanges = ranges.length > 0;
  // No video and no 360 tour: no buttons under the photo.
  const noMedia = !p.videoUrl && !p.vrTourUrl;
  const toggle = () => setConfigOpen((o) => !o);
  // "17 Acres • 13 Towers • 2,632 Units", as on rezide.in (singular for 1).
  const sizeParts = [
    p.acres ? `${p.acres} ${p.acres === 1 ? "Acre" : "Acres"}` : "",
    p.towers ? `${p.towers} ${p.towers === 1 ? "Tower" : "Towers"}` : "",
    p.units ? `${formatNumber(p.units)} ${p.units === 1 ? "Unit" : "Units"}` : "",
  ].filter(Boolean);
  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl border border-rez-smoke bg-white transition-shadow hover:shadow-rez-md">
      <div
        className={cn(
          "grid grid-cols-1 gap-6 p-5 max-sm:gap-0 max-sm:p-0 md:grid-cols-[calc(240px*var(--property-space-scale,1))_minmax(0,1fr)] xl:grid-cols-[calc(300px*var(--property-space-scale,1))_minmax(0,1fr)_calc(260px*var(--property-space-scale,1))]",
          fluid && FLUID.grid,
        )}
      >
        <div className="flex min-w-0 flex-col gap-2 max-sm:gap-0">
        {/* Above the card's stretched link, so the photo arrows and dots work (rezide.in shows up to 5 photos).
            Phones, as rezide.in: a full-width darkened photo (swipe to change it), no arrows or dots. */}
        <div
          className={cn(
            "relative z-10 aspect-[4/3] overflow-hidden rounded-lg bg-rez-cloud max-sm:aspect-auto max-sm:h-[15.5rem] max-sm:rounded-t-xl max-sm:rounded-b-2xl max-sm:[&_button]:hidden",
            // As the old site: with no video or 360 tour under it, the photo fills its column's height.
            noMedia ? "sm:aspect-auto sm:min-h-[180px] sm:flex-1" : fluid && FLUID.photo,
          )}
        >
          {/* As the old site: the arrows show while the photo is hovered, only → on the first photo,
              and → on the last photo opens the project. They sit a little below the middle so they
              clear the builder logo above. */}
          <Viewer key={p.id} images={p.images.slice(0, 5)} label={p.name} cardHref={projectHref(p)} priority={priority} linear arrowClassName="top-[calc(50%+14px)]" />
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
              // Backend uploads come without a Content-Type, so Next's image resizer refuses SVG logos
              // (e.g. Lodha Group's) and browsers won't show them; /api/files adds the right type.
              <Image src={logoSrc(p.developerLogo)} alt={`${p.developer} logo`} width={44} height={44} unoptimized className="size-full object-contain" onError={() => setLogoFailed(true)} />
            ) : (
              initials(p.developer)
            )}
          </span>
        </div>
        {/* rezide.in's video and 360 buttons under the photo. */}
        <ProjectMediaButtons project={p} className={cn("max-sm:px-2 max-sm:pt-2", fluid && FLUID.media)} />
        </div>
        <div className={cn("flex min-w-0 flex-col gap-4 max-sm:gap-3 max-sm:px-4 max-sm:pt-4", fluid && FLUID.body)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className={cn("text-2xl leading-tight font-semibold tracking-[-0.01em] max-sm:text-lg", fluid && FLUID.title)}>
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
          {/* Rows with a round icon (laptop and up). Phones, as rezide.in: a grey label over a bold value underlined by a hairline. */}
          <dl className="flex flex-col max-sm:gap-4 max-sm:pb-4">
            <div className={cn("grid grid-cols-1 gap-y-1 border-t border-rez-smoke py-3 max-sm:border-t-0 max-sm:py-0 md:grid-cols-[2.75rem_minmax(0,1fr)] md:gap-x-4", fluid && FLUID.row)}>
              <span aria-hidden className="hidden size-11 items-center justify-center self-start rounded-full bg-rez-cloud md:row-span-2 md:flex">
                <Building className="size-6" strokeWidth={2} />
              </span>
              <dt className="text-sm text-rez-graphite">Project Size</dt>
              <dd className={cn("flex flex-wrap items-center gap-x-4 text-base leading-snug text-black max-sm:border-b max-sm:border-rez-smoke max-sm:pb-1 max-sm:text-sm max-sm:font-semibold", fluid && FLUID.value)}>
                {sizeParts.length
                  ? sizeParts.map((part, i) => (
                      <Fragment key={part}>
                        {i > 0 && (
                          <span aria-hidden className="text-xs">
                            •
                          </span>
                        )}
                        <span>{part}</span>
                      </Fragment>
                    ))
                  : "Not provided"}
              </dd>
            </div>
            <div className={cn("grid grid-cols-1 gap-y-1 border-t border-rez-smoke py-3 max-sm:border-t-0 max-sm:py-0 md:grid-cols-[2.75rem_minmax(0,1fr)] md:gap-x-4", fluid && FLUID.row)}>
              <span aria-hidden className="hidden size-11 items-center justify-center self-start rounded-full bg-rez-cloud md:row-span-2 md:flex">
                <LayoutGrid className="size-6" strokeWidth={2} />
              </span>
              <dt className="flex items-center gap-4 text-sm text-rez-graphite">
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
              <dd className={cn("text-base leading-snug text-black max-sm:border-b max-sm:border-rez-smoke max-sm:pb-1 max-sm:text-sm max-sm:font-semibold", fluid && FLUID.value)}>
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
            <div className={cn("grid grid-cols-1 gap-y-1 border-t border-rez-smoke py-3 max-sm:hidden md:grid-cols-[2.75rem_minmax(0,1fr)] md:gap-x-4", fluid && FLUID.row)}>
              <span aria-hidden className="hidden size-11 items-center justify-center self-start rounded-full bg-rez-cloud md:row-span-2 md:flex">
                <House className="size-6" strokeWidth={2} />
              </span>
              <dt className="text-sm text-rez-graphite">Amenities</dt>
              <dd className={cn("text-base leading-snug text-black", fluid && FLUID.value)}>{p.amenities.slice(0, 2).join(" · ") + (p.amenities.length > 2 ? ` +${p.amenities.length - 2}` : "")}</dd>
            </div>
          </dl>
        </div>
        {/* Phones show the sale range on the photo and the area under Configurations, as rezide.in does. */}
        <div className={cn("flex flex-col justify-center gap-4 rounded-lg bg-rez-cloud p-5 text-center max-sm:hidden md:col-span-2 xl:col-span-1", fluid && "p-[clamp(16px,1.15vw,20px)]")}>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-rez-graphite">Area range</span>
            <span className={cn("text-[max(12px,calc(17px*var(--property-type-scale,1)))] font-bold", fluid && FLUID.range)}>
              {p.areaMin ? `${formatNumber(p.areaMin)} – ${formatNumber(p.areaMax)} sq ft` : "Not provided"}
            </span>
          </div>
          {/* Price range is hidden when the project has no price (was: "Price on request"). */}
          {p.priceFrom ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-rez-graphite">Price range</span>
              <span className={cn("text-[max(12px,calc(17px*var(--property-type-scale,1)))] font-bold", fluid && FLUID.range)}>
                {`${formatPrice(p.priceFrom, { compact: true })} – ${formatPrice(p.priceTo, { compact: true })}`}
              </span>
              {p.ratePerSqft > 0 && <span className="text-xs text-rez-graphite">₹ {formatNumber(p.ratePerSqft)} per sq ft</span>}
            </div>
          ) : null}
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
      <ProjectCardFooter project={p} fluid={fluid} />
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
export function ProjectCardFooter({ project: p, backendBadges = false, fluid = false }: { project: Project; backendBadges?: boolean; fluid?: boolean }) {
  const { possessionDate: labelDate, reraIds } = statusInfo(p);
  const statusLabel = backendBadges ? p.backendStatus?.trim() : PROJECT_STATUS_LABEL[p.status];
  const parsedDate = p.possessionDate?.trim() ? new Date(p.possessionDate) : null;
  const possessionDate = backendBadges ? (parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : undefined) : labelDate;
  return (
  <div className={cn("relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-gray-300 bg-gray-100 p-4 max-sm:p-3", fluid && FLUID.footer)}>
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
        className={cn("h-10 rounded-md border-black bg-white px-10 text-black hover:bg-white max-sm:w-full max-sm:px-3", fluid && FLUID.button)}
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
        <Button className={cn("h-10 rounded-md px-10 max-sm:w-full max-sm:px-3", fluid && FLUID.button)}>
          <Phone className="size-4" aria-hidden /> Contact
        </Button>
      </LeadDialog>
    </div>
  </div>
  );
}