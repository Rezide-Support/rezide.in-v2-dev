"use client";
import { BACKEND_ID_PATTERN } from "@/lib/ids";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { priceLabel } from "./price-label";
export { priceLabel } from "./price-label";
import { Bath, BedDouble, Building2, Car, Sofa, Store } from "lucide-react";
import { CoverImage } from "@/components/common/cover-image";
import { Button } from "@/components/ui/button";
import { formatArea, formatDate, formatRate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Property } from "@/types/models";
import { PropertyCardImageCarousel } from "./property-card-image-carousel";
import { SaveIconButton } from "./detail/save-actions";
import { ShareButton } from "./share-button";
import { BrochureButton } from "./detail/brochure-button";
import { LeadDialog } from "./detail/lead-dialog";
import { PROPERTY_INTENTS } from "./detail/lead-form";
import { RealtorProfilePopup } from "@/features/realtors/person-profile";
import { ViewedEye } from "./detail/record-view";
import { directoryQueries } from "@/services/realtor-directory";

export const propertyHref = (p: Pick<Property, "id">) => `/properties/${p.id}`;

function propertyCardLocation(p: Pick<Property, "localityName" | "locality" | "city">) {
  const parts = [p.localityName, p.locality]
    .map((value) => value?.trim())
    .filter((value): value is string => !!value);
  return [...new Set(parts)].join(", ") || p.city || "Location not provided";
}

export function availabilityLabel(p: Pick<Property, "availability" | "availableFrom">, now = Date.now()) {
  const status = p.availability?.trim();
  if (!status || /^(availability not provided|not available|not provided|n\/?a)$/i.test(status)) return "";
  if (status.toLowerCase() === "available" && p.availableFrom && Date.parse(p.availableFrom) > now) return `Available: ${formatDate(p.availableFrom)}`;
  return status;
}

/** Shared by compact map cards; display the real availability, not prototype verification. */
function VerificationPill({ property, small }: { property: Property; small?: boolean }) {
  if (!availabilityLabel(property)) return null;
  return <span className={cn("pointer-events-none absolute top-3 left-3 max-w-[calc(100%-24px)] rounded-[4px] bg-black px-3 py-1 text-xs font-semibold text-white", small && "text-[11px]")}>{availabilityLabel(property)}</span>;
}
/** "₹ 3.60 Lac": the deposit format used on the old site. */
const depositLabel = (v: number) =>
  v >= 1_00_00_000 ? `₹ ${(v / 1_00_00_000).toFixed(2)} Cr`
  : v >= 1_00_000 ? `₹ ${(v / 1_00_000).toFixed(2)} Lac`
  : `₹ ${formatNumber(v)}`;

function RealtorAvatar({ name, photo }: { name: string; photo?: string }) {
  const [failedSrc, setFailedSrc] = useState("");
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "R";

  return <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-rez-cloud">
    {photo && failedSrc !== photo
      ? <Image src={photo} alt={`${name} profile`} fill unoptimized sizes="44px" className="object-cover object-top" onError={() => setFailedSrc(photo)} />
      : <span aria-label={`${name}: no photo`} className="flex size-full items-center justify-center text-xs font-semibold text-rez-graphite">{initials}</span>}
  </div>;
}

function PropertyCardRealtorFooter({ property: p, path, realListing, canContact }: {
  property: Property;
  path: string;
  realListing: boolean;
  canContact: boolean;
}) {
  const query = useQuery(directoryQueries.person(p.realtorId));
  const realtorName = query.data?.name || (query.isError ? "Realtor details unavailable" : "Listing Realtor");
  const firmName = query.data?.firmName || p.realtorFirm || "Firm not provided";

  return <div className="mt-auto flex items-center justify-between gap-3 border-t border-rez-smoke bg-white px-3 py-3">
    <div className="flex min-w-0 items-center gap-2.5">
      <RealtorAvatar name={realtorName} photo={query.data?.photo} />
      <div className="min-w-0">
        <p className="truncate text-sm leading-5 font-semibold text-black">{realtorName}</p>
        <p className="truncate text-xs leading-4 text-rez-graphite">{firmName}</p>
      </div>
    </div>
    <LeadDialog mode="contact" title="Contact the realtor" description={p.title} target={{ propertyId: p.id, realtorId: p.realtorId }} recipient={p.realtorFirm || "the realtor"} intents={PROPERTY_INTENTS} listing={realListing ? { id: p.id, firmId: p.realtorFirmId || "", brokerId: p.realtorId, name: p.title, path } : undefined} mobileSheet>
      <Button variant="outline" className="h-9 min-w-[100px] shrink-0 rounded-full border-[#D1D5DB] bg-white px-5 text-xs font-semibold text-[#18181B] shadow-none hover:bg-[#F3F4F6]" disabled={realListing && !canContact} title={realListing && !canContact ? "Broker details are unavailable" : undefined}>Connect</Button>
    </LeadDialog>
  </div>;
}

/** Existing shared property card, restyled to match the Rezide listing card. */
export function PropertyCard({ property: p, priority, layout = "stack" }: { property: Property; priority?: boolean; layout?: "stack" | "row" }) {
  const row = layout === "row";
  const rent = p.intent === "rent", path = propertyHref(p);
  const displayDate = row ? p.listedAt || p.updatedAt : p.updatedAt;
  const realListing = BACKEND_ID_PATTERN.test(p.id);
  const canContact = !!p.realtorId && !!p.realtorFirmId;
  const office = p.category === "offices" || /office/i.test(p.unitType || p.specs[0]?.value || "");
  const retail = p.category === "retail" || /shop|showroom/i.test(p.unitType || p.specs[0]?.value || "");
  const features = [
    { Icon: retail ? Store : office ? Building2 : BedDouble, label: retail ? "Retail type" : office ? "Office type" : "Bedrooms", value: office || retail ? p.specs[0]?.value || p.unitType || "Not provided" : p.bhk ? `${p.bhk} BHK` : p.specs[0]?.value || p.unitType || "Not provided" },
    { Icon: Bath, label: "Bathrooms", value: p.bathrooms !== undefined ? `${p.bathrooms} ${p.bathrooms === 1 ? "Bath" : "Baths"}` : "Not provided" },
    { Icon: Car, label: "Parking", value: p.parking !== undefined ? `${p.parking} ${p.parking === 1 ? "Parking" : "Parks"}` : "Not provided" },
    { Icon: Sofa, label: "Furnishing", value: p.furnishing || p.specs.find(spec => spec.label === "Furnishing")?.value || "Not provided" },
  ];
  return <article className={cn("group relative flex h-full w-full max-w-[640px] min-w-0 flex-col overflow-hidden rounded-xl border border-rez-smoke bg-white shadow-[0_1px_3px_#0000001f]", row && "md:grid md:max-w-none md:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] md:rounded-lg")}>
    <div className={cn("relative h-[calc(240px*var(--property-space-scale,1))] shrink-0 bg-rez-cloud", row && "md:h-auto md:min-h-[calc(208px*var(--property-space-scale,1))] xl:min-h-[calc(250px*var(--property-space-scale,1))] 2xl:min-h-[calc(280px*var(--property-space-scale,1))]")}>
      <PropertyCardImageCarousel key={p.id} images={p.images} label={p.title || "Property listing"} href={path} priority={priority} />
      <div className="pointer-events-none absolute top-5 left-3 flex max-w-[calc(100%-148px)] items-center gap-2">
        {availabilityLabel(p) && <span className="rounded-[4px] bg-black px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">{availabilityLabel(p)}</span>}
        <ViewedEye listingId={p.id} className="size-[18px] text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" />
      </div>
      <div className="absolute top-5 right-5 flex gap-3">
        <SaveIconButton list="shortlist" kind="property" id={p.id} title={p.title} intent={p.intent} className="size-6 gap-0 rounded-full border-0 bg-white p-1 text-rez-graphite hover:bg-white hover:text-black [&_svg]:size-[14px]" />
        <SaveIconButton list="compare" kind="property" id={p.id} title={p.title} intent={p.intent} className="size-6 gap-0 rounded-full border-0 bg-white p-1 text-rez-graphite hover:bg-white hover:text-black [&_svg]:size-[14px]" />
        <ShareButton property={p} title={p.title} path={path} iconOnly className="size-6 gap-0 rounded-full border-0 bg-white p-1 text-rez-graphite hover:bg-white hover:text-black [&_svg:not([class*='size-'])]:size-[14px]" />
      </div>
    </div>
    <div className="flex min-w-0 flex-1 flex-col">
      <div className={cn("flex flex-1 flex-col gap-3 px-4 py-3", row && "md:gap-2 md:px-3 md:py-2")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1"><h3 title={p.title || "Property listing"} className="truncate text-base leading-6 font-semibold"><Link href={path} className="hover:underline">{p.title || "Property listing"}</Link></h3>{!row && <p className="text-xs leading-4 font-medium break-words text-rez-graphite">{propertyCardLocation(p)}</p>}</div>
          <BrochureButton url={p.brochureUrl} listingId={realListing ? p.id : undefined} path={path} iconOnly variant="outline" size="icon" className="size-9 shrink-0 rounded-full border-rez-smoke text-rez-graphite shadow-sm" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-lg leading-7 font-semibold">{priceLabel(p)}</p>{!p.priceHidden && p.price > 0 && (rent ? (p.securityDeposit ? <p className="text-xs leading-4 font-medium text-rez-graphite">Deposit: {depositLabel(p.securityDeposit)}</p> : null) : <p className="text-xs leading-4 font-medium text-rez-graphite">{p.ratePerSqft ? `₹ ${formatNumber(p.ratePerSqft)} per sqft` : formatRate(p.price, p.areaSqft, rent)}</p>)}</div>
          <span className="max-w-full rounded-md bg-gray-100 px-2 py-1 text-[10.4px] break-words lg:text-sm">{p.areaBasis}: {p.areaSqft ? `${formatNumber(p.areaSqft)} sqft` : "Not provided"}</span>
        </div>
        <dl className="grid grid-cols-4 rounded-md bg-[#F3F4F6] py-2">
          {features.map(feature => <div key={feature.label} className="flex min-w-0 flex-col items-center gap-1 px-2 text-center"><dt><feature.Icon className="size-6 text-[#777783]" aria-hidden /><span className="sr-only">{feature.label}</span></dt><dd className="text-xs leading-4 [overflow-wrap:anywhere]">{feature.value}</dd></div>)}
        </dl>
        <div className="flex justify-between gap-3 text-xs leading-4 text-rez-graphite"><div className="min-w-0"><p>Listing Realtor</p><p className="mt-0.5 truncate text-xs font-semibold text-black [&_button]:block [&_button]:max-w-full [&_button]:truncate"><RealtorProfilePopup lookupId={p.realtorId} purpose={p.intent === "rent" ? "rent" : "sale"} label={p.realtorFirm || "Listing realtor"} /></p></div><div className="shrink-0 text-right"><p>{row ? "Listing Date" : "Last Updated"}</p><p className="mt-0.5 text-[12px] font-semibold text-black">{displayDate && !Number.isNaN(Date.parse(displayDate)) ? formatDate(displayDate) : "Not provided"}</p></div></div>
      </div>
      {!row && <PropertyCardRealtorFooter property={p} path={path} realListing={realListing} canContact={canContact} />}
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
            {p.mapSummary ? <span>{p.title}</span> : <Link href={propertyHref(p)} className="after:absolute after:inset-0">{p.title}</Link>}
          </h3>
          <span className="truncate text-xs text-rez-graphite">
            {propertyCardLocation(p)}
          </span>
          <span className="text-base leading-tight font-bold">{priceLabel(p)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-none font-medium">
        {!p.mapSummary && <span className={cn("rounded-md px-2 py-1.5 font-semibold text-white", rent ? "bg-rez-burgundy" : "bg-rez-timber-tint")}>
          {rent ? "RENTAL" : "SALE"}
        </span>}
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
        <span className="text-[max(12px,calc(21px*var(--property-type-scale,1)))] leading-none font-bold tracking-[-0.01em]">{priceLabel(p)}</span>
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
          {propertyCardLocation(p)}
        </span>
      </div>
    </article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="flex w-full max-w-[640px] animate-pulse flex-col overflow-hidden rounded-xl border border-rez-smoke" aria-hidden>
      <div className="h-[240px] bg-rez-cloud" />
      <div className="flex flex-col gap-2 px-4 py-2">
        <div className="h-5 w-3/4 rounded bg-rez-cloud" />
        <div className="h-4 w-1/2 rounded bg-rez-cloud" />
        <div className="h-6 w-1/3 rounded bg-rez-cloud" />
        <div className="h-16 rounded-2xl bg-rez-cloud" />
      </div>
    </div>
  );
}
