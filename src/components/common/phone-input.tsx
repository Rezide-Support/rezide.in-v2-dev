"use client";

import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./form-field";

/** +91 prefixed, digits-only, 10-character mobile input. */
export const PhoneInput = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "onChange" | "value"> & {
  value: string;
  onChange: (digits: string) => void;
}>(function PhoneInput({ value, onChange, className, ...props }, ref) {
  const field = useFieldControl();
  return (
    <span
      className={cn(
        "flex h-[52px] items-center gap-2.5 rounded-full border border-rez-smoke bg-white px-[18px] focus-within:border-rez-mocaccino focus-within:shadow-[var(--ring-focus)] has-[[aria-invalid=true]]:border-destructive",
        className,
      )}
    >
      <span className="text-[15px] font-semibold" aria-hidden>
        +91
      </span>
      <span aria-hidden className="h-[22px] w-px bg-rez-smoke" />
      <input
        ref={ref}
        {...field}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={10}
        placeholder="10-digit mobile number"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        className="min-w-0 flex-1 bg-transparent text-base font-medium tracking-[0.02em] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-[#767a88]"
        {...props}
      />
    </span>
  );
});
