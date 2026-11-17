"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Icon } from "@/components/brand/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ALL_CITIES } from "@/lib/constants";
import { locationQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { rankCities } from "./city-search";

/** Longest list shown for a search; the full master has ≈730 cities. */
const MAX_MATCHES = 60;

/** The cities on the desktop picker's grid, in the design's order. Any other city is found by searching. */
const PICKER_CITIES = ["Mumbai", "Delhi", "Bengaluru", "Thane", "Gurugram", "Hyderabad", "Pune", "Kolkata", "Chennai"];
/** The cities on the mobile bar's list, in the design's order. */
const BAR_CITIES = ["Mumbai", "Delhi", "Bengaluru", "Pune", "Ahmedabad", "Thane", "Gurugram", "Hyderabad", "Kolkata", "Chennai"];

type CityPickerProps = {
  city: string;
  onSelect: (city: string) => void;
  /** "compact": a small button opening a grid (desktop header). "bar": a full-width row opening a list (mobile). */
  variant?: "compact" | "bar";
  triggerClassName?: string;
};

export function CityPicker({ city, onSelect, variant = "compact", triggerClassName }: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const bar = variant === "bar";

  const pick = (c: string) => {
    onSelect(c);
    setQuery("");
    setOpen(false);
  };

  // The backend's city master, loaded the first time the picker opens. Until it arrives (or if it
  // fails) the built-in list keeps the search usable.
  const cities = useQuery({ ...locationQueries.cities(), enabled: open });
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? rankCities(cities.data ?? ALL_CITIES, q).slice(0, MAX_MATCHES) : []),
    [q, cities.data],
  );

  const search = (
    <label className={cn("flex h-9 shrink-0 items-center gap-2 rounded-lg border border-rez-smoke px-3 focus-within:border-rez-graphite", bar && "h-11 rounded-[12px]")}>
      <Icon name="search" size={bar ? 18 : 15} className="text-rez-graphite" />
      <span className="sr-only">Search cities</span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search City"
        className={cn("min-w-0 flex-1 bg-transparent text-base sm:text-xs font-medium outline-none placeholder:text-xs placeholder:text-rez-graphite", bar && "text-base sm:text-sm placeholder:text-sm")}
      />
    </label>
  );

  const list = (names: string[], { pins }: { pins: boolean }) => (
    <ul className="flex flex-col gap-0.5">
      {names.map((c) => (
        <li key={c}>
          <button
            type="button"
            onClick={() => pick(c)}
            aria-current={c === city ? "true" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-rez-cloud",
              bar && "min-h-11 rounded-[12px] px-3 text-sm",
              c === city ? "bg-rez-mocaccino/15 font-bold hover:bg-rez-mocaccino/15" : "font-medium",
            )}
          >
            {pins && <Icon name="map-pin" size={15} className="shrink-0" />}
            {c}
          </button>
        </li>
      ))}
    </ul>
  );

  const results =
    matches.length === 0 ? (
      <p className="px-2 py-4 text-xs text-rez-graphite">No city matches “{query}”.</p>
    ) : (
      list(matches, { pins: bar })
    );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        {bar ? (
          <button
            type="button"
            aria-label={`City: ${city}. Change city`}
            className={cn("flex h-11 w-full items-center gap-2 text-[13px] font-semibold text-black", triggerClassName)}
          >
            <Icon name="map-pin" size={15} />
            <span>{city}</span>
            <Icon name="chevron-left" size={12} className="ml-auto -rotate-90" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={`City: ${city}. Change city`}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-black hover:bg-rez-cloud",
              triggerClassName,
            )}
          >
            <Icon name="map-pin" size={14} />
            <span>{city}</span>
            <Icon name="chevron-left" size={12} className="-rotate-90" />
          </button>
        )}
      </PopoverTrigger>
      {bar ? (
        // Opens over its own bar, the full width of the screen, as in the design.
        <PopoverContent onOpenAutoFocus={event => { if (window.matchMedia("(pointer: coarse)").matches) event.preventDefault(); }}
          aria-label="Select city"
          align="start"
          side="bottom"
          sideOffset={-44}
          alignOffset={-16}
          avoidCollisions={false}
          className="flex max-h-[min(380px,75dvh)] w-[calc(var(--radix-popover-trigger-width)+32px)] flex-col gap-2 overflow-hidden rounded-t-none rounded-b-[24px] border-0 bg-white px-4 pt-0 pb-4 shadow-rez-lg ring-0"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-11 w-full shrink-0 items-center gap-2 text-[13px] font-semibold"
          >
            <Icon name="map-pin" size={15} />
            Select City
            <Icon name="chevron-left" size={12} className="ml-auto rotate-90" />
          </button>
          {search}
          <div className="min-h-0 flex-1 overflow-y-auto">{q ? results : list(BAR_CITIES, { pins: true })}</div>
        </PopoverContent>
      ) : (
        <PopoverContent onOpenAutoFocus={event => { if (window.matchMedia("(pointer: coarse)").matches) event.preventDefault(); }}
          align="start"
          sideOffset={10}
          className="flex max-h-[min(420px,72vh)] w-[min(240px,calc(100vw-32px))] flex-col gap-2 overflow-hidden rounded-xl border-rez-smoke bg-white p-2.5 shadow-rez-lg"
        >
          {search}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!q ? (
              <ul className="grid grid-cols-3 overflow-hidden rounded-lg border-t border-l border-rez-smoke">
                {PICKER_CITIES.map((c) => {
                  const on = c === city;
                  return (
                    <li key={c}>
                      <button
                        type="button"
                        onClick={() => pick(c)}
                        aria-current={on ? "true" : undefined}
                        className={cn(
                          "flex h-[52px] w-full flex-col items-center justify-center gap-1 border-r border-b border-rez-smoke px-1 text-center text-[11px] leading-tight font-semibold",
                          on ? "bg-rez-mocaccino/15" : "hover:bg-rez-cloud",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-6 items-center justify-center rounded-full",
                            on ? "bg-rez-mocaccino/25 text-rez-mocaccino-ink" : "bg-rez-cloud",
                          )}
                        >
                          <Icon name="map-pin" size={12} />
                        </span>
                        {c}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              results
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
