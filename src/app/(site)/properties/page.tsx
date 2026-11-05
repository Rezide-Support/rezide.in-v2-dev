import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertyCardSkeleton } from "@/features/properties/property-card";
import { PropertySearch } from "@/features/search/property-search";

export const metadata: Metadata = {
  title: "Properties",
  description: "Search homes, offices, retail, industrial and land listings by locality, budget and more.",
};

function SearchFallback() {
  return (
    <div className="flex-1 px-4 pt-5 pb-24 md:px-8">
      <div className="mx-auto grid grid-cols-1 max-w-[1280px] gap-6 pt-40 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Results depend on the query string, so the interactive view streams inside Suspense. */
export default function PropertiesPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <PropertySearch />
    </Suspense>
  );
}
