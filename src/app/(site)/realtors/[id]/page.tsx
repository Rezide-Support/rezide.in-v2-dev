import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { FirmProfileView } from "@/features/realtors/firm-profile";
import { realtorHref } from "@/features/realtors/links";
import { ApiError } from "@/lib/api/client";
import { firmQueries } from "@/lib/queries";
import { fetchFirm, fetchRealtor } from "@/services/catalog";

/*
 * /realtors/<firmSlug> is a firm page. Older agent URLs used this segment for
 * the realtor id (/realtors/<realtorId>); those redirect to /realtors/<firm>/<agent>.
 */

const isNotFound = (e: unknown) => e instanceof ApiError && e.status === 404;

/** New URL for an old realtor id, or null if the id is unknown. */
async function legacyAgentUrl(id: string): Promise<string | null> {
  try {
    const { realtor } = await fetchRealtor(id);
    return realtorHref(realtor);
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: PageProps<"/realtors/[id]">): Promise<Metadata> {
  const { id } = await params;
  await connection();
  try {
    const { firm, team } = await fetchFirm(id);
    return {
      title: `${firm.name}, realtor firm in ${firm.city}`,
      description: `${firm.entityType} operating since ${firm.since}. ${firm.specializations.join(", ")}. ${team.length} agent profiles and listings.`,
    };
  } catch {
    return { title: "Realtor firm not found" };
  }
}

async function FirmData({ params }: { params: PageProps<"/realtors/[id]">["params"] }) {
  const { id } = await params;
  // The directory is request-time data (the mock adapter reads the clock), so opt out of prerendering here.
  await connection();
  const queryClient = new QueryClient();
  let found = true;
  try {
    await queryClient.fetchQuery(firmQueries.detail(id));
  } catch (e) {
    if (!isNotFound(e)) throw e;
    found = false;
  }
  if (!found) {
    const next = await legacyAgentUrl(id);
    if (next) permanentRedirect(next);
    notFound();
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FirmProfileView slug={id} />
    </HydrationBoundary>
  );
}

export default function FirmPage({ params }: PageProps<"/realtors/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <FirmData params={params} />
    </Suspense>
  );
}
