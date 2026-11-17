"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { projectPlanQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { UnitPlan } from "@/services/project-plans";
import type { Project, ProjectConfiguration } from "@/types/models";
import { PlanViewer, shortInr, trimDecimals, useDownload, V1Title, V1Toggle } from "./v1-ui";

/*
 * "Configuration Plans", as on rezide.in's project page: Unit Plan / Floor Plan; a tab per
 * configuration (unit plans, with its area, sale and rent ranges) or per tower (floor plans);
 * then the plans one at a time, each with a full-size view and a download.
 */

/** Which plan is showing, and how to move. The carousel scrolls itself to `index`. */
function usePlanIndex(count: number) {
  const [index, setIndex] = useState(0);
  const go = (i: number) => setIndex(Math.min(count - 1, Math.max(0, i)));
  return { index, go, canPrev: index > 0, canNext: index < count - 1 };
}

type Carousel = ReturnType<typeof usePlanIndex>;

/** A one-at-a-time carousel on native scroll snapping, so it swipes on touch screens. */
function SnapCarousel({ carousel, label, slides, className }: { carousel: Carousel; label: string; slides: ReactNode[]; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const { index, go } = carousel;
  // Arrows change the index; scroll the track to it (a swipe has already put it there).
  useEffect(() => {
    const el = track.current;
    if (!el || !el.clientWidth || Math.round(el.scrollLeft / el.clientWidth) === index) return;
    if (typeof el.scrollTo === "function") el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, [index]);
  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const at = Math.round(el.scrollLeft / el.clientWidth);
    // Only once the snap settles on a slide, so a smooth scroll to a far slide isn't interrupted.
    if (at !== index && Math.abs(el.scrollLeft - at * el.clientWidth) < 2) go(at);
  };
  return (
    <div className={cn("relative my-4 w-full", className)} role="region" aria-roledescription="carousel" aria-label={label}>
      <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none">
        {slides.map((s, i) => (
          <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} className="w-full shrink-0 snap-center">
            {s}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous plan"
            onClick={() => carousel.go(carousel.index - 1)}
            disabled={!carousel.canPrev}
            className="absolute top-1/2 left-2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm disabled:opacity-50 md:flex"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next plan"
            onClick={() => carousel.go(carousel.index + 1)}
            disabled={!carousel.canNext}
            className="absolute top-1/2 right-2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm disabled:opacity-50 md:flex"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}

/** rezide.in's configuration / tower tabs: grey pills, black when chosen. */
function PlanTabs({ label, tabs, active, onChange, wrap }: { label: string; tabs: string[]; active: number; onChange: (i: number) => void; wrap?: boolean }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex w-full items-center justify-start", wrap ? "flex-wrap gap-y-2" : "max-w-full overflow-x-auto scrollbar-none")}
    >
      {tabs.map((t, i) => (
        <button
          key={`${t}-${i}`}
          type="button"
          role="tab"
          aria-selected={i === active}
          onClick={() => onChange(i)}
          className={cn(
            "me-2 inline-flex w-auto shrink-0 items-center justify-center rounded-lg border-y border-[#EAEAEA] px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none md:text-base",
            i === active ? "bg-black text-white" : "bg-gray-200 text-[#6D6D6D]",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function EmptyBox({ children }: { children: ReactNode }) {
  return (
    <div className="w-full rounded-md border border-gray-300 p-4 text-center">
      <p className="text-base font-medium text-gray-400">{children}</p>
    </div>
  );
}

function RangeBox({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex w-full flex-col-reverse items-center gap-1 rounded-md border border-gray-300 px-4 py-3 sm:w-auto lg:flex-col lg:items-start", className)}>
      <p className="text-center text-sm font-medium text-gray-500 lg:text-left">{label}</p>
      <span className="inline-flex flex-nowrap gap-1 text-center text-sm font-semibold text-gray-800 sm:gap-2 md:text-lg lg:text-left">{children}</span>
    </div>
  );
}

/** The row between the tabs and the plans: the configuration's ranges, then the arrows and "1 of 4 Plans". */
function PlanBar({ ranges, carousel, total, empty, loading }: { ranges?: ReactNode; carousel: Carousel; total: number; empty: string; loading?: boolean }) {
  return (
    <div className="flex w-full flex-col gap-5 pt-6 md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-6 md:pt-4">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-between md:flex-1 md:gap-4">{ranges}</div>
      <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-between md:ml-auto md:w-auto md:flex-none md:flex-row md:items-center md:justify-end">
        {loading ? null : total > 0 ? (
          <>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="rounded-full border-gray-200" aria-label="Previous plan" onClick={() => carousel.go(carousel.index - 1)} disabled={!carousel.canPrev}>
                <ArrowLeft className="size-4" aria-hidden />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full border-gray-200" aria-label="Next plan" onClick={() => carousel.go(carousel.index + 1)} disabled={!carousel.canNext}>
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
            <p className="text-center text-base font-semibold text-gray-800 sm:text-left md:text-2xl" aria-live="polite">
              {carousel.index + 1} of {total} {total > 1 ? "Plans" : "Plan"}
            </p>
          </>
        ) : (
          <>
            <p className="hidden text-center text-base font-semibold text-gray-800 md:block md:text-right md:text-2xl">{empty}</p>
            <div className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-center text-sm font-medium text-gray-500 md:hidden">{empty}</div>
          </>
        )}
      </div>
    </div>
  );
}

/** rezide.in's round grey icon buttons on a plan (view, download). */
function PlanIconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <Button variant="outline" size="icon" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="rounded-full border-gray-200 bg-gray-100 p-2 hover:bg-gray-200">
      {children}
    </Button>
  );
}

const Loading = () => <div aria-hidden className="my-4 h-96 w-full animate-pulse rounded-2xl bg-gray-100" />;

/* ---------------- Unit plans ---------------- */

function UnitSlide({ plan, bhk, eager }: { plan: UnitPlan; bhk: string; eager: boolean }) {
  const [partIndex, setPartIndex] = useState(0);
  const [viewing, setViewing] = useState(false);
  const download = useDownload();
  const part = plan.parts[partIndex] ?? plan.parts[0];
  const title = plan.label || `${bhk} unit plan`;
  const save = () => download.run(part.image, plan.combined ? "Combined" : (plan.label ?? "Unit Plan"));
  return (
    <div className="relative w-full rounded-xl border border-transparent md:border-2 md:border-gray-200">
      <div className="flex flex-row items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {plan.area !== undefined && (
            <div className="rounded-lg bg-gray-200 p-2">
              <p className="text-base font-semibold">{plan.area} sqft.</p>
            </div>
          )}
        </div>
        <div className="flex flex-row gap-4">
          <PlanIconButton label="View plan" onClick={() => setViewing(true)}>
            <ExternalLink className="size-4 text-black" aria-hidden />
          </PlanIconButton>
          <PlanIconButton label="Download plan" onClick={save} disabled={download.busy}>
            <Download className={cn("size-4 text-black", download.busy && "text-gray-300")} aria-hidden />
          </PlanIconButton>
        </div>
      </div>
      <div className="relative h-[300px] w-full overflow-hidden">
        <Image src={part.image} alt={`${title}${plan.area ? `, ${plan.area} sq ft` : ""}`} fill sizes="(min-width: 1280px) 1216px, 100vw" priority={eager} className="object-contain p-2" />
      </div>
      <div className="mb-10 flex max-w-[600px] flex-row items-center justify-start gap-3 overflow-x-auto pb-2 scrollbar-none sm:pl-0 lg:mx-auto lg:justify-center lg:pb-0">
        {plan.combined &&
          plan.parts.map((p, i) => (
            <button
              key={`${p.image}-${i}`}
              type="button"
              aria-pressed={i === partIndex}
              onClick={() => setPartIndex(i)}
              className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-4 py-2 text-sm font-medium", i === partIndex ? "bg-black text-white hover:bg-black/80" : "bg-gray-100 text-black hover:bg-gray-200")}
            >
              <span className="hidden lg:block">{p.label}</span> {p.bhk} {p.area !== undefined && `(${p.area} sqft.)`}
            </button>
          ))}
      </div>
      {part.rooms.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 p-0 md:grid-cols-4 md:p-4 lg:grid-cols-6" aria-label="Room sizes">
          {part.rooms.map((r, i) => (
            <li key={`${r.name}-${i}`} className="rounded-xl border border-gray-300 px-4 py-2 md:w-auto">
              <p className="text-xs font-semibold text-black md:text-sm">{r.name}</p>
              <p className="text-xs text-gray-400">
                {r.length}&quot; x {r.breadth}&quot;
              </p>
              <p className="text-xs text-gray-400">{trimDecimals(r.area)} sq.ft. Area</p>
            </li>
          ))}
        </ul>
      )}
      <PlanViewer open={viewing} onOpenChange={setViewing} title={title} src={part.image} onDownload={save} downloading={download.busy} />
    </div>
  );
}

function UnitPlanTab({ projectId, config }: { projectId: string; config: ProjectConfiguration }) {
  const query = useQuery(projectPlanQueries.unit(projectId, config.bhk));
  const plans = query.data?.plans ?? [];
  const carousel = usePlanIndex(plans.length);
  const ranges = (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 lg:flex-nowrap lg:overflow-visible">
      {config.areaMin > 0 && (
        <RangeBox label="Area Range" className="hidden sm:flex">
          <span className="whitespace-nowrap">{config.areaMin}</span> - <span className="whitespace-nowrap">{config.areaMax}</span> sqft.
        </RangeBox>
      )}
      {config.saleMin !== undefined && (
        <RangeBox label="Sale Range">
          <span className="whitespace-nowrap">Rs {shortInr(config.saleMin)}</span> - <span className="whitespace-nowrap">{shortInr(config.saleMax)}</span>
        </RangeBox>
      )}
      {config.rentMin !== undefined && (
        <RangeBox label="Rent Range">
          <span className="whitespace-nowrap">Rs {shortInr(config.rentMin)}</span> - <span className="whitespace-nowrap">{shortInr(config.rentMax)}</span>
        </RangeBox>
      )}
    </div>
  );
  return (
    <div role="tabpanel" aria-label={`${config.bhk} unit plans`}>
      <PlanBar ranges={ranges} carousel={carousel} total={plans.length} empty="No Unit Plans Available" loading={query.isPending} />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <p className="my-4 text-sm text-gray-500">
          The unit plans couldn&apos;t be loaded.{" "}
          <button type="button" className="font-semibold text-blue-600 underline" onClick={() => query.refetch()}>
            Retry
          </button>
        </p>
      ) : plans.length > 0 ? (
        <SnapCarousel carousel={carousel} label={`${config.bhk} unit plans`} slides={plans.map((plan, i) => <UnitSlide key={plan.id} plan={plan} bhk={config.bhk} eager={i === 0} />)} />
      ) : null}
    </div>
  );
}

function UnitPlans({ project: p }: { project: Project }) {
  const configs = p.configurationPlans ?? [];
  const [active, setActive] = useState(0);
  if (configs.length === 0) return <EmptyBox>No Unit Plans Available</EmptyBox>;
  const config = configs[Math.min(active, configs.length - 1)];
  return (
    <div className="flex w-full flex-col">
      <PlanTabs label="Configurations" tabs={configs.map((c) => c.bhk)} active={active} onChange={setActive} />
      <UnitPlanTab key={config.bhk} projectId={p.id} config={config} />
    </div>
  );
}

/* ---------------- Floor plans ---------------- */

function FloorSlide({ src, tower, eager }: { src: string; tower: string; eager: boolean }) {
  const [viewing, setViewing] = useState(false);
  const download = useDownload();
  const save = () => download.run(src, tower);
  return (
    <div className="relative w-full rounded-xl border border-transparent md:border-2 md:border-gray-200">
      <div className="relative h-[400px] w-full overflow-hidden">
        <Image src={src} alt={`${tower} floor plan`} fill sizes="(min-width: 1280px) 1216px, 100vw" priority={eager} className="object-contain p-2" />
      </div>
      <div className="absolute top-0 right-0 p-4">
        <div className="flex flex-row gap-4">
          <PlanIconButton label="View plan" onClick={() => setViewing(true)}>
            <ExternalLink className="size-4 text-black" aria-hidden />
          </PlanIconButton>
          <PlanIconButton label="Download plan" onClick={save} disabled={download.busy}>
            <Download className={cn("size-4 text-black", download.busy && "text-gray-300")} aria-hidden />
          </PlanIconButton>
        </div>
      </div>
      <PlanViewer open={viewing} onOpenChange={setViewing} title={tower} src={src} onDownload={save} downloading={download.busy} />
    </div>
  );
}

function FloorPlanTab({ tower, images }: { tower: string; images: string[] }) {
  const carousel = usePlanIndex(images.length);
  return (
    <div role="tabpanel" aria-label={`${tower} floor plans`}>
      <PlanBar carousel={carousel} total={images.length} empty="No Floor Plans Available" />
      {images.length > 0 && (
        <div className="w-full space-y-4">
          <SnapCarousel carousel={carousel} label={`${tower} floor plans`} slides={images.map((src, i) => <FloorSlide key={src} src={src} tower={tower} eager={i === 0} />)} />
          {images.length > 1 && (
            <div className="my-2 flex w-full items-center justify-center">
              <div className="inline-block rounded-full bg-black px-4 py-1">
                <p className="text-xs text-white">
                  {carousel.index + 1} / {images.length}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FloorPlans({ projectId }: { projectId: string }) {
  const query = useQuery(projectPlanQueries.floor(projectId));
  const [active, setActive] = useState(0);
  if (query.isPending) return <Loading />;
  const towers = query.data ?? [];
  if (query.isError || towers.length === 0) return <EmptyBox>No Floor Plans Available</EmptyBox>;
  const tower = towers[Math.min(active, towers.length - 1)];
  return (
    <div className="flex w-full flex-col">
      <PlanTabs label="Towers" tabs={towers.map((t) => t.tower)} active={active} onChange={setActive} wrap />
      <FloorPlanTab key={`${active}-${tower.tower}`} tower={tower.tower} images={tower.images} />
    </div>
  );
}

export function ConfigurationPlans({ project: p }: { project: Project }) {
  const [kind, setKind] = useState<"unit" | "floor">("unit");
  return (
    <section aria-labelledby="config-heading" className="flex flex-col">
      <div className="mb-5 grid gap-3 lg:flex lg:items-center lg:justify-between">
        <V1Title id="config-heading" className="text-left">
          <span className="lg:hidden">Plans</span>
          <span className="hidden lg:inline">Configuration Plans</span>
        </V1Title>
        <V1Toggle
          label="Plan type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "unit", label: "Unit Plan" },
            { value: "floor", label: "Floor Plan" },
          ]}
        />
      </div>
      {kind === "unit" ? <UnitPlans project={p} /> : <FloorPlans projectId={p.id} />}
    </section>
  );
}
