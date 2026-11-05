import { Suspense } from "react";
import { ProjectsHero, ProjectsHeroView } from "@/features/home/home-hero";

/** Shared by `/projects`, `/projects/ready-to-move` and `/projects/new-launches`; the hero stays mounted across tabs. */
export default function ProjectsHomeLayout({ children }: LayoutProps<"/projects">) {
  return (
    <>
      <Suspense fallback={<ProjectsHeroView status="uc" />}>
        <ProjectsHero />
      </Suspense>
      {children}
    </>
  );
}
