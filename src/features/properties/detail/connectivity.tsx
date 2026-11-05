"use client";

import Image from "next/image";
import Link from "next/link";
import { GraduationCap, Hospital, Navigation, Plane, ShoppingBag, TrainFront, TramFront, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { SampleBadge } from "@/components/common/feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResultsMap } from "@/features/search/results-map";
import type { MapPoint } from "@/features/search/leaflet-map";
import { cn } from "@/lib/utils";
import type { LandmarkCategory, LandmarkGroup, LatLng } from "@/types/models";
import { directionsHref, formatKm } from "./format";

const ICONS: Record<LandmarkCategory, LucideIcon> = {
  Schools: GraduationCap,
  "Railway Stations": TrainFront,
  "Metro Stations": TramFront,
  Airports: Plane,
  Malls: ShoppingBag,
  Hospitals: Hospital,
};

/**
 * v1 "Connectivity & Landmarks": locality photo, map, landmark category tabs
 * and a distance list. Landmarks are real on listings (`live`, with `status`
 * while they load) and sample data on projects. Directions open OpenStreetMap
 * in a new tab.
 */
export function Connectivity({
  name,
  locality,
  coords,
  groups,
  photo,
  exploreHref,
  live = false,
  status = "ready",
  onRetry,
  className,
}: {
  name: string;
  locality: string;
  coords: LatLng;
  groups?: LandmarkGroup[];
  photo: string;
  exploreHref: string;
  live?: boolean;
  status?: "loading" | "error" | "ready";
  onRetry?: () => void;
  className?: string;
}) {
  const available = useMemo(() => (groups ?? []).filter((g) => g.items.length), [groups]);
  const [chosen, setChosen] = useState<string | null>(null);
  // Landmarks can arrive after the first render, so the first tab is worked out, not stored.
  const active = chosen ?? available[0]?.category ?? "";
  const [highlighted, setHighlighted] = useState<string | null>(null);

  // Memoised: the map refits whenever its points change, and hovering a landmark re-renders.
  const points = useMemo<MapPoint[]>(() => {
    const items = available.find((g) => g.category === active)?.items ?? [];
    return [
      { id: "here", position: coords, label: name.length > 22 ? `${name.slice(0, 21)}…` : name, title: name },
      ...items.map((l, i) => ({ id: `lm-${i}`, position: l.coords, label: String(i + 1), title: `${i + 1}. ${l.name}` })),
    ];
  }, [coords, name, available, active]);

  return (
    <div className={cn("flex flex-col gap-5 rounded-xl border border-rez-smoke bg-white p-4 sm:p-8", className)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
        <Link href={exploreHref} className="group relative block aspect-[2/1] overflow-hidden rounded-xl bg-rez-cloud outline-none focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/60">
          <Image src={photo} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" quality={70} className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
          <span className="absolute inset-0 bg-black/45" aria-hidden />
          <span className="absolute inset-x-0 bottom-6 text-center text-lg font-semibold text-white">
            Explore <span className="text-rez-mocaccino">{locality}</span>
          </span>
        </Link>
        <div className="relative isolate z-0 aspect-[2/1] overflow-hidden rounded-xl">
          <ResultsMap points={points} highlightedId={highlighted} onSelect={(p) => setHighlighted(p.id)} className="h-full w-full" />
        </div>
      </div>

      {status === "loading" ? (
        <p role="status" className="text-center text-[15px] text-rez-graphite">Loading nearby landmarks…</p>
      ) : status === "error" ? (
        <p role="alert" className="text-center text-[15px] text-rez-graphite">
          Nearby landmarks are unavailable right now.{" "}
          <button type="button" className="font-semibold underline" onClick={onRetry}>
            Retry
          </button>
        </p>
      ) : available.length === 0 ? (
        <p className="text-center text-[15px] text-rez-graphite">Nearby landmarks haven&apos;t been added for this location yet.</p>
      ) : (
        <Tabs value={active} onValueChange={(v) => {
            setChosen(v);
            setHighlighted(null);
          }} className="gap-3">
          <TabsList aria-label="Landmark type" className="flex h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-px scrollbar-none group-data-horizontal/tabs:h-auto">
            {available.map((g) => (
              <TabsTrigger
                key={g.category}
                value={g.category}
                className="h-9 min-w-[120px] flex-1 rounded-md border border-rez-arsenic bg-white px-3 text-sm font-medium text-black after:hidden data-active:border-black data-active:bg-black data-active:text-rez-full-white data-active:shadow-none data-active:hover:text-rez-full-white"
              >
                {g.category}
              </TabsTrigger>
            ))}
          </TabsList>
          <p className="flex flex-wrap items-center justify-center gap-2 text-center text-[13px] text-rez-graphite">
            Choose a landmark for directions (opens OpenStreetMap). {live ? null : <SampleBadge>Sample landmarks</SampleBadge>}
          </p>
          {available.map((g) => {
            const IconCmp = ICONS[g.category];
            return (
              <TabsContent key={g.category} value={g.category}>
                <ol className="flex flex-col">
                  {g.items.map((l, i) => (
                    <li key={l.name} className="border-b border-rez-smoke last:border-b-0">
                      <a
                        href={directionsHref(coords, l.coords)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseEnter={() => setHighlighted(`lm-${i}`)}
                        onFocus={() => setHighlighted(`lm-${i}`)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2 py-3 text-sm transition-colors hover:bg-rez-cloud focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/60 focus-visible:outline-none sm:px-3",
                          highlighted === `lm-${i}` && "bg-rez-cloud",
                        )}
                      >
                        <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-rez-full-white">
                          {i + 1}
                        </span>
                        <IconCmp className="hidden size-5 shrink-0 text-rez-arsenic sm:block" aria-hidden />
                        <span className="min-w-0 flex-1 font-medium text-rez-arsenic">{l.name}</span>
                        <span className="shrink-0 text-rez-arsenic tabular-nums">{formatKm(l.distanceKm)}</span>
                        <Navigation className="size-4 shrink-0 text-rez-graphite" aria-hidden />
                        <span className="sr-only">(directions open in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
