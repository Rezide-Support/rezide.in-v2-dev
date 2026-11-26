"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/brand/icon";
import { cn } from "@/lib/utils";

/**
 * A light scroll-snap carousel for the About page: swipe on touch, arrows and dots on any screen.
 * `slideClassName` sets each slide's width (e.g. "basis-full lg:basis-1/3").
 */
export function Slider({
  children,
  label,
  slideClassName = "basis-full",
  arrows = "outside",
  dots = true,
  dark = true,
  className,
}: {
  children: ReactNode;
  label: string;
  slideClassName?: string;
  /** "outside": round buttons beside the track (large screens); "inside": small arrows over it. */
  arrows?: "outside" | "inside" | "none";
  dots?: boolean;
  dark?: boolean;
  className?: string;
}) {
  const slides = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(slides.length <= 1);

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const items = [...el.children] as HTMLElement[];
    const left = el.scrollLeft;
    let best = 0;
    items.forEach((item, i) => {
      if (Math.abs(item.offsetLeft - el.offsetLeft - left) < Math.abs(items[best].offsetLeft - el.offsetLeft - left)) best = i;
    });
    setIndex(best);
    setAtEnd(left + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const go = (i: number) => {
    const el = track.current;
    const item = el?.children[Math.max(0, Math.min(i, slides.length - 1))] as HTMLElement | undefined;
    if (el && item) el.scrollTo({ left: item.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  const arrowClass = dark
    ? "bg-white text-black disabled:bg-white/30 disabled:text-black/60"
    : "bg-black text-white disabled:bg-black/20";

  return (
    <div className={cn("relative", className)} role="region" aria-roledescription="carousel" aria-label={label}>
      <div
        ref={track}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            className={cn("min-w-0 shrink-0 snap-start", slideClassName)}
          >
            {slide}
          </div>
        ))}
      </div>

      {arrows !== "none" && slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            disabled={index === 0}
            onClick={() => go(index - 1)}
            className={cn(
              "absolute top-1/2 z-10 grid -translate-y-1/2 place-items-center rounded-full transition-colors",
              arrows === "outside" ? "-left-12 hidden size-8 lg:grid" : "left-3 size-7 bg-transparent! text-white! disabled:opacity-30",
              arrows === "outside" && arrowClass,
            )}
          >
            <Icon name="arrow-right" size={16} className="rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            disabled={atEnd}
            onClick={() => go(index + 1)}
            className={cn(
              "absolute top-1/2 z-10 grid -translate-y-1/2 place-items-center rounded-full transition-colors",
              arrows === "outside" ? "-right-12 hidden size-8 lg:grid" : "right-3 size-7 bg-transparent! text-white! disabled:opacity-30",
              arrows === "outside" && arrowClass,
            )}
          >
            <Icon name="arrow-right" size={16} />
          </button>
        </>
      )}

      {dots && slides.length > 1 && (
        <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label={`${label} slides`}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => go(i)}
              className={cn("size-2 rounded-full transition-colors", dark ? (i === index ? "bg-white" : "bg-white/35") : i === index ? "bg-black" : "bg-black/25")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
