"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Images, Info, LayoutGrid, MapPin, Mountain, Share, Share2, Video } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PROJECT_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/models";
import { ErrorState } from "@/components/common/feedback";
import { HERO_IMAGES } from "@/content/media";
import { PropertyCard } from "@/features/properties/property-card";
import { Connectivity } from "@/features/properties/detail/connectivity";
import { BrochureButton, projectBrochureFileName } from "@/features/properties/detail/brochure-button";
import { DetailCard, SectionHeading } from "@/features/properties/detail/detail-ui";
import { MediaGallery } from "@/features/properties/detail/media-gallery";
import { Rail } from "@/features/properties/detail/rail";
import { RecordView } from "@/features/properties/detail/record-view";
import { SaveActions, SaveIconButton } from "@/features/properties/detail/save-actions";
import { ProjectTransactions } from "./detail/project-transactions";
import { projectSearchHref } from "@/features/search/criteria";
import { projectQueries } from "@/lib/queries";
import { AboutDeveloper } from "./detail/about-developer";
import { ConfigurationPlans, ProjectAmenities, ProjectSummary, ReraDetails } from "./detail/project-sections";
import { ProjectWideCard } from "./detail/project-wide-card";
import { ProjectCompare } from "@/features/compare/project-compare";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./project-media";
import { ShareProjectButton } from "./share-project";
import { useSession } from "@/stores/session";

/** rezide.in's small square icon buttons beside the name on phones. */
const SQUARE = "size-8 rounded-[8px] border border-gray-200 bg-white p-2 text-[#242424] hover:bg-gray-50 [&_svg]:size-4";

/**
 * Phones only, as rezide.in's project page: grey status chips (status, possession, RERA on tap),
 * then the address with a Google Maps link.
 */
function PhoneFacts({ project: p }: { project: Project }) {
  const reraIds = p.reraIds ?? (p.reraId && !/^na$/i.test(p.reraId) ? [p.reraId] : []);
  const chip = "rounded-sm bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600";
  const [lat, lng] = p.coords;
  return (
    <div className="flex flex-col gap-4 md:hidden">
      <ul className="flex flex-wrap gap-2">
        <li className={chip}>{PROJECT_STATUS_LABEL[p.status]}</li>
        {/^(Possession|Completed) /.test(p.possessionLabel) && <li className={chip}>{p.possessionLabel}</li>}
        {reraIds.length > 0 && (
          <li>
            <Popover>
              <PopoverTrigger className={cn(chip, "flex items-center gap-2")}>
                RERA <Info className="size-3 text-black" aria-hidden />
                <span className="sr-only">ids of {p.name}</span>
              </PopoverTrigger>
              <PopoverContent className="w-auto max-w-[80vw] bg-black text-white ring-0">{reraIds.join(", ")}</PopoverContent>
            </Popover>
          </li>
        )}
      </ul>
      {p.address && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-black uppercase">Address</p>
          <p className="text-xs">{p.address}</p>
          <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="self-start text-xs text-[#0077B6] hover:underline">
            <MapPin className="mr-1 inline-block size-4" aria-hidden />
            On Google Maps
          </a>
        </div>
      )}
    </div>
  );
}

/** Project detail page body, laid out like the v1 project page. */
export function ProjectDetailView({ id }: { id: string }) {
  const { data, isError, refetch } = useQuery(projectQueries.detail(id));
  const { session } = useSession();
  if (isError && !data) return <ErrorState className="m-8" message="This project couldn't be loaded." onRetry={() => refetch()} />;
  if (!data) return null;
  const { project: p, listings, similar = [], nearby = [], developer } = data;
  const path = `/projects/${p.id}`;

  return (
    <div className="px-4 pt-5 pb-20 md:px-8">
      {session && <RecordView listingId={p.id} intent="project" />}
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
        {/* ---------- Title + gallery + highlights ---------- */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1fr)_330px]">
          <header className="flex min-w-0 flex-col gap-1 max-md:mt-3 max-md:gap-4">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl leading-tight font-semibold tracking-[-0.01em] max-md:text-lg sm:text-[28px]">{p.name}</h1>
              {/* Phones: rezide.in's Share · Compare · Shortlist as small square icon buttons beside the name. */}
              <div className="flex shrink-0 gap-2 md:hidden">
                <ShareProjectButton project={p}>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Share ${p.name}`} className={SQUARE}>
                    <Share className="size-4" aria-hidden />
                  </Button>
                </ShareProjectButton>
                <SaveIconButton list="compare" kind="project" id={p.id} title={p.name} className={cn(SQUARE, "aria-pressed:text-green-500 aria-pressed:[&_svg]:fill-green-500")} />
                <SaveIconButton list="shortlist" kind="project" id={p.id} title={p.name} className={cn(SQUARE, "aria-pressed:text-red-500")} />
              </div>
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-rez-graphite max-md:gap-x-1.5 max-md:text-sm max-md:font-medium max-md:text-[#6D6D6D] sm:text-base">
              {p.developer && (
                <span className="md:hidden">
                  <Link href={projectSearchHref({ city: p.city, q: p.developer })} className="text-blue-500 hover:underline">
                    {p.developer}
                  </Link>{" "}
                  •
                </span>
              )}
              {p.locality}, {p.city}
            </p>
            <PhoneFacts project={p} />
          </header>
          <SaveActions
            kind="project"
            id={p.id}
            title={p.name}
            path={path}
            className="-ml-3 max-md:hidden lg:ml-0 lg:justify-end lg:self-end"
            share={
              // rezide.in's "Share this project" popup, as on the project cards.
              <ShareProjectButton project={p}>
                <Button variant="secondary" className="h-10 border-transparent px-2.5 font-medium hover:bg-black/[0.06]">
                  <Share2 className="size-[18px]" aria-hidden />
                  Share
                </Button>
              </ShareProjectButton>
            }
          />

          <MediaGallery
            title={p.name}
            // As rezide.in: every tab shows (an empty one says so); each photo's label runs along its bottom.
            showEmptyTabs
            className="max-md:order-first"
            tabs={[
              { value: "photos", label: "Photos", icon: Images, images: p.images, captions: p.imageCaptions, empty: "Photos haven't been added yet." },
              {
                value: "video",
                label: "Video",
                icon: Video,
                images: [],
                empty: "There's no project video yet.",
                // As on rezide.in: the project's YouTube video (or CDN file) plays here.
                // Without one, rezide.in's dark "No video available" box.
                content: p.videoUrl ? (
                  <VideoPlayer url={p.videoUrl} title={p.name} className="rounded-lg" />
                ) : (
                  <div className="flex h-[280px] items-center justify-center bg-zinc-900 md:h-[580px]">
                    <p className="text-base text-white">No video available</p>
                  </div>
                ),
              },
              { value: "amenities", label: "Amenities", icon: Building2, images: p.amenityImages ?? [], empty: "No amenity photos yet." },
              { value: "plans", label: "Project Plans", phoneLabel: "Plans", icon: LayoutGrid, images: p.planImages ?? [], empty: "The developer hasn't shared master or site plans yet." },
              {
                value: "views",
                label: "Views",
                icon: Mountain,
                images: p.viewImages ?? [],
                empty: "The developer hasn't shared the views yet.",
                // As on rezide.in: the apartments' views as cards, four to a row.
                content: p.views.length ? (
                  <ul className="mt-4 grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-4" aria-label={`Views from ${p.name}`}>
                    {p.views.map((v) => (
                      <li key={v} className="flex min-h-[100px] items-center justify-center rounded-xl border border-rez-smoke bg-white p-5 text-center text-sm shadow-sm lg:text-lg">
                        <span className="first-letter:uppercase">{v}</span>
                      </li>
                    ))}
                  </ul>
                ) : undefined,
              },
            ]}
          />

          <DetailCard className="flex flex-col gap-4 bg-white lg:bg-rez-cream-warm">
            <div className="flex flex-col gap-1.5 border-b border-rez-smoke pb-4 max-md:border-b-0 max-md:pb-0">
              <h2 className="text-xl leading-tight font-semibold tracking-[-0.01em] uppercase sm:text-2xl">Project highlights</h2>
              {/* Phones show the address in the header instead (PhoneFacts), as rezide.in does. */}
              <p className="text-[13px] text-rez-arsenic max-md:hidden">{p.address ?? `${p.locality}, ${p.city}`}</p>
              {/* As rezide.in: Google Maps at the project's coordinates, in a new tab. */}
              <a
                href={`https://www.google.com/maps?q=${p.coords[0]},${p.coords[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start text-[15px] font-semibold text-[#2a5bd7] hover:underline max-md:hidden"
              >
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
              <BrochureButton variant="outline" className="w-full rounded-md" url={p.brochureUrl} fileName={projectBrochureFileName(p.name)} path={path} />
            </div>
          </DetailCard>
        </div>

        <div className="mt-8 flex flex-col gap-14 sm:mt-12 sm:gap-20">
          <ProjectSummary project={p} />
          <ConfigurationPlans project={p} />
          <ProjectAmenities project={p} />

          <section id="connectivity" aria-labelledby="conn-heading" className="flex scroll-mt-24 flex-col gap-6 sm:gap-10">
            <SectionHeading id="conn-heading">
              <span className="lg:hidden">Landmarks</span>
              <span className="hidden lg:inline">Connectivity &amp; landmarks</span>
            </SectionHeading>
            <Connectivity
              name={p.name}
              locality={p.locality}
              coords={p.coords}
              groups={p.landmarks}
              photo={p.localityPhoto ?? HERO_IMAGES[p.status].src}
              live
              // As rezide.in: the photo opens the locality's own page (in a new tab).
              exploreHref={p.localityId ? `/locality/${p.localityId}` : projectSearchHref({ city: p.city, localities: [p.locality] })}
              exploreNewTab={!!p.localityId}
            />
          </section>

          <div className="flex flex-col gap-10">
            <ReraDetails project={p} />
            <ProjectTransactions projectId={p.id} name={p.name} path={path} />
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

          {/* As on rezide.in: signed-in visitors compare projects here. */}
          {session && (
            <section aria-labelledby="compare-heading" className="flex flex-col gap-6">
              <SectionHeading id="compare-heading">Compare project</SectionHeading>
              <ProjectCompare pinned={{ id: p.id, title: p.name }} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
