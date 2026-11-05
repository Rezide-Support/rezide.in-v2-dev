"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { propertySearchHref } from "@/features/search/criteria";
import { HERO_IMAGES } from "@/content/media";
import { formatNumber } from "@/lib/format";
import { localityQueries } from "@/lib/queries";
import type { Project, Property } from "@/types/models";
import { AmenityTile } from "./amenity-icon";
import { Connectivity } from "./connectivity";
import { DashList, UnderlinedField } from "./detail-ui";
import { formatFeet, roomArea } from "./format";
import { propertyFields } from "./property-fields";

const panel = "rounded-xl border border-rez-smoke bg-rez-cream-warm p-5 sm:p-10 lg:px-12 lg:py-10";

function Empty({ children }: { children: string }) {
  return <p className="py-10 text-center text-[15px] text-rez-graphite">{children}</p>;
}

/** The Locality tab. Landmarks and the photo come from the backend, unless the listing already carries sample landmarks. */
function LocalityPanel({ property: p }: { property: Property }) {
  const live = !p.landmarks;
  const landmarks = useQuery({ ...localityQueries.landmarks(p.projectId ?? ""), enabled: live && !!p.projectId });
  const photo = useQuery({ ...localityQueries.photo(p.localityName ?? ""), enabled: live && !!p.localityName });
  return (
    <Connectivity
      name={p.title}
      locality={p.locality}
      coords={p.coords}
      groups={p.landmarks ?? landmarks.data}
      photo={photo.data ?? HERO_IMAGES[p.category].src}
      exploreHref={propertySearchHref({ city: p.city, intent: p.intent, category: p.category, localities: [p.locality] })}
      live={live}
      status={landmarks.isLoading ? "loading" : landmarks.isError ? "error" : "ready"}
      onRetry={() => landmarks.refetch()}
    />
  );
}

/** v1 info tabs under the gallery. */
export function PropertyInfoTabs({ property: p, project }: { property: Property; project?: Project | null }) {
  const rooms = p.rooms ?? [];
  return (
    <Tabs defaultValue="property" className="min-w-0 gap-3">
      <TabsList
        aria-label="Property information"
        className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-full border border-rez-smoke bg-white p-1 scrollbar-none group-data-horizontal/tabs:h-auto"
      >
        {[
          ["property", "Property"],
          ["dimensions", "Dimensions"],
          ["amenities", "Amenities"],
          ["project", "Project"],
          ["locality", "Locality"],
        ].map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            className="h-9 min-w-[96px] flex-1 rounded-full border-0 px-3 text-sm font-medium text-rez-graphite after:hidden hover:text-black data-active:bg-black data-active:font-semibold data-active:text-rez-full-white data-active:shadow-none data-active:hover:text-rez-full-white"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="property" className={panel}>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-11 sm:gap-y-9 md:grid-cols-3">
          {propertyFields(p).map((f) => (
            <UnderlinedField key={f.label} label={f.label} value={f.value} upper />
          ))}
        </dl>
      </TabsContent>

      <TabsContent value="dimensions" className={panel}>
        {rooms.length ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <li key={r.name} className="flex flex-col gap-0.5 rounded-lg border border-rez-smoke bg-white px-4 py-3">
                <span className="text-sm font-semibold">{r.name}</span>
                <span className="text-[13px] text-rez-graphite">
                  {formatFeet(r.length)} × {formatFeet(r.width)}
                </span>
                <span className="text-[13px] text-rez-graphite">{formatNumber(roomArea(r))} sq ft area</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Room dimensions haven&apos;t been added for this listing.</Empty>
        )}
        {rooms.length > 0 && <p className="mt-4 text-xs text-rez-graphite">Sample dimensions, rounded to the nearest inch.</p>}
      </TabsContent>

      <TabsContent value="amenities" className={`${panel} flex flex-col gap-6`}>
        <section aria-labelledby="amen-prop" className="flex flex-col gap-4">
          <h3 id="amen-prop" className="text-lg font-semibold">
            Property amenities
          </h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {p.amenities.map((a) => (
              <li key={a}>
                <AmenityTile name={a} />
              </li>
            ))}
          </ul>
        </section>
        {p.category === "homes" && (
          <section aria-labelledby="amen-furn" className="flex flex-col gap-4">
            <h3 id="amen-furn" className="text-lg font-semibold">
              Furnishing amenities
            </h3>
            {p.furnishingItems?.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {p.furnishingItems.map((a) => (
                  <li key={a}>
                    <AmenityTile name={a} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-rez-graphite">This unit is listed unfurnished.</p>
            )}
          </section>
        )}
      </TabsContent>

      <TabsContent value="project" className={panel}>
        {project ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-rez-cloud">
                <Image src={project.images[0]} alt={`${project.name} (sample image)`} fill sizes="(min-width: 768px) 30vw, 100vw" quality={70} className="object-cover" />
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-[15px] font-semibold tracking-[0.02em] uppercase">{project.name} – key features</h3>
                <DashList items={project.highlights ?? [project.configurations, project.possessionLabel]} />
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-4 sm:gap-11">
              <UnderlinedField label="No. of towers" value={project.towers} upper />
              <UnderlinedField label="Total units" value={formatNumber(project.units)} upper />
              <UnderlinedField label="Total area" value={`${project.acres} acres`} upper />
            </dl>
            <Link href={`/projects/${project.id}`} className="self-start text-sm font-semibold underline underline-offset-4 hover:text-rez-mocaccino-ink">
              View {project.name}
            </Link>
          </div>
        ) : (
          <Empty>{`This ${p.unitType.toLowerCase()} isn't part of a project listed on Rezide (${(p.projectType ?? "standalone").toLowerCase()}).`}</Empty>
        )}
      </TabsContent>

      <TabsContent value="locality">
        <LocalityPanel property={p} />
      </TabsContent>
    </Tabs>
  );
}
