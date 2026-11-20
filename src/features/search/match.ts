import { BUDGET_TIERS } from "@/lib/constants";
import type {
  Intent,
  Paginated,
  Project,
  ProjectSearchCriteria,
  Property,
  PropertySearchCriteria,
  Realtor,
  RealtorSearchCriteria,
} from "@/types/models";
import type { PropertyArrayFilter } from "./criteria";
import {
  RENT_AVAILABILITY_OPTIONS,
  SALE_AVAILABILITY_OPTIONS,
  SALE_EXIT_DIRECTIONS,
  SALE_FURNISHING_ID_TO_LABEL,
} from "./sale-filter-options";

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
const matchesCount = (value: number | undefined, options: string[], greaterThan = 4) => {
  if (options.length === 0) return true;
  if (value === undefined) return false;
  return options.some((opt) => {
    const n = parseFloat(opt);
    if (opt === ">") return value > greaterThan;
    if (Number.isNaN(n)) return false;
    return opt.includes("+") ? value >= n : value === n;
  });
};

function matchesBhk(property: Property, options: string[], intent: Intent): boolean {
  if (options.length === 0) return true;
  return options.some((option) => {
    if (option === "Studio") return norm(property.bhkLabel ?? "") === "studio" || norm(property.unitType) === "studio";
    if (option === "5+ BHK" && intent === "rent") return property.bhkLabel === "5+ BHK";
    return matchesCount(property.bhk, [option]);
  });
}

const inList = (value: string | undefined, options: string[]) =>
  options.length === 0 || (!!value && options.some((o) => norm(o) === norm(value)));

/**
 * A chosen locality, matched as the backend's own filter (project_names_localities) matches it,
 * so the map's list finds what the list view finds: the listing's sub-region ("Parel") or finer
 * locality ("Lower Parel"), or the name in its location line or project name.
 */
function inLocalities(p: Property, options: string[]): boolean {
  if (options.length === 0) return true;
  return options.some((o) => {
    const v = norm(o);
    if (!v) return false;
    return [p.locality, p.subRegion, p.localityName].some((f) => !!f && norm(f) === v) || [p.locationLabel, p.projectName].some((f) => !!f && norm(f).includes(v));
  });
}

export function matchesProperty(p: Property, c: PropertySearchCriteria): boolean {
  if (norm(p.city) !== norm(c.city)) return false;
  if (p.intent !== c.intent) return false;
  if (p.category !== c.category) return false;
  if (!matchesText(c.q, [p.title, p.locality, p.projectName, p.unitType, p.city])) return false;
  if (!inLocalities(p, c.localities)) return false;
  const unitTypes = c.unitTypes.map((value) =>
    value === "Independent Houses" ? "Independent House" :
      value === "Pent House" ? "Penthouse" :
        value === "Row/Town House" ? "Row House" : value,
  );
  if (!inList(p.unitType, unitTypes)) return false;
  if (!matchesBhk(p, c.bhk, c.intent)) return false;
  const furnishingOptions = c.furnishing.map((value) => SALE_FURNISHING_ID_TO_LABEL[value] ?? value);
  if (!inList(p.furnishingLabel ?? p.furnishing, furnishingOptions)) return false;
  if (c.availability.length > 0 && !c.availability.some((value) =>
    value === p.availabilityId ||
    norm(SALE_AVAILABILITY_OPTIONS.find((option) => option.value === value)?.label ??
      RENT_AVAILABILITY_OPTIONS.find((option) => option.value === value)?.label ?? value) === norm(p.availability ?? ""),
  )) return false;
  if (!inList(p.buildingType, c.buildingTypes)) return false;
  if (!matchesCount(p.bathrooms, c.bathrooms, 5)) return false;
  if (!matchesCount(p.parking, c.parking)) return false;
  if (!matchesCount(p.balconies, c.balconies)) return false;
  if (!matchesBuildingAge(p, c.buildingAges)) return false;
  if (!matchesPreferredApartment(p.unitNo, c.preferredApartment)) return false;
  if (!matchesFloor(p.floor, c.floorRanges)) return false;
  if (!matchesTimeOnRezide(p.listedAt, c.timeOnRezide)) return false;
  const facingOptions = c.facing.map((value) => SALE_EXIT_DIRECTIONS.find((direction) => direction.value === value)?.label ?? value);
  if (!inList(p.facing, facingOptions)) return false;
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

function matchesBuildingAge(property: Property, options: string[]): boolean {
  if (options.length === 0) return true;
  return options.some((option) => {
    if (option === "Under Construction") {
      const underConstructionId = SALE_AVAILABILITY_OPTIONS.find((availability) =>
        availability.label.toLowerCase() === "under construction",
      )?.value;
      return property.availabilityId === underConstructionId ||
        /under construction/i.test(property.buildingAgeLabel ?? property.availability ?? "");
    }
    if (property.buildingAgeLabel) {
      const cleanAgeLabel = (value: string) => norm(value.replace(/\s*years?$/i, "").trim());
      if (cleanAgeLabel(property.buildingAgeLabel) === cleanAgeLabel(option)) return true;
      if (option === "0-0" && /<\s*1\s*year/i.test(property.buildingAgeLabel)) return true;
    }
    const age = property.ageYears;
    if (age === undefined) return false;
    if (option === "0-0") return age < 1;
    if (option === "1 - 3 years") return age >= 1 && age < 3;
    if (option === "3 - 5 years") return age >= 3 && age < 5;
    if (option === "5 - 10") return age >= 5 && age < 10;
    if (option === "10 - 20") return age >= 10 && age <= 20;
    if (option === "> 20") return age > 20;
    return false;
  });
}

function matchesPreferredApartment(unitNo: string | undefined, options: string[]): boolean {
  if (options.length === 0) return true;
  if (!unitNo) return false;
  const digits = unitNo.replace(/\D/g, "");
  if (!digits) return false;
  const total = [...digits].reduce((sum, digit) => sum + Number(digit), 0);
  return options.includes(String(total));
}

function matchesFloor(floor: number | undefined, options: string[]): boolean {
  if (options.length === 0) return true;
  if (floor === undefined) return false;
  return options.some((option) => {
    if (option === "0") return floor === 0;
    const [min, max] = option.split("-").map(Number);
    return floor >= min && floor <= max;
  });
}

function matchesTimeOnRezide(listedAt: string | undefined, options: string[]): boolean {
  if (options.length === 0 || options.includes("Any Time") || options.includes("AnyTime")) return true;
  if (!listedAt) return false;
  const timestamp = Date.parse(listedAt);
  if (!Number.isFinite(timestamp)) return false;
  const days = Math.max(0, Date.now() - timestamp) / 86_400_000;
  return options.some((option) => {
    if (option === "New lising") return days < 1;
    const match = /^Less than (\d+) days$/.exec(option);
    return !!match && days < Number(match[1]);
  });
}

/**
 * Rate per sq ft as the card shows it: the backend's own rate when it has one (the
 * one its rate sort uses), else price ÷ area. Null when the price is withheld or unknown.
 */
const ratePsf = (p: Property) => {
  if (p.priceHidden || p.price <= 0) return null;
  if (p.ratePerSqft && p.ratePerSqft > 0) return p.ratePerSqft;
  return p.areaSqft > 0 ? p.price / p.areaSqft : null;
};

/**
 * Orders by a number, ascending or descending. Listings without one (area 0,
 * withheld price) always go last, so a "Low to High" list doesn't open on blanks.
 */
const byNumber = (value: (p: Property) => number | null, dir: 1 | -1) => (a: Property, b: Property) => {
  const x = value(a);
  const y = value(b);
  if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
  return (x - y) * dir;
};
const positive = (n: number) => (n > 0 ? n : null);

export function sortProperties(list: Property[], sort: PropertySearchCriteria["sort"]): Property[] {
  const out = [...list];
  const byId = (a: Property, b: Property) => a.id.localeCompare(b.id);
  const sortBy = (compare: (a: Property, b: Property) => number) => out.sort((a, b) => compare(a, b) || byId(a, b));
  switch (sort) {
    case "price-asc":
      return out.sort((a, b) => a.price - b.price || byId(a, b));
    case "price-desc":
      return out.sort((a, b) => b.price - a.price || byId(a, b));
    case "rate-asc":
      return sortBy(byNumber(ratePsf, 1));
    case "rate-desc":
      return sortBy(byNumber(ratePsf, -1));
    case "area-asc":
      return sortBy(byNumber((p) => positive(p.areaSqft), 1));
    case "area-desc":
      return sortBy(byNumber((p) => positive(p.areaSqft), -1));
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

/** Part of a map: [west, south, east, north]. */
export type MapArea = [west: number, south: number, east: number, north: number];

/** Reads `west,south,east,north` from a query string; anything else is no area. */
export function parseMapArea(value: string | null): MapArea | undefined {
  const parts = value?.split(",").map((v) => (v.trim() === "" ? NaN : Number(v))) ?? [];
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return undefined;
  const [west, south, east, north] = parts;
  return west <= east && south <= north ? [west, south, east, north] : undefined;
}

/** Listings with no known location have coords [0, 0], which no Indian map view includes. */
const isInArea = ({ coords: [lat, lng] }: Property, [west, south, east, north]: MapArea) =>
  lng >= west && lng <= east && lat >= south && lat <= north;

export function searchProperties(all: Property[], c: PropertySearchCriteria, area?: MapArea): Paginated<Property> {
  const found = all.filter((p) => matchesProperty(p, c) && (!area || isInArea(p, area)));
  return paginate(sortProperties(found, c.sort), c.page, c.perPage);
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
type ArrayFilter = PropertyArrayFilter;

export type PropertyFacets = {
  /** Listings matching the criteria as given. */
  total: number;
  /**
   * Per filter group, per option value: how many listings would match if that
   * value were the group's only choice, with every other group unchanged
   * ("disjunctive" facets). Values with no listings may be omitted (read as 0).
   */
  facets: Record<ArrayFilter, Record<string, number>>;
  /** Option counts that could not be obtained from the listings service. */
  unavailable?: Partial<Record<ArrayFilter, Record<string, true>>>;
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
    furnishing: (p) => (p.furnishingLabel ? [p.furnishingLabel] : p.furnishing ? [p.furnishing] : []),
    bathrooms: () => [],
    parking: () => [],
    media: (p) => p.media,
    facing: (p) => (p.facing ? [p.facing] : []),
    projects: (p) => (p.projectId ? [p.projectId] : []),
    availability: (p) => (p.availabilityId ? [p.availabilityId] : []),
    buildingTypes: (p) => (p.buildingType ? [p.buildingType] : []),
    balconies: (p) => (p.balconies !== undefined ? [String(p.balconies)] : []),
    buildingAges: (p) => (p.buildingAgeLabel ? [p.buildingAgeLabel] : []),
    preferredApartment: () => [],
    floorRanges: () => [],
    timeOnRezide: () => [],
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
