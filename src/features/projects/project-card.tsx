import Link from "next/link";
import { Icon } from "@/components/brand/icon";
import { CoverImage } from "@/components/common/cover-image";
import { SampleBadge } from "@/components/common/feedback";
import { PROJECT_STATUS_LABEL } from "@/lib/constants";
import { formatNumber, formatPrice, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/features/properties/share-button";
import { propertySearchHref } from "@/features/search/criteria";
import type { Project } from "@/types/models";

export const projectHref = (p: Pick<Project, "id">) => `/projects/${p.id}`;

export const statusTone = (s: Project["status"]) =>
  s === "rtm" ? "bg-rez-timber-tint text-rez-full-white" : s === "nl" ? "bg-rez-mocaccino text-black" : "bg-black text-rez-full-white";

/** Wide project card (prototype "project mode" layout). */
export function ProjectCard({ project: p, priority }: { project: Project; priority?: boolean }) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl border border-rez-smoke bg-white transition-shadow hover:shadow-rez-md">
      <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_260px]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-rez-cloud">
          <CoverImage src={p.images[0]} alt={`${p.name} (sample image)`} sizes="(min-width: 1280px) 300px, (min-width: 768px) 240px, 100vw" priority={priority} />
          <span className="absolute top-3 left-3 flex size-11 items-center justify-center rounded-full bg-white text-[13px] font-bold">
            {initials(p.developer)}
          </span>
          <SampleBadge className="absolute top-3 right-3">Sample</SampleBadge>
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
            {[
              ["Project size", `${p.acres} acres · ${p.towers} towers · ${formatNumber(p.units)} units`],
              ["Configurations", p.configurations],
              ["Amenities", p.amenities.slice(0, 2).join(" · ") + (p.amenities.length > 2 ? ` +${p.amenities.length - 2}` : "")],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1.5 border-t border-rez-smoke py-3">
                <dt className="text-xs text-rez-graphite">{k}</dt>
                <dd className="text-base leading-snug font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col justify-center gap-4 rounded-lg bg-rez-cloud p-5 text-center md:col-span-2 xl:col-span-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-rez-graphite">Area range</span>
            <span className="text-[17px] font-bold">
              {formatNumber(p.areaMin)} – {formatNumber(p.areaMax)} sq ft
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-rez-graphite">Price range</span>
            <span className="text-[17px] font-bold">
              {formatPrice(p.priceFrom, { compact: true })} – {formatPrice(p.priceTo, { compact: true })}
            </span>
            <span className="text-xs text-rez-graphite">₹ {formatNumber(p.ratePerSqft)} per sq ft</span>
          </div>
          <Link
            href={propertySearchHref({ city: p.city, view: "proj", projects: [p.id] })}
            className="relative z-10 self-center py-1 text-[13px] font-bold tracking-[0.08em] uppercase underline underline-offset-4 hover:text-rez-mocaccino-ink"
          >
            View listings
            <span className="sr-only"> in {p.name}</span>
          </Link>
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
            <Icon name="shield-check" size={16} /> RERA {p.reraId} (sample)
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
