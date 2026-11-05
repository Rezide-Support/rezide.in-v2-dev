import { BUDGET_TIERS } from "@/lib/constants";
import type {
  Paginated,
  Project,
  ProjectSearchCriteria,
  Property,
  PropertySearchCriteria,
  Realtor,
  RealtorSearchCriteria,
} from "@/types/models";

/**
 * Pure matching functions over a fixed dataset. The mock API uses them today;
 * they double as the reference behaviour for the real search endpoint.
 * Within a filter group values are OR-ed; across groups they are AND-ed.
 */

const norm = (s: string) => s.toLocaleLowerCase("en-IN").normalize("NFKD");

/** Every whitespace-separated token must appear in at least one of the fields. */
export function matchesText(query: string, fields: (string | undefined)[]): boolean {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = fields.filter(Boolean).map((f) => norm(f as string));
  return tokens.every((t) => haystack.some((h) => h.includes(t)));
}

/** Matches "3 BHK" (or "2.5 BHK") exactly and "5+ BHK" as five or more. */
const matchesCount = (value: number | undefined, options: string[]) => {
  if (options.length === 0) return true;
  if (value === undefined) return false;
  return options.some((opt) => {
    const n = parseFloat(opt);
    if (Number.isNaN(n)) return false;
    return opt.includes("+") ? value >= n : value === n;
  });
};

const inList = (value: string | undefined, options: string[]) =>
  options.length === 0 || (!!value && options.some((o) => norm(o) === norm(value)));

export function matchesProperty(p: Property, c: PropertySearchCriteria): boolean {
  if (norm(p.city) !== norm(c.city)) return false;
  if (p.intent !== c.intent) return false;
  if (p.category !== c.category) return false;
  if (!matchesText(c.q, [p.title, p.locality, p.projectName, p.unitType, p.city])) return false;
  if (!inList(p.locality, c.localities)) return false;
  if (!inList(p.unitType, c.unitTypes)) return false;
  if (!matchesCount(p.bhk, c.bhk)) return false;
  if (!inList(p.furnishing, c.furnishing)) return false;
  if (!matchesCount(p.bathrooms, c.bathrooms)) return false;
  if (!matchesCount(p.parking, c.parking)) return false;
  if (!inList(p.facing, c.facing)) return false;
  if (c.projects.length > 0 && (!p.projectId || !c.projects.includes(p.projectId))) return false;
  if (c.media.length > 0 && !c.media.some((m) => p.media.includes(m as Property["media"][number]))) {
    return false;
  }
  if (c.budgetMin !== undefined && p.price < c.budgetMin) return false;
  if (c.budgetMax !== undefined && p.price > c.budgetMax) return false;
  if (c.areaMin !== undefined && p.areaSqft < c.areaMin) return false;
  if (c.areaMax !== undefined && p.areaSqft >= c.areaMax) return false;
  return true;
}

export function sortProperties(list: Property[], sort: PropertySearchCriteria["sort"]): Property[] {
  const out = [...list];
  const byId = (a: Property, b: Property) => a.id.localeCompare(b.id);
  switch (sort) {
    case "price-asc":
      return out.sort((a, b) => a.price - b.price || byId(a, b));
    case "price-desc":
      return out.sort((a, b) => b.price - a.price || byId(a, b));
    case "area-desc":
      return out.sort((a, b) => b.areaSqft - a.areaSqft || byId(a, b));
    default:
      return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || byId(a, b));
  }
}

export function paginate<T>(items: T[], page: number, perPage: number): Paginated<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * perPage;
  return { items: items.slice(start, start + perPage), total, page: current, perPage, pageCount };
}

export function searchProperties(all: Property[], c: PropertySearchCriteria): Paginated<Property> {
  return paginate(sortProperties(all.filter((p) => matchesProperty(p, c)), c.sort), c.page, c.perPage);
}

/* ---------------- Projects ---------------- */

export const budgetTierOf = (price: number) =>
  BUDGET_TIERS.find((t) => price >= t.min && price < t.max)?.id ?? "value";

export function matchesProject(p: Project, c: ProjectSearchCriteria): boolean {
  if (norm(p.city) !== norm(c.city)) return false;
  if (!matchesText(c.q, [p.name, p.developer, p.locality])) return false;
  if (c.status.length > 0 && !c.status.includes(p.status)) return false;
  if (!inList(p.locality, c.localities)) return false;
  if (c.budget.length > 0 && !c.budget.includes(budgetTierOf(p.priceFrom))) return false;
  if (c.years.length > 0 && (!p.possessionYear || !c.years.includes(p.possessionYear))) return false;
  if (c.views.length > 0 && !c.views.some((v) => p.views.includes(v))) return false;
  return true;
}

export function searchProjects(all: Project[], c: ProjectSearchCriteria): Paginated<Project> {
  const order = { nl: 0, uc: 1, rtm: 2 } as const;
  const matched = all
    .filter((p) => matchesProject(p, c))
    .sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
  return paginate(matched, c.page, c.perPage);
}

/* ---------------- Realtors ---------------- */

export function matchesRealtor(r: Realtor, c: RealtorSearchCriteria): boolean {
  if (c.city && norm(r.city) !== norm(c.city)) return false;
  if (!matchesText(c.q, c.by === "name" ? [r.name] : [r.firm])) return false;
  if (c.specializations.length > 0 && !c.specializations.some((s) => r.specializations.includes(s))) {
    return false;
  }
  if (c.locality && !r.localities.includes(c.locality) && !r.subRegions?.includes(c.locality)) return false;
  if (c.by === "name") {
    if (c.language && !r.languages.includes(c.language)) return false;
    if (c.gender && r.gender !== c.gender) return false;
  }
  return true;
}

export const searchRealtors = (all: Realtor[], c: RealtorSearchCriteria) =>
  all.filter((r) => matchesRealtor(r, c));

/* ---------------- Facets and groups (reference for GET /properties/facets and /properties/groups) ---------------- */

/** Property filter groups that take several values (see PropertyArrayFilter in criteria.ts). */
type ArrayFilter = "localities" | "unitTypes" | "bhk" | "furnishing" | "bathrooms" | "parking" | "media" | "facing" | "projects";

export type PropertyFacets = {
  /** Listings matching the criteria as given. */
  total: number;
  /**
   * Per filter group, per option value: how many listings would match if that
   * value were the group's only choice, with every other group unchanged
   * ("disjunctive" facets). Values with no listings may be omitted (read as 0).
   */
  facets: Record<ArrayFilter, Record<string, number>>;
};

/**
 * Faceted counts for the filter drawer. `options` lists the values to count
 * per group; values present in the data are always included.
 */
export function propertyFacets(
  all: Property[],
  c: PropertySearchCriteria,
  options: Partial<Record<ArrayFilter, string[]>> = {},
): PropertyFacets {
  const pool = all.filter((p) => norm(p.city) === norm(c.city) && p.intent === c.intent && p.category === c.category);
  const present: Record<ArrayFilter, (p: Property) => string[]> = {
    localities: (p) => [p.locality],
    unitTypes: (p) => [p.unitType],
    bhk: () => [],
    furnishing: (p) => (p.furnishing ? [p.furnishing] : []),
    bathrooms: () => [],
    parking: () => [],
    media: (p) => p.media,
    facing: (p) => (p.facing ? [p.facing] : []),
    projects: (p) => (p.projectId ? [p.projectId] : []),
  };
  const facets = {} as PropertyFacets["facets"];
  for (const key of Object.keys(present) as ArrayFilter[]) {
    const values = new Set([...(options[key] ?? []), ...pool.flatMap(present[key])]);
    const counts: Record<string, number> = {};
    for (const value of values) {
      const n = pool.filter((p) => matchesProperty(p, { ...c, [key]: [value] })).length;
      if (n > 0) counts[value] = n;
    }
    facets[key] = counts;
  }
  return { total: pool.filter((p) => matchesProperty(p, c)).length, facets };
}

export type PropertyGroupBy = "locality" | "project";

export type PropertyGroupSummary = {
  /** Locality name, or project id. */
  key: string;
  count: number;
  /** Distinct projects among the group's listings. */
  projectCount: number;
  /** INR; null when the group is empty. */
  minPrice: number | null;
  maxPrice: number | null;
  /** First photo of the most recently updated listing in the group. */
  image: string | null;
};

/** Listings matching `c`, summarised per locality or per project (only non-empty groups). */
export function groupProperties(all: Property[], c: PropertySearchCriteria, by: PropertyGroupBy): PropertyGroupSummary[] {
  const groups = new Map<string, Property[]>();
  for (const p of sortProperties(all.filter((x) => matchesProperty(x, c)), "latest")) {
    const key = by === "locality" ? p.locality : p.projectId;
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups].map(([key, items]) => {
    // Withheld prices (sent as 0) don't count towards the range.
    const prices = items.filter((p) => !p.priceHidden).map((p) => p.price);
    return {
      key,
      count: items.length,
      projectCount: new Set(items.map((p) => p.projectId).filter(Boolean)).size,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      image: items[0].images[0] ?? null,
    };
  });
}
