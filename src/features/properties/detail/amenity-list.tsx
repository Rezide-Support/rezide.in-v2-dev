"use client";

import Image from "next/image";
import { useState } from "react";
import { publicApiOrigin } from "@/lib/api/origins";

export const INITIAL_AMENITY_COUNT = 5;
export const amenityNames = (items: unknown): string[] =>
  Array.isArray(items) ? items.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

function AmenityImage({ name, size = 20 }: { name: string; size?: 20 | 32 }) {
  const [failed, setFailed] = useState(false);
  const remote = `${publicApiOrigin()}/v1/admin/repository/amenities/icon/${encodeURIComponent(name)}.svg`;
  return <Image
    src={failed ? "/images/amenity-fallback.svg" : remote}
    alt=""
    aria-hidden
    width={size}
    height={size}
    unoptimized
    className={size === 32 ? "size-8 shrink-0 object-contain" : "size-5 shrink-0 object-contain"}
    onError={failed ? undefined : () => setFailed(true)}
  />;
}

/** Detail tab tiles keep backend labels and API order; comparison lists sort separately. */
export function BackendAmenityTile({ name }: { name: string }) {
  return <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl bg-white p-5 text-center shadow-rez-sm">
    <AmenityImage key={name} name={name} size={32} />
    <span className="text-xs leading-4 break-words text-black lg:text-sm lg:leading-5">{name}</span>
  </div>;
}

/** Preserve API names for both labels and custom SVG filenames. */
export function AmenityList({ items, expanded = false }: { items?: readonly string[]; expanded?: boolean }) {
  const sorted = amenityNames(items).sort((a, b) => a.localeCompare(b, "en"));
  const visible = expanded ? sorted : sorted.slice(0, INITIAL_AMENITY_COUNT);
  if (!visible.length) return <span className="text-[12px] text-[#555]">-</span>;
  return <ul className="flex flex-col gap-1">
    {visible.map((name, index) => <li key={`${name}-${index}`} className="flex items-center gap-2 text-[12px] leading-5 text-[#3f3f3f]">
      <AmenityImage key={name} name={name} />
      <span>{name}</span>
    </li>)}
  </ul>;
}
