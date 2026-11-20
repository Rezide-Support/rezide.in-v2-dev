"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Images, LayoutGrid, Video, View } from "lucide-react";
import { ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { useCompareOnVisit } from "@/features/compare/use-compare-on-visit";
import { formatDate, formatPrice } from "@/lib/format";
import { propertyQueries } from "@/lib/queries";
import { useSession } from "@/stores/session";
import { AgentCard } from "./detail/agent-card";
import { BrochureButton } from "./detail/brochure-button";
import { CardTitle, Chip, DashList, DetailCard, SectionHeading, UnderlinedField } from "./detail/detail-ui";
import { formatRupees } from "./detail/format";
import { LeadDialog } from "./detail/lead-dialog";
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

/** Property detail page body, laid out like the v1 listing page. */
export function PropertyDetailView({ id }: { id: string }) {
  const { status } = useSession();
  const { data, isError, refetch } = useQuery(propertyQueries.detail(id));
  // As rezide.in: opening a listing adds it to Compare, under Sale or Rental (signed-in visitors).
  useCompareOnVisit(data ? { kind: "property", id: data.property.id, title: data.property.title, intent: data.property.intent } : undefined, "listings");
  if (isError && !data) return <ErrorState className="m-8" message="This listing couldn't be loaded." onRetry={() => refetch()} />;
  if (!data) return null;

  const { property: p, realtor, similar, project, projectStock } = data;
  const rent = p.intent === "rent";
  const headerLocation = [...new Set([p.localityName, p.locality].filter(Boolean))].join(", ") || p.city;
  const headerPrice = !rent && !p.priceHidden && p.price >= 10_000_000 ? `\u20B9 ${(p.price / 10_000_000).toFixed(2)} Cr.` : priceLabel(p);
  const path = `/properties/${p.id}`;
  const recipient = realtor?.name ?? "the realtor";
  const enquiryTarget = { propertyId: p.id, realtorId: realtor?.id };
  const leadListing = { id: p.id, firmId: p.realtorFirmId ?? "", brokerId: p.realtorId, name: p.title, path };

  return (
    <div data-listing-detail className="px-2 pt-3 pb-[calc(140px+env(safe-area-inset-bottom))] sm:px-4 lg:px-8 lg:pt-5 lg:pb-20">
      <ResumeListingAction property={p} />

      <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
        {/* ---------- Title row ---------- */}
        <header className="hidden gap-x-6 gap-y-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(170px,0.5fr)] lg:items-center">
          <div className="contents">
            <h1 className="col-span-2 col-start-1 row-start-1 min-w-0 text-[26px] leading-tight font-semibold tracking-[-0.01em]">{p.title}<ViewedEye listingId={p.id} className="ml-2.5 size-5 text-black" /></h1>
            <div className="col-start-1 row-start-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-[15px] text-rez-graphite sm:text-base">
                {!p.projectHidden && p.projectName && p.projectId ? (
                  <Link
                    href={`/projects/${p.projectId}`}
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
            <p className="text-[22px] leading-none font-semibold tracking-[-0.01em]">{headerPrice}</p>
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

        {/* Both desktop rows share the same wide gallery/content and narrow sidebar columns. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="max-lg:order-0">
          <MediaGallery
            title={p.title}
            overlay={<SaveIconButton list="shortlist" kind="property" id={p.id} title={p.title} intent={p.intent} className="size-8 rounded-full bg-white/90 p-0 text-rez-graphite" />}
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
          <MobileListingOverview property={p} />
          </div>
          </div>

          {/* First row sidebar: key features and visit details. */}
          <aside className="max-lg:contents lg:col-start-2 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-4" aria-label="Key features and visit details">
            <section id="key" className="scroll-mt-32 max-lg:order-1">
            <h2 className="mb-4 px-2 text-sm font-semibold uppercase lg:hidden">Key features</h2>
            <DetailCard className="flex flex-col gap-4 lg:rounded-[12px] lg:border-[#c4c4c4] lg:bg-[#fafafa] lg:p-4 lg:shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-rez-smoke pb-4">
                <CardTitle className="max-lg:hidden">Key features</CardTitle>
                <BrochureButton url={p.brochureUrl} listingId={p.id} path={path} variant="outline" size="sm" className="rounded-[6px] border-gray-200 bg-white font-normal shadow-sm" />
              </div>
              <DashList items={p.keyFeatures?.length ? p.keyFeatures : p.amenities} className="lg:gap-2.5 lg:[&_li]:text-[13px] lg:[&_li]:leading-5 lg:[&_li]:text-[#444]" />
              <dl className="mt-auto flex justify-between gap-4 border-t border-rez-smoke pt-4 text-sm">
                <div>
                  <dt className="text-rez-graphite">Listing date</dt>
                  <dd className="font-semibold">{p.listedAt ? formatDate(p.listedAt) : "N/A"}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-rez-graphite">Last updated</dt>
                  <dd className="font-semibold">{formatDate(p.updatedAt)}</dd>
                </div>
              </dl>
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
              <div className="grid grid-cols-2 gap-3">
                <LeadDialog
                  mode="offer"
                  title="Make an offer"
                  description={`Send ${recipient} your offer for ${p.title}. Asking price: ${priceLabel(p)}.`}
                  target={enquiryTarget}
                  recipient={recipient}
                  submitLabel="Send offer"
                  listing={leadListing}
                  mobileSheet
                >
                  <Button variant="outline" className="rounded-[6px] border-gray-200 px-2 text-xs font-normal shadow-sm lg:h-9">
                    Make an offer
                  </Button>
                </LeadDialog>
                <LeadDialog
                  mode="visit"
                  title="Request a visit"
                  description={`Visits: ${p.visit?.days ?? "on request"}${p.visit ? `, ${p.visit.timings}` : ""}. ${recipient} confirms the slot.`}
                  target={enquiryTarget}
                  recipient={recipient}
                  submitLabel="Request visit"
                  listing={leadListing}
                  mobileSheet
                >
                  <Button variant="outline" className="rounded-[6px] border-gray-200 px-2 text-xs font-normal shadow-sm lg:h-9">
                    Request visit
                  </Button>
                </LeadDialog>
              </div>
            </DetailCard>
            </section>

          </aside>

          {/* Second row: selected information tab beside the project and broker. */}
          <div className="min-w-0 max-lg:order-5 lg:col-start-1 lg:row-start-2 lg:flex lg:flex-col lg:self-stretch">
            <PropertyInfoTabs property={p} project={project} />
          </div>
          <aside className="max-lg:contents lg:col-start-2 lg:row-start-2 lg:flex lg:min-w-0 lg:flex-col lg:gap-4" aria-label="Project and listing broker">
            {!p.projectHidden && project && <div className="max-lg:hidden"><ProjectMiniCard project={project} stock={projectStock} /></div>}
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
          </aside>
        </div>

        {!p.projectHidden && project && <div className="mt-6">
          <Transactions title={p.projectName ?? p.locality} path={path} projectId={p.projectId} initial={rent ? "rent" : "sale"} centered />
        </div>}

        {status === "authenticated" && similar.length > 0 && (
          <section id="similar" aria-labelledby="similar-heading" className="mt-6 flex scroll-mt-32 flex-col gap-5">
            <SectionHeading id="similar-heading" className="text-center lg:text-[26px]">
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
