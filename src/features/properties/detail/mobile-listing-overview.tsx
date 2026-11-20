"use client";

import { Bath, BedDouble, Car, Sofa } from "lucide-react";
import { formatDate, formatNumber } from "@/lib/format";
import type { Property } from "@/types/models";
import { priceLabel } from "../price-label";
import { ShareButton } from "../share-button";
import { BrochureButton } from "./brochure-button";
import { SaveIconButton } from "./save-actions";
import { formatRupees } from "./format";
import { Chip } from "./detail-ui";

export function MobileListingOverview({ property: p }: { property: Property }) {
  const path = `/properties/${p.id}`;
  const round = "size-9 shrink-0 rounded-full border border-rez-smoke bg-white p-0 text-rez-graphite shadow-sm";
  return <section id="overview" aria-label="Listing overview" className="rounded-b-lg border border-rez-smoke bg-white p-4 lg:hidden">
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1"><h1 className="truncate text-base font-semibold" title={p.title}>{p.title}</h1><p className="mt-1 truncate text-xs text-rez-graphite">{[p.locality, p.city].filter(Boolean).join(", ")}</p></div>
      <ShareButton property={p} title={p.title} path={path} iconOnly className={round} />
      <SaveIconButton list="compare" kind="property" id={p.id} title={p.title} intent={p.intent} className={round} />
      <BrochureButton url={p.brochureUrl} listingId={p.id} path={path} iconOnly className={round} />
    </div>
    <div className="my-3 flex flex-wrap gap-2"><Chip>{p.intent === "rent" ? "Rental" : "Sale"}</Chip>{p.availability && <Chip tone="mint">{p.availability}</Chip>}</div>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-lg font-semibold">{priceLabel(p)}</p>{!p.priceHidden && !!p.areaSqft && p.intent !== "rent" && <p className="text-xs text-rez-graphite">{formatRupees(p.ratePerSqft ?? p.price / p.areaSqft)} per sq ft</p>}{p.priceHidden && <a href="#enquire" className="text-sm underline">Request price</a>}</div><span className="rounded bg-rez-cloud px-2 py-1 text-[10px] uppercase">{p.areaBasis}: {p.areaKnown === false ? "On request" : `${formatNumber(p.areaSqft)} sqft`}</span></div>
    <dl className="mt-3 grid grid-cols-4 gap-1 rounded-md bg-rez-cloud px-1 py-3 text-center">
      {[{ Icon: BedDouble, name: "Beds", value: p.bhk !== undefined ? `${p.bhk} Beds` : p.unitType }, { Icon: Bath, name: "Bathrooms", value: p.bathrooms !== undefined ? `${p.bathrooms} Baths` : "—" }, { Icon: Car, name: "Parking", value: p.parking !== undefined ? `${p.parking} Parks` : "—" }, { Icon: Sofa, name: "Furnishing", value: p.furnishing || "—" }].map(({ Icon, name, value }) => <div key={name} className="min-w-0"><dt><Icon size={22} className="mx-auto text-rez-graphite" /><span className="sr-only">{name}</span></dt><dd className="mt-1 text-[10px] break-words sm:text-xs">{value}</dd></div>)}
    </dl>
    <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-rez-graphite"><p>Listed on: <b className="text-black">{p.listedAt ? formatDate(p.listedAt) : "—"}</b></p><p>Last updated: <b className="text-black">{p.updatedAt ? formatDate(p.updatedAt) : "—"}</b></p></div>
  </section>;
}
