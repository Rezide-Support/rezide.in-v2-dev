import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LinkTab = { href: string; label: ReactNode; active: boolean };

type LinkTabsProps = {
  /** Accessible name of the tab set, e.g. "Property type". */
  label: string;
  items: LinkTab[];
  /** "track": cloud track, white active pill. "solid": black active pill on cloud. "bare": black active pill, no track. */
  appearance?: "track" | "solid" | "bare";
  size?: "md" | "lg";
  /** Wrap onto several lines instead of scrolling sideways on narrow screens. */
  wrap?: boolean;
  /** Inactive text colour: "ink" (black, as in the hero) or "muted" (graphite). */
  tone?: "ink" | "muted";
  className?: string;
  /** Classes for the inner <ul>, e.g. to stretch it full width on phones. */
  listClassName?: string;
  /** Classes for each <li>, e.g. `flex-1` for equal-width tabs. */
  itemWrapClassName?: string;
  itemClassName?: string;
};

/**
 * Tabs that are pages. Looks like `Segmented`, but every option is a link to
 * its own URL, so switching tabs is navigation: it can be shared, bookmarked,
 * opened in a new tab and undone with Back. The current tab has
 * `aria-current="page"`. Scroll position is kept so the switch feels in-place.
 */
export function LinkTabs({
  label,
  items,
  appearance = "track",
  size = "md",
  wrap,
  tone = "muted",
  className,
  listClassName,
  itemWrapClassName,
  itemClassName,
}: LinkTabsProps) {
  const sizes = { md: "h-10 px-4 text-sm", lg: "h-11 px-5 text-sm sm:text-[15px]" };
  return (
    <nav aria-label={label} className={cn("max-w-full", className)}>
      <ul
        className={cn(
          "inline-flex max-w-full items-center gap-0.5 rounded-full",
          wrap ? "flex-wrap" : "overflow-x-auto scrollbar-none",
          appearance !== "bare" && "bg-rez-cloud p-1",
          listClassName,
        )}
      >
        {items.map((item) => (
          <li key={item.href} className={cn("shrink-0", itemWrapClassName)}>
            <Link
              href={item.href}
              scroll={false}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex items-center rounded-full whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 ease-rez",
                sizes[size],
                item.active
                  ? appearance === "track"
                    ? "bg-white font-bold text-black shadow-rez-sm"
                    : "bg-black font-semibold text-rez-full-white"
                  : tone === "ink"
                    ? "font-medium text-black hover:bg-black/5"
                    : "font-medium text-rez-graphite hover:text-black",
                itemClassName,
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}