"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/*
 * rezide.in's About page is a vertical slideshow: one mouse-wheel step moves a whole section, and
 * dots on the right (desktop, ≥ 992 px) show and pick the section. This reproduces that on top of
 * normal page scrolling: phones scroll as usual, a section taller than the window scrolls normally,
 * and scrolling down from the last section continues to the site footer.
 */

const DESKTOP = "(min-width: 992px)";
const LOCK_MS = 900;

export function useSectionPager(count: number) {
  const sections = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const locked = useRef(false);

  const topOf = useCallback((i: number) => {
    const el = sections.current[i];
    if (!el) return 0;
    // The first section sits under the site header: going "to" it means the top of the page.
    return i === 0 ? 0 : el.getBoundingClientRect().top + window.scrollY;
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const target = Math.max(0, Math.min(count - 1, i));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      locked.current = true;
      window.scrollTo({ top: topOf(target), behavior: reduce ? "auto" : "smooth" });
      setActive(target);
      window.setTimeout(() => (locked.current = false), reduce ? 50 : LOCK_MS);
    },
    [count, topOf],
  );

  // Which section is on screen.
  useEffect(() => {
    const update = () => {
      const line = window.innerHeight * 0.4;
      let current = 0;
      sections.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line) current = i;
      });
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // One wheel step = one section, on desktop.
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP);
    const onWheel = (e: WheelEvent) => {
      if (!desktop.matches || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || Math.abs(e.deltaY) < 4) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      if (locked.current) {
        e.preventDefault();
        return;
      }
      const last = count - 1;
      const y = window.scrollY;
      // Below the top of the last section (e.g. in the footer): scroll normally.
      if (y > topOf(last) + 4) return;
      // The section exactly in place (or the nearest one).
      let i = 0;
      for (let k = 0; k <= last; k++) if (topOf(k) <= y + 4) i = k;
      const fits = (k: number) => (sections.current[k]?.offsetHeight ?? Infinity) <= window.innerHeight + 2;
      const aligned = Math.abs(topOf(i) - y) <= 4;
      if (e.deltaY > 0) {
        if (i >= last || !fits(i) || !aligned) return; // let the page scroll (to the footer, or through a tall section)
        e.preventDefault();
        goTo(i + 1);
      } else {
        if (!aligned) {
          if (!fits(i)) return;
          e.preventDefault();
          goTo(i);
          return;
        }
        if (i === 0 || !fits(i - 1)) return;
        e.preventDefault();
        goTo(i - 1);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [count, goTo, topOf]);

  const register = (i: number) => (el: HTMLElement | null) => {
    sections.current[i] = el;
  };

  return { register, active, goTo };
}

/** rezide.in's section dots: 8 px, 6 px apart, 8 px from the right edge; the current one solid black. */
export function SectionDots({ labels, active, onSelect }: { labels: string[]; active: number; onSelect: (i: number) => void }) {
  return (
    <nav aria-label="Page sections" className="fixed top-1/2 right-2 z-30 hidden -translate-y-1/2 flex-col gap-1.5 min-[992px]:flex">
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          aria-label={`Go to ${label}`}
          aria-current={i === active ? "true" : undefined}
          onClick={() => onSelect(i)}
          className={cn("size-2 rounded-full bg-black transition-opacity", i === active ? "opacity-100" : "opacity-20 hover:opacity-60")}
        />
      ))}
    </nav>
  );
}
