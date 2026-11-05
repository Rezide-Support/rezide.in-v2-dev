import { formatArea } from "@/lib/format";
import type { Property } from "@/types/models";

export type FieldRow = { label: string; value: string };

const na = (v: string | number | undefined | null) => (v === undefined || v === null || v === "" ? "N/A" : String(v));

/**
 * Rows for the v1 "Property" info tab. Fields that don't apply to the
 * category are left out; applicable fields with no data show "N/A" (as v1 does).
 */
export function propertyFields(p: Property): FieldRow[] {
  const homes = p.category === "homes";
  const rows: FieldRow[] = [
    { label: "City", value: p.city },
    { label: "Region", value: na(p.region) },
    { label: "Sub region", value: na(p.subRegion ?? p.locality) },
    { label: "Locality", value: p.locality },
    { label: "Project type", value: na(p.projectType) },
    { label: "Unit type", value: p.unitType },
  ];
  if (homes) {
    rows.push(
      { label: "Vastu: entry", value: na(p.vastuEntry) },
      { label: "Vastu: exit", value: na(p.vastuExit) },
      { label: "View", value: na(p.view) },
      { label: "Flooring", value: na(p.flooring) },
      { label: "BHK", value: p.unitType === "Studio" ? "Studio" : na(p.bhk && `${p.bhk} BHK`) },
      { label: "No. of balconies", value: na(p.balconies) },
      { label: "No. of bathrooms", value: na(p.bathrooms) },
      { label: "No. of parkings", value: na(p.parking) },
      { label: "No. of lifts", value: na(p.lifts) },
      { label: "Furnishing", value: na(p.furnishing) },
    );
  } else {
    if (p.facing) rows.push({ label: "Facing", value: p.facing });
    if (p.flooring) rows.push({ label: "Flooring", value: p.flooring });
    // Category-specific specs (seats, clear height, road width, ...).
    for (const s of p.specs) if (s.label !== "Facing") rows.push({ label: s.label, value: s.value });
    if (p.lifts !== undefined) rows.push({ label: "No. of lifts", value: String(p.lifts) });
  }
  rows.push({ label: `${p.areaBasis} area`, value: formatArea(p.areaSqft) });
  return rows;
}
