"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ErrorState } from "@/components/common/feedback";
import { PropertyCardImageCarousel } from "@/features/properties/property-card-image-carousel";
import { SaveIconButton } from "@/features/properties/detail/save-actions";
import { initials } from "@/lib/format";
import { propertySearchHref } from "./criteria";
import type { BuildingProject } from "@/services/building-projects";
import type { ProjectConfiguration } from "@/types/models";

function PriceRangeTable({ rows }: { rows: ProjectConfiguration[] }) {
  const valid = (value: number | undefined): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
  const currency = (value: number) => {
    const [amount, unit] = value >= 10_000_000 ? [value / 10_000_000, " Cr."] : value >= 100_000 ? [value / 100_000, "L"] : value >= 1_000 ? [value / 1_000, "K"] : [value, ""];
    return "\u20b9" + Number(amount).toFixed(2) + unit;
  };
  const price = (min?: number, max?: number) => valid(min) && valid(max) ? currency(min) + " - " + currency(max) : "-";
  return <div className="min-w-0 overflow-x-auto rounded-lg border border-gray-200">
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">Project price ranges by configuration</caption>
      <thead className="bg-[#f8f8fa] text-[#747480]"><tr>{["Configuration", "Area (sqft)", "Rental Price", "Sale Price"].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-3 font-semibold">{label}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.bhk + index} className="border-t border-gray-200 bg-white">
        <td className="whitespace-nowrap px-3 py-2.5">{row.bhk || "-"}</td>
        <td className="whitespace-nowrap px-3 py-2.5">{valid(row.areaMin) && valid(row.areaMax) ? row.areaMin + " - " + row.areaMax : "-"}</td>
        <td className="whitespace-nowrap px-3 py-2.5">{price(row.rentMin, row.rentMax)}</td>
        <td className="whitespace-nowrap px-3 py-2.5">{price(row.saleMin, row.saleMax)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function PriceRange({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);

  const ranges = useQuery({
    queryKey: ["building-price-range", id], enabled: open, staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/projects/price-range?id=${encodeURIComponent(id)}`, { signal });
      if (!response.ok) throw new Error("Couldn't load price ranges.");
      const json: { data: { price_range: ProjectConfiguration[] } } = await response.json();
      return json.data.price_range;
    },
  });
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button className="whitespace-nowrap text-sm text-rez-graphite hover:underline underline-offset-4">Price Range</button></DialogTrigger>
    <DialogContent overlayClassName="bg-black/80 supports-backdrop-filter:backdrop-blur-none" className="w-[calc(100%-32px)] max-w-[760px] min-w-0 gap-6 rounded-[24px] bg-white p-5 sm:max-w-[760px] sm:p-6 [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:top-3">
      <DialogTitle className="px-8 text-center text-[22px]">Price Range</DialogTitle><DialogDescription className="sr-only">Configuration, area, rental and sale prices for {name}.</DialogDescription>
      {ranges.isPending ? <p role="status">Loading price ranges...</p> : ranges.isError ? <ErrorState onRetry={() => void ranges.refetch()} /> : ranges.data.length ? <PriceRangeTable rows={ranges.data} /> : <p>No price ranges available.</p>}
    </DialogContent>
  </Dialog>;
}

export function BuildingProjectCard({ item, priority }: { item: BuildingProject; priority?: boolean }) {
  const { project: p, rentalCount, saleCount } = item;
  const [logoFailed, setLogoFailed] = useState(false);
  const path = `/project/${p.id}`;
  const availability = (intent: "buy" | "rent", count: number) => {
    const content = <><span>Available {intent === "rent" ? "Rent" : "Sale"}</span><span className="text-[#0000ff]">{count}</span></>;
    const className = "inline-flex items-center gap-2 whitespace-nowrap text-sm text-rez-graphite";
    return count > 0 ? <Link className={className + " hover:underline"} href={propertySearchHref({ city: p.city, category: "homes", intent, q: p.name })} target="_blank" rel="noopener noreferrer">{content}</Link> : <span className={className}>{content}</span>;
  };
  return <article className="min-w-0 overflow-hidden rounded-xl border border-rez-smoke bg-white shadow-rez-sm">
    <div className="relative aspect-[16/9]">
      <PropertyCardImageCarousel images={p.images} label={p.name} href={path} maxImages={p.images.length} priority={priority} />
      <div className="absolute right-2 top-2 flex gap-2">
        <SaveIconButton kind="project" list="shortlist" id={p.id} title={p.name} className="size-6 gap-0 rounded-full border-0 bg-white p-1 text-rez-graphite hover:bg-white hover:text-black [&_svg]:size-[14px]" />
        <SaveIconButton kind="project" list="compare" id={p.id} title={p.name} className="size-6 gap-0 rounded-full border-0 bg-white p-1 text-rez-graphite hover:bg-white hover:text-black [&_svg]:size-[14px]" />
      </div>
    </div>
    <div className="flex flex-col gap-2 px-3.5 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><Link href={path} target="_blank" rel="noopener noreferrer" className="block truncate text-base font-semibold hover:underline">{p.name}</Link><p className="truncate text-sm text-rez-graphite">{[p.locality, p.subRegion].filter(Boolean).join(", ")}</p></div>
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-rez-smoke text-xs font-semibold">
          {p.logo && !logoFailed ? <Image src={p.logo} alt={`${p.name} logo`} width={36} height={36} className="size-full object-contain" onError={() => setLogoFailed(true)} /> : initials(p.name)}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">{availability("rent", rentalCount)}{availability("buy", saleCount)}<PriceRange id={p.id} name={p.name} /></div>
    </div>
  </article>;
}
