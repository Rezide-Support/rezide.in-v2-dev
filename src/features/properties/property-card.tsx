"use client";
import { BACKEND_ID_PATTERN } from "@/lib/ids";

import Link from "next/link";
import { priceLabel } from "./price-label";
export { priceLabel } from "./price-label";
import { Bath, BedDouble, Building2, Car, Phone, Sofa, Store } from "lucide-react";
import { CoverImage } from "@/components/common/cover-image";
import { SampleBadge } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { formatArea, formatDate, formatRate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Property } from "@/types/models";
import { Viewer } from "./detail/media-gallery";
import { SaveIconButton } from "./detail/save-actions";
import { ShareButton } from "./share-button";
import { BrochureButton } from "./detail/brochure-button";
import { ListingWhatsAppButton } from "./detail/agent-card";
import { LeadDialog } from "./detail/lead-dialog";
import { PROPERTY_INTENTS } from "./detail/lead-form";
import { RealtorProfilePopup } from "@/features/realtors/person-profile";

export const propertyHref = (p: Pick<Property, "id">) => `/properties/${p.id}`;


export function availabilityLabel(p: Pick<Property, "availability" | "availableFrom">, now = Date.now()) {
  const status = p.availability?.trim();
  if (!status) return "Availability not provided";
  if (status.toLowerCase() === "available" && p.availableFrom && Date.parse(p.availableFrom) > now) return `Available: ${formatDate(p.availableFrom)}`;
  return status;
}

/** Shared by compact map cards; display the real availability, not prototype verification. */
function VerificationPill({ property, small }: { property: Property; small?: boolean }) {
  return <span className={cn("pointer-events-none absolute top-3 left-3 max-w-[calc(100%-24px)] rounded-[4px] bg-black px-3 py-1 text-xs font-semibold text-white", small && "text-[11px]")}>{availabilityLabel(property)}</span>;
}

/** Existing shared property card, restyled to match the Rezide listing card. */
export function PropertyCard({ property: p, priority, layout = "stack" }: { property: Property; priority?: boolean; layout?: "stack" | "row" }) {
  const rent = p.intent === "rent", path = propertyHref(p);
  const realListing = BACKEND_ID_PATTERN.test(p.id);
  const canContact = !!p.realtorId && !!p.realtorFirmId;
  const photos = p.images.slice(0, 5);
  const office = p.category === "offices" || /office/i.test(p.unitType || p.specs[0]?.value || "");
  const retail = p.category === "retail" || /shop|showroom/i.test(p.unitType || p.specs[0]?.value || "");
  const features = [
    { Icon: retail ? Store : office ? Building2 : BedDouble, label: retail ? "Retail type" : office ? "Office type" : "Bedrooms", value: office || retail ? p.specs[0]?.value || p.unitType || "Not provided" : p.bhk ? `${p.bhk} BHK` : p.specs[0]?.value || p.unitType || "Not provided" },
    { Icon: Bath, label: "Bathrooms", value: p.bathrooms !== undefined ? `${p.bathrooms} Baths` : "Not provided" },
    { Icon: Car, label: "Parking", value: p.parking !== undefined ? `${p.parking} Parks` : "Not provided" },
    { Icon: Sofa, label: "Furnishing", value: p.furnishing || p.specs.find(spec => spec.label === "Furnishing")?.value || "Not provided" },
  ];
  return <article className={cn("group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[14px] border border-rez-smoke bg-white shadow-[0_1px_3px_#0000001f]", layout === "row" && "md:grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]")}>
    <div className={cn("relative aspect-[16/9] shrink-0 bg-rez-cloud", layout === "row" && "md:aspect-auto md:min-h-[290px]")}>
      <Viewer key={p.id} reserveBadgeSpace={!!p.photoSource && p.photoSource !== "listing" && p.photoSource !== "placeholder"} images={photos} label={p.title} cardHref={path} priority={priority} />
      <span className="pointer-events-none absolute top-5 left-3 max-w-[calc(100%-148px)] rounded-[4px] bg-black px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">{availabilityLabel(p)}</span>
      <div className="absolute top-5 right-3 flex gap-2">
        <SaveIconButton list="shortlist" kind="property" id={p.id} title={p.title} intent={p.intent} className="size-9 sm:size-8 rounded-full bg-white p-0 text-rez-graphite hover:bg-rez-cloud" />
        <SaveIconButton list="compare" kind="property" id={p.id} title={p.title} intent={p.intent} className="size-9 sm:size-8 rounded-full bg-white p-0 text-rez-graphite hover:bg-rez-cloud" />
        <ShareButton title={p.title} path={path} iconOnly className="size-9 sm:size-8 rounded-full border-0 bg-white p-0 text-rez-graphite hover:bg-rez-cloud" />
      </div>
      {p.photoSource && p.photoSource !== "listing" && p.photoSource !== "placeholder" && <SampleBadge className="pointer-events-none absolute right-3 bottom-3">{p.photoSource === "sample-flat" ? "Sample" : "Project photo"}</SampleBadge>}
    </div>
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><h3 className="text-[16px] leading-tight font-semibold [overflow-wrap:anywhere] sm:text-[17px]"><Link href={path} className="hover:underline">{p.title || "Property listing"}</Link></h3><p className="mt-1 text-[13px] leading-snug text-rez-graphite">{p.locationLabel || [p.locality, p.city].filter(Boolean).join(", ") || "Location not provided"}</p></div>
          <BrochureButton url={p.brochureUrl} listingId={realListing ? p.id : undefined} path={path} iconOnly variant="outline" size="icon" className="size-9 shrink-0 rounded-full border-rez-smoke text-rez-graphite shadow-sm" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-[20px] leading-tight font-semibold">{priceLabel(p)}</p>{!p.priceHidden && p.price > 0 && <p className="mt-1 text-xs text-rez-graphite">{p.ratePerSqft ? `₹ ${formatNumber(p.ratePerSqft)} per sqft` : formatRate(p.price, p.areaSqft, rent)}</p>}</div>
          <span className="rounded-[6px] bg-[#f4f4f6] px-2 py-1.5 text-[13px] whitespace-nowrap">{p.areaBasis}: {p.areaSqft ? `${formatNumber(p.areaSqft)} sqft` : "Not provided"}</span>
        </div>
        <dl className="grid grid-cols-4 gap-1 rounded-[8px] bg-[#f4f4f6] px-2 py-2.5">
          {features.map(feature => <div key={feature.label} className="flex min-w-0 flex-col items-center gap-1 text-center"><dt><feature.Icon className="size-[22px] text-[#777783]" aria-hidden /><span className="sr-only">{feature.label}</span></dt><dd className="text-[10px] leading-snug [overflow-wrap:anywhere] sm:text-xs">{feature.value}</dd></div>)}
        </dl>
        <div className="mt-auto flex justify-between gap-3 text-xs leading-snug text-rez-graphite"><div className="min-w-0"><p>Listing Realtor</p><p className="mt-0.5 text-[12px] font-semibold text-black [overflow-wrap:anywhere]"><RealtorProfilePopup lookupId={p.realtorId} purpose={p.intent === "rent" ? "rent" : "sale"} label={p.realtorFirm || "Listing realtor"} /></p></div><div className="shrink-0 text-right"><p>Last Updated</p><p className="mt-0.5 text-[12px] font-semibold text-black">{p.updatedAt && !Number.isNaN(Date.parse(p.updatedAt)) ? formatDate(p.updatedAt) : "Not provided"}</p></div></div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2.5 bg-[#f4f4f6] px-3 py-5">
        <ListingWhatsAppButton listingId={p.id} brokerId={realListing ? p.realtorId : ""} title={p.title} className="h-10 min-w-0 gap-2 rounded-[4px] border-rez-smoke bg-white px-2 text-sm" />
        <LeadDialog mode="contact" title="Contact the realtor" description={p.title} target={{ propertyId: p.id, realtorId: p.realtorId }} recipient={p.realtorFirm || "the realtor"} intents={PROPERTY_INTENTS} listing={realListing ? { id: p.id, firmId: p.realtorFirmId || "", brokerId: p.realtorId, name: p.title, path } : undefined} mobileSheet>
          <Button className="h-10 min-w-0 gap-2 rounded-[4px] bg-[#18181b] px-2 text-sm" disabled={realListing && !canContact} title={realListing && !canContact ? "Broker details are unavailable" : undefined}><Phone className="size-[18px]" />Contact</Button>
        </LeadDialog>
      </div>
    </div>
  </article>;
}

/** Compact row used beside the map. */
export function PropertyRow({
  property: p,
  highlighted,
  onHover,
  priority,
}: {
  property: Property;
  highlighted?: boolean;
  /** Above the fold: load the photo eagerly. */
  priority?: boolean;
  onHover?: (id: string | null) => void;
}) {
  const rent = p.intent === "rent";
  const facts = [p.bhk ? `${p.bhk} BHK` : p.unitType, p.areaSqft ? formatArea(p.areaSqft) : ""].filter(Boolean);
  return (
    <article
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "relative flex flex-col gap-2.5 rounded-2xl border bg-white p-3 transition-shadow hover:shadow-rez-md",
        highlighted ? "border-black shadow-rez-md" : "border-rez-smoke",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-rez-cloud">
          <CoverImage src={p.images[0]} alt="" sizes="64px" priority={priority} />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="truncate text-sm font-semibold">
            <Link href={propertyHref(p)} className="after:absolute after:inset-0">
              {p.title}
            </Link>
          </h3>
          <span className="truncate text-xs text-rez-graphite">
            {p.locality}, {p.city}
          </span>
          <span className="text-base leading-tight font-bold">{priceLabel(p)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-none font-medium">
        <span className={cn("rounded-md px-2 py-1.5 font-semibold text-white", rent ? "bg-rez-burgundy" : "bg-rez-timber-tint")}>
          {rent ? "RENTAL" : "SALE"}
        </span>
        {facts.map((f) => (
          <span key={f} className="rounded-full border border-rez-smoke px-2.5 py-[5px]">
            {f}
          </span>
        ))}
      </div>
    </article>
  );
}

/** Photo + key facts card beside the map (prototype map-card variant "B"). */
export function PropertyPhotoCard({
  property: p,
  highlighted,
  onHover,
  priority,
}: {
  property: Property;
  highlighted?: boolean;
  /** Above the fold: load the photo eagerly. */
  priority?: boolean;
  onHover?: (id: string | null) => void;
}) {
  const facts = [p.specs[0]?.value, p.specs[1]?.value, formatArea(p.areaSqft)].filter(Boolean);
  return (
    <article
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[20px] border bg-white transition-shadow hover:shadow-rez-md",
        highlighted ? "border-black shadow-rez-md" : "border-rez-smoke",
      )}
    >
      <div className="relative aspect-video bg-rez-cloud">
        <CoverImage src={p.images[0]} alt="" sizes="460px" priority={priority} />
        <VerificationPill property={p} small />
      </div>
      <div className="flex flex-col gap-2 px-[18px] pt-3.5 pb-4">
        <span className="text-[21px] leading-none font-bold tracking-[-0.01em]">{priceLabel(p)}</span>
        <h3 className="truncate text-sm font-semibold">
          <Link href={propertyHref(p)} className="after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm leading-tight font-medium">
          {facts.map((f, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="h-3.5 w-px bg-rez-smoke" />}
              {f}
            </span>
          ))}
        </div>
        <span className="truncate text-[13px] text-rez-graphite">
          {p.locationLabel || [p.locality, p.city].filter(Boolean).join(", ")}
        </span>
      </div>
    </article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-[20px] border border-rez-smoke" aria-hidden>
      <div className="aspect-[4/3] bg-rez-cloud" />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-5 w-3/4 rounded bg-rez-cloud" />
        <div className="h-4 w-1/2 rounded bg-rez-cloud" />
        <div className="h-6 w-1/3 rounded bg-rez-cloud" />
        <div className="h-16 rounded-2xl bg-rez-cloud" />
      </div>
    </div>
  );
}
