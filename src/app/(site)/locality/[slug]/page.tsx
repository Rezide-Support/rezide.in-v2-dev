import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { CanonicalPath } from "@/components/common/canonical-path";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { LocalityView } from "@/features/localities/locality-view";
import { localityJsonLd, localityMetadata } from "@/features/localities/seo";
import { ApiError } from "@/lib/api/client";
import { localityIdFromParam, localityPath } from "@/lib/locality-url";
import { jsonLdScript } from "@/lib/seo";
import { fetchLocality } from "@/services/localities";
import { fetchCityName } from "@/services/locations";

/*
 * /locality/<locality>-<sub-region>-<city>-<id> (src/lib/locality-url.ts). Only the id at the end
 * is read. Old /locality/<id> links get a 308 to this URL from src/proxy.ts; any other words still
 * load the locality, with a canonical link to the right URL.
 */

/** One request per page view, shared by the metadata and the page. A missing locality is null. */
const loadLocality = cache(async (id: string) => {
  try {
    return await fetchLocality(id, fetchCityName);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: PageProps<"/locality/[slug]">): Promise<Metadata> {
  const id = localityIdFromParam((await params).slug);
  await connection();
  const l = id ? await loadLocality(id).catch(() => null) : null;
  if (!l) return { title: "Locality not found" };
  return localityMetadata(l);
}

async function LocalityData({ params }: { params: PageProps<"/locality/[slug]">["params"] }) {
  const id = localityIdFromParam((await params).slug);
  if (!id) notFound();
  await connection();
  const locality = await loadLocality(id);
  if (!locality) notFound();
  return (
    <>
      {/* Structured data for search engines (not shown): the locality, where it is, and the breadcrumb trail. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(localityJsonLd(locality)) }} />
      {locality.slug && <CanonicalPath path={localityPath(locality)} />}
      <LocalityView locality={locality} />
    </>
  );
}

/** rezide.in's locality page, linked from a project's "Explore {locality}" photo. */
export default function LocalityPage({ params }: PageProps<"/locality/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <LocalityData params={params} />
    </Suspense>
  );
}
