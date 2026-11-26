import type { ComponentProps } from "react";
import { Icon } from "@/components/brand/icon";
import { cn } from "@/lib/utils";

/** Pill-shaped native <select>. Native controls keep platform pickers on mobile. */
export function NativeSelect({
  className,
  wrapperClassName,
  size = "md",
  children,
  ...props
}: Omit<ComponentProps<"select">, "size"> & { wrapperClassName?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={cn("relative inline-flex", wrapperClassName)}>
      <select
        className={cn(
          "w-full min-w-0 appearance-none rounded-full border border-rez-smoke bg-white pr-11 pl-[18px] font-semibold text-black outline-none hover:border-black focus-visible:border-rez-mocaccino focus-visible:shadow-[var(--ring-focus)] disabled:opacity-50 aria-invalid:border-destructive",
          size === "sm" && "h-10 text-sm",
          size === "md" && "h-12 text-sm",
          size === "lg" && "h-[50px] text-[15px] font-medium",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevron-left"
        size={14}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-[18px] -translate-y-1/2 -rotate-90"
      />
    </span>
  );
}
