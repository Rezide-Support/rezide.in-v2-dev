"use client";

import { ToggleChip } from "@/components/common/chip";
import { ApplyContent } from "@/components/common/multi-select-dialog";
import { NativeSelect } from "@/components/common/native-select";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { pluralize } from "@/lib/format";
import type { ProjectSearchCriteria } from "@/types/models";

/*
 * rezide.in's "Project Filters" (the sliders button on its project list), laid out like this
 * app's property Filters drawer. The values are the ones rezide.in sends to the backend.
 */

/** rezide.in's project types; the backend filters on these ids. */
export const PROJECT_TYPE_OPTIONS = [
  { value: "650c671ba3021fab1835c038", label: "Gated amenities" },
  { value: "65320fb5d47054bedb0a9c28", label: "Gated no amenities" },
  { value: "650c6732a3021fab1835c045", label: "Standalone" },
  { value: "655ca24bce88a45e413f05bc", label: "Standalone no amenities" },
];
export const PROJECT_UNIT_TYPES = ["Studio", "Apartment", "Jodi", "Duplex", "Penthouse", "Independent floor", "Independent house", "Villa"];
export const PROJECT_BHK_OPTIONS = ["1 BHK", "1.5 BHK", "2 BHK", "2.5 BHK", "3 BHK", "3.5 BHK", "4 BHK", "4.5 BHK", "5 BHK", "5+ BHK"];
/** "Project With Video / VR". */
export const PROJECT_MEDIA_OPTIONS = ["Video", "VR Tour"];
/** "Area Range (250 - 10000 sqft)": rezide.in's min and max choices. */
export const PROJECT_AREA_MIN = [250, 300, 400, 500, 1000, 1500, 2000, 3000, 4000, 5000];
export const PROJECT_AREA_MAX = [...PROJECT_AREA_MIN, 10000];

export const formatSqft = (n: number) => `${n.toLocaleString("en-IN")} sq. ft`;

type ArrayKey = "projectTypes" | "unitTypes" | "bhk" | "media";
const GROUPS: { key: ArrayKey; label: string; options: { value: string; label: string }[] }[] = [
  { key: "projectTypes", label: "Project type", options: PROJECT_TYPE_OPTIONS },
  { key: "unitTypes", label: "Unit type", options: PROJECT_UNIT_TYPES.map((v) => ({ value: v, label: v })) },
  { key: "bhk", label: "BHK", options: PROJECT_BHK_OPTIONS.map((v) => ({ value: v, label: v })) },
];
const MEDIA_GROUP = { key: "media" as const, label: "Project with Video / VR", options: PROJECT_MEDIA_OPTIONS.map((v) => ({ value: v, label: v })) };

export const RESET_DRAWER: Partial<ProjectSearchCriteria> = { projectTypes: [], unitTypes: [], bhk: [], media: [], areaMin: undefined, areaMax: undefined };

/** How many drawer filters are on (an area range counts once), for the button's badge. */
export const countDrawerFilters = (c: ProjectSearchCriteria) =>
  c.projectTypes.length + c.unitTypes.length + c.bhk.length + c.media.length + (c.areaMin !== undefined || c.areaMax !== undefined ? 1 : 0);

const areaLabel = (min?: number, max?: number) =>
  min !== undefined && max !== undefined
    ? `${min.toLocaleString("en-IN")} - ${formatSqft(max)}`
    : min !== undefined
      ? `Above ${formatSqft(min)}`
      : `Up to ${formatSqft(max ?? 0)}`;

/** The removable chips for the drawer's filters, shown under the search bar. */
export function drawerChips(c: ProjectSearchCriteria): { id: string; label: string; remove: Partial<ProjectSearchCriteria> }[] {
  const chips = [...GROUPS, MEDIA_GROUP].flatMap((g) =>
    c[g.key].map((v) => ({
      id: `${g.key}:${v}`,
      label: g.options.find((o) => o.value === v)?.label ?? v,
      remove: { [g.key]: c[g.key].filter((x) => x !== v) } as Partial<ProjectSearchCriteria>,
    })),
  );
  if (c.areaMin !== undefined || c.areaMax !== undefined) {
    chips.push({ id: "area", label: areaLabel(c.areaMin, c.areaMax), remove: { areaMin: undefined, areaMax: undefined } });
  }
  return chips;
}

export function ProjectFilterDrawer({
  open,
  onOpenChange,
  criteria,
  update,
  total,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  criteria: ProjectSearchCriteria;
  update: (patch: Partial<ProjectSearchCriteria>) => void;
  total: number | undefined;
  pending: boolean;
}) {
  const toggle = (key: ArrayKey, value: string) => {
    const cur = criteria[key];
    update({ [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
  };
  const renderGroup = (g: (typeof GROUPS)[number] | typeof MEDIA_GROUP) => (
    <fieldset key={g.key} className="border-b border-rez-smoke py-[22px]">
      <legend className="eyebrow float-left mb-3.5 w-full text-black">{g.label}</legend>
      <div className="clear-both flex flex-wrap gap-2">
        {g.options.map((o) => (
          <ToggleChip key={o.value} pressed={criteria[g.key].includes(o.value)} onClick={() => toggle(g.key, o.value)}>
            {o.label}
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
            <span className="eyebrow text-rez-graphite">Project filters</span>
            <SheetTitle>
              Projects<span className="sr-only"> in {criteria.city}</span>
            </SheetTitle>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close filters">
              <Icon name="x" size={20} />
            </Button>
          </SheetClose>
          <SheetDescription className="sr-only">Choose filters. Results update as you select options.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-7 pb-6">
          {GROUPS.map(renderGroup)}
          <fieldset className="border-b border-rez-smoke py-[22px]">
            <legend className="eyebrow float-left mb-3.5 w-full text-black">Area range (250 - 10,000 sq. ft)</legend>
            <div className="clear-both grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1.5">
                <span className="sr-only">Minimum area</span>
                <NativeSelect
                  size="lg"
                  value={criteria.areaMin ?? ""}
                  onChange={(e) => {
                    const min = e.target.value ? Number(e.target.value) : undefined;
                    // As rezide.in: a max at or below the new min is cleared.
                    update({ areaMin: min, ...(min !== undefined && criteria.areaMax !== undefined && criteria.areaMax <= min ? { areaMax: undefined } : {}) });
                  }}
                >
                  <option value="">Min.</option>
                  {PROJECT_AREA_MIN.map((n) => (
                    <option key={n} value={n}>
                      {formatSqft(n)}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="sr-only">Maximum area</span>
                <NativeSelect size="lg" value={criteria.areaMax ?? ""} onChange={(e) => update({ areaMax: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">Max.</option>
                  {PROJECT_AREA_MAX.filter((n) => criteria.areaMin === undefined || n > criteria.areaMin).map((n) => (
                    <option key={n} value={n}>
                      {formatSqft(n)}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </div>
          </fieldset>
          {renderGroup(MEDIA_GROUP)}
        </div>
        <SheetFooter className="flex-row items-center justify-between gap-3 border-t border-rez-smoke px-7 py-[18px]">
          <Button variant="secondary" size="lg" onClick={() => update(RESET_DRAWER)}>
            Reset
          </Button>
          <Button size="lg" onClick={() => onOpenChange(false)} aria-live="polite">
            <ApplyContent
              label={pending || total === undefined ? "Updating" : total === 0 ? "No matches" : `Show ${pluralize(total, "project")}`}
              loading={pending || total === undefined}
            />
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
