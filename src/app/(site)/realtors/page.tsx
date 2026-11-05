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
    <>
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
    </>
  );
}
