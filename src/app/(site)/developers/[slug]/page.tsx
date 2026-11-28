import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { CanonicalPath } from "@/components/common/canonical-path";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { DeveloperView } from "@/features/developers/developer-view";
import { developerJsonLd, developerMetadata } from "@/features/developers/seo";
import { ApiError } from "@/lib/api/client";
import { developerIdFromParam, developerPath } from "@/lib/developer-url";
import { jsonLdScript } from "@/lib/seo";
import { developerExperience, fetchDeveloper } from "@/services/developers";
import { getDeveloperProjects, type DeveloperProjects } from "@/services/projects";

/*
 * /developers/<developer-name>-<city>-<id> (src/lib/developer-url.ts). Only the id at the end is
 * read. Old /developers/<id> links get a 308 to this URL from src/proxy.ts; any other words still
 * load the developer, with a canonical link to the right URL.
 */

/** One request per page view, shared by the metadata and the page. A missing developer is null. */
const loadDeveloper = cache(async (id: string) => {
  try {
    return await fetchDeveloper(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
});

const NO_PROJECTS: DeveloperProjects = { total: 0, all: [], rtm: [], uc: [], nl: [] };

/** The developer's projects, shared by the metadata and the page. A failed search shows none. */
const loadProjects = cache((name: string, city: string | undefined) => getDeveloperProjects(name, city).catch(() => NO_PROJECTS));

export async function generateMetadata({ params }: PageProps<"/developers/[slug]">): Promise<Metadata> {
  const id = developerIdFromParam((await params).slug);
  await connection();
  const d = id ? await loadDeveloper(id).catch(() => null) : null;
  if (!d) return { title: "Developer not found" };
  return developerMetadata(d, await loadProjects(d.name, d.cities[0]));
}

async function DeveloperData({ params }: { params: PageProps<"/developers/[slug]">["params"] }) {
  const id = developerIdFromParam((await params).slug);
  if (!id) notFound();
  await connection();
  const developer = await loadDeveloper(id);
  if (!developer) notFound();
  const projects = await loadProjects(developer.name, developer.cities[0]);
  return (
    <>
      {/* Structured data for search engines (not shown): the developer, its projects and the breadcrumb trail. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(developerJsonLd(developer, projects)) }} />
      <CanonicalPath path={developerPath(developer)} />
      <DeveloperView developer={developer} experience={developerExperience(developer.established)} projects={projects} />
    </>
  );
}

/** rezide.in's developer page, opened from a project's "Builder Details". */
export default function DeveloperPage({ params }: PageProps<"/developers/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DeveloperData params={params} />
    </Suspense>
  );
}
