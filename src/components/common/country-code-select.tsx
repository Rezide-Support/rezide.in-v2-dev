"use client";

import { defaultCountries, FlagImage, parseCountry, type CountryIso2 } from "react-international-phone";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Every country, as the old site's phone field lists them (react-international-phone). */
export const COUNTRIES = defaultCountries.map((c) => parseCountry(c));

/** India first, then the rest by name. */
const LIST = [...COUNTRIES].sort((a, b) => (a.iso2 === "in" ? -1 : b.iso2 === "in" ? 1 : a.name.localeCompare(b.name)));

export const dialCodeOf = (iso2: CountryIso2) => COUNTRIES.find((c) => c.iso2 === iso2)?.dialCode ?? "91";

/** A country's flag. India's is a local image so the default never waits on the flag CDN. */
export function CountryFlag({ iso2, className }: { iso2: CountryIso2; className?: string }) {
  if (iso2 === "in") {
    // eslint-disable-next-line @next/next/no-img-element -- a tiny local SVG
    return <img src="/images/flags/in.svg" alt="" width={20} height={20} className={cn("size-5 shrink-0", className)} />;
  }
  return <FlagImage iso2={iso2} size={20} className={cn("size-5 shrink-0", className)} />;
}

/**
 * The phone field's country picker, as the old site's sign-in: the flag and dial code; it opens a
 * list of every country with its flag, name and dial code.
 */
export function CountryCodeSelect({ value, onChange, className }: { value: CountryIso2; onChange: (iso2: CountryIso2) => void; className?: string }) {
  const current = COUNTRIES.find((c) => c.iso2 === value);
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CountryIso2)}>
      <SelectTrigger
        aria-label={`Country code: ${current?.name ?? ""} +${current?.dialCode ?? ""}`}
        className={cn("w-auto gap-2 rounded-none border-0 border-r border-input bg-transparent px-3 py-0 text-sm shadow-none focus-visible:ring-0 data-[size=default]:h-auto", className)}
      >
        <CountryFlag iso2={value} />
        <span className="whitespace-nowrap">+{current?.dialCode}</span>
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="max-h-[min(320px,var(--radix-select-content-available-height))]">
        {LIST.map((c) => (
          <SelectItem key={c.iso2} value={c.iso2}>
            <span className="flex items-center gap-2">
              <CountryFlag iso2={c.iso2} />
              <span>{c.name}</span>
              <span className="text-rez-graphite">+{c.dialCode}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
