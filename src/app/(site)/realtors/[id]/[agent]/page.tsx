import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { RealtorProfileView } from "@/features/realtors/realtor-profile";
import { ApiError } from "@/lib/api/client";
import { realtorQueries } from "@/lib/queries";
import { fetchFirmAgent } from "@/services/catalog";

/* Agent page: /realtors/<firmSlug>/<agentSlug> (v1: /brokers/<firm>/<agent>). */

export async function generateMetadata({ params }: PageProps<"/realtors/[id]/[agent]">): Promise<Metadata> {
  const { id, agent } = await params;
  await connection();
  try {
    const { realtor, firm } = await fetchFirmAgent(id, agent);
    return {
      title: `${realtor.name}, ${firm?.name ?? realtor.firm}`,
      description: `${realtor.specializations.join(", ")} in ${realtor.localities.join(", ")}.`,
    };
  } catch {
    return { title: "Realtor not found" };
  }
}

async function AgentData({ params }: { params: PageProps<"/realtors/[id]/[agent]">["params"] }) {
  const { id, agent } = await params;
  // The directory is request-time data (the mock adapter reads the clock), so opt out of prerendering here.
  await connection();
  const queryClient = new QueryClient();
  try {
    await queryClient.fetchQuery(realtorQueries.agent(id, agent));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RealtorProfileView firmSlug={id} agentSlug={agent} />
    </HydrationBoundary>
  );
}

export default function AgentPage({ params }: PageProps<"/realtors/[id]/[agent]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <AgentData params={params} />
    </Suspense>
  );
}
