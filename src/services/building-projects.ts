import { api } from "@/lib/api/client";
import { toProject, type BackendProjectRow } from "./project-mapper";
import type { Project } from "@/types/models";

export type BuildingProject = { project: Project; rentalCount: number; saleCount: number };
export type BuildingPage = { data: BuildingProject[]; result_count: number };
export type BuildingRequest = {
  page: number; pageSize: number; city?: string[];
  project_names_localities_subRegions: string[];
  listingExist: "exist"; sortBy: "listingExist";
};

/** Map public list fields only. Never hydrate each card through the detail API. */
export async function searchBuildingProjects(body: BuildingRequest): Promise<BuildingPage> {
  const { data } = await api.post<{ data?: (BackendProjectRow & { rental_count?: number | string; sale_count?: number | string })[]; result_count?: number }>("/Inventory/project/filter/new", body);
  const count = (value: unknown) => Math.max(0, Number(value) || 0);
  return {
    data: (data.data ?? []).map(row => ({
      project: { ...toProject(row, body.city?.[0] ?? ""), subRegion: row.sub_region?.trim() },
      rentalCount: count(row.rental_count), saleCount: count(row.sale_count),
    })),
    result_count: count(data.result_count),
  };
}
