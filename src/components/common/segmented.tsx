"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string; disabled?: boolean; title?: string };

type SegmentedProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** "track": cloud track with white active pill. "solid": black active pill. "outline": bordered track. "accent": cloud track with mocaccino active pill (black bold text). */
  appearance?: "track" | "solid" | "outline" | "accent";
  size?: "sm" | "md" | "lg";
  className?: string;
  itemClassName?: string;
  fullWidth?: boolean;
};

/**
 * Single-choice segmented control (radio group) with roving focus:
 * arrow keys move and select, Home/End jump to the ends.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  appearance = "track",
  size = "md",
  className,
  itemClassName,
  fullWidth,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.filter((o) => !o.disabled);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const idx = enabled.findIndex((o) => o.value === value);
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % enabled.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + enabled.length) % enabled.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = enabled.length - 1;
    const target = enabled[next];
    onChange(target.value);
    refs.current[options.indexOf(target)]?.focus();
  };

  const heights = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-11 px-5 text-sm sm:text-[15px]" };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1 scrollbar-none",
        appearance === "track" && "bg-rez-cloud",
        appearance === "outline" && "border border-rez-smoke bg-white shadow-rez-sm",
        (appearance === "solid" || appearance === "accent") && "bg-rez-cloud",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            title={o.title}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={onKeyDown}
            className={cn(
              "shrink-0 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 ease-rez disabled:cursor-not-allowed disabled:text-rez-steel",
              heights[size],
              fullWidth && "flex-1",
              active
                ? appearance === "track"
                  ? "bg-white font-bold text-black shadow-rez-sm"
                  : appearance === "accent"
                    ? "bg-rez-mocaccino font-bold text-black"
                    : "bg-black font-semibold text-rez-full-white"
                : appearance === "accent"
                  ? "text-black hover:bg-white/60"
                  : "text-rez-graphite hover:text-black",
              itemClassName,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
