"use client";

import { useQueries } from "@tanstack/react-query";
import { priceLabel, propertyHref } from "@/features/properties/property-card";
import { projectHref } from "@/features/projects/project-card";
import { formatArea, formatDate, formatNumber, formatPrice, formatRate, pluralize } from "@/lib/format";
import { projectQueries, propertyQueries } from "@/lib/queries";
import { compareGroupOf, type CompareGroup, type SavedItem } from "@/stores/saved";
import type { Project, Property } from "@/types/models";

/** The three compare tabs, in rezide.in's order. `type` is the /compare?type= value. */
export const COMPARE_TABS: { group: CompareGroup; label: string; type: string; empty: string }[] = [
  { group: "sale", label: "Sale", type: "sale", empty: "No properties for sale to compare." },
  { group: "rent", label: "Rental", type: "rental", empty: "No rental properties to compare." },
  { group: "projects", label: "Projects", type: "projects", empty: "No projects to compare." },
];

export const compareHref = (group: CompareGroup) => `/compare?type=${COMPARE_TABS.find((t) => t.group === group)!.type}`;

/** /compare showing just these projects (a project page's comparison), leaving the saved list alone. */
export const pageCompareHref = (ids: string[]) => `/compare?type=projects&ids=${ids.map(encodeURIComponent).join(",")}`;

/** The project ids a /compare link carries (?ids=a,b), up to three backend ids; null when it carries none. */
export function pageCompareIds(param: string | null): string[] | null {
  const ids = [...new Set((param ?? "").split(",").map((s) => s.trim()).filter((s) => /^[a-f0-9]{24}$/i.test(s)))].slice(0, 3);
  return ids.length ? ids : null;
}

/** One compared item with its full details, once they've loaded. */
export type CompareEntry = {
  item: SavedItem;
  group: CompareGroup;
  property?: Property;
  project?: Project;
  loading: boolean;
  failed: boolean;
};

/**
 * Loads each compared item's details (the same requests as its detail page, so they're
 * shared with it). A property's group comes from its loaded intent when the saved item
 * predates intent being kept.
 */
export function useCompareEntries(items: SavedItem[], enabled = true): CompareEntry[] {
  const results = useQueries({
    queries: items.map((item) =>
      item.kind === "project"
        ? { ...projectQueries.detail(item.id), enabled, select: (d: { project: Project }) => ({ project: d.project }) }
        : { ...propertyQueries.detail(item.id), enabled, select: (d: { property: Property }) => ({ property: d.property }) },
    ),
  });
  return items.map((item, i) => {
    const r = results[i];
    const data = r.data as { property?: Property; project?: Project } | undefined;
    const intent = item.intent ?? data?.property?.intent;
    return {
      item,
      group: compareGroupOf({ kind: item.kind, intent }),
      property: data?.property,
      project: data?.project,
      loading: r.isPending && enabled,
      failed: r.isError,
    };
  });
}

export const entryHref = (e: CompareEntry) => (e.item.kind === "project" ? projectHref({ id: e.item.id }) : propertyHref({ id: e.item.id }));
export const entryImage = (e: CompareEntry) => e.property?.images[0] ?? e.project?.images[0];

/** The short line under a name in the header menu: price for properties, place for projects. */
export function entrySummary(e: CompareEntry): string {
  if (e.property) return priceLabel(e.property);
  if (e.project) return [e.project.locality, e.project.city].filter(Boolean).join(", ");
  return "";
}

/* ---------------- The compare table's rows ---------------- */

export type Row<T> = { label: string; value: (x: T) => string | number | undefined };

const orDash = (v: string | number | undefined) => (v === undefined || v === "" ? "—" : String(v));
export const cellText = <T,>(row: Row<T>, x: T) => orDash(row.value(x));

const count = (n: number | undefined) => (n === undefined ? undefined : formatNumber(n));
const floorText = (p: Property) =>
  p.floor === undefined ? undefined : p.totalFloors ? `${p.floor} of ${p.totalFloors}` : String(p.floor);

/** Rows shared by Sale and Rental, after the price rows (rezide.in's compare page). */
const UNIT_ROWS: Row<Property>[] = [
  { label: "Property type", value: (p) => p.unitType },
  { label: "Complex name", value: (p) => p.projectName },
  { label: "Unit no.", value: (p) => p.unitNo },
  { label: "Apartment on floor", value: floorText },
  { label: "Total floors", value: (p) => count(p.totalFloors) },
  { label: "Area", value: (p) => (p.areaSqft ? `${formatArea(p.areaSqft)} (${p.areaBasis})` : undefined) },
  { label: "Bedrooms", value: (p) => (p.bhk ? `${p.bhk} BHK` : undefined) },
  { label: "Bathrooms", value: (p) => count(p.bathrooms) },
  { label: "Balconies", value: (p) => count(p.balconies) },
  { label: "Car parks", value: (p) => count(p.parking) },
  { label: "Furnishing", value: (p) => p.furnishing },
  { label: "Locality", value: (p) => p.localityName ?? p.locality },
  { label: "City", value: (p) => p.city },
  { label: "Age of property", value: (p) => (p.ageYears === undefined ? undefined : p.ageYears === 0 ? "New" : pluralize(p.ageYears, "year")) },
  { label: "Availability date", value: (p) => (p.availableFrom ? formatDate(p.availableFrom) : "Ready to move") },
  { label: "Vastu (main door)", value: (p) => p.vastuEntry },
  { label: "View / overlooking", value: (p) => p.view },
];

export const SALE_ROWS: Row<Property>[] = [
  { label: "Sale price", value: (p) => priceLabel(p) },
  { label: "Rate per sq ft", value: (p) => (p.priceHidden ? undefined : formatRate(p.price, p.areaSqft)) },
  ...UNIT_ROWS,
];

export const RENT_ROWS: Row<Property>[] = [
  { label: "Monthly rent", value: (p) => priceLabel(p) },
  { label: "Security deposit", value: (p) => (p.securityDeposit ? formatPrice(p.securityDeposit) : undefined) },
  ...UNIT_ROWS,
];

export const PROJECT_ROWS: Row<Project>[] = [
  { label: "Price range", value: (p) => (p.priceFrom ? `${formatPrice(p.priceFrom)}${p.priceTo > p.priceFrom ? ` – ${formatPrice(p.priceTo)}` : ""}` : undefined) },
  { label: "Rate per sq ft", value: (p) => (p.ratePerSqft ? `₹ ${formatNumber(p.ratePerSqft)} per sq ft` : undefined) },
  { label: "Developer", value: (p) => p.developer },
  { label: "Configurations", value: (p) => p.configurations },
  { label: "Locality", value: (p) => p.locality },
  { label: "City", value: (p) => p.city },
  { label: "Possession", value: (p) => p.possessionLabel },
  { label: "Land area", value: (p) => (p.acres ? `${p.acres} acres` : undefined) },
  { label: "No. of towers", value: (p) => (p.towers ? formatNumber(p.towers) : undefined) },
  { label: "Total apartments", value: (p) => (p.units ? formatNumber(p.units) : undefined) },
  { label: "RERA ID", value: (p) => p.reraId },
];

/* ---------------- "Compare this apartment" on a property page: grouped rows, as on rezide.in ---------------- */

export type CompareSectionDef =
  | { kind: "rows"; title: string; rows: Row<Property>[]; more?: Row<Property>[] }
  | { kind: "photos"; title: string }
  | { kind: "list"; title: string; items: (p: Property) => string[] };

const availability = (p: Property) => (p.availableFrom ? formatDate(p.availableFrom) : "Ready to move");

/** The sections of the property page's compare table. `more` rows sit behind "View More". */
export function compareSections(group: "sale" | "rent"): CompareSectionDef[] {
  const commercials: Row<Property>[] =
    group === "rent"
      ? [
          { label: "Availability Date", value: availability },
          { label: "Monthly Rent", value: (p) => priceLabel(p) },
          { label: "Security Deposit", value: (p) => (p.securityDeposit ? formatPrice(p.securityDeposit) : undefined) },
        ]
      : [
          { label: "Availability Date", value: availability },
          { label: "Sale Price", value: (p) => priceLabel(p) },
          { label: "Rate Psf.", value: (p) => (p.priceHidden ? undefined : formatRate(p.price, p.areaSqft)) },
        ];
  return [
    { kind: "rows", title: "Commercials", rows: commercials },
    {
      kind: "rows",
      title: "Location",
      rows: [
        { label: "City", value: (p) => p.city },
        { label: "Locality", value: (p) => p.localityName ?? p.locality },
        { label: "Complex Name", value: (p) => p.projectName },
      ],
    },
    {
      kind: "rows",
      title: "Property Summary",
      rows: [
        { label: "Property type", value: (p) => p.unitType },
        { label: "Age of Property", value: (p) => (p.ageYears === undefined ? undefined : p.ageYears === 0 ? "New" : pluralize(p.ageYears, "year")) },
        { label: "Total Floors", value: (p) => count(p.totalFloors) },
      ],
      more: [
        { label: "Unit no.", value: (p) => p.unitNo },
        { label: "Apartment on floor", value: floorText },
        { label: "Vastu (main door)", value: (p) => p.vastuEntry },
        { label: "View / overlooking", value: (p) => p.view },
      ],
    },
    {
      kind: "rows",
      title: "Property Configuration",
      rows: [
        { label: "Area Type", value: (p) => p.areaBasis },
        { label: "Area", value: (p) => (p.areaSqft ? formatArea(p.areaSqft) : undefined) },
      ],
      more: [
        { label: "Bedrooms", value: (p) => (p.bhk ? `${p.bhk} BHK` : undefined) },
        { label: "Bathrooms", value: (p) => count(p.bathrooms) },
        { label: "Balconies", value: (p) => count(p.balconies) },
        { label: "Car parks", value: (p) => count(p.parking) },
      ],
    },
    { kind: "photos", title: "Property Photos" },
    { kind: "rows", title: "Furnishing", rows: [{ label: "Status", value: (p) => p.furnishing }] },
    { kind: "list", title: "Apartment Amenities", items: (p) => p.amenities },
  ];
}