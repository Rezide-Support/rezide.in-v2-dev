import { api } from "@/lib/api/client";
import { uploadUrl } from "@/lib/api/origins";

/*
 * A project's unit plans (per configuration) and floor plans (per tower), from the same
 * public Rezide backend endpoints rezide.in's project page calls from the browser.
 * Contract: docs/API.md → Projects.
 */

/** One room of a unit plan. `length` and `breadth` are as the backend sends them (feet). */
export type PlanRoom = { name: string; length: string; breadth: string; area: number };

/** One drawing of a plan; a combined (duplex/jodi) plan has one per level or unit. */
export type PlanPart = { label: string; bhk: string; area?: number; image: string; rooms: PlanRoom[] };

export type UnitPlan = {
  id: string;
  /** A combined plan joins several units or levels (duplex, jodi). */
  combined: boolean;
  label?: string;
  /** RERA, else carpet, else built-up, else saleable area (sq ft). */
  area?: number;
  /** The drawings: one for a simple plan, one per part for a combined plan. */
  parts: PlanPart[];
};

export type UnitPlans = { plans: UnitPlan[]; total: number };

export type TowerFloorPlans = { tower: string; images: string[] };

type BackendRoom = { name?: string; length?: string | number; breadth?: string | number; total_area?: number; TotalArea?: number };
type BackendAreas = { rera_area?: number; carpet_area?: number; built_up_area?: number; total_sellable_area?: number };
type BackendUnitPlan = BackendAreas & {
  _id?: string;
  id?: string;
  combined?: boolean;
  label?: string;
  unit_plan?: string;
  partitions?: BackendRoom[];
  combined_config?: { _id?: string; label?: string; config_name_data?: BackendAreas & { bhk?: string; unit_plan?: string; partitions?: BackendRoom[] } }[];
};

/** rezide.in's order: RERA, carpet, built-up, then saleable area. */
const areaOf = (a: BackendAreas | undefined) => [a?.rera_area, a?.carpet_area, a?.built_up_area, a?.total_sellable_area].find((n) => typeof n === "number" && n > 0);

const toRooms = (rooms: BackendRoom[] | undefined): PlanRoom[] =>
  (rooms ?? []).flatMap((r) =>
    r.name?.trim() ? [{ name: r.name.trim(), length: String(r.length ?? ""), breadth: String(r.breadth ?? ""), area: Number(r.TotalArea ?? r.total_area) || 0 }] : [],
  );

export function toUnitPlan(raw: BackendUnitPlan, index: number): UnitPlan | null {
  if (raw.combined) {
    const parts = (raw.combined_config ?? []).flatMap((c): PlanPart[] => {
      const d = c.config_name_data;
      if (!d?.unit_plan) return [];
      // rezide.in drops the "Level 0" prefix.
      const label = c.label?.trim() && c.label.trim().toLowerCase() !== "level 0" ? `${c.label.trim()} -` : "";
      return [{ label, bhk: d.bhk?.trim() ?? "", area: areaOf(d), image: uploadUrl(d.unit_plan), rooms: toRooms(d.partitions) }];
    });
    if (!parts.length) return null;
    return { id: raw._id ?? raw.id ?? `combined-${index}`, combined: true, area: areaOf(raw), parts };
  }
  if (!raw.unit_plan) return null;
  return {
    id: raw._id ?? raw.id ?? raw.unit_plan,
    combined: false,
    label: raw.label?.trim() || undefined,
    area: areaOf(raw),
    parts: [{ label: "", bhk: "", area: areaOf(raw), image: uploadUrl(raw.unit_plan), rooms: toRooms(raw.partitions) }],
  };
}

/** The unit plans of one configuration (e.g. "3 BHK"). */
export async function fetchUnitPlans(projectId: string, bhk: string): Promise<UnitPlans> {
  const { data } = await api.get<{ result?: BackendUnitPlan[]; unit_plan_count?: number }>("/inventory/project/detail-price-range", {
    params: { project_id: projectId, selected_price_range: bhk },
  });
  const plans = (data.result ?? []).map(toUnitPlan).filter((p): p is UnitPlan => p !== null);
  return { plans, total: plans.length };
}

/** "A" → "Tower A"; names that already say "tower" stay as they are (as rezide.in labels them). */
export const towerLabel = (name: string | undefined) => {
  const n = (name ?? "").trim();
  return n.toLowerCase().includes("tower") ? n : `Tower ${n}`.trim();
};

/** The floor plans of each tower. */
export async function fetchFloorPlans(projectId: string): Promise<TowerFloorPlans[]> {
  const { data } = await api.get<{ tower_name?: string; floorplans?: string[] }[]>(`/Inventory/project/floor-plan/${encodeURIComponent(projectId)}`);
  return (Array.isArray(data) ? data : []).map((t) => ({
    tower: towerLabel(t.tower_name),
    images: (t.floorplans ?? []).filter(Boolean).map(uploadUrl),
  }));
}
