"use client";

import Image from "next/image";
import { Building2, MapPin, User } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectCard } from "@/features/projects/project-card";
import { cn } from "@/lib/utils";
import type { DeveloperPage } from "@/services/developers";
import type { DeveloperProjects } from "@/services/projects";
import type { Project } from "@/types/models";

/*
 * rezide.in's developer page (/developers/{id}), opened from a project's "Builder Details":
 * logo, name and city; Experience; the four project counts; About; Address (its popup),
 * Established In and Operating In; then "Projects By {developer}" in four tabs.
 */

/** rezide.in's stat box: a white box in a thick light-grey frame. */
const BOX = "rounded-xl border-[8px] border-gray-100 bg-white p-4";

function Stat({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={cn(BOX, className)}>
      <h3 className="text-sm font-medium text-gray-400 md:text-base">{label}</h3>
      <p className="text-base font-semibold text-black">{value}</p>
    </div>
  );
}

function NoProjects() {
  return (
    <div className="mt-5 flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 py-12 shadow">
      <Building2 className="size-12 text-gray-300" aria-hidden />
      <p className="text-center font-semibold text-[#242424]">No projects found</p>
    </div>
  );
}

function ProjectList({ projects }: { projects: Project[] }) {
  if (!projects.length) return <NoProjects />;
  return (
    <ul className="my-5 grid gap-4">
      {projects.map((p, i) => (
        <li key={p.id}>
          <ProjectCard project={p} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}

export function DeveloperView({ developer: d, experience, projects }: { developer: DeveloperPage; experience?: string; projects: DeveloperProjects }) {
  const [addressOpen, setAddressOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const tabs = [
    { value: "all-projects", label: "All Projects", count: projects.total, items: projects.all },
    { value: "ready-to-move", label: "Ready To Move", count: projects.rtm.length, items: projects.rtm },
    { value: "under-construction", label: "Under Construction", count: projects.uc.length, items: projects.uc },
    { value: "newly-launched", label: "Newly Launched", count: projects.nl.length, items: projects.nl },
  ];
  const title = `Projects By ${d.name.toUpperCase()}`;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-2 md:px-8">
      <section className="flex flex-col p-4 md:p-6 lg:p-10">
        {/* Top bar: logo, name and city; Experience. */}
        <div className="flex flex-col gap-4 md:flex-row md:justify-between">
          <div className="flex flex-row items-center gap-4">
            <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 md:size-24">
              {d.logo && !logoFailed ? (
                <Image src={d.logo} alt={`${d.name} logo`} fill sizes="96px" priority className="object-contain p-2" onError={() => setLogoFailed(true)} />
              ) : (
                <User className="size-12 text-gray-200" aria-hidden />
              )}
            </div>
            <div>
              <h1 className="text-lg font-medium md:text-2xl">{d.name}</h1>
              {d.place && (
                <p className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="size-4" aria-hidden />
                  {d.place}
                </p>
              )}
            </div>
          </div>
          <div className={cn(BOX, "w-full md:w-1/2")}>
            <h2 className="text-base font-medium text-gray-400">Experience</h2>
            <p className="text-base font-semibold text-black">{experience ?? "N/A"}</p>
          </div>
        </div>

        {/* Project counts. */}
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="All Projects" value={projects.total} />
          <Stat label="Ready to Move" value={projects.rtm.length} />
          <Stat label="Under Const." value={projects.uc.length} />
          <Stat label="Newly Launched" value={projects.nl.length} />
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-xl font-semibold md:text-2xl">About</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line md:text-base">{d.description}</p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <h2 className="mb-2 text-xl font-semibold md:text-2xl">Address</h2>
            {d.addresses.length ? (
              <button type="button" onClick={() => setAddressOpen(true)} className="flex flex-wrap gap-x-1 text-left text-blue-600 hover:underline" aria-haspopup="dialog">
                {d.addresses.map((a, i) => (
                  <span key={`${a.type}-${i}`}>
                    {a.type}
                    {i === d.addresses.length - 1 ? "" : ","}
                  </span>
                ))}
              </button>
            ) : (
              <p className="text-base">N/A</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="mb-2 text-xl font-semibold md:text-2xl">Established In</h2>
            <p className="text-base md:text-lg">{d.established ?? "N/A"}</p>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="mb-2 text-xl font-semibold md:text-2xl">Operating In</h2>
            <p className="text-base md:text-lg">{d.cities.length ? d.cities.join(", ") : "N/A"}</p>
          </div>
        </div>
      </section>

      {/* rezide.in's Address popup: one card per office. */}
      <Dialog open={addressOpen} onOpenChange={setAddressOpen}>
        <DialogContent className="max-w-[min(700px,calc(100%-2rem))] sm:max-w-[700px] md:rounded-2xl lg:rounded-3xl">
          <DialogTitle>Address</DialogTitle>
          <DialogDescription className="sr-only">{d.name}&apos;s offices.</DialogDescription>
          <div className="flex flex-wrap items-stretch gap-3">
            {d.addresses.map((a, i) => (
              <div key={`${a.type}-${i}`} className="min-w-[200px] flex-1 rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="mb-4 font-semibold capitalize">{a.type}</h3>
                <address className="text-sm text-gray-500 not-italic">
                  {a.line1 && <>{a.line1},<br /></>}
                  {a.line2 && <>{a.line2},<br /></>}
                  {[a.city, a.pincode].filter(Boolean).join(" - ")}
                </address>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <section aria-labelledby="developer-projects" className="flex flex-col items-center pt-10 pb-16">
        <Tabs defaultValue="all-projects" className="w-full items-center">
          <h2 id="developer-projects" className="pb-5 text-center text-base font-semibold uppercase lg:text-xl">
            {title}
          </h2>
          <div className="w-full max-w-4xl overflow-x-auto scrollbar-none">
            <TabsList className="grid h-10 w-full min-w-[600px] grid-cols-4 gap-1 rounded-full border border-gray-200 bg-transparent px-1 lg:min-w-0">
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="h-8 rounded-full border-0 text-sm font-normal text-gray-500 after:hidden hover:bg-[#eee] hover:text-black hover:shadow-md data-active:bg-black data-active:text-white data-active:shadow-md data-active:hover:bg-black data-active:hover:text-white"
                >
                  <span className="flex items-center gap-x-2">
                    {t.label}
                    {t.count ? <span className="flex items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-semibold text-black">{t.count}</span> : null}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {tabs.map((t) => (
            <TabsContent key={t.value} value={t.value} className="w-full">
              <ProjectList projects={t.items} />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  );
}
