"use client";

import { Icon } from "@/components/brand/icon";
import { cn } from "@/lib/utils";

/** 1 … 4 5 6 … 20 */
export function pageList(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(page - 1, pageCount - 4));
  const out: (number | "gap")[] = [1];
  if (start > 2) out.push("gap");
  out.push(start, start + 1, start + 2);
  if (start + 2 < pageCount - 1) out.push("gap");
  out.push(pageCount);
  return out;
}

export function Pagination({
  page,
  pageCount,
  onChange,
  label = "Results pages",
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  const btn =
    "flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-center gap-1.5 pt-9 pb-2">
      <button
        type="button"
        className={cn(btn, "border-rez-smoke bg-white hover:border-black")}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <Icon name="arrow-right" size={16} className="rotate-180" />
      </button>
      {pageList(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-rez-graphite" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              btn,
              "min-w-10 px-1.5",
              p === page ? "border-black bg-black text-rez-full-white" : "border-rez-smoke bg-white hover:border-black",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={cn(btn, "border-rez-smoke bg-white hover:border-black")}
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <Icon name="arrow-right" size={16} />
      </button>
    </nav>
  );
}
