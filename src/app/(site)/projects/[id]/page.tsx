import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { ProjectDetailView } from "@/features/projects/project-detail";
import { ApiError } from "@/lib/api/client";
import { projectQueries } from "@/lib/queries";
import { fetchProject } from "@/services/catalog";

export async function generateMetadata({ params }: PageProps<"/projects/[id]">): Promise<Metadata> {
  const { id } = await params;
  await connection();
  try {
    const { project } = await fetchProject(id);
    return { title: `${project.name}, ${project.locality}`, description: `${project.configurations} by ${project.developer} in ${project.locality}, ${project.city}.` };
  } catch {
    return { title: "Project not found" };
  }
}

async function ProjectData({ params }: { params: PageProps<"/projects/[id]">["params"] }) {
  const { id } = await params;
  // Sample data is fetched per request; TanStack Query reads the clock while dehydrating.
  await connection();
  const queryClient = new QueryClient();
  try {
    await queryClient.fetchQuery(projectQueries.detail(id));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectDetailView id={id} />
    </HydrationBoundary>
  );
}

export default function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ProjectData params={params} />
    </Suspense>
  );
}
