"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal carousel (v1 Similar / Nearby rails). Native scroll-snap so touch
 * and trackpads work; arrow buttons page by one viewport; the track is
 * focusable so arrow keys scroll it. Respects reduced motion.
 */
export function Rail({ label, children, itemClassName }: { label: string; children: ReactNode; itemClassName?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  const items = Children.toArray(children);
  const arrow =
    "absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-rez-smoke bg-white shadow-rez-sm transition-opacity hover:border-black disabled:pointer-events-none disabled:opacity-0 focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/60 focus-visible:outline-none sm:flex";

  return (
    <div className="relative">
      <button type="button" className={cn(arrow, "-left-4 min-[1400px]:-left-12")} onClick={() => page(-1)} disabled={edges.start} aria-label={`Previous: ${label}`}>
        <ArrowLeft className="size-4" aria-hidden />
      </button>
      <ul
        ref={track}
        onScroll={update}
        tabIndex={0}
        aria-label={label}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-none focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/45 focus-visible:outline-none motion-reduce:scroll-auto"
      >
        {items.map((child, i) => (
          <li key={i} className={cn("relative w-full shrink-0 snap-start", itemClassName)}>
            {child}
          </li>
        ))}
      </ul>
      <button type="button" className={cn(arrow, "-right-4 min-[1400px]:-right-12")} onClick={() => page(1)} disabled={edges.end} aria-label={`Next: ${label}`}>
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
