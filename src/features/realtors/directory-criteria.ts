import { DEFAULT_CITY } from "@/lib/constants";
import type { DirectoryFilters } from "./directory-model";
import type { DirectoryGender } from "./directory-filtering";

export type DirectoryCriteria = DirectoryFilters & { city: string; by: "name" | "firm"; page: number; specializations: string[]; language: string; gender: "" | DirectoryGender };
type Params = { get(key: string): string | null; getAll(key: string): string[] };
export function parseDirectoryCriteria(p: Params): DirectoryCriteria {
  const values = (key: string) => [...new Set(p.getAll(key).flatMap(v => v.split(",")).map(v => v.trim()).filter(Boolean))];
  const page = Number(p.get("page"));
  const by = p.get("by") === "firm" ? "firm" : "name";
  const gender = p.get("gender");
  return { city: p.get("city") || DEFAULT_CITY, by, page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    subRegions: values("subRegions"), locality: values("locality").length ? values("locality") : values("loc"), projects: values("projects"), broker: values("broker").length ? values("broker") : values("q"),
    specializations: values("spec").length ? values("spec") : values("specialization"),
    language: by === "name" ? (p.get("lang") || p.get("language") || "").trim() : "",
    gender: by === "name" && (gender === "Male" || gender === "Female" || gender === "Not specified") ? gender : "" };
}
export function serializeDirectoryCriteria(c: DirectoryCriteria) {
  const p = new URLSearchParams({ city: c.city });
  if (c.by !== "name") p.set("by", c.by);
  if (c.page > 1) p.set("page", String(c.page));
  for (const key of ["subRegions", "locality", "projects", "broker"] as const) c[key].forEach(v => p.append(key, v));
  c.specializations.forEach(value => p.append("spec", value));
  if (c.by === "name" && c.language) p.set("lang", c.language);
  if (c.by === "name" && c.gender) p.set("gender", c.gender);
  return p;
}
export function directoryFilters(c: DirectoryCriteria): DirectoryFilters {
  return { city: c.city, subRegions: c.subRegions, locality: c.locality, projects: c.projects, broker: c.broker, ...(c.specializations.length ? { specializations: c.specializations } : {}) };
}
