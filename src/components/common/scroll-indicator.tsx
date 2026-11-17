"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Persistent overflow hint, including on browsers that hide native scrollbars. */
export function ScrollIndicator({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = root.current?.firstElementChild;
    if (!(scroller instanceof HTMLElement) || !track.current || !thumb.current || disabled) return;
    const update = () => {
      if (!track.current || !thumb.current) return;
      const { clientWidth, scrollWidth, scrollLeft } = scroller;
      track.current.hidden = scrollWidth <= clientWidth + 1;
      thumb.current.style.width = `${clientWidth / (scrollWidth || 1) * 100}%`;
      thumb.current.style.marginLeft = `${Math.max(0, scrollLeft) / (scrollWidth || 1) * 100}%`;
    };
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    for (const child of scroller.children) observer.observe(child);
    scroller.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", update);
    };
  }, [children, disabled]);

  return (
    <div ref={root} className="min-w-0 max-w-full">
      {children}
      <div ref={track} hidden aria-hidden="true" className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-200">
        <div ref={thumb} className="h-full rounded-full bg-gray-400" />
      </div>
    </div>
  );
}
