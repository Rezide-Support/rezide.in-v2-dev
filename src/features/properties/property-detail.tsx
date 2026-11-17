"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Images, LayoutGrid } from "lucide-react";
import { ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { propertySearchHref } from "@/features/search/criteria";
import { categoryById } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/format";
import { propertyQueries } from "@/lib/queries";
import { AgentCard } from "./detail/agent-card";
import { BrochureButton } from "./detail/brochure-button";
import { CardTitle, Chip, DashList, DetailCard, SectionHeading, UnderlinedField } from "./detail/detail-ui";
import { formatRupees } from "./detail/format";
import { LeadDialog } from "./detail/lead-dialog";
import { MediaGallery } from "./detail/media-gallery";
import { ProjectMiniCard } from "./detail/project-mini-card";
import { PropertyInfoTabs } from "./detail/property-info-tabs";
import { Rail } from "./detail/rail";
import { RecordView } from "./detail/record-view";
import { SaveActions } from "./detail/save-actions";
import { Transactions } from "./detail/transactions";
import { PropertyCard, priceLabel } from "./property-card";

/** Property detail page body, laid out like the v1 listing page. */
export function PropertyDetailView({ id }: { id: string }) {
  const { data, isError, refetch } = useQuery(propertyQueries.detail(id));
  if (isError && !data) return <ErrorState className="m-8" message="This listing couldn't be loaded." onRetry={() => refetch()} />;
  if (!data) return null;

  const { property: p, realtor, similar, project, projectStock } = data;
  const cat = categoryById(p.category);
  const rent = p.intent === "rent";
  const path = `/properties/${p.id}`;
  const recipient = realtor?.name ?? "the realtor";
  const enquiryTarget = { propertyId: p.id, realtorId: realtor?.id };
  const leadListing = { id: p.id, firmId: p.realtorFirmId ?? "", brokerId: p.realtorId, name: p.title, path };

  return (
    <div className="px-4 pt-5 pb-20 md:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-[13px] text-rez-graphite">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={propertySearchHref({ city: p.city, intent: p.intent, category: p.category })} className="font-semibold hover:text-black">
                {cat.noun} {rent ? `for ${cat.lease.toLowerCase()}` : "for sale"} in {p.city}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={propertySearchHref({ city: p.city, intent: p.intent, category: p.category, localities: [p.locality] })} className="hover:text-black">
                {p.locality}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-black">
              {p.title}
            </li>
          </ol>
        </nav>

        {/* ---------- Title row ---------- */}
        <header className="grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-2xl leading-tight font-semibold tracking-[-0.01em] sm:text-[28px]">{p.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-[15px] text-rez-graphite sm:text-base">
                {p.projectName && p.projectId ? (
                  <Link href={`/projects/${p.projectId}`} className="hover:text-black hover:underline">
                    {p.locality}, {p.city}
                  </Link>
                ) : (
                  <>
                    {p.locality}, {p.city}
                  </>
                )}
              </p>
              <Chip>{rent ? "Rental" : "Sale"}</Chip>
              <Chip tone="mint">{p.availability?.trim() || "Available"}</Chip>
            </div>
          </div>
          <div className="order-last lg:order-none">
            <SaveActions kind="property" id={p.id} title={p.title} path={path} intent={p.intent} className="-ml-3 lg:ml-0" />
            <RecordView listingId={p.id} intent={p.intent} />
          </div>
          <div className="flex flex-col gap-1 lg:items-end lg:self-start lg:text-right">
            <p className="text-2xl leading-none font-bold tracking-[-0.01em] sm:text-[26px]">{priceLabel(p)}</p>
            <p className="text-[13px] text-rez-graphite">
              {rent
                ? p.securityDeposit
                  ? `${formatPrice(p.securityDeposit)} security deposit`
                  : "Security deposit on request"
                : p.priceHidden || !p.areaSqft
                  ? ""
                  : `${formatRupees(p.price / p.areaSqft)} per sq ft`}
            </p>
          </div>
        </header>

        {/* ---------- Gallery + info tabs (left) | cards (right) ---------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
          {/* LEFT column */}
          <div className="flex min-w-0 flex-col gap-4">
            <MediaGallery
              title={p.title}
              caption={p.unitType === "Studio" ? "Studio" : p.bhk ? `${p.bhk} BHK` : p.unitType}
              tabs={[
                { value: "photos", label: "Photos", icon: Images, images: p.images, empty: "Photos haven't been added yet." },
                {
                  value: "complex",
                  label: "Complex",
                  icon: Building2,
                  images: p.category === "land" ? [] : (p.complexImages ?? []),
                  empty: "There are no building or complex photos for this listing.",
                },
                ...(p.planImages?.length ? [{ value: "plans", label: "Plans", icon: LayoutGrid, images: p.planImages, empty: "Floor plans haven't been uploaded for this listing." }] : []),
              ]}
            />
            <PropertyInfoTabs property={p} project={project} />
          </div>

          {/* RIGHT column */}
          <aside className="flex flex-col gap-4" aria-label="Key features, visit details, project and realtor">
            <DetailCard className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 border-b border-rez-smoke pb-4">
                <CardTitle>Key features</CardTitle>
                <BrochureButton url={p.brochureUrl} path={path} variant="outline" size="sm" className="rounded-md" />
              </div>
              <DashList items={p.keyFeatures?.length ? p.keyFeatures : p.amenities} />
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

            <DetailCard className="flex flex-col gap-4">
              <CardTitle>Visit details</CardTitle>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
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
                >
                  <Button variant="outline" className="rounded-lg px-2 text-[13px]">
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
                >
                  <Button variant="outline" className="rounded-lg px-2 text-[13px]">
                    Request visit
                  </Button>
                </LeadDialog>
              </div>
            </DetailCard>

            {project && <ProjectMiniCard project={project} stock={projectStock} />}
            <AgentCard
              realtor={realtor}
              propertyId={p.id}
              listing={leadListing}
              defaultIntent={p.priceHidden ? "Request the price for this property" : undefined}
            />
          </aside>
        </div>

        <div className="mt-6">
          <Transactions title={p.projectName ?? p.locality} path={path} projectId={p.projectId} initial={rent ? "rent" : "sale"} centered />
        </div>

        {similar.length > 0 && (
          <section aria-labelledby="similar-heading" className="mt-6 flex flex-col gap-5">
            <SectionHeading id="similar-heading">Similar properties</SectionHeading>
            <Rail label={`Similar ${cat.noun.toLowerCase()} in ${p.city}`} itemClassName="sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]">
              {similar.map((s) => (
                <PropertyCard key={s.id} property={s} />
              ))}
            </Rail>
          </section>
        )}
      </div>
    </div>
  );
}