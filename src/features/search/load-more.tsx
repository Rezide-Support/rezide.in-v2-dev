"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * The end of an endless list: loads the next batch when it scrolls into view (in the page or
 * in a scrolling panel), with a button for keyboards and browsers without IntersectionObserver.
 */
export function LoadMore({
  hasMore,
  loading,
  failed,
  onLoad,
  shown,
  total,
}: {
  hasMore: boolean;
  loading: boolean;
  failed?: boolean;
  onLoad: () => void;
  shown: number;
  total: number;
}) {
  const end = useRef<HTMLDivElement>(null);
  const load = useRef(onLoad);
  useEffect(() => {
    load.current = onLoad;
  });

  useEffect(() => {
    const el = end.current;
    // Re-attached after each batch, so a short list that still shows the end keeps loading.
    if (!el || !hasMore || loading || failed || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) load.current();
    }, { rootMargin: "300px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, failed]);

  return (
    <div ref={end} className="flex min-h-12 flex-col items-center justify-center gap-2 py-4 text-center text-sm text-rez-graphite" aria-live="polite">
      {loading ? (
        <p>Loading more listings…</p>
      ) : failed ? (
        <>
          <p>More listings couldn&apos;t be loaded.</p>
          <Button variant="secondary" size="sm" onClick={onLoad}>
            Try again
          </Button>
        </>
      ) : hasMore ? (
        <Button variant="secondary" size="sm" onClick={onLoad}>
          Load more
        </Button>
      ) : total > 0 ? (
        <p>
          You&apos;ve seen all {shown} {shown === 1 ? "listing" : "listings"}.
        </p>
      ) : null}
    </div>
  );
}
