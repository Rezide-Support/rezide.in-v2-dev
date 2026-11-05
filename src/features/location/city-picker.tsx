"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { Icon } from "@/components/brand/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ALL_CITIES, DEFAULT_CITY, OTHER_CITIES, TOP_CITIES } from "@/lib/constants";
import { locationQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { rankCities } from "./city-search";
import { detectMessage, useDetectCity } from "./geolocation";

/** Longest list shown for a search; the full master has ≈730 cities. */
const MAX_MATCHES = 60;

type CityPickerProps = {
  city: string;
  onSelect: (city: string) => void;
  triggerClassName?: string;
};

export function CityPicker({ city, onSelect, triggerClassName }: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const statusId = useId();

  const pick = (c: string) => {
    onSelect(c);
    setQuery("");
    setOpen(false);
  };
  const { state, detect, reset } = useDetectCity(pick);
  const message = detectMessage(state);

  // The backend's city master, loaded the first time the picker opens. Until it arrives (or if it
  // fails) the built-in list keeps the picker usable.
  const cities = useQuery({ ...locationQueries.cities(), enabled: open });
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const all = cities.data ?? ALL_CITIES;
    if (q) return rankCities(all, q).slice(0, MAX_MATCHES);
    return cities.data ? all.filter((c) => !TOP_CITIES.includes(c)) : OTHER_CITIES;
  }, [q, cities.data]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQuery("");
          if (state.status !== "locating") reset();
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`City: ${city}. Change city`}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-black hover:bg-rez-cloud",
            triggerClassName,
          )}
        >
          <span>{city}</span>
          <Icon name="chevron-left" size={12} className="-rotate-90" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        className="flex max-h-[min(560px,72vh)] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-[20px] border-rez-smoke p-0 shadow-rez-lg"
      >
        <div className="bg-rez-cloud p-3">
          <label className="flex h-12 items-center gap-2.5 rounded-full bg-white px-4">
            <Icon name="search" size={18} />
            <span className="sr-only">Search cities</span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Select or type your city"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none"
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-rez-smoke px-[18px] py-3.5">
          <button
            type="button"
            onClick={detect}
            disabled={state.status === "locating"}
            aria-describedby={message ? statusId : undefined}
            className="flex items-center gap-2.5 text-sm font-semibold hover:text-rez-mocaccino-ink disabled:opacity-60"
          >
            <Icon name={state.status === "locating" ? "loader" : "compass"} size={18} className={state.status === "locating" ? "animate-spin" : undefined} />
            Detect my location
          </button>
          <button
            type="button"
            onClick={() => pick(DEFAULT_CITY)}
            className="text-[13px] font-medium text-rez-graphite hover:text-black"
          >
            Reset city
          </button>
        </div>
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={cn(
            "px-[18px] text-[13px] leading-snug",
            message ? "py-2.5" : "sr-only",
            state.status === "denied" || state.status === "unavailable" || state.status === "out-of-range"
              ? "bg-rez-cream text-rez-burgundy"
              : "text-rez-graphite",
          )}
        >
          {message}
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!q && (
            <>
              <h3 className="bg-rez-cloud px-[18px] pt-3 pb-2 text-[13px] font-bold">Top cities</h3>
              <ul className="grid grid-cols-3 border-t border-rez-smoke sm:grid-cols-4">
                {TOP_CITIES.map((c) => {
                  const on = c === city;
                  return (
                    <li key={c}>
                      <button
                        type="button"
                        onClick={() => pick(c)}
                        aria-current={on ? "true" : undefined}
                        className={cn(
                          "flex min-h-[84px] w-full flex-col items-center justify-center gap-2 border-r border-b border-rez-smoke px-1 py-2.5 text-center text-[13px] leading-tight hover:bg-rez-cloud",
                          on ? "bg-rez-cloud font-bold" : "font-medium",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-[34px] items-center justify-center rounded-full",
                            on ? "bg-black text-rez-full-white" : "bg-rez-cloud",
                          )}
                        >
                          <Icon name="map-pin" size={16} />
                        </span>
                        {c}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <h3 className="bg-rez-cloud px-[18px] pt-3 pb-2 text-[13px] font-bold">{q ? "Matching cities" : "Other cities"}</h3>
          {matches.length === 0 ? (
            <p className="px-[18px] py-6 text-sm text-rez-graphite">No city matches “{query}”.</p>
          ) : (
            <ul>
              {matches.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    className={cn(
                      "block w-full border-b border-rez-smoke px-[18px] py-3.5 text-left text-[15px] hover:bg-rez-cloud",
                      c === city ? "font-bold" : "font-normal",
                    )}
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
