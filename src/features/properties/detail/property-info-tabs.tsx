"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import { formatNumber } from "@/lib/format";
import type { Project, Property, RoomDimension } from "@/types/models";
import { BackendAmenityTile as AmenityTile } from "./amenity-list";
import { DashList, UnderlinedField } from "./detail-ui";
import { roomArea } from "./format";
import { propertyFields } from "./property-fields";
import { ScrollIndicator } from "@/components/common/scroll-indicator";


import { ListingLocality, hasListingLocality } from "./listing-locality";

const subscribeMobile = (callback: () => void) => {
  const media = window.matchMedia("(max-width: 1023px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const mobileSnapshot = () => window.matchMedia("(max-width: 1023px)").matches;
const serverSnapshot = () => false;

function InfoPanel({ stacked, value, title, className, children }: { stacked: boolean; value: string; title: string; className?: string; children: ReactNode }) {
  if (!stacked) return <TabsContent value={value} className={`${className ?? ""} data-[state=inactive]:hidden`}>{children}</TabsContent>;
  return <section id={value === "locality" ? "neighborhood" : value} className="scroll-mt-32"><h2 className="mb-4 px-2 text-sm font-semibold uppercase">{title}</h2><div className={className}>{children}</div></section>;
}

const panel = "rounded-md border border-[#c4c4c4] bg-[#fafafa] p-5 sm:p-8 lg:min-h-[400px] lg:px-12 lg:py-10";

function Empty({ children }: { children: string }) {
  return <p className="py-10 text-center text-[max(12px,calc(15px*var(--property-type-scale,1)))] text-rez-graphite">{children}</p>;
}

/** "18.58" (feet, two decimals, as rezide.in prints them). */
const feet = (n: number) => n.toFixed(2);

/** rezide.in's room boxes: name, length × breadth, and floor area, two to four to a row. */
export function RoomDimensions({ rooms }: { rooms: RoomDimension[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4" aria-label="Room dimensions">
      {rooms.map((r, i) => (
        <li key={`${r.name}-${i}`} className="rounded-[12px] border border-gray-300 bg-white px-4 py-2">
          <p className="text-xs font-semibold text-black md:text-sm">{r.name}</p>
          <p className="text-xs text-gray-400">
            {feet(r.length)}&quot; x {feet(r.width)}&quot;
          </p>
          <p className="text-xs text-gray-400">{Number((r.area ?? roomArea(r)).toFixed(2))} sq.ft. Area</p>
        </li>
      ))}
    </ul>
  );
}

/** v1 info tabs under the gallery. Pass `value` + `onValueChange` to drive the tab from outside (the phone section menu does). */
export function PropertyInfoTabs({ property: p, project, value, onValueChange }: { property: Property; project?: Project | null; value?: string; onValueChange?: (value: string) => void }) {
  const rooms = p.rooms ?? [];
  const hasAmenities = p.amenities.length > 0 || (p.furnishingItems?.length ?? 0) > 0;
  const stacked = useSyncExternalStore(subscribeMobile, mobileSnapshot, serverSnapshot);
  return (
    <Tabs {...(value === undefined ? { defaultValue: "property" } : { value, onValueChange })} className="min-w-0 gap-7 lg:flex-1 lg:flex-col lg:gap-3">
      <div className={stacked ? "hidden" : "shrink-0"}><ScrollIndicator>
      <TabsList
        aria-label="Property information"
        className="flex h-auto w-full justify-start gap-0 overflow-x-auto rounded-md border border-rez-smoke bg-white p-0 scrollbar-none group-data-horizontal/tabs:h-auto"
      >
        {[
          ["property", "Property"],
          // rezide.in's "Dimensions" tab, when the unit's configuration lists its rooms.
          ...(rooms.length ? [["dimensions", "Dimensions"]] : []),
          ...(hasAmenities ? [["amenities", "Amenities"]] : []),
          ...(!p.projectHidden && project ? [["project", "Project"]] : []),
          ...(hasListingLocality(p) ? [["locality", "Locality"]] : []),
        ].map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            className="h-9 min-w-[96px] flex-1 rounded-sm border-0 px-3 text-sm font-medium text-rez-graphite after:hidden hover:text-black data-active:bg-black data-active:font-semibold data-active:text-rez-full-white data-active:shadow-none data-active:hover:text-rez-full-white"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      </ScrollIndicator></div>

      <InfoPanel stacked={stacked} value="property" title="Property detail" className={panel}>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-11 sm:gap-y-9 md:grid-cols-3 lg:gap-y-11 [&_dt]:font-medium [&_dt]:tracking-normal [&_dt]:text-[#727272] [&_dd]:border-[#bdbdbd] [&_dd]:font-semibold">
          {propertyFields(p).map((f) => (
            <UnderlinedField key={f.label} label={f.label} value={f.value} upper />
          ))}
        </dl>
      </InfoPanel>

      {rooms.length > 0 && <InfoPanel stacked={stacked} value="dimensions" title="Room dimensions" className={panel}>
        <RoomDimensions rooms={rooms} />
        {rooms.length > 0 && <p className="mt-4 text-xs text-rez-graphite">Dimensions in feet.</p>}
      </InfoPanel>}

      {hasAmenities && <InfoPanel stacked={stacked} value="amenities" title="Amenities" className={`${panel} flex flex-col gap-6`}>
        <section aria-labelledby="amen-prop" className="flex flex-col gap-4">
          <h3 id="amen-prop" className="text-lg font-semibold">
            Property amenities
          </h3>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {p.amenities.map((a) => (
              <li key={a}>
                <AmenityTile name={a} />
              </li>
            ))}
          </ul>
        </section>
        {(p.furnishingItems?.length ?? 0) > 0 && (
          <section aria-labelledby="amen-furn" className="flex flex-col gap-4">
            <h3 id="amen-furn" className="text-lg font-semibold">
              Furnishing amenities
            </h3>
            {p.furnishingItems?.length ? (
              <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
      </InfoPanel>}

      {(!p.projectHidden && !!project) && <InfoPanel stacked={stacked} value="project" title="Project information" className={panel}>
        {project ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-rez-cloud md:h-[350px] md:aspect-auto lg:h-[420px]">
                <Image src={project.images[0]} alt={project.name} fill sizes="(min-width: 768px) 30vw, 100vw" quality={70} className="object-cover" />
              </div>
              <div className="flex h-[350px] min-w-0 flex-col gap-4 bg-white p-4 lg:h-[420px]">
                <h3 className="text-[max(12px,calc(15px*var(--property-type-scale,1)))] font-semibold tracking-[0.02em] uppercase">{project.name} – key features</h3>
                <div role="region" aria-label={`${project.name} description`} tabIndex={0} className="min-h-0 flex-1 overflow-y-auto pr-3 outline-none [scrollbar-color:#e1e1e6_transparent] [scrollbar-width:thin] focus-visible:ring-2 focus-visible:ring-rez-mocaccino">
                  <DashList items={project.highlights?.length ? project.highlights : project.description?.trim() ? [project.description] : [project.configurations, project.possessionLabel]} />
                </div>
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
      </InfoPanel>}

      {hasListingLocality(p) && <InfoPanel stacked={stacked} value="locality" title="Locality">
        <ListingLocality property={p} />
      </InfoPanel>}
    </Tabs>
  );
}
