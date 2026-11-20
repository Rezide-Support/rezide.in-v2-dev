"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import type { Property } from "@/types/models";
import { localityCategories, localityDirectionsUrl, validCoordinates, type LocalityLandmark } from "@/lib/listing-locality";
import { LocalityMap } from "./locality-map";

const emptyLandmarks: LocalityLandmark[] = [];
async function read<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error("Unable to load locality information");
  return response.json();
}
export function hasListingLocality(property: Property) {
  return !property.projectHidden && /^[a-f0-9]{24}$/i.test(property.projectId ?? "") && !!property.projectLocality?.name && validCoordinates(...property.projectLocality.coords);
}
export function ListingLocality({ property }: { property: Property }) {
  if (!hasListingLocality(property)) return null;
  return <LocalityContent property={property} key={property.projectId} />;
}
function LocalityContent({ property }: { property: Property }) {
  const locality = property.projectLocality!;
  const [category, setCategory] = useState<string>("school");
  const [selected, setSelected] = useState<LocalityLandmark | null>(null);
  const map = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(scrollTimer.current), []);
  const preview = useQuery({ queryKey: ["listing-locality-preview", locality.name], queryFn: () => read<{ id?: string; image?: string } | null>("/api/localities?page=1&pageSize=1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sub_regions: null, regions: null, searchQuery: [locality.name] }) }), staleTime: 600000 });
  const landmarks = useQuery({ queryKey: ["listing-locality-landmarks", property.projectId, category], queryFn: () => read<LocalityLandmark[]>(`/api/localities/landmarks?projectId=${encodeURIComponent(property.projectId!)}&category=${category}`), staleTime: 600000 });
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const directions = selected && apiKey ? localityDirectionsUrl(apiKey, locality.coords, [selected.latitude, selected.longitude]) : null;
  const select = (item: LocalityLandmark) => {
    clearTimeout(scrollTimer.current);
    setSelected(selected?._id === item._id ? null : item);
    if (selected?._id !== item._id && window.matchMedia("(max-width: 430px)").matches) scrollTimer.current = setTimeout(() => map.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  };
  return <div className="rounded-md border border-rez-smoke bg-white p-4 sm:p-6 lg:p-8">
    <div className="grid gap-6 md:grid-cols-2">
      <div className="relative h-[300px] overflow-hidden rounded-xl bg-gray-100 max-[430px]:h-[130px]">
        <Image key={preview.data?.image} src={preview.data?.image || "/images/empty.gif"} alt={locality.name} fill unoptimized className="object-cover" onError={event => { event.currentTarget.src = "/images/empty.gif"; }} />
        <div className="absolute inset-x-0 bottom-0 bg-black/40 p-4 text-center font-semibold text-white">{preview.data?.id ? <a href={`/locality/${encodeURIComponent(preview.data.id)}`} target="_blank" rel="noopener noreferrer">Explore {locality.name}</a> : <span>{preview.isLoading ? "Loading locality…" : `Explore ${locality.name}`}</span>}</div>
      </div>
      <div ref={map} className="scroll-mt-32">
        {!apiKey ? <div className="grid h-[300px] place-items-center rounded-lg bg-gray-100 p-5 text-center text-sm">Map unavailable. Google Maps configuration is required.</div> : directions ? <iframe title={`Driving directions to ${selected?.placeName}`} src={directions} width="100%" height="300" className="rounded-lg border-0" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <LocalityMap key={category} apiKey={apiKey} coords={locality.coords} landmarks={landmarks.data ?? emptyLandmarks} />}
      </div>
    </div>
    <div className="mt-8 flex gap-2 overflow-x-auto pb-2" aria-label="Landmark categories">{localityCategories.map(([label, key]) => <button key={key} type="button" aria-pressed={category === key} className={`min-w-[130px] flex-1 whitespace-nowrap rounded-lg border px-3 py-2 text-xs ${category === key ? "border-black bg-black font-semibold text-white" : "border-gray-400 bg-white"}`} onClick={() => { clearTimeout(scrollTimer.current); setSelected(null); setCategory(key); }}>{label}</button>)}</div>
    <p className="my-3 text-center text-xs text-rez-graphite">Tap a landmark to see live directions</p>
    {landmarks.isLoading ? <p role="status" className="py-5 text-center text-sm">Loading landmarks…</p> : landmarks.isError ? <p role="alert" className="py-5 text-center text-sm">Unable to load landmarks. <button onClick={() => landmarks.refetch()} className="underline">Retry</button></p> : !landmarks.data?.length ? <p className="py-5 text-center text-sm">No landmarks found.</p> : landmarks.data.map(item => <button type="button" key={item._id} aria-pressed={selected?._id === item._id} onClick={() => select(item)} className={`flex w-full items-center justify-between gap-3 border-b border-gray-200 px-3 py-3 text-left text-sm ${selected?._id === item._id ? "bg-blue-50" : "hover:bg-gray-50"}`}><span className="flex min-w-0 items-center gap-3"><Image src={item.icon || "/images/amenity-fallback.svg"} alt="" width={24} height={24} unoptimized className="size-6 shrink-0" onError={event => { event.currentTarget.src = "/images/amenity-fallback.svg"; }} /><span>{item.placeName}</span></span><span className="shrink-0 text-xs">{item.distance.toFixed(2)} kms</span></button>)}
  </div>;
}
