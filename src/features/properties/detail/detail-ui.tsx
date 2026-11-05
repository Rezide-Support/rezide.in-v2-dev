"use client";

import type { ComponentProps, ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* Small building blocks shared by the property and project detail pages (v1 layout). */

/** v1 section heading: large, uppercase, tight. */
export function SectionHeading({ id, children, className, as: As = "h2" }: { id?: string; children: ReactNode; className?: string; as?: "h2" | "h3" }) {
  return (
    <As id={id} className={cn("text-[22px] leading-tight font-semibold tracking-[-0.01em] uppercase sm:text-[28px] lg:text-[32px]", className)}>
      {children}
    </As>
  );
}

/** Light panel with a hairline border, used for the side cards. */
export function DetailCard({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-rez-smoke bg-rez-cream-warm p-4 shadow-rez-sm sm:p-[18px]", className)} {...props} />;
}

/** Uppercase card title (KEY FEATURES, VISIT DETAILS). */
export function CardTitle({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <h2 id={id} className={cn("text-[15px] leading-tight font-semibold tracking-[0.02em] uppercase sm:text-[17px]", className)}>
      {children}
    </h2>
  );
}

/** Label above an underlined value (v1 field style). */
export function UnderlinedField({ label, value, upper }: { label: string; value: ReactNode; upper?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <dt className={cn(upper ? "text-[11px] font-semibold tracking-[0.04em] text-rez-arsenic uppercase sm:text-xs" : "text-[13px] text-rez-graphite")}>{label}</dt>
      <dd className="border-b border-rez-steel pb-1 break-words text-sm font-medium text-black sm:text-[15px]">{value}</dd>
    </div>
  );
}

/** Dash-bulleted list (v1 Key Features). */
export function DashList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {items.map((f) => (
        <li key={f} className="flex items-start gap-3 text-sm leading-snug text-rez-arsenic sm:text-[15px]">
          <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-rez-graphite" />
          {f}
        </li>
      ))}
    </ul>
  );
}

/**
 * A button for an action that has no backend yet. It stays focusable and says
 * so when used, instead of pretending to work.
 */
export function NotYetButton({
  message,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & { message: string }) {
  return (
    <Button {...props} onClick={() => toast.info(message)}>
      {children}
    </Button>
  );
}

/** Uppercase status chip (SALE / RENTAL / Under Construction). */
export function Chip({ children, tone = "timber", className }: { children: ReactNode; tone?: "timber" | "mint" | "dark" | "outline"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold tracking-[0.02em] whitespace-nowrap",
        tone === "timber" && "bg-rez-timber-tint text-rez-full-white uppercase",
        tone === "mint" && "bg-[#eaf4ee] text-rez-timber-green uppercase",
        tone === "dark" && "bg-rez-arsenic text-rez-full-white",
        tone === "outline" && "border border-rez-smoke bg-white text-black",
        className,
      )}
    >
      {children}
    </span>
  );
}
