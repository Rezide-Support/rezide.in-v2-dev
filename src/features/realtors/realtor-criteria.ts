import { DEFAULT_CITY } from "@/lib/constants";
import type { RealtorSearchCriteria } from "@/types/models";

type ParamsLike = { get(key: string): string | null; getAll(key: string): string[] };

/** Realtor search criteria ↔ URL. `page` is unused (results are not paginated) but keeps the hook contract. */
export type RealtorUrlCriteria = RealtorSearchCriteria & { page: number };

export function parseRealtorCriteria(p: ParamsLike): RealtorUrlCriteria {
  return {
    city: p.get("city") || DEFAULT_CITY,
    by: p.get("by") === "firm" ? "firm" : "name",
    q: p.get("q")?.trim() ?? "",
    specializations: Array.from(new Set(p.getAll("spec").filter(Boolean))),
    locality: p.get("loc") ?? "",
    language: p.get("lang") ?? "",
    gender: p.get("gender") === "Female" || p.get("gender") === "Male" ? (p.get("gender") as string) : "",
    page: 1,
  };
}

export function serializeRealtorCriteria(c: RealtorUrlCriteria): URLSearchParams {
  const p = new URLSearchParams();
  p.set("city", c.city);
  if (c.by !== "name") p.set("by", c.by);
  if (c.q) p.set("q", c.q);
  c.specializations.forEach((s) => p.append("spec", s));
  if (c.locality) p.set("loc", c.locality);
  if (c.by === "name" && c.language) p.set("lang", c.language);
  if (c.by === "name" && c.gender) p.set("gender", c.gender);
  return p;
}
