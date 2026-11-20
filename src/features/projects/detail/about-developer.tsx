"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectSearchHref } from "@/features/search/criteria";
import { cn } from "@/lib/utils";
import type { DeveloperStats } from "@/services/catalog";
import type { Project } from "@/types/models";
import { ContactBuilderDialog } from "./contact-builder";
import { V1Title } from "./v1-ui";

/** rezide.in's "Experience": years since the developer was founded, e.g. "28+ years". */
export function experienceLabel(established: string | undefined, now = new Date()): string {
  const year = Number(established);
  if (!Number.isInteger(year) || year < 1800 || year > now.getFullYear()) return "N/A";
  return `${now.getFullYear() - year}+ years`;
}

function StatBox({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={cn("w-full rounded-xl bg-white p-4", className)}>
      <h4 className="text-base font-medium">{label}</h4>
      <p className="text-base font-semibold text-black">{value}</p>
    </div>
  );
}

/** "About developer", as on rezide.in's project page. */
export function AboutDeveloper({ project: p, stats }: { project: Project; stats?: DeveloperStats }) {
  const [readMore, setReadMore] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const profile = p.developerProfile;
  const name = profile?.name || p.developer;
  const cities = stats?.cities.length ? stats.cities : profile?.cities?.length ? profile.cities : [p.city];
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    // `id="enquire"`: project cards' "Contact" link lands here, next to Contact Builder.
    <section id="enquire" aria-labelledby="dev-heading" className="flex scroll-mt-24 flex-col">
      <V1Title id="dev-heading" className="mb-2 lg:my-10">
        About developer
      </V1Title>
      <div className="mt-0 flex flex-col gap-6 md:mt-3 md:grid md:grid-cols-3 md:items-stretch">
        {/* Left */}
        <div className="flex h-full min-w-0 flex-col md:col-span-2">
          <div className="mb-2 flex flex-row items-center gap-4">
            <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 md:size-24">
              {profile?.logo ? (
                <Image src={profile.logo} alt={`${name} logo`} fill sizes="96px" className="object-contain p-2" />
              ) : (
                <span aria-hidden className="text-lg font-bold">
                  {initials}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-medium md:text-2xl">{name}</h3>
              {profile?.headquarters && (
                <div className="flex items-center gap-1">
                  <MapPin className="size-4 text-gray-500" aria-hidden />
                  <p className="text-sm text-gray-500">{profile.headquarters}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <h4 className="mb-2 text-base font-semibold">Description</h4>
            <p id="dev-desc" className={cn("text-base whitespace-pre-line", !readMore && "line-clamp-6")}>
              {profile?.description || "The developer hasn't added a description yet."}
            </p>
            {profile?.description && (
              <button type="button" onClick={() => setReadMore((r) => !r)} aria-expanded={readMore} aria-controls="dev-desc" className="text-blue-500">
                {readMore ? "Read less" : "Read more"}
              </button>
            )}
          </div>

          {/* Two equal columns: this app's Button doesn't shrink, so two w-full buttons in a flex row overflow. */}
          <div className="mt-8 grid grid-cols-2 gap-2">
            {/* As rezide.in: the developer's page, in a new tab (their projects' search when the id isn't known). */}
            <Button asChild className="h-auto w-full rounded-md border border-black px-2 py-3.5 text-base font-medium text-white">
              <Link href={profile?.id ? `/developers/${profile.id}` : projectSearchHref({ city: p.city, q: name })} target="_blank" rel="noopener">
                Builder Details
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => setContactOpen(true)}
              className="h-auto w-full rounded-md border border-black bg-transparent px-2 py-3.5 text-base font-medium text-black hover:bg-black hover:text-white"
            >
              Contact Builder
            </Button>
          </div>
        </div>

        {/* Right */}
        <div className="flex h-full flex-col md:col-span-1">
          <div className="flex w-full flex-1 flex-col items-center justify-evenly gap-2 rounded-2xl bg-gray-100 p-2 px-3 py-3">
            <StatBox label="Experience" value={experienceLabel(profile?.established)} />
            <StatBox label="Operating in" value={cities.join(", ")} />
            <div className="grid w-full grid-cols-2 grid-rows-2 gap-2">
              <StatBox label="All Projects" value={stats?.total ?? 0} />
              <StatBox label="Ready to Move" value={stats?.rtm ?? 0} />
              <StatBox label="Under Const." value={stats?.uc ?? 0} />
              <StatBox label="Newly Launched" value={stats?.nl ?? 0} />
            </div>
          </div>
        </div>
      </div>

      <ContactBuilderDialog open={contactOpen} onOpenChange={setContactOpen} project={p} developerName={name} developerId={profile?.id} />
    </section>
  );
}
