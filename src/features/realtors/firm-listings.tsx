"use client";

import { useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { Pagination } from "@/components/common/pagination";
import { Segmented } from "@/components/common/segmented";
import { PropertyCard } from "@/features/properties/property-card";
import { useUrlCriteria } from "@/features/search/use-url-criteria";
import { directoryQueries } from "@/services/realtor-directory";

const parseListings = (params: URLSearchParams) => {
  const page = Number(params.get("page"));
  return { purpose: params.get("purpose") === "rent" ? "rent" as const : "sale" as const, page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
};
const serializeListings = (criteria: ReturnType<typeof parseListings>) => {
  const params = new URLSearchParams();
  if (criteria.purpose === "rent") params.set("purpose", "rent");
  if (criteria.page > 1) params.set("page", String(criteria.page));
  return params;
};

export function FirmListings({ firmId }: { firmId: string }) {
  const { criteria, update } = useUrlCriteria(parseListings, serializeListings);
  const query = useQuery(directoryQueries.listings(firmId, criteria.purpose, criteria.page));
  const data = query.data;
  return <section className="mt-12" aria-labelledby="firm-listings-title" aria-busy={query.isFetching}>
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <h2 id="firm-listings-title" className="text-2xl font-semibold">Firm Listings</h2>
      <Segmented label="Listing purpose" value={criteria.purpose} onChange={purpose => update({ purpose, page: 1 })} appearance="solid" options={[
        { value: "sale", label: `Available Sale${data ? ` (${data.sale})` : ""}` },
        { value: "rent", label: `Available Rental${data ? ` (${data.rent})` : ""}` },
      ]} className="w-full sm:w-fit" itemClassName="min-w-0 flex-1 px-3 text-xs sm:px-4 sm:text-sm" />
    </div>
    {query.isError ? <ErrorState message={query.error.message} onRetry={() => query.refetch()} /> : !data ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-96 animate-pulse rounded-xl bg-rez-cloud" />)}</div> : !data.items.length ? <EmptyState title={`No ${criteria.purpose === "rent" ? "rental" : "sale"} listings available.`}>Choose the other listing tab or check back later.</EmptyState> : <>
      <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">{data.items.map(property => <PropertyCard key={property.id} property={property} />)}</div>
      <Pagination page={data.page} pageCount={data.pageCount} onChange={page => update({ page })} />
    </>}
  </section>;
}
