"use client";

import { forwardRef, type ComponentProps } from "react";
import { OTP_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./form-field";

/** Single-field one-time-code input. Supports SMS autofill (autocomplete="one-time-code"). */
export const OtpInput = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "onChange" | "value"> & {
  value: string;
  onChange: (code: string) => void;
}>(function OtpInput({ value, onChange, className, ...props }, ref) {
  const field = useFieldControl();
  return (
    <input
      ref={ref}
      {...field}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern={`\\d{${OTP_LENGTH}}`}
      maxLength={OTP_LENGTH}
      placeholder={"•".repeat(OTP_LENGTH).split("").join(" ")}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
      className={cn(
        "h-14 w-full rounded-2xl border border-black bg-white text-center text-2xl font-semibold tracking-[0.5em] outline-none placeholder:tracking-[0.3em] placeholder:text-rez-steel focus-visible:border-rez-mocaccino focus-visible:shadow-[var(--ring-focus)] aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
});
