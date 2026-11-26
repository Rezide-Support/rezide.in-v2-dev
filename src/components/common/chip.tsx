import type { ComponentProps, ReactNode } from "react";
import { Icon } from "@/components/brand/icon";
import { cn } from "@/lib/utils";

/** Toggleable pill (aria-pressed). Black when selected, as in the prototype's filter chips. */
export function ToggleChip({
  pressed,
  className,
  children,
  count,
  size = "md",
  ...props
}: ComponentProps<"button"> & { pressed: boolean; count?: number | null; size?: "xs" | "sm" | "md" | "lg" }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium transition-[background-color,color,border-color] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "xs" && "h-8 gap-1.5 px-3 text-xs",
        size === "sm" && "h-9 px-3.5 text-[13px]",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-[52px] px-5 text-[15px] font-semibold",
        pressed ? "border-black bg-black text-rez-full-white" : "border-rez-smoke bg-white text-black hover:border-black",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className={cn("text-[11px] font-semibold", pressed ? "text-rez-full-white/80" : "text-rez-graphite")}>
          {count === null ? "—" : count}
        </span>
      )}
    </button>
  );
}

/** Removable filter chip. */
export function RemovableChip({
  children,
  onRemove,
  label,
  className,
  size = "md",
}: {
  children: ReactNode;
  onRemove: () => void;
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter: ${label}`}
      className={cn(
        "inline-flex items-center rounded-full border border-black bg-white font-medium hover:bg-black/[0.06]",
        size === "sm" ? "h-6 gap-1.5 pr-2 pl-2.5 text-[11px]" : "h-8 gap-2 pr-2.5 pl-3.5 text-[13px]",
        className,
      )}
    >
      <span>{children}</span>
      <Icon name="x" size={size === "sm" ? 10 : 12} />
    </button>
  );
}
