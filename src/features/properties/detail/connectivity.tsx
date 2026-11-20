"use client";

import Image from "next/image";
import Link from "next/link";
import { GraduationCap, Hospital, Plane, ShoppingBag, TrainFront, TramFront, type LucideIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { SampleBadge } from "@/components/common/feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { directionsEmbedUrl } from "@/lib/google-maps";
import { cn } from "@/lib/utils";
import type { Landmark, LandmarkCategory, LandmarkGroup, LatLng } from "@/types/models";
import { LandmarksMap } from "./landmarks-map";

/** rezide.in's tabs, in its order. All six always show; Schools is open first. */
const CATEGORIES: LandmarkCategory[] = ["Schools", "Railway Stations", "Metro Stations", "Airports", "Malls", "Hospitals"];

/** Stand-ins for Google's place icon when a landmark has none. */
const ICONS: Record<LandmarkCategory, LucideIcon> = {
  Schools: GraduationCap,
  "Railway Stations": TrainFront,
  "Metro Stations": TramFront,
  Airports: Plane,
  Malls: ShoppingBag,
  Hospitals: Hospital,
};

const NO_LANDMARKS: Landmark[] = [];

/**
 * v1 "Connectivity & Landmarks", as rezide.in has it: the locality photo beside a Google map
 * with a red pin per landmark, six landmark tabs, and a distance list. Tapping a landmark shows
 * Google's driving route from the project in place of the map; tapping it again goes back.
 * Landmarks are real on listings (`live`, with `status` while they load) and sample data otherwise.
 */
export function Connectivity({
  locality,
  coords,
  groups,
  photo,
  exploreHref,
  exploreNewTab = false,
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
  /** Opens the locality's page in a new tab, as rezide.in's "Explore" photo. */
  exploreNewTab?: boolean;
  live?: boolean;
  status?: "loading" | "error" | "ready";
  onRetry?: () => void;
  className?: string;
}) {
  const [active, setActive] = useState<LandmarkCategory>("Schools");
  // By name: the landmark objects can be rebuilt between renders (a list's names are unique).
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const mapBox = useRef<HTMLDivElement>(null);
  const itemsOf = (category: LandmarkCategory) => groups?.find((g) => g.category === category)?.items ?? NO_LANDMARKS;
  // Memoised: the map re-pins and refits whenever this list changes.
  const pins = useMemo(() => groups?.find((g) => g.category === active)?.items ?? NO_LANDMARKS, [groups, active]);
  const selected = pins.find((l) => l.name === selectedName) ?? null;
  const setSelected = (l: Landmark | null) => setSelectedName(l?.name ?? null);

  const choose = (l: Landmark) => {
    if (selected?.name === l.name) return setSelected(null);
    setSelected(l);
    // On phones the map sits above the list: bring the route into view, as rezide.in does.
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.setTimeout(() => mapBox.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
  };

  return (
    <div className={cn("flex flex-col gap-5 rounded-xl border border-[#BDBDBD] bg-white p-3 sm:p-8", className)}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        <Link
          href={exploreHref}
          {...(exploreNewTab ? { target: "_blank", rel: "noopener" } : {})}
          className="group relative block h-[130px] overflow-hidden rounded-xl bg-rez-cloud outline-none focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/60 min-[431px]:h-[300px]"
        >
          <Image src={photo} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" quality={70} className="object-cover" />
          <span className="absolute inset-0 bg-black/40" aria-hidden />
          <span className="absolute inset-x-0 bottom-4 text-center text-lg font-semibold whitespace-nowrap text-white">
            Explore <span className="text-[#3b82f6]">{locality}</span>
          </span>
        </Link>
        <div ref={mapBox} className="relative isolate z-0 h-[300px] scroll-mt-24 overflow-hidden rounded-xl">
          {selected && (
            <iframe
              key={selected.name}
              title={`Driving directions to ${selected.name}`}
              src={directionsEmbedUrl(coords, selected.coords)}
              className="absolute inset-0 h-full w-full rounded-xl border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
          {/* Kept mounted under the route, so going back doesn't reload the map. */}
          <LandmarksMap center={coords} landmarks={pins} className={cn("h-full w-full rounded-xl", selected && "invisible")} />
        </div>
      </div>

      <Tabs
        value={active}
        onValueChange={(v) => {
          setActive(v as LandmarkCategory);
          setSelected(null);
        }}
        className="gap-3"
      >
        <TabsList aria-label="Landmark type" className="flex h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-px scrollbar-none group-data-horizontal/tabs:h-auto">
          {CATEGORIES.map((c) => (
            <TabsTrigger
              key={c}
              value={c}
              className="h-9 min-w-[120px] flex-1 rounded-lg border border-gray-500 bg-white px-4 py-1.5 text-sm font-medium whitespace-nowrap text-gray-800 after:hidden data-active:border-black data-active:bg-black data-active:text-white data-active:shadow-none data-active:hover:text-white"
            >
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
        <p className="flex flex-wrap items-center justify-center gap-2 text-center text-sm font-medium text-gray-500">
          Tap a landmark to see live directions {live ? null : <SampleBadge>Sample landmarks</SampleBadge>}
        </p>
        {CATEGORIES.map((c) => {
          const items = itemsOf(c);
          const Fallback = ICONS[c];
          return (
            <TabsContent key={c} value={c}>
              {status === "loading" ? (
                <p role="status" className="flex justify-center py-2 text-sm">
                  Loading landmarks...
                </p>
              ) : status === "error" ? (
                <p role="alert" className="py-2 text-center text-sm text-[#242424]">
                  Nearby landmarks are unavailable right now.{" "}
                  <button type="button" className="font-semibold underline" onClick={onRetry}>
                    Retry
                  </button>
                </p>
              ) : items.length === 0 ? (
                <p className="py-2 pl-4 text-sm text-[#242424]">No landmarks available</p>
              ) : (
                <ul className="flex flex-col">
                  {items.map((l) => (
                    <li key={l.name} className="border-b border-rez-smoke">
                      <button
                        type="button"
                        aria-pressed={selected?.name === l.name}
                        onClick={() => choose(l)}
                        className={cn(
                          "flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-rez-cloud focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/60 focus-visible:outline-none",
                          selected?.name === l.name && "bg-blue-100 hover:bg-blue-100",
                        )}
                      >
                        {l.icon ? (
                          <Image src={l.icon} alt="" width={24} height={24} unoptimized className="size-6 shrink-0" />
                        ) : (
                          <Fallback className="size-6 shrink-0 text-[#6D6D6D]" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#6D6D6D] sm:whitespace-normal">{l.name}</span>
                        <span className="w-24 shrink-0 text-sm text-[#242424] tabular-nums">{l.distanceKm.toFixed(2)} kms</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
