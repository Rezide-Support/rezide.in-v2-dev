"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Images, LayoutGrid, Mountain, Video } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { ErrorState, SampleBadge } from "@/components/common/feedback";
import { HERO_IMAGES } from "@/content/media";
import { PropertyCard } from "@/features/properties/property-card";
import { Connectivity } from "@/features/properties/detail/connectivity";
import { DetailCard, NotYetButton, SectionHeading } from "@/features/properties/detail/detail-ui";
import { MediaGallery } from "@/features/properties/detail/media-gallery";
import { Rail } from "@/features/properties/detail/rail";
import { SaveActions } from "@/features/properties/detail/save-actions";
import { Transactions } from "@/features/properties/detail/transactions";
import { projectSearchHref } from "@/features/search/criteria";
import { projectQueries } from "@/lib/queries";
import { AboutDeveloper } from "./detail/about-developer";
import { ConfigurationPlans, ProjectAmenities, ProjectSummary, ReraDetails } from "./detail/project-sections";
import { ProjectWideCard } from "./detail/project-wide-card";

/** Project detail page body, laid out like the v1 project page. */
export function ProjectDetailView({ id }: { id: string }) {
  const { data, isError, refetch } = useQuery(projectQueries.detail(id));
  if (isError && !data) return <ErrorState className="m-8" message="This project couldn't be loaded." onRetry={() => refetch()} />;
  if (!data) return null;
  const { project: p, listings, similar = [], nearby = [], developer } = data;
  const path = `/projects/${p.id}`;

  return (
    <div className="px-4 pt-5 pb-20 md:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-[13px] text-rez-graphite">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={projectSearchHref({ city: p.city })} className="font-semibold hover:text-black">
                Projects in {p.city}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-black">
              {p.name}
            </li>
          </ol>
        </nav>

        {/* ---------- Title + gallery + highlights ---------- */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1fr)_330px]">
          <header className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl leading-tight font-semibold tracking-[-0.01em] sm:text-[28px]">{p.name}</h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-rez-graphite sm:text-base">
              {p.locality}, {p.city}
              <SampleBadge>Sample project</SampleBadge>
            </p>
          </header>
          <SaveActions kind="project" id={p.id} title={p.name} path={path} className="-ml-3 lg:ml-0 lg:justify-end lg:self-end" />

          <MediaGallery
            title={p.name}
            tabs={[
              { value: "photos", label: "Photos", icon: Images, images: p.images, empty: "Photos haven't been added yet." },
              { value: "video", label: "Video", icon: Video, images: [], empty: "There's no project video yet." },
              { value: "amenities", label: "Amenities", icon: Building2, images: p.amenityImages ?? [], empty: "No amenity photos yet." },
              { value: "plans", label: "Project Plans", icon: LayoutGrid, images: p.planImages ?? [], empty: "The developer hasn't shared master or site plans yet." },
              { value: "views", label: "Views", icon: Mountain, images: p.viewImages ?? [], empty: "No view photos yet." },
            ]}
          />

          <DetailCard className="flex flex-col gap-4 bg-white lg:bg-rez-cream-warm">
            <div className="flex flex-col gap-1.5 border-b border-rez-smoke pb-4">
              <h2 className="text-xl leading-tight font-semibold tracking-[-0.01em] uppercase sm:text-2xl">Project highlights</h2>
              <p className="text-[13px] text-rez-arsenic">{p.address ?? `${p.locality}, ${p.city}`}</p>
              <a href="#connectivity" className="self-start text-[15px] font-semibold text-[#2a5bd7] hover:underline">
                View on Map
              </a>
            </div>
            <ul className="flex flex-col gap-2.5">
              {(p.highlights ?? [p.configurations, p.possessionLabel]).map((h) => (
                <li key={h} className="flex items-start gap-3 text-sm leading-snug text-rez-arsenic sm:text-[15px]">
                  <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-rez-arsenic" />
                  {h}
                </li>
              ))}
            </ul>
            <div className="mt-auto border-t border-rez-smoke pt-4">
              <NotYetButton variant="outline" className="w-full rounded-md" message="Brochures aren't available in this prototype yet.">
                <Icon name="file-download" size={16} /> Brochure
              </NotYetButton>
            </div>
          </DetailCard>
        </div>

        <div className="mt-8 flex flex-col gap-14 sm:mt-12 sm:gap-20">
          <ProjectSummary project={p} />
          <ConfigurationPlans project={p} />
          <ProjectAmenities project={p} />

          <section id="connectivity" aria-labelledby="conn-heading" className="flex scroll-mt-24 flex-col gap-6 sm:gap-10">
            <SectionHeading id="conn-heading">Connectivity &amp; landmarks</SectionHeading>
            <Connectivity
              name={p.name}
              locality={p.locality}
              coords={p.coords}
              groups={p.landmarks}
              photo={HERO_IMAGES[p.status].src}
              exploreHref={projectSearchHref({ city: p.city, localities: [p.locality] })}
            />
          </section>

          <div className="flex flex-col gap-10">
            <ReraDetails project={p} />
            <Transactions title={p.name} path={path} toggle />
          </div>

          <AboutDeveloper project={p} stats={developer} />

          {listings.length > 0 && (
            <section aria-labelledby="units-heading" className="flex flex-col gap-6">
              <SectionHeading id="units-heading">Available units in {p.name}</SectionHeading>
              <Rail label={`Listings in ${p.name}`} itemClassName="sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]">
                {listings.map((l) => (
                  <PropertyCard key={l.id} property={l} />
                ))}
              </Rail>
            </section>
          )}

          {similar.length > 0 && (
            <section aria-labelledby="similar-heading" className="flex flex-col gap-6">
              <SectionHeading id="similar-heading">Similar projects</SectionHeading>
              <Rail label="Similar projects">
                {similar.map((s) => (
                  <ProjectWideCard key={s.id} project={s} />
                ))}
              </Rail>
            </section>
          )}

          {nearby.length > 0 && (
            <section aria-labelledby="nearby-heading" className="flex flex-col gap-6">
              <SectionHeading id="nearby-heading">Nearby projects</SectionHeading>
              <Rail label="Nearby projects">
                {nearby.map((s) => (
                  <ProjectWideCard key={s.id} project={s} />
                ))}
              </Rail>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
