import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "@/features/compare/compare-view";

export const metadata: Metadata = { title: "Compare", robots: { index: false } };

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[60vh] w-full max-w-[1280px] p-8" aria-busy="true" />}>
      <CompareView />
    </Suspense>
  );
}
