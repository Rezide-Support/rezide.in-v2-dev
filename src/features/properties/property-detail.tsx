"use client";
import { propertyHref } from "@/lib/property-url";


import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Images, LayoutGrid, Video, View } from "lucide-react";
import { ErrorState } from "@/components/common/feedback";
import { formatDate, formatPrice } from "@/lib/format";
import { projectPath } from "@/lib/project-url";
import { propertyQueries } from "@/lib/queries";
import { useSession } from "@/stores/session";
import { AgentCard } from "./detail/agent-card";
import { CardTitle, Chip, DashList, DetailCard, SectionHeading, UnderlinedField } from "./detail/detail-ui";
import { formatRupees } from "./detail/format";
import { MediaGallery } from "./detail/media-gallery";
import { ProjectMiniCard } from "./detail/project-mini-card";
import { PropertyInfoTabs } from "./detail/property-info-tabs";
import { RecordView, ViewedEye } from "./detail/record-view";
import { SaveActions, SaveIconButton } from "./detail/save-actions";
import { MobileListingNav } from "./detail/mobile-listing-nav";
import { MobileListingOverview } from "./detail/mobile-listing-overview";
import { Transactions } from "./detail/transactions";
import { Rail } from "./detail/rail";
import { PropertyCard, priceLabel } from "./property-card";
import { ResumeListingAction } from "./detail/resume-listing-action";
import { ListingComparison } from "./detail/listing-comparison";
import { ShareButton } from "./share-button";
import { Button } from "@/components/ui/button";
import { BrochureButton } from "./detail/brochure-button";
import { LeadDialog } from "./detail/lead-dialog";

/** Property detail page body, laid out like the v1 listing page. */
export function PropertyDetailView({ id }: { id: string }) {
  const { status } = useSession();
  const { data, isError, refetch } = useQuery(propertyQueries.detail(id));
  if (isError && !data) return <ErrorState className="m-8" message="This listing couldn't be loaded." onRetry={() => refetch()} />;
  if (!data) return null;

  const { property: p, realtor, similar, project, projectStock, configurations } = data;
  const rent = p.intent === "rent";
  const headerLocation = [...new Set([p.localityName, p.locality].filter(Boolean))].join(", ") || p.city;
  const headerPrice = !rent && !p.priceHidden && p.price >= 10_000_000 ? `\u20B9 ${(p.price / 10_000_000).toFixed(2)} Cr.` : priceLabel(p);
  const path = propertyHref(p);
  const leadListing = { id: p.id, firmId: p.realtorFirmId ?? "", brokerId: p.realtorId, name: p.title, path };

  return (
    <div data-listing-detail className="property-page min-w-0 px-2 pt-3 pb-[calc(140px+env(safe-area-inset-bottom))] sm:px-4 md:px-8 lg:pt-5 lg:pb-20">
      <ResumeListingAction property={p} />

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
        {/* ---------- Title row ---------- */}
        <header className="hidden gap-x-6 gap-y-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(170px,0.5fr)] lg:items-center">
          <div className="contents">
            <h1 className="col-span-2 col-start-1 row-start-1 min-w-0 text-[max(12px,calc(26px*var(--property-type-scale,1)))] leading-tight font-semibold tracking-[-0.01em]">{p.title}<ViewedEye listingId={p.id} className="ml-2.5 size-5 text-black" /></h1>
            <div className="col-start-1 row-start-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-[max(12px,calc(15px*var(--property-type-scale,1)))] text-rez-graphite sm:text-base">
                {!p.projectHidden && p.projectName && p.projectId ? (
                  <Link
                    href={project?.id === p.projectId ? projectPath(project) : projectPath({ id: p.projectId })}
                    className="hover:text-black hover:underline"
                  >
                    {headerLocation}
                  </Link>
                ) : (
                  <>
                    {headerLocation}
                  </>
                )}
              </p>

              <Chip className="h-7 rounded-[4px] bg-[#5c8d87] px-2 text-xs font-medium">{rent ? "Rental" : "Sale"}</Chip>
              <Chip tone="mint" className="h-7 rounded-[4px] bg-[#effff4] px-2 text-xs font-medium text-[#717171]">{p.availability?.trim() || "Available"}</Chip>
            </div>
          </div>

          <div className="col-start-2 row-start-2">
            <SaveActions
              share={<ShareButton property={p} title={p.title} path={path} className="h-10 border-transparent px-2.5 font-medium" />}
              kind="property"
              id={p.id}
              title={p.title}
              path={path}
              intent={p.intent}
              className="gap-2 [&_button]:text-sm [&_button]:font-normal [&_svg]:size-[17px] [&_button:not([aria-pressed=true])_svg]:text-[#7b7b85]"
            />

            <RecordView listingId={p.id} intent={p.intent} />
          </div>

          <div className="col-start-3 row-span-2 row-start-1 flex flex-col items-end gap-2 text-right">
            <p className="text-[max(12px,calc(22px*var(--property-type-scale,1)))] leading-none font-semibold tracking-[-0.01em]">{headerPrice}</p>
            <p className="text-[13px] text-rez-graphite">
              {rent
                ? p.securityDeposit
                  ? `${formatPrice(p.securityDeposit)} security deposit`
                  : "Security deposit on request"
                : p.priceHidden || !p.areaSqft
                  ? ""
                  : `${formatRupees(p.ratePerSqft ?? p.price / p.areaSqft)}/- per sqft`}
            </p>
          </div>
        </header>

        {/* Desktop columns stack independently; mobile sections retain their existing order. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(264px,1fr)] lg:items-start">
          <div className="max-lg:contents lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
          <div className="max-lg:order-0">
          <MediaGallery
            keepEmptyPhotos
            title={p.title}
            overlay={<SaveIconButton list="shortlist" kind="property" id={p.id} title={p.title} intent={p.intent} className="size-6 rounded-none border-0 bg-transparent! p-0 text-white shadow-none hover:bg-transparent! aria-[pressed=false]:text-white! aria-[pressed=false]:hover:text-white! [&_svg]:size-[18px]" />}
            tabs={[
              {
                value: "photos",
                label: "Photos",
                icon: Images,
                images: p.photoSource === "placeholder" ? [] : p.images,
                slides: p.galleryPhotos?.length ? p.galleryPhotos : undefined,
                empty: "Photos haven't been added yet.",
              },
              {
                value: "complex",
                label: "Complex",
                icon: Building2,
                images: p.category === "land" ? [] : (p.complexImages ?? []),
                slides: p.category === "land" ? [] : p.complexPhotos,
                empty: "There are no building or complex photos for this listing.",
              },
              { value: "video", label: "Video", icon: Video, images: [], videoUrl: p.videoUrl, empty: "There's no walkthrough video for this listing yet." },
              { value: "vr", label: "VR Tour", icon: View, images: [], tourUrl: p.vrTourUrl, empty: "" },
              { value: "plans", label: "Plans", icon: LayoutGrid, images: p.planImages ?? [], slides: p.planPhotos, empty: "Floor plans haven't been uploaded for this listing." },
            ]}
          />
          <MobileListingOverview property={p} withoutPhotoDivider={!p.galleryPhotos?.length && (p.photoSource === "placeholder" || !p.images.length)} />
          </div>
          <div className="min-w-0 max-lg:order-5"><PropertyInfoTabs property={p} project={project} configurations={configurations} /></div>
          </div>

          {/* Independent sidebar stack. */}
          <aside className="max-lg:contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4" aria-label="Enquiry, key features, visit details and project">
            <div id="brokers" className="scroll-mt-32 max-lg:order-3">
            <AgentCard
              realtor={realtor}
              propertyId={p.id}
              listing={leadListing}
              defaultIntent={
                p.priceHidden
                  ? "Request the price for this property"
                  : undefined
              }
            />
            </div>
            <section id="key" className="scroll-mt-32 max-lg:order-1">
            <h2 className="mb-4 px-2 text-sm font-semibold uppercase lg:hidden">Key features</h2>
            <DetailCard className="flex flex-col gap-4 lg:rounded-[12px] lg:border-[#c4c4c4] lg:bg-[#fafafa] lg:p-4 lg:shadow-sm">
              <div className="flex items-center justify-between gap-3 lg:border-b lg:border-rez-smoke lg:pb-3">
                <CardTitle className="max-lg:hidden">Key features</CardTitle>
                <div className="max-lg:hidden"><BrochureButton url={p.brochureUrl} listingId={p.id} path={path} className="h-8 rounded-md border border-rez-smoke bg-white px-3 text-[11px] text-black shadow-sm hover:bg-rez-cloud" /></div>
              </div>
              <DashList items={p.keyFeatures?.length ? p.keyFeatures : p.amenities} className="lg:min-h-[190px] lg:gap-2.5 lg:[&_li]:text-[13px] lg:[&_li]:leading-5 lg:[&_li]:text-[#444]" />
              <div className="hidden justify-between gap-3 border-t border-rez-smoke pt-3 text-[12px] lg:flex">
                <div><p className="text-rez-graphite">Listing Date</p><p className="mt-1 font-semibold">{p.listedAt ? formatDate(p.listedAt) : "On request"}</p></div>
                <div className="text-right"><p className="text-rez-graphite">Last Updated</p><p className="mt-1 font-semibold">{p.updatedAt ? formatDate(p.updatedAt) : "On request"}</p></div>
              </div>
            </DetailCard>
            </section>



            <section id="visit" className="scroll-mt-32 max-lg:order-2">
            <h2 className="mb-4 px-2 text-sm font-semibold uppercase lg:hidden">Visit details</h2>
            <DetailCard className="flex flex-col gap-4 lg:rounded-[12px] lg:border-[#c4c4c4] lg:bg-[#fafafa] lg:p-4 lg:shadow-sm">
              <CardTitle className="max-lg:hidden">Visit details</CardTitle>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:[&_dd]:border-[#bdbdbd] lg:[&_dd]:text-[13px] lg:[&_dd]:font-normal lg:[&_dt]:text-[#777]">
                <UnderlinedField label="Available from" value={p.availableFrom ? formatDate(p.availableFrom) : "Immediately"} />
                <UnderlinedField label="Visit days" value={p.visit?.days ?? "On request"} />
                <UnderlinedField label="Visit timings" value={p.visit?.timings ?? "On request"} />
                <UnderlinedField label="Showing status" value={p.visit?.showingStatus ?? "N/A"} />
              </dl>
              <div className="hidden grid-cols-2 gap-3 lg:grid">
                <LeadDialog mode="offer" title="Make an offer" description={`Send ${p.realtorFirm || "the realtor"} your offer for ${p.title}.`} target={{ propertyId: p.id, realtorId: p.realtorId }} recipient={p.realtorFirm || "the realtor"} submitLabel="Send offer" listing={leadListing}>
                  <Button variant="outline" className="h-8 w-full rounded-md border-rez-smoke bg-white px-2 text-[11px] shadow-sm">Make an offer</Button>
                </LeadDialog>
                <LeadDialog mode="visit" title="Request a visit" description={`Request a visit for ${p.title}.`} target={{ propertyId: p.id, realtorId: p.realtorId }} recipient={p.realtorFirm || "the realtor"} submitLabel="Request visit" listing={leadListing}>
                  <Button variant="outline" className="h-8 w-full rounded-md border-rez-smoke bg-white px-2 text-[11px] shadow-sm">Request Visit</Button>
                </LeadDialog>
              </div>
            </DetailCard>
            </section>
            {!p.projectHidden && project && <div className="max-lg:hidden"><ProjectMiniCard project={project} stock={projectStock} /></div>}

          </aside>
        </div>

        {!p.projectHidden && project && <div className="mt-6">
          <Transactions title={p.projectName ?? p.locality} path={path} projectId={p.projectId} initial={rent ? "rent" : "sale"} centered />
        </div>}

        {status === "authenticated" && similar.length > 0 && (
          <section id="similar" aria-labelledby="similar-heading" className="mt-6 flex scroll-mt-32 flex-col gap-5">
            <SectionHeading id="similar-heading" className="text-center lg:text-[max(12px,calc(26px*var(--property-type-scale,1)))]">
              Other {rent ? "Rental" : "Sale"} units in {p.projectName ?? project?.name ?? p.locality}
            </SectionHeading>
            <Rail label={`Other ${rent ? "rental" : "sale"} units in ${p.projectName ?? project?.name ?? p.locality}`} mobileStack itemClassName="max-lg:w-full lg:w-[calc((100%-2rem)/3)]" className="max-lg:[&_ul]:flex-col max-lg:[&_ul]:overflow-visible max-lg:[&>button]:hidden">
              {similar.map((s) => (
                <PropertyCard key={s.id} property={s} />
              ))}
            </Rail>
          </section>
        )}
        <ListingComparison property={p} />
      </div>
      <MobileListingNav />
    </div>
  );
}
