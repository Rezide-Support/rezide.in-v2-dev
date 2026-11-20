"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Box } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/common/native-select";
import { defaultProjectCriteria, defaultPropertyCriteria } from "@/features/search/criteria";
import { projectQueries, propertyQueries } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { useCompareItems, useSavedStore } from "@/stores/saved";
import { useSession } from "@/stores/session";
import type { Property } from "@/types/models";
import { priceLabel } from "../price-label";
import { AmenityList, amenityNames, INITIAL_AMENITY_COUNT } from "./amenity-list";
import { SectionHeading } from "./detail-ui";
import { formatRupees } from "./format";
import { ComparisonPhoto, comparisonPhotoUrl } from "./comparison-photo";

type ComparisonRow = {
  label: string;
  value: (property: Property) => string | number | undefined;
  display?: "area-type" | "area" | "room";
  roomName?: string;
};
type Group = { name: string; expandable?: boolean; rows: ComparisonRow[] };
const dash = (value: string | number | undefined) => value === undefined || value === "" ? "-" : value;
const dimensionLabel = (value: number | undefined) =>
  value === undefined ? "-" : value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const propertyAge = (age: number | undefined) => {
  if (age === undefined) return undefined;
  let years = Math.floor(age);
  let months = Math.round((age - years) * 12);
  if (months === 12) {
    years += 1;
    months = 0;
  }
  const yearLabel = `${years} ${years === 1 ? "year" : "years"}`;
  return months ? `${yearLabel} ${months} ${months === 1 ? "month" : "months"}` : yearLabel;
};
const groups: Group[] = [
  { name: "Commercial", rows: [
    { label: "Availability Date", value: p => p.availableFrom ? formatDate(p.availableFrom) : p.availability },
    { label: "Price", value: p => p.priceHidden ? priceLabel(p) : `${formatRupees(p.price)}/-` },
    { label: "Security deposit", value: p => p.priceHidden || p.securityDeposit === undefined ? undefined : `${formatRupees(p.securityDeposit)}/-` },
    { label: "Rate Psf.", value: p => {
      if (p.priceHidden) return undefined;
      const rate = p.ratePerSqft ?? (p.areaSqft ? p.price / p.areaSqft : undefined);
      return rate === undefined ? undefined : `${formatRupees(rate)}/-`;
    } },
  ] },
  { name: "Location", rows: [
    { label: "City", value: p => p.city }, { label: "Locality", value: p => p.localityName ?? p.locality },
    { label: "Complex name", value: p => p.projectHidden ? undefined : p.projectName },
  ] },
  { name: "Property summary", expandable: true, rows: [
    { label: "Property type", value: p => p.unitType },
    { label: "Tower", value: p => p.tower },
    { label: "Age of property", value: p => propertyAge(p.ageYears) },
    { label: "Total floors", value: p => p.totalFloors },
    { label: "Apartment on floor", value: p => p.floorLabel ?? p.floor },
    { label: "Unit no", value: p => p.unitNo },
    { label: "Bedrooms", value: p => p.unitType === "Studio" ? "Studio" : p.bhk === undefined ? undefined : `${p.bhk} BHK` },
    { label: "Bathrooms", value: p => p.bathrooms },
    { label: "Balconies", value: p => p.balconies },
    { label: "Car parks", value: p => p.parking },
    { label: "View / Overlooking", value: p => p.view },
    { label: "Vastu (Main Door)", value: p => p.vastuEntry || p.vastuExit ? `Entry ${p.vastuEntry ?? "-"} · Exit ${p.vastuExit ?? "-"}` : undefined },
  ] },
  { name: "Property configuration", expandable: true, rows: [] },
  { name: "Furnishing", rows: [] },
  { name: "Apartment amenities", rows: [] },
  { name: "Project amenities", rows: [] },
];

function ConfigurationCell({ property, row }: { property: Property; row: ComparisonRow }) {
  const value = row.value(property);
  const badge = "inline-flex min-w-10 justify-center bg-[#f2f2f2] px-3 py-1 text-[11px] text-[#171717]";

  if (row.display === "area-type" || row.display === "area") {
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span>Area</span>
        <span className={badge}>{dash(value)}</span>
      </div>
    );
  }

  if (row.display === "room") {
    const room = property.rooms?.find((item) => item.name === row.roomName);
    return (
      <div className="flex items-center gap-1 whitespace-nowrap text-[11px]">
        <span>L</span>
        <span className={badge}>{dimensionLabel(room?.length)}</span>
        <span>B</span>
        <span className={badge}>{dimensionLabel(room?.width)}</span>
        <span>Area</span>
        <span className={badge}>-</span>
      </div>
    );
  }

  return dash(value);
}

function FurnishingComparisonRows({
  columns,
  cell,
  sectionCell,
  expanded,
  onToggle,
}: {
  columns: (Property | undefined)[];
  cell: string;
  sectionCell: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasMore = columns.some(property => amenityNames(property?.furnishingItems).length > INITIAL_AMENITY_COUNT);

  return (
    <Fragment>
      <tr>
        <th colSpan={columns.length + 1} className={sectionCell}>Furnishing</th>
      </tr>
      <tr>
        <th scope="row" className={`${cell} font-medium text-[#4a4a4a]`}>Status</th>
        {columns.map((property, index) => (
          <td key={property?.id ?? index} className={`${cell} text-center text-[12px] font-semibold`}>
            {property?.furnishingLabel || property?.furnishing || "-"}
          </td>
        ))}
      </tr>
      <tr>
        <th scope="row" className={cell}>
          <span className="sr-only">Furnishing items</span>
        </th>
        {columns.map((property, index) => {
          return (
            <td key={property?.id ?? index} className={`${cell} align-top`}>
              <AmenityList items={property?.furnishingItems} expanded={expanded} />
            </td>
          );
        })}
      </tr>
      {hasMore && (
        <tr className="print:hidden">
          <td colSpan={columns.length + 1} className={`${cell} text-center`}>
            <button
              type="button"
              aria-expanded={expanded}
              className="rounded-full border border-[#d0d0d0] bg-white px-4 py-1 text-[11px] font-medium text-[#2f2f2f]"
              onClick={onToggle}
            >
              {expanded ? "View Less" : "View More"}
            </button>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function ApartmentAmenityComparisonRows({
  columns,
  cell,
  sectionCell,
  expanded,
  onToggle,
}: {
  columns: (Property | undefined)[];
  cell: string;
  sectionCell: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasMore = columns.some(property => amenityNames(property?.amenities).length > INITIAL_AMENITY_COUNT);

  return (
    <Fragment>
      <tr>
        <th colSpan={columns.length + 1} className={sectionCell}>Apartment amenities</th>
      </tr>
      <tr>
        <th scope="row" className={cell}>
          <span className="sr-only">Apartment amenities</span>
        </th>
        {columns.map((property, index) => {
          return (
            <td key={property?.id ?? index} className={`${cell} align-top`}>
              <AmenityList items={property?.amenities} expanded={expanded} />
            </td>
          );
        })}
      </tr>
      {hasMore && (
        <tr className="print:hidden">
          <td colSpan={columns.length + 1} className={`${cell} text-center`}>
            <button
              type="button"
              aria-expanded={expanded}
              className="rounded-full border border-[#d0d0d0] bg-white px-4 py-1 text-[11px] font-medium text-[#2f2f2f]"
              onClick={onToggle}
            >
              {expanded ? "View Less" : "View More"}
            </button>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function ProjectAmenityComparisonRows({
  columns,
  cell,
  sectionCell,
  expanded,
  onToggle,
}: {
  columns: (Property | undefined)[];
  cell: string;
  sectionCell: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasMore = columns.some(property => amenityNames(property?.projectAmenities).length > INITIAL_AMENITY_COUNT);

  return (
    <Fragment>
      <tr>
        <th colSpan={columns.length + 1} className={sectionCell}>Project amenities</th>
      </tr>
      <tr>
        <th scope="row" className={cell}>
          <span className="sr-only">Project amenities</span>
        </th>
        {columns.map((property, index) => {
          return (
            <td key={property?.id ?? index} className={`${cell} align-top`}>
              <AmenityList items={property?.projectAmenities} expanded={expanded} />
            </td>
          );
        })}
      </tr>
      {hasMore && (
        <tr className="print:hidden">
          <td colSpan={columns.length + 1} className={`${cell} text-center`}>
            <button
              type="button"
              aria-expanded={expanded}
              className="rounded-full border border-[#d0d0d0] bg-white px-4 py-1 text-[11px] font-medium text-[#2f2f2f]"
              onClick={onToggle}
            >
              {expanded ? "View Less" : "View More"}
            </button>
          </td>
        </tr>
      )}
      <tr>
        <td className={cell} />
        {columns.map((property, index) => (
          <td key={property?.id ?? index} className={`${cell} text-center`}>
            {property?.projectId && !property.projectHidden ? (
              <Link
                href={`/projects/${property.projectId}`}
                className="inline-flex h-8 items-center gap-2 rounded-full border border-[#d9d9d9] bg-white px-4 text-[11px] font-medium text-[#242424] shadow-sm hover:bg-[#f7f7f7]"
              >
                View Details
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            ) : (
              "-"
            )}
          </td>
        ))}
      </tr>
    </Fragment>
  );
}

function ComparisonPicker({ property, excluded, onAdd }: { property: Property; excluded: string[]; onAdd: (property: Property) => void }) {
  const [opened, setOpened] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [listingId, setListingId] = useState("");
  const projects = useQuery({ ...projectQueries.search(defaultProjectCriteria({ city: property.city, perPage: 50 })), enabled: opened });
  const project = projects.data?.items.find(item => item.id === projectId);
  const listings = useQuery({ ...propertyQueries.search(defaultPropertyCriteria({ city: property.city, intent: property.intent, category: property.category, q: project?.name ?? "", perPage: 50 })), enabled: !!project });
  const candidates = listings.data?.items.filter(item => item.intent === property.intent && item.projectId === projectId && !excluded.includes(item.id)) ?? [];
  return <div className="flex flex-col gap-2 print:hidden">
    <span className="text-[11px] font-medium text-[#2f2f2f]">Add property</span>
    <NativeSelect aria-label="Select comparison project" className="h-9 rounded-md border border-[#d8d8d8] bg-white text-xs text-[#2a2a2a]" value={projectId} onFocus={() => setOpened(true)} onChange={event => { setProjectId(event.target.value); setListingId(""); }}>
      <option value="">{projects.isFetching ? "Loading projects…" : "Select project…"}</option>
      {projects.data?.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </NativeSelect>
    {projects.isError && <button type="button" className="text-xs underline" onClick={() => projects.refetch()}>Retry projects</button>}
    <NativeSelect aria-label="Select comparison unit" className="h-9 rounded-md border border-[#d8d8d8] bg-white text-xs text-[#2a2a2a]" value={listingId} disabled={!project || listings.isFetching} onChange={event => setListingId(event.target.value)}>
      <option value="">{listings.isFetching ? "Loading units…" : project && !candidates.length ? "No matching units" : "Select unit…"}</option>
      {candidates.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
    </NativeSelect>
    {listings.isError && <button type="button" className="text-xs underline" onClick={() => listings.refetch()}>Retry units</button>}
    <Button size="sm" className="h-9 rounded-md bg-[#3b3b3b] text-xs font-medium text-white hover:bg-[#222]" disabled={!listingId} onClick={() => { const item = candidates.find(p => p.id === listingId); if (item) onAdd(item); }}>Add to Compare</Button>
  </div>;
}

/** Shares the site's three-item sale/rental Compare store and public listing adapters. */
export function ListingComparison({ property }: { property: Property }) {
  const { status } = useSession();
  const saved = useCompareItems();
  const toggle = useSavedStore(state => state.toggle);
  const remove = useSavedStore(state => state.remove);
  const [expanded, setExpanded] = useState<string[]>([]);
  const selected = saved.filter(item => item.kind === "property" && (item.intent ?? "buy") === property.intent && item.id !== property.id).slice(0, 2);
  const ids = selected.map(item => item.id);
  const records = useQuery({
    queryKey: ["listing-comparison", ...ids],
    enabled: status === "authenticated" && ids.length > 0,
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<Property[]> => {
      const response = await fetch("/api/properties/by-ids", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingIds: ids }), signal });
      if (!response.ok) throw new Error("Couldn't load comparison properties.");
      const data = await response.json();
      return Array.isArray(data.items) ? data.items : [];
    },
  });
  if (status !== "authenticated") return null;
  const columns = [property, ...ids.map(id => records.data?.find(p => p.id === id && p.intent === property.intent))];
  while (columns.length < 3) columns.push(undefined);
  const add = (candidate: Property) => {
    const currentSaved = useSavedStore.getState().compare.some(item => item.kind === "property" && item.id === property.id);
    if (!currentSaved) {
      const result = toggle("compare", { kind: "property", id: property.id, title: property.title, intent: property.intent });
      if (result === "limit") { toast.error("Remove a property from Compare before adding another."); return; }
    }
    const result = toggle("compare", { kind: "property", id: candidate.id, title: candidate.title, intent: candidate.intent });
    if (result === "limit") toast.error("You can compare up to three properties of the same purpose.");
  };
  const compareTitle = property.unitType ? `Compare this ${property.unitType.toLowerCase()}` : "Compare this apartment";
  const roomNames = [...new Set(columns.flatMap((item) => item?.rooms?.map((room) => room.name) ?? []))];
  const configurationRows: ComparisonRow[] = [
    { label: "Area Type", value: (p) => p.areaType ?? p.areaBasis, display: "area-type" },
    { label: "Area", value: (p) => p.areaKnown === false ? undefined : p.areaSqft.toLocaleString("en-IN"), display: "area" },
    ...roomNames.map((name): ComparisonRow => ({
      label: name,
      value: () => undefined,
      display: "room",
      roomName: name,
    })),
  ];
  const visibleGroups = groups.map(group => group.name === "Commercial"
    ? {
        ...group,
        rows: group.rows
          .filter(row => property.intent === "rent" || row.label !== "Security deposit")
          .map(row => row.label === "Price"
            ? { ...row, label: property.intent === "rent" ? "Monthly Rent" : "Sale Price" }
            : row),
      }
    : group.name === "Property configuration"
      ? { ...group, expandable: configurationRows.length > 15, rows: configurationRows }
      : group);
  const cell = "border border-[#dfe1e3] bg-white px-3 py-2 align-top text-[13px] text-[#1f1f1f]";
  const headerCell = "border border-[#dfe1e3] bg-[#f7f7f7] px-3 py-3 align-top text-left";
  const sectionCell = "border border-[#dfe1e3] bg-[#ebebeb] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2f2f2f]";
  const photoLabels = [...new Set(columns.flatMap((item) => item?.propertyPhotos?.map((photo) => photo.label) ?? []))];
  const visiblePhotoLabels = photoLabels.filter(label => columns.some(item =>
    comparisonPhotoUrl(item?.propertyPhotos?.find(photo => photo.label === label)?.url)
  ));

  return (
    <section id="compare" className="listing-comparison mt-8 flex scroll-mt-32 flex-col gap-4" aria-label="Property comparison table">
      <SectionHeading className="text-center lg:text-[26px]">{compareTitle}</SectionHeading>

      {records.isError && (
        <p role="alert" className="text-sm">
          Comparison details couldn&apos;t be loaded. <button className="underline" onClick={() => records.refetch()}>Try again</button>
        </p>
      )}

      <div className="overflow-x-auto rounded-[10px] border border-[#dfe1e3] bg-[#f5f5f5]" tabIndex={0} role="region" aria-label="Property comparison table, scroll horizontally">
        <table className="w-full min-w-[900px] table-fixed border-collapse text-left text-xs">
          <caption className="sr-only">Compare up to three {property.intent === "rent" ? "rental" : "sale"} properties.</caption>
          <thead>
            <tr>
              <th className={`${headerCell} w-[25%] align-middle text-center`}>
                <Button
                  size="sm"
                  className="h-10 rounded-md bg-[#1a1a1a] px-6 text-sm font-semibold text-white print:hidden"
                  onClick={() => {
                    document.documentElement.classList.add("print-listing-comparison");
                    const cleanup = () => document.documentElement.classList.remove("print-listing-comparison");
                    window.addEventListener("afterprint", cleanup, { once: true });
                    window.print();
                  }}
                >
                  Compare in PDF
                </Button>
              </th>

              {columns.map((p, index) => (
                <th key={p?.id ?? index} className={`${headerCell} min-w-[240px] bg-white align-top`}>
                  {p ? (
                    <div className="flex flex-col gap-2 py-1">
                      <div className="relative overflow-hidden rounded-lg border border-[#e4e4e4] bg-[#f9f9f9]">
                        <Image
                          src={p.images[0] ?? "/images/placeholder-property.jpg"}
                          alt={p.title}
                          width={320}
                          height={240}
                          className="h-[210px] w-full bg-[#f2f2f2] object-contain"
                        />
                        <button
                          type="button"
                          aria-label={`Remove ${p.title} from comparison`}
                          className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full border border-white/80 bg-white/90 text-[12px] font-medium text-[#333] shadow-sm print:hidden"
                          onClick={() => remove("compare", { kind: "property", id: p.id })}
                        >
                          ×
                        </button>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-semibold text-[#1c1c1c]">{p.title}</span>
                        <span className="text-[12px] text-[#5f5f5f]">{p.locality}, {p.city}</span>
                      </div>
                    </div>
                  ) : ids[index - 1] ? (
                    <div className="py-2 text-[12px] text-[#4a4a4a]">
                      {records.isFetching ? "Loading…" : "Property unavailable"}
                      <button className="ml-1 underline" onClick={() => remove("compare", { kind: "property", id: ids[index - 1] })}>Remove</button>
                    </div>
                  ) : (
                    <div className="py-1"><ComparisonPicker property={property} excluded={columns.flatMap(item => item ? [item.id] : [])} onAdd={add} /></div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleGroups.filter(group => !["Furnishing", "Apartment amenities", "Project amenities"].includes(group.name)).map(group => (
              <Fragment key={group.name}>
                <tr>
                  <th colSpan={columns.length + 1} className={sectionCell}>{group.name}</th>
                </tr>

                {(group.expandable && !expanded.includes(group.name) ? group.rows.slice(0, group.name === "Property summary" ? 4 : 15) : group.rows).map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className={`${cell} font-medium text-[#4a4a4a]`}>{row.label}</th>
                    {columns.map((p, index) => (
                      <td key={p?.id ?? index} className={cell}>
                        {p
                          ? group.name === "Property configuration"
                            ? <ConfigurationCell property={p} row={row} />
                            : dash(row.value(p))
                          : "-"}
                      </td>
                    ))}
                  </tr>
                ))}

                {group.expandable && (
                  <tr className="print:hidden">
                    <td colSpan={columns.length + 1} className={`${cell} text-center`}>
                      <button
                        type="button"
                        aria-expanded={expanded.includes(group.name)}
                        className="rounded-full border border-[#d0d0d0] bg-[#f8f8f8] px-4 py-1 text-[11px] font-medium text-[#2f2f2f]"
                        onClick={() => setExpanded((value) => value.includes(group.name) ? value.filter((name) => name !== group.name) : [...value, group.name])}
                      >
                        {expanded.includes(group.name) ? "View less" : "View more"}
                      </button>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}

            {visiblePhotoLabels.length > 0 && <tr>
              <th colSpan={columns.length + 1} className={sectionCell}>Property photos</th>
            </tr>}

            {visiblePhotoLabels.map((label) => (
              <tr key={label}>
                <th scope="row" className="border border-[#dfe1e3] bg-[#f8f8fa] px-4 py-2 align-middle text-center text-[13px] font-medium text-black">
                  <span className="inline-flex items-center justify-center gap-3">
                    {label}
                    <Box className="size-4 shrink-0 text-rez-graphite" strokeWidth={1.6} aria-hidden />
                  </span>
                </th>
                {columns.map((p, index) => {
                  const photo = p?.propertyPhotos?.find((item) => item.label === label);
                  return (
                    <td key={p?.id ?? index} className="border border-[#dfe1e3] bg-[#f8f8fa] p-2 align-middle">
                      <ComparisonPhoto key={`${p?.id ?? index}:${photo?.url ?? ""}`} url={photo?.url} label={label} title={p?.title} />
                    </td>
                  );
                })}
              </tr>
            ))}

            <FurnishingComparisonRows
              columns={columns}
              cell={cell}
              sectionCell={sectionCell}
              expanded={expanded.includes("Furnishing")}
              onToggle={() => setExpanded(value => value.includes("Furnishing")
                ? value.filter(name => name !== "Furnishing")
                : [...value, "Furnishing"])}
            />

            <ApartmentAmenityComparisonRows
              columns={columns}
              cell={cell}
              sectionCell={sectionCell}
              expanded={expanded.includes("Apartment amenities")}
              onToggle={() => setExpanded(value => value.includes("Apartment amenities")
                ? value.filter(name => name !== "Apartment amenities")
                : [...value, "Apartment amenities"])}
            />

            <ProjectAmenityComparisonRows
              columns={columns}
              cell={cell}
              sectionCell={sectionCell}
              expanded={expanded.includes("Project amenities")}
              onToggle={() => setExpanded((value) => value.includes("Project amenities")
                ? value.filter((name) => name !== "Project amenities")
                : [...value, "Project amenities"])}
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}
