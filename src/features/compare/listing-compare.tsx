"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Box, Moon, Sun, X } from "lucide-react";
import { useDeferredValue, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { propertyHref } from "@/features/properties/property-card";
import { SaveIconButton } from "@/features/properties/detail/save-actions";
import { projectQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { COMPARE_LIMIT, compareGroupOf, useCompareItems, useSavedStore, type SavedItem } from "@/stores/saved";
import type { CompareListing, ComparePhoto, CompareRoom } from "@/services/compare-listings";
import { AmenityList, ComparePdfButton, GroupRow, Picker, ToggleRow, cellBorder, compareDate, matches, projectAge, td, tr, type Option } from "./project-compare";

/*
 * rezide.in's Sale / Rental compare table (/compare?type=Sale|Rental), section by section as
 * there: Commercials, Location, Property summary, Property configuration, Property photos,
 * External views, Furnishing, Apartment and Project amenities, and View Details.
 */

type Purpose = "sale" | "rent";
type Slot = CompareListing | undefined;

const PDF_URL = "/v1/admin/inventory/Listing/download-comparison-report-pdf";
/** rezide.in shows five furnishing items and amenities per listing until "View More". */
const LIST_SHOWN = 5;
/** Rows a collapsed configuration / photos / views section keeps, after its title row. */
const COLLAPSED_ROWS = 4;
/** rezide.in's external view rooms. */
const VIEW_ROOMS = ["Living Room", "Kitchen", "Bedroom 1", "Bedroom 2", "Bedroom 3", "Bedroom 4"];

/** rezide.in's area type names. */
export const AREA_TYPES: Record<string, string> = {
  total_usable_area: "Usable Area",
  rera_area: "Rera",
  built_up_area: "Build Up",
  carpet_area: "Carpet",
};

/** rezide.in's amounts: the first positive one (else zero), Indian grouping; "-" with none. */
export function formatListingPrice(...values: (number | undefined)[]): string {
  let zero: number | undefined;
  for (const v of values) {
    if (v === undefined || !Number.isFinite(v)) continue;
    if (v > 0) return v.toLocaleString("en-IN");
    if (v === 0 && zero === undefined) zero = 0;
  }
  return zero !== undefined ? zero.toLocaleString("en-IN") : "-";
}

/** "Sale Price" / "Monthly Rent": "₹ 5,50,00,000/-" or "₹ 85,000/- p.m.". */
export function priceText(l: CompareListing): string {
  if (l.purpose === "rent") return `₹ ${formatListingPrice(l.monthlyRent, l.propertyPrice, l.discountPrice, l.saleConsideration)}/- p.m.`;
  return l.discountPrice
    ? `₹ ${formatListingPrice(l.discountPrice, l.propertyPrice, l.saleConsideration)}/-`
    : `₹ ${formatListingPrice(l.saleConsideration, l.propertyPrice, l.discountPrice)}/-`;
}

/** "Rate Psf." for a sale ("₹ 61,591/-"), "Security Deposit" for a rental. */
export function secondaryPriceText(l: CompareListing): string {
  if (l.purpose === "rent") return l.securityDeposit ? `₹ ${l.securityDeposit.toLocaleString("en-IN")}/-` : "";
  return `₹ ${formatListingPrice(l.ratePerSqft)}/-`;
}

/** A room size as rezide.in rounds it, or "-". */
export const roomValue = (v: string | number | undefined) => (v === undefined || v === "" || v === "-" ? "-" : Math.ceil(Number(v)));
/** An area as rezide.in shows it: numbers rounded up, text as it is. */
const areaValue = (v: string | number | undefined) => {
  if (v === undefined || v === "" || v === "-") return "-";
  const n = Number(v);
  return Number.isFinite(n) ? Math.ceil(n) : String(v);
};

/** rezide.in's grey value boxes ("Entry [NE]", "L [17]"). */
function ValueBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="whitespace-nowrap">
      {label}
      <span className="ml-2 inline-flex w-16 items-center justify-center rounded-none bg-gray-100 p-2 text-xs font-semibold text-black">{children}</span>
    </div>
  );
}

/**
 * How rezide.in's configuration, photo and view sections open: everything shows at first under
 * "View More"; the button then shows "View Less", and from there it shuts to the first rows.
 */
type Fold = "initial" | "open" | "closed";
const nextFold = (f: Fold): Fold => (f === "open" ? "closed" : "open");

export function ListingCompare({ purpose }: { purpose: Purpose }) {
  const items = useCompareItems().filter((i) => i.kind === "property" && compareGroupOf(i) === purpose);
  const ids = items.map((i) => i.id);
  const query = useQuery({ ...projectQueries.compareListings(ids), enabled: ids.length > 0 });
  const byId = new Map((query.data?.listings ?? []).map((l) => [l.id, l]));
  const slots: Slot[] = Array.from({ length: COMPARE_LIMIT }, (_, i) => (items[i] ? byId.get(items[i].id) : undefined));
  const roomLabels = query.data?.roomLabels ?? [];

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [configFold, setConfigFold] = useState<Fold>("initial");
  const [photosFold, setPhotosFold] = useState<Fold>("initial");
  const [viewsFold, setViewsFold] = useState<Fold>("initial");
  const [allFurnishing, setAllFurnishing] = useState(false);
  const [allApartment, setAllApartment] = useState(false);
  const [allProject, setAllProject] = useState(false);

  if (ids.length > 0 && query.isPending) return <Skeleton className="h-[480px] w-full rounded-md" />;

  const any = slots.some(Boolean);
  const row = (label: string, read: (l: CompareListing) => ReactNode, empty: ReactNode = "-") => (
    <tr className={tr}>
      <td className={td}>{label}</td>
      {slots.map((l, i) => (
        <td key={l?.id ?? i} className={td}>
          {l ? read(l) : empty}
        </td>
      ))}
    </tr>
  );
  const dash = (v: string | undefined) => v || "-";
  const sorted = (list: string[], all: boolean) => {
    const s = [...list].sort((a, b) => a.localeCompare(b));
    return all ? s : s.slice(0, LIST_SHOWN);
  };
  const listRow = (pick: (l: CompareListing) => string[], all: boolean) => (
    <tr className={tr}>
      <td className={td} />
      {slots.map((l, i) => (
        <td key={l?.id ?? i} className={cn(td, "text-center align-baseline")}>
          {l && <AmenityList names={sorted(pick(l), all)} />}
        </td>
      ))}
    </tr>
  );

  // Property configuration: the area rows, then a row per room any listing has, in the labels' order.
  const roomOf = (l: Slot, name: string): CompareRoom | undefined => l?.rooms.find((r) => r.name === name);
  const roomRows = roomLabels.filter((name) => slots.some((l) => roomOf(l, name)));
  const configRows: ReactNode[] = [
    <tr key="area-type" className={tr}>
      <td className={cn(td, "whitespace-nowrap")}>Area Type</td>
      {slots.map((l, i) => (
        <td key={l?.id ?? i} className={td}>
          <ValueBox label="Area">{AREA_TYPES[l?.areaType ?? "rera_area"] ?? "-"}</ValueBox>
        </td>
      ))}
    </tr>,
    <tr key="area" className={tr}>
      <td className={cn(td, "whitespace-nowrap")}>Area</td>
      {slots.map((l, i) => (
        <td key={l?.id ?? i} className={td}>
          <ValueBox label="Area">{areaValue(l?.area ?? "0")}</ValueBox>
        </td>
      ))}
    </tr>,
    ...roomRows.map((name) => (
      <tr key={name} className={tr}>
        <td className={td}>{name}</td>
        {slots.map((l, i) => {
          const r = roomOf(l, name);
          return (
            <td key={l?.id ?? i} className={td}>
              <div className="flex gap-2">
                <ValueBox label="L">{roomValue(r?.length)}</ValueBox>
                <ValueBox label="B">{roomValue(r?.breadth)}</ValueBox>
                <ValueBox label="Area">{roomValue(r?.area)}</ValueBox>
              </div>
            </td>
          );
        })}
      </tr>
    )),
  ];

  // Property photos: a row per room label any listing has a photo for; columns only for listings.
  const photoOf = (l: Slot, label: string) => l?.photos.find((p) => p.label === label);
  const photoRows = roomLabels
    .filter((label) => slots.some((l) => photoOf(l, label)))
    .map((label) => (
      <tr key={label} className={tr}>
        <td className={cn(td, "text-center")}>
          <div className="flex items-center justify-center">
            <span>{label}</span>
            <PhotoSlider title={label} photos={slots.map((l) => photoOf(l, label))} />
          </div>
        </td>
        {slots.map((l) => (l ? <td key={l.id} className={td}><PhotoCell photo={photoOf(l, label)} /></td> : null))}
      </tr>
    ));

  const shown = (rows: ReactNode[], fold: Fold) => (fold === "closed" ? rows.slice(0, COLLAPSED_ROWS) : rows);
  const hasViews = slots.some((l) => l?.viewsDay.some((p) => VIEW_ROOMS.includes(p.label)));

  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className={tr}>
            <th scope="col" className={cn(cellBorder, "w-1/4 p-4 text-center align-middle font-medium")}>
              <ComparePdfButton url={PDF_URL} body={{ listingIds: ids, showImages: true }} />
            </th>
            {Array.from({ length: COMPARE_LIMIT }, (_, i) => (
              <th key={items[i]?.id ?? `empty-${i}`} scope="col" className={cn(cellBorder, "w-1/4 p-4 text-left align-middle font-medium")}>
                {items[i] ? <ListingHeader item={items[i]} listing={slots[i]} /> : <AddProperty purpose={purpose} taken={ids} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <GroupRow title="Commercials" />
          {row("Availability Date", (l) => (l.availableFrom ? compareDate(l.availableFrom) : ""), "")}
          {row(purpose === "rent" ? "Monthly Rent" : "Sale Price", priceText, "")}
          {row(purpose === "rent" ? "Security Deposit" : "Rate Psf.", secondaryPriceText, "")}

          <GroupRow title="Location" />
          {row("City", (l) => dash(l.city))}
          {row("Locality", (l) => dash(l.locality))}
          {row("Complex Name", (l) => dash(l.complexName))}

          <GroupRow title="Property summary" />
          {row("Property type", (l) => dash(l.propertyType))}
          {row("Tower", (l) => l.tower)}
          {row("Age of Property", (l) => (l.completionDate ? projectAge(l.completionDate) : "-"))}
          {row("Total Floors", (l) => (l.totalFloors === null ? "" : l.totalFloors), "")}
          {summaryOpen && (
            <>
              {row("Apartment on floor", (l) => l.floor)}
              {row("Unit no", (l) => l.unitNo)}
              {row("Bedrooms", (l) => dash(l.bedrooms))}
              {row("Bathrooms", (l) => dash(l.bathrooms))}
              {row("Balconies", (l) => dash(l.balconies))}
              {row("Car parks", (l) => dash(l.carParks))}
              {row("View / Overlooking", (l) => dash(l.view))}
              {row("Vastu (Main Door)", (l) => (
                <div className="flex gap-2">
                  <ValueBox label="Entry">{dash(l.entry)}</ValueBox>
                  <ValueBox label="Exit">{dash(l.exit)}</ValueBox>
                </div>
              ))}
            </>
          )}
          <ToggleRow open={summaryOpen} onToggle={() => setSummaryOpen((v) => !v)} />

          <GroupRow title="Property configuration" />
          {shown(configRows, configFold)}
          <ToggleRow open={configFold === "open"} onToggle={() => setConfigFold(nextFold)} />

          <GroupRow title="Property photos" />
          {shown(photoRows, photosFold)}
          <ToggleRow open={photosFold === "open"} onToggle={() => setPhotosFold(nextFold)} />

          {hasViews && (
            <>
              <GroupRow title="External views" />
              {shown(
                VIEW_ROOMS.filter((room) => slots.some((l) => l?.viewsDay.some((p) => p.label === room))).map((room) => <ViewRow key={room} room={room} slots={slots} />),
                viewsFold,
              )}
              <ToggleRow open={viewsFold === "open"} onToggle={() => setViewsFold(nextFold)} />
            </>
          )}

          <GroupRow title="Furnishing" />
          <tr className={tr}>
            <td className={cn(td, "font-semibold text-black")}>Status</td>
            {slots.map((l, i) => (
              <td key={l?.id ?? i} className={cn(td, "font-semibold text-black", i < 2 && "text-center")}>
                {l?.furnishing || "-"}
              </td>
            ))}
          </tr>
          {listRow((l) => l.furnishingItems, allFurnishing)}
          {any && <ToggleRow open={allFurnishing} onToggle={() => setAllFurnishing((v) => !v)} />}

          <GroupRow title="Apartment amenities" />
          {listRow((l) => l.apartmentAmenities, allApartment)}
          {any && <ToggleRow open={allApartment} onToggle={() => setAllApartment((v) => !v)} />}

          <GroupRow title="Project amenities" />
          {listRow((l) => l.projectAmenities, allProject)}
          {any && <ToggleRow open={allProject} onToggle={() => setAllProject((v) => !v)} />}

          <tr className={tr}>
            <td className={cn(td, "text-center")} />
            {slots.map((l, i) => (
              <td key={l?.id ?? i} className={cn(td, "text-center")}>
                {l ? (
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href={propertyHref(l)} target="_blank">
                      <span>View Details</span>
                      <ArrowRight className="ml-2 size-4" aria-hidden />
                      <span className="sr-only">: {l.name}</span>
                    </Link>
                  </Button>
                ) : (
                  "-"
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** The listing's photo, with rezide.in's box button to see it large. */
function PhotoCell({ photo }: { photo?: ComparePhoto }) {
  return (
    <div className="relative h-[150px] w-full overflow-hidden lg:h-[200px]">
      {photo && (
        <>
          {/* Upload URLs come without an image content type, which the optimiser rejects. */}
          <Image src={photo.url} alt={photo.label} fill unoptimized className="m-auto h-full w-full object-cover" />
          <div className="absolute top-0 right-0">
            <PhotoSlider title={photo.label} photos={[photo]} light />
          </div>
        </>
      )}
    </div>
  );
}

/** rezide.in's lightbox: the photos side by side, large. */
function PhotoSlider({ title, photos, light = false }: { title: string; photos: (ComparePhoto | undefined)[]; light?: boolean }) {
  const shown = photos.filter((p): p is ComparePhoto => !!p);
  if (shown.length === 0) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="link" aria-label={`View ${title} photos`} className={cn(light && "text-white")}>
          <Box className={cn("size-5", light && "fill-white text-white")} aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[min(1100px,calc(100vw-2rem))] p-4">
        <DialogTitle>{title}</DialogTitle>
        <div className="flex snap-x gap-3 overflow-x-auto">
          {shown.map((p, i) => (
            <div key={`${p.url}-${i}`} className="relative h-[60vh] min-w-[80%] snap-center sm:min-w-[48%]">
              <Image src={p.url} alt={p.label} fill unoptimized className="object-contain" />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** An external view row: the room, rezide.in's day / night switch, and each listing's view. */
function ViewRow({ room, slots }: { room: string; slots: Slot[] }) {
  const [night, setNight] = useState(false);
  const pick = (l: Slot) => (night ? l?.viewsNight : l?.viewsDay)?.find((p) => p.label === room);
  return (
    <tr className={tr}>
      <td className={cn(td, "text-center")}>
        <div className="flex items-center justify-center">
          <div>
            {room}
            <div className="mt-1 flex items-center justify-center space-x-2">
              <Sun className="size-4" aria-hidden />
              <Switch checked={night} onCheckedChange={setNight} aria-label={`Show ${room} at night`} />
              <Moon className="size-4" aria-hidden />
            </div>
          </div>
          <PhotoSlider title={room} photos={slots.map(pick)} />
        </div>
      </td>
      {slots.map((l) => (l ? <td key={l.id} className={td}><PhotoCell photo={pick(l)} /></td> : null))}
    </tr>
  );
}

/** A compared listing's header: photo, remove, shortlist and name (rezide.in's grey card). */
function ListingHeader({ item, listing }: { item: SavedItem; listing?: CompareListing }) {
  const remove = useSavedStore((s) => s.remove);
  return (
    <div className="relative w-[200px] rounded-md bg-[#eee] p-2 lg:w-full">
      <button
        type="button"
        onClick={() => {
          remove("compare", item);
          toast.success("Removed from compare");
        }}
        aria-label={`Remove ${item.title} from compare`}
        className="absolute -top-2 -right-1 z-10 flex size-6 items-center justify-center rounded-full border border-[#ddd] bg-[#FAFAF9] p-1 text-[#FF6161] hover:bg-gray-100"
      >
        <X className="size-4" aria-hidden />
      </button>
      <div className="relative m-auto h-[150px] w-full max-w-[324px] overflow-hidden lg:h-[242px]">
        {listing?.photo && <Image src={listing.photo} alt={listing.name} fill unoptimized className="object-cover" />}
        <SaveIconButton
          list="shortlist"
          kind="property"
          id={item.id}
          title={item.title}
          intent={item.intent}
          className="absolute top-2 right-2 z-[1] size-9 rounded-md bg-transparent p-0 text-black shadow-none hover:bg-white/30 [&_svg]:size-4"
        />
      </div>
      <div className="m-auto my-2 flex items-center justify-center gap-2">
        <h4 className="text-sm font-semibold text-[#242424]">{(listing?.name || item.title).substring(0, 30)}</h4>
      </div>
    </div>
  );
}

/** An empty column: pick a project, then one of its units for this tab, then "Add to Compare" (as on rezide.in). */
function AddProperty({ purpose, taken }: { purpose: Purpose; taken: string[] }) {
  const toggle = useSavedStore((s) => s.toggle);
  const [projectSearch, setProjectSearch] = useState("");
  const [project, setProject] = useState<Option>();
  const [unitSearch, setUnitSearch] = useState("");
  const [unit, setUnit] = useState<Option>();
  const projectText = useDeferredValue(projectSearch.trim());

  const projects = useQuery(projectQueries.compareProjects(projectText));
  const projectOptions =
    projectText.length > 2 ? (projects.data ?? []).filter((p) => matches(p.name, projectSearch)).map((p) => ({ value: p.id, label: p.name })) : null;
  const units = useQuery(projectQueries.compareUnits(project?.value ?? "", project?.label ?? "", purpose));
  const unitOptions = (units.data ?? []).filter((u) => matches(u.name, unitSearch)).map((u) => ({ value: u.id, label: u.name, disabled: taken.includes(u.id) }));

  const reset = () => {
    setProject(undefined);
    setProjectSearch("");
    setUnit(undefined);
    setUnitSearch("");
  };
  const add = () => {
    if (!unit) {
      toast.error("Please select a project");
      return;
    }
    if (taken.includes(unit.value)) {
      toast.error("Property is already in the compare list");
      return;
    }
    const result = toggle("compare", { kind: "property", id: unit.value, title: unit.label, intent: purpose === "rent" ? "rent" : "buy" });
    if (result === "limit") {
      toast.error("You can only compare 3 listings at a time");
      return;
    }
    toast.success("Added to compare");
    reset();
  };

  return (
    <div className="grid items-center justify-center gap-2">
      <h4 className="text-sm font-semibold text-[#242424]">Add Property</h4>
      <Picker
        placeholder="Select project..."
        searchPlaceholder="Search project..."
        selected={project}
        onSelect={(o) => {
          setProject(o);
          setUnit(undefined);
        }}
        search={projectSearch}
        onSearch={setProjectSearch}
        options={projectOptions}
        empty={projectOptions ? (projects.isFetching ? "Searching..." : "No project found.") : "Please search project."}
      />
      <Picker
        placeholder="Select unit..."
        searchPlaceholder="Search unit..."
        selected={unit}
        onSelect={setUnit}
        search={unitSearch}
        onSearch={setUnitSearch}
        options={unitOptions}
        empty={units.isFetching ? "Searching..." : "No unit found."}
      />
      <Button type="button" onClick={add} className="mt-2 rounded-md">
        Add to Compare
      </Button>
    </div>
  );
}
