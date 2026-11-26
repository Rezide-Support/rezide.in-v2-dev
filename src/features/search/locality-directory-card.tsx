"use client";

import Link from "next/link";
import { PropertyCardImageCarousel } from "@/features/properties/property-card-image-carousel";
import type { LocalityCardData } from "@/services/directory-localities";
import { propertySearchHref } from "./criteria";

export function LocalityDirectoryCard({ locality, city, priority }: { locality: LocalityCardData; city: string; priority?: boolean }) {
  const path = `/locality/${locality.id}`;
  const availability = (intent: "buy" | "rent", count: number) => {
    const content = <><span>Available {intent === "rent" ? "Rent" : "Sale"}</span><span className="text-sm text-[#0000ff]">{count}</span></>;
    const className = "inline-flex items-center gap-2 whitespace-nowrap text-xs text-rez-graphite";
    return count > 0 ? <Link href={propertySearchHref({ city, category: "homes", intent, q: locality.name })} target="_blank" rel="noopener noreferrer" className={className + " hover:underline"}>{content}</Link> : <span className={className}>{content}</span>;
  };
  return <article className="h-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="h-[150px]"><PropertyCardImageCarousel images={locality.images} label={locality.name} href={path} priority={priority} maxImages={5} fallbackImage="/assets/image/empty.gif" /></div>
    <div className="flex flex-col gap-2 px-[16px] py-[8px]">
      <Link href={path} target="_blank" rel="noopener noreferrer" className="block truncate text-base font-semibold leading-6 hover:underline" title={locality.name}>{locality.name}</Link>
      <div className="flex flex-wrap items-center justify-between gap-2">{availability("rent", locality.rentalCount)}{availability("buy", locality.saleCount)}</div>
    </div>
  </article>;
}
