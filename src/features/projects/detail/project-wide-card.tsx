"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, Download, House, LayoutGrid, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/features/properties/share-button";
import { Chip, NotYetButton } from "@/features/properties/detail/detail-ui";
import { formatAreaRange, formatPriceRange, formatRupees } from "@/features/properties/detail/format";
import { LeadDialog } from "@/features/properties/detail/lead-dialog";
import { PROJECT_INTENTS } from "@/features/properties/detail/lead-form";
import { SaveIconButton } from "@/features/properties/detail/save-actions";
import { PROJECT_STATUS_LABEL } from "@/lib/constants";
import { formatNumber, possessive } from "@/lib/format";
import type { Project } from "@/types/models";

function Row({ icon: IconCmp, label, children }: { icon: typeof Building2; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-rez-smoke py-3 last:border-b-0">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rez-cloud">
        <IconCmp className="size-5" strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] text-rez-graphite">{label}</p>
        <div className="text-[15px]">{children}</div>
      </div>
    </div>
  );
}

/** Wide project card for the v1 Similar / Nearby rails (detail page only). */
export function ProjectWideCard({ project: p }: { project: Project }) {
  const amen = p.amenities.slice(0, 2).join(" · ");
  const extra = p.amenities.length - 2;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-rez-smoke bg-white">
      <div className="grid grid-cols-1 flex-1 gap-5 p-4 md:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_200px]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-rez-cloud md:aspect-auto md:min-h-[240px]">
          <Image src={p.images[0]} alt={`${p.name} (sample image)`} fill sizes="(min-width: 768px) 300px, 100vw" quality={70} className="object-cover" />
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xl leading-tight font-semibold">
                <Link href={`/projects/${p.id}`} className="hover:underline">
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
            <Row icon={Building2} label="Project size">
              {p.acres} Acre · {p.towers} Towers · {formatNumber(p.units)} Units
            </Row>
            <Row icon={LayoutGrid} label="Configurations">
              {p.configurations}
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
          <p>
            <Link href={`/projects/${p.id}`} className="text-[13px] font-semibold tracking-[0.02em] uppercase underline underline-offset-4">
              Details<span className="sr-only">: {p.name}</span>
            </Link>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rez-smoke bg-rez-cream-warm px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="dark">{PROJECT_STATUS_LABEL[p.status]}</Chip>
          <Chip tone="outline">{p.possessionLabel}</Chip>
        </div>
        <div className="flex gap-2">
          <NotYetButton variant="outline" size="sm" className="rounded-md" message="Brochures aren't available in this prototype yet.">
            <Download className="size-4" aria-hidden /> Brochure
          </NotYetButton>
          <LeadDialog
            mode="contact"
            title={`Enquire about ${p.name}`}
            description={`${p.developer} · ${p.locality}, ${p.city}`}
            target={{ projectId: p.id }}
            recipient={`${possessive(p.developer)} sales team`}
            intents={PROJECT_INTENTS}
            submitLabel="Send request"
          >
            <Button size="sm" className="rounded-md">
              <Phone className="size-4" aria-hidden /> Contact
            </Button>
          </LeadDialog>
        </div>
      </div>
    </article>
  );
}
