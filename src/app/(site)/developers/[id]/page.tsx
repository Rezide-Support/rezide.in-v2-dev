import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { DeveloperView } from "@/features/developers/developer-view";
import { ApiError } from "@/lib/api/client";
import { developerExperience, fetchDeveloper } from "@/services/developers";
import { getDeveloperProjects } from "@/services/projects";

/** One request per page view, shared by the metadata and the page. A missing developer is null. */
const loadDeveloper = cache(async (id: string) => {
  try {
    return await fetchDeveloper(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: PageProps<"/developers/[id]">): Promise<Metadata> {
  const { id } = await params;
  await connection();
  const d = await loadDeveloper(id).catch(() => null);
  if (!d) return { title: "Developer not found" };
  return { title: d.name, description: d.description.slice(0, 160) || `Projects by ${d.name}.` };
}

async function DeveloperData({ params }: { params: PageProps<"/developers/[id]">["params"] }) {
  const { id } = await params;
  await connection();
  const developer = await loadDeveloper(id);
  if (!developer) notFound();
  // A failed project search still shows the developer, with no projects.
  const projects = await getDeveloperProjects(developer.name, developer.cities[0]).catch(() => ({ total: 0, all: [], rtm: [], uc: [], nl: [] }));
  return <DeveloperView developer={developer} experience={developerExperience(developer.established)} projects={projects} />;
}

/** rezide.in's developer page, opened from a project's "Builder Details". */
export default function DeveloperPage({ params }: PageProps<"/developers/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DeveloperData params={params} />
    </Suspense>
  );
}
