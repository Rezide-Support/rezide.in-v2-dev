"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: ReactNode; icon?: ReactNode };

const chipClass = (on: boolean, size: "md" | "lg", tone: "default" | "accent" = "default") =>
  cn(
    "inline-flex items-center gap-2.5 rounded-full border font-medium transition-[background-color,color,border-color] duration-150 active:scale-[0.98]",
    size === "md" ? "h-[42px] px-[18px] text-sm" : "h-[52px] pr-[22px] pl-4 text-[15px] font-semibold",
    on
      ? tone === "accent"
        ? "border-rez-mocaccino bg-rez-mocaccino font-bold text-black"
        : "border-black bg-black text-rez-full-white"
      : "border-rez-smoke bg-white text-black hover:border-black",
  );

/**
 * Pill choices. Single-select renders a radio group (arrow keys move the
 * selection); multi-select renders toggle buttons (aria-pressed).
 */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
  multiple,
  size = "md",
  invalid,
  describedBy,
  max,
  tone = "default",
}: {
  label: string;
  options: Option[];
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  size?: "md" | "lg";
  invalid?: boolean;
  describedBy?: string;
  max?: number;
  /** "accent": selected chip is mocaccino-filled with black bold text (single-select only). */
  tone?: "default" | "accent";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const groupId = useId();

  if (multiple) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div role="group" aria-label={label} aria-describedby={describedBy} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value);
          const disabled = !on && max !== undefined && selected.length >= max;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
              className={cn(chipClass(on, size), "disabled:cursor-not-allowed disabled:opacity-40")}
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  const current = typeof value === "string" ? value : undefined;
  const focusIndex = Math.max(0, options.findIndex((o) => o.value === current));
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (i + 1) % options.length
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? (i - 1 + options.length) % options.length
          : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      id={groupId}
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className="flex flex-wrap gap-2"
    >
      {options.map((o, i) => {
        const on = o.value === current;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === focusIndex ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={chipClass(on, size, tone)}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
