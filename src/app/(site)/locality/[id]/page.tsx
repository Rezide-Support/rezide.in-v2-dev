import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { LocalityView } from "@/features/localities/locality-view";
import { ApiError } from "@/lib/api/client";
import { fetchLocality } from "@/services/localities";
import { fetchCityName } from "@/services/locations";

/** One request per page view, shared by the metadata and the page. A missing locality is null. */
const loadLocality = cache(async (id: string) => {
  try {
    return await fetchLocality(id, fetchCityName);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: PageProps<"/locality/[id]">): Promise<Metadata> {
  const { id } = await params;
  await connection();
  const l = await loadLocality(id).catch(() => null);
  if (!l) return { title: "Locality not found" };
  return { title: `Welcome to ${l.name}`, description: l.description.slice(0, 160) || `What to expect, the lifestyle and the market in ${l.name}.` };
}

async function LocalityData({ params }: { params: PageProps<"/locality/[id]">["params"] }) {
  const { id } = await params;
  await connection();
  const locality = await loadLocality(id);
  if (!locality) notFound();
  return <LocalityView locality={locality} />;
}

/** rezide.in's locality page, linked from a project's "Explore {locality}" photo. */
export default function LocalityPage({ params }: PageProps<"/locality/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <LocalityData params={params} />
    </Suspense>
  );
}
