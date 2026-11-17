"use client";

import { useState } from "react";
import { ToggleChip } from "@/components/common/chip";
import { NativeSelect } from "@/components/common/native-select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Icon } from "@/components/brand/icon";
import {
  BATHROOM_OPTIONS,
  BHK_OPTIONS,
  BUDGET_POINTS,
  FACING_OPTIONS,
  FURNISHING_OPTIONS,
  MEDIA_OPTIONS,
  PARKING_OPTIONS,
  UNIT_TYPES,
  categoryById,
  localitiesFor,
} from "@/lib/constants";
import { pluralize } from "@/lib/format";
import type { PropertySearchCriteria } from "@/types/models";
import { areaBandsFor, type PropertyArrayFilter } from "./criteria";
import type { PropertyFacets } from "./match";

type Group = { key: PropertyArrayFilter; label: string; options: string[]; format?: (v: string) => string };

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

/** `localities` replaces the built-in list (see localityOptions). */
export function filterGroups(c: PropertySearchCriteria, localities: string[] = localitiesFor(c.city)): Group[] {
  const groups: Group[] = [
    { key: "localities", label: "Locality", options: localities },
    { key: "unitTypes", label: c.category === "land" ? "Plot type" : "Property type", options: UNIT_TYPES[c.category] },
  ];
  if (c.category === "homes") {
    groups.push(
      { key: "bhk", label: "BHK", options: BHK_OPTIONS },
      { key: "furnishing", label: "Furnishing", options: FURNISHING_OPTIONS },
      { key: "bathrooms", label: "Bathrooms", options: BATHROOM_OPTIONS, format: (v) => `${v} Bath` },
    );
  }
  if (c.category !== "land") {
    groups.push({ key: "parking", label: "Parking", options: PARKING_OPTIONS, format: (v) => `${v} Parking` });
  }
  groups.push({ key: "media", label: "Listing with", options: MEDIA_OPTIONS });
  if (c.category === "homes" || c.category === "land") {
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
      // The prototype's homes drawer filters by BHK instead; only surface the control
      // when an area band arrived through a link (e.g. the home "Size" rail).
      return c.areaMin !== undefined || c.areaMax !== undefined ? "Carpet area" : null;
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
  return (
    <fieldset className="border-b border-rez-smoke py-[22px]">
      <legend className="eyebrow float-left mb-3.5 w-full text-black">{label}</legend>
      <div className="clear-both flex flex-wrap gap-2">
        {areaBandsFor(criteria.category).map((b) => {
          const on = criteria.areaMin === b.min && criteria.areaMax === b.max;
          return (
            <ToggleChip
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
  facets,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  criteria: PropertySearchCriteria;
  update: (patch: Partial<PropertySearchCriteria>) => void;
  total: number | undefined;
  pending: boolean;
  /** Per-option counts from GET /properties/facets; counts are hidden until they arrive. */
  facets?: PropertyFacets["facets"];
}) {
  const cat = categoryById(criteria.category);
  const points = BUDGET_POINTS[criteria.intent];
  const toggle = (key: PropertyArrayFilter, value: string) => {
    const cur = criteria[key];
    update({ [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
  };
  // Faceted count: listings that would match if this option were the group's only choice.
  const countFor = (key: PropertyArrayFilter, value: string) => (facets ? (facets[key]?.[value] ?? 0) : undefined);
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
      budgetMin: undefined,
      budgetMax: undefined,
      areaMin: undefined,
      areaMax: undefined,
    });
  // Locality chips hold their places while the drawer is open: choosing an option changes
  // the counts (and so the ranking), but the chips shouldn't move under the user's finger.
  const scope = open ? `${criteria.city}|${criteria.intent}|${criteria.category}` : "";
  const [shown, setShown] = useState({ scope, names: [] as string[] });
  const localities = keepOrder(shown.scope === scope ? shown.names : [], localityOptions(criteria, facets));
  if (shown.scope !== scope || localities.length !== shown.names.length) setShown({ scope, names: localities });
  const groups = filterGroups(criteria, localities);
  const areaLabel = areaGroupLabel(criteria);
  const renderGroup = (g: Group) => (
    <fieldset key={g.key} className="border-b border-rez-smoke py-[22px]">
      <legend className="eyebrow float-left mb-3.5 w-full text-black">{g.label}</legend>
      <div className="clear-both flex flex-wrap gap-2">
        {g.options.map((o) => (
          <ToggleChip
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="flex-row items-center justify-between gap-4 border-b border-rez-smoke px-7 py-6">
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow text-rez-graphite">{criteria.intent === "rent" ? "Rent filters" : "Sale filters"}</span>
            <SheetTitle>
              {criteria.intent === "rent" ? cat.lease : "Buy"} {cat.noun}
              <span className="sr-only"> in {criteria.city}</span>
            </SheetTitle>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close filters">
              <Icon name="x" size={20} />
            </Button>
          </SheetClose>
          <SheetDescription className="sr-only">
            Choose filters. Results update as you select options.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-7 pb-6">
          {groups.slice(0, 2).map(renderGroup)}
          {areaLabel && <AreaFieldset criteria={criteria} update={update} label={areaLabel} />}
          {groups.slice(2).map(renderGroup)}
          <fieldset className="py-[22px]">
            <legend className="eyebrow float-left mb-3.5 w-full text-black">
              Budget{criteria.intent === "rent" ? " (per month)" : ""}
            </legend>
            <div className="clear-both grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1.5">
                <span className="sr-only">Minimum budget</span>
                <NativeSelect
                  size="lg"
                  value={criteria.budgetMin ?? ""}
                  onChange={(e) => update({ budgetMin: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">Min budget</option>
                  {points.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="sr-only">Maximum budget</span>
                <NativeSelect
                  size="lg"
                  value={criteria.budgetMax ?? ""}
                  onChange={(e) => update({ budgetMax: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">Max budget</option>
                  {points.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </div>
          </fieldset>
        </div>
        <SheetFooter className="flex-row items-center justify-between gap-3 border-t border-rez-smoke px-7 py-[18px]">
          <Button variant="secondary" size="lg" onClick={reset}>
            Reset
          </Button>
          <Button size="lg" onClick={() => onOpenChange(false)} aria-live="polite">
            {pending || total === undefined ? "Updating…" : total === 0 ? "No matches" : `Show ${pluralize(total, "result")}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
