"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/features/properties/detail/detail-ui";
import { LeadDialog } from "@/features/properties/detail/lead-dialog";
import { PROJECT_INTENTS } from "@/features/properties/detail/lead-form";
import { projectSearchHref } from "@/features/search/criteria";
import { possessive } from "@/lib/format";
import type { Project } from "@/types/models";
import type { DeveloperStats } from "@/services/catalog";

function StatBox({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 rounded-lg bg-white px-4 py-3.5 ${className ?? ""}`}>
      <dt className="text-[15px]">{label}</dt>
      <dd className="text-[15px] font-semibold">{value}</dd>
    </div>
  );
}

export function AboutDeveloper({ project: p, stats }: { project: Project; stats?: DeveloperStats }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const desc = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = desc.current;
    if (!el) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const profile = p.developerProfile;
  const initials = p.developer
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    // `id="enquire"`: project cards' "Contact" link lands here, next to Contact builder.
    <section id="enquire" aria-labelledby="dev-heading" className="flex scroll-mt-24 flex-col gap-6 sm:gap-10">
      <SectionHeading id="dev-heading">About developer</SectionHeading>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-4">
            <span aria-hidden className="flex size-20 shrink-0 items-center justify-center rounded-full border border-rez-smoke text-lg font-bold tracking-[0.04em] sm:size-24">
              {initials}
            </span>
            <div className="min-w-0">
              <h3 className="text-xl leading-tight font-medium sm:text-2xl">{p.developer}</h3>
              <p className="mt-1 flex items-center gap-1 text-sm text-rez-graphite">
                <MapPin className="size-4" aria-hidden /> {profile?.headquarters ?? p.city}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <h4 className="text-base font-semibold">Description</h4>
            <p ref={desc} id="dev-desc" className={`text-[15px] leading-relaxed text-rez-arsenic ${expanded ? "" : "line-clamp-3"}`}>
              {profile?.description ?? "The developer hasn't added a description yet."}
            </p>
            {profile && (clamped || expanded) && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                aria-controls="dev-desc"
                className="self-start text-[15px] text-[#2a5bd7] hover:underline"
              >
                {expanded ? "Read less" : "Read more"}
              </button>
            )}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button asChild size="lg" className="rounded-md">
              <Link href={projectSearchHref({ city: p.city, q: p.developer.split(/\s+/)[0] })}>Builder projects</Link>
            </Button>
            <LeadDialog
              mode="contact"
              title={`Contact ${p.developer}`}
              description={`Ask about ${p.name}. Requests go to the developer's sales team.`}
              target={{ projectId: p.id }}
              project={{ developerName: p.developer, projectName: p.name, location: `${p.locality}, ${p.city}`, budgetMin: p.priceFrom, budgetMax: p.priceTo }}
              recipient={`${possessive(p.developer)} sales team`}
              intents={PROJECT_INTENTS}
              submitLabel="Send request"
            >
              <Button variant="secondary" size="lg" className="rounded-md">
                Contact builder
              </Button>
            </LeadDialog>
          </div>
        </div>
        <div className="self-start rounded-xl bg-rez-cloud p-3">
        <dl className="grid grid-cols-2 gap-2">
          <StatBox label="Operating in" value={stats?.cities.join(", ") || p.city} className="col-span-2" />
          {/* The backend can't count a developer's projects, so counts only show when given. */}
          {stats && (
            <>
              <StatBox label="All projects" value={stats.total} />
              <StatBox label="Ready to move" value={stats.rtm} />
              <StatBox label="Under const." value={stats.uc} />
              <StatBox label="Newly launched" value={stats.nl} />
            </>
          )}
        </dl>
        </div>
      </div>
    </section>
  );
}
