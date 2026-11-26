"use client";

import { forwardRef, type ComponentProps } from "react";
import type { CountryIso2 } from "react-international-phone";
import { cn } from "@/lib/utils";
import { CountryCodeSelect } from "./country-code-select";
import { useFieldControl } from "./form-field";

/**
 * Digits-only mobile input with the India flag and +91, 10 characters.
 * With `country` and `onCountryChange` the flag opens every country (as the old site's sign-in),
 * and other countries take up to 14 digits.
 */
export const PhoneInput = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "onChange" | "value"> & {
  value: string;
  onChange: (digits: string) => void;
  country?: CountryIso2;
  onCountryChange?: (iso2: CountryIso2) => void;
}>(function PhoneInput({ value, onChange, country, onCountryChange, className, ...props }, ref) {
  const field = useFieldControl();
  const picker = country !== undefined && onCountryChange !== undefined;
  const india = !picker || country === "in";
  return (
    <span
      className={cn(
        "flex h-[52px] items-center gap-2.5 rounded-full border border-rez-smoke bg-white px-[18px] focus-within:border-rez-mocaccino focus-within:shadow-[var(--ring-focus)] has-[[aria-invalid=true]]:border-destructive",
        picker && "pl-1.5",
        className,
      )}
    >
      {picker ? (
        <CountryCodeSelect value={country} onChange={onCountryChange} className="rounded-full pl-3 text-[15px] font-semibold hover:bg-rez-cloud data-[size=default]:h-[38px]" />
      ) : (
        <>
          {/* India flag image, as the old site (a flag emoji shows as "IN" on Windows). */}
          <span className="flex shrink-0 items-center gap-2 text-[15px] font-semibold" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element -- a tiny local SVG */}
            <img src="/images/flags/in.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
            +91
          </span>
          <span aria-hidden className="h-[22px] w-px bg-rez-smoke" />
        </>
      )}
      <input
        ref={ref}
        {...field}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={india ? "10-digit mobile number" : "Mobile number"}
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          if (!india) return onChange(digits.slice(0, 14));
          onChange(digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.slice(0, 10));
        }}
        className="min-w-0 flex-1 bg-transparent text-base font-medium tracking-[0.02em] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-[#767a88]"
        {...props}
      />
    </span>
  );
});
