import type { Metadata } from "next";
import { Suspense } from "react";
import { RealtorFinder } from "@/features/realtors/realtor-finder";
import { RealtorHero } from "@/features/realtors/realtor-hero";
import { RealtorSearchCard, RealtorSearchCardFallback } from "@/features/realtors/realtor-search";

export const metadata: Metadata = {
  title: "Find a realtor",
  description: "Search RERA-registered realtors and firms by name, specialization, locality and language.",
};

export default function RealtorsPage() {
  return (
    // On tablets and laptops the page is drawn a little smaller, so it fits the screen like on a big
    // monitor (full size from 1600px; phones unchanged). Popups and the filter sheet open outside it.
    // --page-zoom lets the hero fill the screen exactly despite the zoom.
    <div className="md:max-lg:[zoom:0.9] md:max-lg:[--page-zoom:0.9] lg:max-[1439.98px]:[zoom:0.85] lg:max-[1439.98px]:[--page-zoom:0.85] min-[1440px]:max-[1599.98px]:[zoom:0.92] min-[1440px]:max-[1599.98px]:[--page-zoom:0.92]">
      <RealtorHero
        search={
          <Suspense fallback={<RealtorSearchCardFallback />}>
            <RealtorSearchCard />
          </Suspense>
        }
      />
      <Suspense fallback={<div className="h-[400px]" aria-busy="true" />}>
        <RealtorFinder />
      </Suspense>
    </div>
  );
}
