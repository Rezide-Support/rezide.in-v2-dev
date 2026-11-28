import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { CanonicalPath } from "@/components/common/canonical-path";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { ProjectDetailView } from "@/features/projects/project-detail";
import { projectJsonLd, projectMetadata } from "@/features/projects/seo";
import { ApiError } from "@/lib/api/client";
import { projectIdFromParam, projectPath } from "@/lib/project-url";
import { projectQueries } from "@/lib/queries";
import { jsonLdScript } from "@/lib/seo";
import { fetchProject } from "@/services/catalog";

/*
 * /projects/<name>-<BHKs>-<status>-<locality>-<sub-region>-<city>-<id> (src/lib/project-url.ts).
 * Only the id at the end is read. Old /projects/<id> links get a 308 to this URL from
 * src/proxy.ts; any other words still load the project, with a canonical link to the right URL.
 */

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const id = projectIdFromParam((await params).slug);
  await connection();
  if (!id) return { title: "Project not found" };
  try {
    const { project } = await fetchProject(id);
    return projectMetadata(project);
  } catch {
    return { title: "Project not found" };
  }
}

async function ProjectData({ params }: { params: PageProps<"/projects/[slug]">["params"] }) {
  const id = projectIdFromParam((await params).slug);
  if (!id) notFound();
  // Sample data is fetched per request; TanStack Query reads the clock while dehydrating.
  await connection();
  const queryClient = new QueryClient();
  let project;
  try {
    ({ project } = await queryClient.fetchQuery(projectQueries.detail(id)));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <>
      {/* Structured data for search engines (not shown): the project and its breadcrumb trail. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(projectJsonLd(project)) }} />
      <CanonicalPath path={projectPath(project)} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProjectDetailView id={id} />
      </HydrationBoundary>
    </>
  );
}

export default function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ProjectData params={params} />
    </Suspense>
  );
}
