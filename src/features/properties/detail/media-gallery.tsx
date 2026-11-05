"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { SampleBadge } from "@/components/common/feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { thumbnailSrc } from "@/content/media";
import { cn } from "@/lib/utils";

export type GalleryTab = {
  value: string;
  label: string;
  icon: LucideIcon;
  images: string[];
  /** Shown when the tab has no media. */
  empty: string;
};

/** v1 media gallery: segmented tabs, large photo with counter + arrows, thumbnail strip. */
export function MediaGallery({ tabs, title, className }: { tabs: GalleryTab[]; title: string; className?: string }) {
  const first = tabs.find((t) => t.images.length)?.value ?? tabs[0].value;
  return (
    <Tabs defaultValue={first} className={cn("gap-2", className)}>
      <TabsList
        aria-label="Media"
        className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-full border border-rez-smoke bg-white p-1 scrollbar-none group-data-horizontal/tabs:h-auto"
      >
        {tabs.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="h-9 min-w-[88px] flex-1 rounded-full border-0 px-3 text-sm font-medium text-rez-graphite after:hidden hover:text-black data-active:bg-black data-active:font-semibold data-active:text-rez-full-white data-active:shadow-none data-active:hover:text-rez-full-white sm:h-10"
          >
            <t.icon className="size-4" aria-hidden />
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="min-w-0">
          {t.images.length ? (
            <Viewer images={t.images} label={`${title}: ${t.label.toLowerCase()}`} />
          ) : (
            <div className="flex aspect-[16/9] flex-col items-center justify-center gap-3 rounded-lg bg-rez-cloud px-6 text-center sm:aspect-[21/10]">
              <t.icon className="size-8 text-rez-graphite" aria-hidden />
              <p className="max-w-sm text-[15px] text-rez-arsenic">{t.empty}</p>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function Viewer({ images, label }: { images: string[]; label: string }) {
  const [index, setIndex] = useState(0);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const n = images.length;
  const go = (i: number) => {
    const next = (i + n) % n;
    setIndex(next);
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    thumbs.current[next]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    }
  };

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} onKeyDown={onKeyDown} className="flex flex-col gap-2">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-rez-cloud sm:aspect-[21/10]">
        {images.map((src, i) => (
          <div
            key={src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${n}`}
            aria-hidden={i !== index}
            className={cn("absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none", i === index ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            {/* Only the active slide and its neighbours load. */}
            {Math.abs(i - index) <= 1 || (index === 0 && i === n - 1) ? (
              <Image src={src} alt={`${label}, photo ${i + 1} of ${n} (sample image)`} fill sizes="(min-width: 1024px) 66vw, 100vw" quality={70} loading={i === 0 ? "eager" : undefined} fetchPriority={i === 0 ? "high" : undefined} className="object-cover" />
            ) : null}
          </div>
        ))}
        <SampleBadge className="absolute top-3 left-3">Sample photo</SampleBadge>
        <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white tabular-nums" aria-live="polite">
          {index + 1}/{n}
        </span>
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-rez-sm transition-colors hover:bg-white focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/60 focus-visible:outline-none"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-rez-sm transition-colors hover:bg-white focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/60 focus-visible:outline-none"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>
      {n > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Thumbnails">
          {images.map((src, i) => (
            <li key={src} className="w-[calc((100%-1.5rem)/4)] min-w-[88px] shrink-0">
              <button
                ref={(el) => {
                  thumbs.current[i] = el;
                }}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1} of ${n}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "group/thumb relative block aspect-[2/1] w-full overflow-hidden rounded-md bg-rez-cloud outline-none",
                  i === index ? "" : "opacity-60 transition-opacity hover:opacity-100",
                )}
              >
                <Image src={thumbnailSrc(src)} alt="" fill sizes="(min-width: 1024px) 240px, 25vw" quality={70} loading="eager" className="object-cover" />
                {/* Border drawn inside the thumbnail, above the photo: an outer ring is clipped by the
                    scrolling strip and doesn't follow the rounded corners. */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-[inherit] border-2 transition-colors",
                    i === index ? "border-black" : "border-transparent",
                    "group-focus-visible/thumb:border-rez-mocaccino-ink",
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
