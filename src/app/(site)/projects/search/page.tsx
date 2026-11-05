import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectSearch } from "@/features/projects/project-search";

export const metadata: Metadata = {
  title: "Search projects",
  description: "Filter residential projects by status, budget, location, views and possession year.",
};

export default function ProjectSearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[60vh] w-full max-w-[1280px] animate-pulse px-4 pt-40" aria-busy="true" />}>
      <ProjectSearch />
    </Suspense>
  );
}
