"use client";

export { LiveRealtorSearch as RealtorSearchCard } from "./live-search";

/** Match the live search footprint while URL criteria resolve. */
export function RealtorSearchCardFallback() {
  return <div aria-hidden className="flex w-full flex-col gap-3 rounded-[28px] bg-white p-3 sm:max-w-[640px] sm:rounded-3xl sm:p-2 lg:h-[72px] lg:max-w-none lg:flex-row lg:items-center">
    <div className="h-11 w-full rounded-full bg-rez-cloud lg:h-14 lg:w-[232px]" />
    <div className="h-11 flex-1 rounded-full border border-rez-smoke lg:h-14" />
  </div>;
}
