import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { PropertyDetailView } from "@/features/properties/property-detail";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { priceLabel } from "@/features/properties/property-card";
import { ApiError } from "@/lib/api/client";
import { propertyQueries } from "@/lib/queries";
import { fetchProperty } from "@/services/properties";

export async function generateMetadata({ params }: PageProps<"/properties/[id]">): Promise<Metadata> {
  const { id } = await params;
  await connection();
  try {
    const { property: p } = await fetchProperty(id);
    return {
      title: `${p.title}, ${p.locality}`,
      description: `${p.unitType} in ${p.locality}, ${p.city} · ${priceLabel(p)}`,
    };
  } catch {
    return { title: "Property not found" };
  }
}

async function PropertyData({ params }: { params: PageProps<"/properties/[id]">["params"] }) {
  const { id } = await params;
  // Sample data is fetched per request; TanStack Query reads the clock while dehydrating.
  await connection();
  const queryClient = new QueryClient();
  try {
    await queryClient.fetchQuery(propertyQueries.detail(id));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PropertyDetailView id={id} />
    </HydrationBoundary>
  );
}

export default function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PropertyData params={params} />
    </Suspense>
  );
}
