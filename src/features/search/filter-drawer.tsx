"use client";

import { useState } from "react";
import { ToggleChip } from "@/components/common/chip";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Icon } from "@/components/brand/icon";
import {
  BUDGET_POINTS,
  FACING_OPTIONS,
  MEDIA_OPTIONS,
  PARKING_OPTIONS,
  UNIT_TYPES,
  categoryById,
  localitiesFor,
} from "@/lib/constants";
import {
  SALE_AGE_OPTIONS,
  SALE_AREA_LABELS,
  SALE_AREA_MAX,
  SALE_AREA_MIN,
  SALE_AVAILABILITY_ID_TO_LABEL,
  SALE_AVAILABILITY_OPTIONS,
  SALE_BALCONY_OPTIONS,
  SALE_BATHROOM_OPTIONS,
  SALE_BHK_OPTIONS,
  SALE_BUDGET_LABELS,
  SALE_BUDGET_MAX,
  SALE_BUDGET_MIN,
  SALE_BUILDING_TYPES,
  SALE_EXIT_DIRECTIONS,
  SALE_FLOOR_OPTIONS,
  SALE_FURNISHING_ID_TO_LABEL,
  SALE_FURNISHING_OPTIONS,
  SALE_LISTING_OPTIONS,
  SALE_PARKING_OPTIONS,
  SALE_PREFERRED_APARTMENT_OPTIONS,
  SALE_PROPERTY_TYPES,
  SALE_TIME_OPTIONS,
  RENT_AVAILABILITY_OPTIONS,
  RENT_BHK_OPTIONS,
  RENT_BUDGET_OPTIONS,
  RENT_TIME_OPTIONS,
} from "./sale-filter-options";
import { pluralize } from "@/lib/format";
import type { PropertySearchCriteria } from "@/types/models";
import { areaBandsFor, type PropertyArrayFilter } from "./criteria";
import type { PropertyFacets } from "./match";

type Group = {
  key: PropertyArrayFilter;
  label: string;
  options: string[];
  format?: (v: string) => string;
  description?: string;
};

type DropdownOption = { value: number; label: string };

const CLEAR_FILTER_OPTION = "__clear_filter_option__";

function FilterDropdown({
  ariaLabel,
  placeholder,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  placeholder: string;
  value?: number;
  options: DropdownOption[];
  onChange: (value: number | undefined) => void;
}) {
  return (
    <Select
      value={value === undefined ? "" : String(value)}
      onValueChange={(selected) => onChange(selected === CLEAR_FILTER_OPTION ? undefined : Number(selected))}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-10 w-full min-w-0 rounded-full border border-rez-smoke bg-white px-[18px] text-left text-sm font-semibold text-black hover:border-black focus-visible:border-rez-mocaccino focus-visible:ring-0 data-[size=default]:h-10"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="start"
        sideOffset={4}
        collisionPadding={12}
        className="z-[70] max-h-[min(320px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-0 max-w-[calc(100vw-2rem)] rounded-xl border border-rez-smoke bg-white p-1.5 text-rez-graphite shadow-rez-lg ring-0"
      >
        <SelectGroup>
          <SelectLabel className="px-2.5 py-2 text-sm font-semibold text-black">Select option</SelectLabel>
          <SelectItem
            value={CLEAR_FILTER_OPTION}
            className="min-h-10 cursor-pointer rounded-lg px-2.5 py-2 text-sm whitespace-normal data-highlighted:bg-rez-cloud data-highlighted:text-black"
          >
            {placeholder}
          </SelectItem>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={String(option.value)}
              className="min-h-10 cursor-pointer rounded-lg px-2.5 py-2 text-sm whitespace-normal data-highlighted:bg-rez-cloud data-highlighted:text-black data-[state=checked]:bg-rez-cloud data-[state=checked]:font-medium data-[state=checked]:text-black"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/** Most locality options the drawer lists; the busiest come first. */
const MAX_LOCALITIES = 40;

/**
 * The drawer's locality options: the localities that have listings (most listings
 * first). Chosen ones keep their place; a chosen one outside the list goes at the end.
 * Until the counts arrive, only the chosen ones.
 */
export function localityOptions(c: PropertySearchCriteria, facets?: PropertyFacets["facets"]): string[] {
  if (!facets) return c.localities;
  const ranked = Object.entries(facets.localities ?? {})
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .map(([name]) => name)
    .slice(0, MAX_LOCALITIES);
  return [...new Set([...ranked, ...c.localities])];
}

/**
 * `next` in the order already on screen: options shown before keep their place
 * (even if their count changes) and new ones are added at the end, so chips
 * don't jump while the user is choosing.
 */
export function keepOrder(shown: readonly string[], next: readonly string[]): string[] {
  return [...new Set([...shown, ...next])];
}

function homeFilterGroups(intent: "buy" | "rent", localities: string[]): Group[] {
  const isRent = intent === "rent";
  return [
    { key: "localities", label: "Locality", options: localities },
    {
      key: "unitTypes",
      label: "Property type",
      options: SALE_PROPERTY_TYPES.map(({ value }) => value),
      format: (v) => SALE_PROPERTY_TYPES.find((o) => o.value === v)?.label ?? v,
    },
    { key: "bhk", label: "BHK", options: isRent ? RENT_BHK_OPTIONS : SALE_BHK_OPTIONS },
    {
      key: "furnishing",
      label: "Furnishing",
      options: SALE_FURNISHING_OPTIONS.map(({ value }) => value),
      format: (v) => SALE_FURNISHING_ID_TO_LABEL[v] ?? v,
    },
    {
      key: "availability",
      label: "Availability",
      options: (isRent ? RENT_AVAILABILITY_OPTIONS : SALE_AVAILABILITY_OPTIONS).map(({ value }) => value),
      format: (v) => isRent
        ? RENT_AVAILABILITY_OPTIONS.find((o) => o.value === v)?.label ?? v
        : SALE_AVAILABILITY_ID_TO_LABEL[v] ?? v,
    },
    { key: "buildingTypes", label: "Building type", options: SALE_BUILDING_TYPES },
    { key: "bathrooms", label: "Bathroom", options: SALE_BATHROOM_OPTIONS, format: (v) => v === ">" ? ">5" : v },
    { key: "balconies", label: "No. of balconies", options: SALE_BALCONY_OPTIONS, format: (v) => v === ">" ? ">4" : v },
    { key: "parking", label: "No. of parkings", options: SALE_PARKING_OPTIONS, format: (v) => v === ">" ? ">4" : v },
    { key: "media", label: "Listing With", options: SALE_LISTING_OPTIONS },
    {
      key: "preferredApartment",
      label: "Preferred Apartment number total",
      options: SALE_PREFERRED_APARTMENT_OPTIONS,
      description: "For ex: Unit no 1402, total = 1+4+0+2 = 7",
    },
    {
      key: "facing",
      label: "Main door Exit direction",
      options: SALE_EXIT_DIRECTIONS.map(({ value }) => value),
      format: (v) => SALE_EXIT_DIRECTIONS.find((o) => o.value === v)?.label ?? v,
    },
    {
      key: "floorRanges",
      label: "Floor range",
      options: SALE_FLOOR_OPTIONS.map(({ value }) => value),
      format: (v) => SALE_FLOOR_OPTIONS.find((o) => o.value === v)?.label ?? v,
    },
    {
      key: "buildingAges",
      label: "Age of building",
      options: SALE_AGE_OPTIONS.map(({ value }) => value),
      format: (v) => SALE_AGE_OPTIONS.find((o) => o.value === v)?.label ?? v,
    },
    {
      key: "timeOnRezide",
      label: "Time on Rezide",
      options: isRent ? RENT_TIME_OPTIONS.map(({ value }) => value) : SALE_TIME_OPTIONS,
      format: isRent ? (v) => RENT_TIME_OPTIONS.find((o) => o.value === v)?.label ?? v : undefined,
    },
  ];
}

/** `localities` replaces the built-in list (see localityOptions). */
export function filterGroups(c: PropertySearchCriteria, localities: string[] = localitiesFor(c.city)): Group[] {
  if (c.category === "homes") return homeFilterGroups(c.intent, localities);
  const groups: Group[] = [
    { key: "localities", label: "Locality", options: localities },
    { key: "unitTypes", label: c.category === "land" ? "Plot type" : "Property type", options: UNIT_TYPES[c.category] },
  ];
  if (c.category !== "land") {
    groups.push({ key: "parking", label: "Parking", options: PARKING_OPTIONS, format: (v) => `${v} Parking` });
  }
  groups.push({ key: "media", label: "Listing with", options: MEDIA_OPTIONS });
  if (c.category === "land") {
    groups.push({ key: "facing", label: "Main door / plot facing", options: FACING_OPTIONS, format: (v) => `${v} facing` });
  }
  return groups;
}

/** Label of the area group for a category, or null when the drawer should not offer it. */
export function areaGroupLabel(c: PropertySearchCriteria): string | null {
  switch (c.category) {
    case "land":
      return "Plot size";
    case "industrial":
      return "Built-up area";
    case "homes":
      return "Area";
    default:
      return "Carpet area";
  }
}

function AreaFieldset({
  criteria,
  update,
  label,
}: {
  criteria: PropertySearchCriteria;
  update: (patch: Partial<PropertySearchCriteria>) => void;
  label: string;
}) {
  if (criteria.category === "homes") {
    const minChoices = SALE_AREA_MIN.filter((value) => criteria.areaMax === undefined || value < criteria.areaMax);
    const maxChoices = SALE_AREA_MAX.filter((value) => criteria.areaMin === undefined || value > criteria.areaMin);
    return (
      <fieldset className="border-b border-rez-smoke py-4">
        <legend className="eyebrow float-left mb-2.5 w-full text-black">{label}</legend>
        <div className="clear-both grid grid-cols-2 gap-2">
          <label>
            <span className="sr-only">Minimum area</span>
            <FilterDropdown
              ariaLabel="Minimum area"
              placeholder="Min area"
              value={criteria.areaMin}
              options={minChoices.map((value) => ({ value, label: SALE_AREA_LABELS(value) }))}
              onChange={(areaMin) => {
                update({
                  areaMin,
                  areaMax: areaMin !== undefined && criteria.areaMax !== undefined && criteria.areaMax <= areaMin
                    ? undefined
                    : criteria.areaMax,
                });
              }}
            />
          </label>
          <label>
            <span className="sr-only">Maximum area</span>
            <FilterDropdown
              ariaLabel="Maximum area"
              placeholder="Max area"
              value={criteria.areaMax}
              options={maxChoices.map((value) => ({ value, label: SALE_AREA_LABELS(value) }))}
              onChange={(areaMax) => {
                update({
                  areaMax,
                  areaMin: areaMax !== undefined && criteria.areaMin !== undefined && criteria.areaMin >= areaMax
                    ? undefined
                    : criteria.areaMin,
                });
              }}
            />
          </label>
        </div>
      </fieldset>
    );
  }
  return (
    <fieldset className="border-b border-rez-smoke py-4">
      <legend className="eyebrow float-left mb-2.5 w-full text-black">{label}</legend>
      <div className="clear-both flex flex-wrap gap-1.5">
        {areaBandsFor(criteria.category).map((b) => {
          const on = criteria.areaMin === b.min && criteria.areaMax === b.max;
          return (
            <ToggleChip
            size="xs"
              key={b.label}
              pressed={on}
              onClick={() => update(on ? { areaMin: undefined, areaMax: undefined } : { areaMin: b.min, areaMax: b.max })}
            >
              {b.label}
            </ToggleChip>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FilterDrawer({
  open,
  onOpenChange,
  criteria,
  update,
  total,
  pending,
  countError = false,
  onRetryCount,
  onApply,
  facets,
  unavailableCounts,
  prefetchedLocalities = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  criteria: PropertySearchCriteria;
  update: (patch: Partial<PropertySearchCriteria>) => void;
  total: number | undefined;
  pending: boolean;
  countError?: boolean;
  onRetryCount?: () => void;
  /** Commit draft selections; closing the sheet alone leaves applied filters unchanged. */
  onApply?: () => void;
  /** Per-option counts from GET /properties/facets; counts are hidden until they arrive. */
  facets?: PropertyFacets["facets"];
  prefetchedLocalities?: string[];
  unavailableCounts?: PropertyFacets["unavailable"];
}) {
  const cat = categoryById(criteria.category);
  const points = BUDGET_POINTS[criteria.intent];
  const isSaleHomes = criteria.intent === "buy" && criteria.category === "homes";
  const isRentHomes = criteria.intent === "rent" && criteria.category === "homes";
  const isHomeDirectory = isSaleHomes || isRentHomes;
  const toggle = (key: PropertyArrayFilter, value: string) => {
    const cur = criteria[key];
    update({ [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
  };
  // Faceted count: listings that would match if this option were the group's only choice.
  const countFor = (key: PropertyArrayFilter, value: string) => {
    if (!facets) return undefined;
    return unavailableCounts?.[key]?.[value] ? null : (facets[key]?.[value] ?? 0);
  };
  const reset = () =>
    update({
      localities: [],
      unitTypes: [],
      bhk: [],
      furnishing: [],
      bathrooms: [],
      parking: [],
      media: [],
      facing: [],
      projects: [],
      availability: [],
      buildingTypes: [],
      balconies: [],
      buildingAges: [],
      preferredApartment: [],
      floorRanges: [],
      timeOnRezide: [],
      budgetMin: undefined,
      budgetMax: undefined,
      areaMin: undefined,
      areaMax: undefined,
    });
  // Locality chips hold their places while the drawer is open: choosing an option changes
  // the counts (and so the ranking), but the chips shouldn't move under the user's finger.
  const scope = open ? `${criteria.city}|${criteria.intent}|${criteria.category}` : "";
  const [shown, setShown] = useState({ scope, names: [] as string[] });
  const localities = keepOrder(shown.scope === scope ? shown.names : [], facets ? localityOptions(criteria, facets) : [...new Set([...prefetchedLocalities, ...criteria.localities])]);
  if (shown.scope !== scope || localities.length !== shown.names.length) setShown({ scope, names: localities });
  const groups = filterGroups(criteria, localities);
  const areaLabel = areaGroupLabel(criteria);
  const renderGroup = (g: Group) => (
    <fieldset key={g.key} className="border-b border-rez-smoke py-4">
      <legend className="eyebrow float-left mb-2.5 w-full text-black">{g.label}</legend>
      {g.description && (
        <p className="clear-both mb-2.5 text-sm text-rez-graphite">{g.description}</p>
      )}
      <div className="clear-both flex flex-wrap gap-1.5">
        {g.options.map((o) => (
          <ToggleChip
            size="xs"
            key={o}
            pressed={criteria[g.key].includes(o)}
            onClick={() => toggle(g.key, o)}
            count={countFor(g.key, o)}
          >
            {g.format ? g.format(o) : o}
          </ToggleChip>
        ))}
      </div>
    </fieldset>
  );
  const renderBudget = () => {
    const minOptions = isSaleHomes
      ? SALE_BUDGET_MIN
      : isRentHomes ? RENT_BUDGET_OPTIONS.map(({ value }) => value) : points.map((p) => p.value);
    const maxOptions = isSaleHomes
      ? SALE_BUDGET_MAX
      : isRentHomes ? RENT_BUDGET_OPTIONS.map(({ value }) => value) : points.map((p) => p.value);
    const minAllowed = minOptions.filter((value) => criteria.budgetMax === undefined || value < criteria.budgetMax);
    const maxAllowed = maxOptions.filter((value) => criteria.budgetMin === undefined || value > criteria.budgetMin);
    const labelOf = (value: number) => isSaleHomes
      ? SALE_BUDGET_LABELS(value)
      : isRentHomes
        ? RENT_BUDGET_OPTIONS.find((option) => option.value === value)?.label ?? String(value)
        : points.find((point) => point.value === value)?.label ?? String(value);
    return (
      <fieldset className="border-b border-rez-smoke py-4">
        <legend className="eyebrow float-left mb-2.5 w-full text-black">
          Budget{criteria.intent === "rent" ? " (per month)" : ""}
        </legend>
        <div className="clear-both grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="sr-only">Minimum budget</span>
            <FilterDropdown
              ariaLabel="Minimum budget"
              placeholder="Min budget"
              value={criteria.budgetMin}
              options={minAllowed.map((value) => ({ value, label: labelOf(value) }))}
              onChange={(budgetMin) => {
                update({ budgetMin, budgetMax: budgetMin !== undefined && criteria.budgetMax !== undefined && criteria.budgetMax <= budgetMin ? undefined : criteria.budgetMax });
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="sr-only">Maximum budget</span>
            <FilterDropdown
              ariaLabel="Maximum budget"
              placeholder="Max budget"
              value={criteria.budgetMax}
              options={maxAllowed.map((value) => ({ value, label: labelOf(value) }))}
              onChange={(budgetMax) => {
                update({ budgetMax, budgetMin: budgetMax !== undefined && criteria.budgetMin !== undefined && criteria.budgetMin >= budgetMax ? undefined : criteria.budgetMin });
              }}
            />
          </label>
        </div>
      </fieldset>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="flex w-full flex-col gap-0 p-0 sm:max-w-[400px]!">
        <SheetHeader className="flex-row items-center justify-between gap-3 border-b border-rez-smoke px-5 py-4">
          <div className="flex flex-col gap-1">
            <span className="eyebrow text-rez-graphite">{criteria.intent === "rent" ? "Rent filters" : "Sale filters"}</span>
            <SheetTitle className="text-lg!">
              {criteria.intent === "rent" ? cat.lease : "Buy"} {cat.noun}
              <span className="sr-only"> in {criteria.city}</span>
            </SheetTitle>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close filters">
              <Icon name="x" size={18} />
            </Button>
          </SheetClose>
          <SheetDescription className="sr-only">
            Choose filters, then select Show results to apply them.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {isHomeDirectory ? (
            <>
              {groups.slice(0, 4).map(renderGroup)}
              {renderBudget()}
              {groups.slice(4, 8).map(renderGroup)}
              {areaLabel && <AreaFieldset criteria={criteria} update={update} label={areaLabel} />}
              {groups.slice(8).map(renderGroup)}
            </>
          ) : (
            <>
              {groups.slice(0, 2).map(renderGroup)}
              {areaLabel && <AreaFieldset criteria={criteria} update={update} label={areaLabel} />}
              {groups.slice(2).map(renderGroup)}
              {renderBudget()}
            </>
          )}
        </div>
        <SheetFooter className="flex-row items-center justify-between gap-3 border-t border-rez-smoke px-5 py-3">
          <Button variant="secondary" onClick={reset}>
            Reset
          </Button>
          <div className="flex flex-col items-end gap-1">
            {countError && (
              <span role="status" className="text-xs text-red-700">
                Count unavailable. Retry before closing.
              </span>
            )}
            <Button
              onClick={() => countError ? onRetryCount?.() : onApply ? onApply() : onOpenChange(false)}
              aria-live="polite"
            >
              {countError
                ? "Retry count"
                : pending || total === undefined
                  ? "Updating…"
                  : total === 0
                    ? "No matches"
                    : `Show ${pluralize(total, "result")}`}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
