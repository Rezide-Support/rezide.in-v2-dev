import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { PropertyDetailView } from "@/features/properties/property-detail";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { priceLabel } from "@/features/properties/price-label";
import { ApiError } from "@/lib/api/client";
import { propertyQueries } from "@/lib/queries";
import { fetchProperty } from "@/services/properties";
import { propertyHref, propertyIdFromSegment } from "@/lib/property-url";

export async function generateMetadata({ params }: PageProps<"/properties/[id]">): Promise<Metadata> {
  const { id: segment } = await params;
  const id = propertyIdFromSegment(segment);
  await connection();
  try {
    const { property: p } = await fetchProperty(id);
    return {
      title: `${p.title}, ${p.locality}`,
      description: `${p.unitType} in ${p.locality}, ${p.city} · ${priceLabel(p)}`,
      alternates: { canonical: propertyHref(p) },
      openGraph: { url: propertyHref(p), title: p.title },
    };
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) console.error("Property metadata failed", { id, status: error instanceof ApiError ? error.status : undefined });
    return { title: "Property not found" };
  }
}

async function PropertyData({ params, searchParams }: Pick<PageProps<"/properties/[id]">, "params" | "searchParams">) {
  const { id: segment } = await params;
  const id = propertyIdFromSegment(segment);
  // Sample data is fetched per request; TanStack Query reads the clock while dehydrating.
  await connection();
  const queryClient = new QueryClient();
  let canonicalPath: string;
  try {
    const detail = await queryClient.fetchQuery(propertyQueries.detail(id));
    canonicalPath = propertyHref(detail.property);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  if (`/properties/${segment}` !== canonicalPath) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (Array.isArray(value)) value.forEach(item => query.append(key, item));
      else if (value !== undefined) query.set(key, value);
    }
    permanentRedirect(`${canonicalPath}${query.size ? `?${query}` : ""}`);
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PropertyDetailView id={id} />
    </HydrationBoundary>
  );
}

export default function PropertyPage({ params, searchParams }: PageProps<"/properties/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PropertyData params={params} searchParams={searchParams} />
    </Suspense>
  );
}
