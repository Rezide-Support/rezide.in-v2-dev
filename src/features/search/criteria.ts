import { AREA_BANDS, CATEGORIES, DEFAULT_CITY } from "@/lib/constants";
import type {
  Intent,
  ProjectSearchCriteria,
  ProjectStatus,
  PropertyCategory,
  PropertySearchCriteria,
  ResultsView,
  SortKey,
} from "@/types/models";

/**
 * Search criteria live in the URL so results are shareable and survive reloads.
 * Multi-value filters use repeated keys, e.g. `?bhk=2+BHK&bhk=3+BHK`.
 */

export const PER_PAGE_OPTIONS = [9, 18, 27, 36] as const;
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "area-desc", label: "Largest area" },
];

/** One acre in sq ft, used by the plot-size bands. */
const ACRE = 43_560;

export type AreaBand = (typeof AREA_BANDS)[number];

/** Carpet / built-up area bands come from `AREA_BANDS` (shared with the home "Size" rail). */
export { AREA_BANDS };

export const PLOT_SIZE_BANDS: AreaBand[] = [
  { label: "Under 2,400 sq ft", max: 2_400 },
  { label: "2,400 – 5,000 sq ft", min: 2_400, max: 5_000 },
  { label: "5,000 sq ft – 1 acre", min: 5_000, max: ACRE },
  { label: "1 acre+", min: ACRE },
];

export const areaBandsFor = (category: PropertyCategory) =>
  category === "land" ? PLOT_SIZE_BANDS : AREA_BANDS;

/** Human label for an area range: the matching band's label, else a formatted range. */
export function areaRangeLabel(min: number | undefined, max: number | undefined): string {
  const band = [...AREA_BANDS, ...PLOT_SIZE_BANDS].find((b) => b.min === min && b.max === max);
  if (band) return band.label;
  const n = (v: number) => v.toLocaleString("en-IN");
  if (min !== undefined && max !== undefined) return `${n(min)} – ${n(max)} sq ft`;
  if (min !== undefined) return `From ${n(min)} sq ft`;
  if (max !== undefined) return `Below ${n(max)} sq ft`;
  return "Any area";
}

type ParamsLike = { get(key: string): string | null; getAll(key: string): string[] };

const ARRAY_KEYS = {
  localities: "loc",
  unitTypes: "unit",
  bhk: "bhk",
  furnishing: "furnishing",
  bathrooms: "bath",
  parking: "parking",
  media: "media",
  facing: "facing",
  projects: "project",
} as const satisfies Partial<Record<keyof PropertySearchCriteria, string>>;

export type PropertyArrayFilter = keyof typeof ARRAY_KEYS;

export const PROPERTY_ARRAY_FILTERS = Object.keys(ARRAY_KEYS) as PropertyArrayFilter[];

const isCategory = (v: string | null): v is PropertyCategory =>
  !!v && CATEGORIES.some((c) => c.id === v);
const isIntent = (v: string | null): v is Intent => v === "buy" || v === "rent";
const isSort = (v: string | null): v is SortKey =>
  !!v && SORT_OPTIONS.some((o) => o.value === v);
const isView = (v: string | null): v is ResultsView =>
  v === "list" || v === "map" || v === "loc" || v === "proj";

const positiveInt = (v: string | null, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

const optionalAmount = (v: string | null) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const clean = (values: string[]) =>
  Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));

export function defaultPropertyCriteria(
  overrides: Partial<PropertySearchCriteria> = {},
): PropertySearchCriteria {
  return {
    city: DEFAULT_CITY,
    intent: "buy",
    category: "homes",
    q: "",
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
    sort: "latest",
    page: 1,
    perPage: 9,
    view: "list",
    ...overrides,
  };
}

export function parsePropertyCriteria(params: ParamsLike): PropertySearchCriteria {
  const perPage = positiveInt(params.get("per"), 9);
  const criteria = defaultPropertyCriteria({
    city: params.get("city")?.trim() || DEFAULT_CITY,
    intent: isIntent(params.get("intent")) ? (params.get("intent") as Intent) : "buy",
    category: isCategory(params.get("type")) ? (params.get("type") as PropertyCategory) : "homes",
    q: params.get("q")?.trim() ?? "",
    budgetMin: optionalAmount(params.get("min")),
    budgetMax: optionalAmount(params.get("max")),
    areaMin: optionalAmount(params.get("areaMin")),
    areaMax: optionalAmount(params.get("areaMax")),
    sort: isSort(params.get("sort")) ? (params.get("sort") as SortKey) : "latest",
    page: positiveInt(params.get("page"), 1),
    perPage: (PER_PAGE_OPTIONS as readonly number[]).includes(perPage) ? perPage : 9,
    view: isView(params.get("view")) ? (params.get("view") as ResultsView) : "list",
  });
  for (const key of PROPERTY_ARRAY_FILTERS) {
    criteria[key] = clean(params.getAll(ARRAY_KEYS[key]));
  }
  // An inverted budget range would match nothing; swap it so the intent is preserved.
  if (
    criteria.budgetMin !== undefined &&
    criteria.budgetMax !== undefined &&
    criteria.budgetMin > criteria.budgetMax
  ) {
    [criteria.budgetMin, criteria.budgetMax] = [criteria.budgetMax, criteria.budgetMin];
  }
  if (criteria.areaMin !== undefined && criteria.areaMax !== undefined && criteria.areaMin > criteria.areaMax) {
    [criteria.areaMin, criteria.areaMax] = [criteria.areaMax, criteria.areaMin];
  }
  return criteria;
}

/** Serialises criteria, omitting defaults so URLs stay short and stable. */
export function serializePropertyCriteria(c: PropertySearchCriteria): URLSearchParams {
  const p = new URLSearchParams();
  p.set("city", c.city);
  p.set("intent", c.intent);
  p.set("type", c.category);
  if (c.q) p.set("q", c.q);
  for (const key of PROPERTY_ARRAY_FILTERS) {
    for (const v of c[key]) p.append(ARRAY_KEYS[key], v);
  }
  if (c.budgetMin !== undefined) p.set("min", String(c.budgetMin));
  if (c.budgetMax !== undefined) p.set("max", String(c.budgetMax));
  if (c.areaMin !== undefined) p.set("areaMin", String(c.areaMin));
  if (c.areaMax !== undefined) p.set("areaMax", String(c.areaMax));
  if (c.sort !== "latest") p.set("sort", c.sort);
  if (c.perPage !== 9) p.set("per", String(c.perPage));
  if (c.page > 1) p.set("page", String(c.page));
  if (c.view !== "list") p.set("view", c.view);
  return p;
}

export const propertySearchHref = (overrides: Partial<PropertySearchCriteria> = {}) =>
  `/properties?${serializePropertyCriteria(defaultPropertyCriteria(overrides)).toString()}`;

/** Number of active refinements (everything except city, intent, category, sort, paging and view). */
export function countActiveFilters(c: PropertySearchCriteria): number {
  let n = PROPERTY_ARRAY_FILTERS.reduce((sum, key) => sum + c[key].length, 0);
  if (c.budgetMin !== undefined) n += 1;
  if (c.budgetMax !== undefined) n += 1;
  if (c.areaMin !== undefined || c.areaMax !== undefined) n += 1;
  return n;
}

/* ---------------- Projects ---------------- */

const isStatus = (v: string): v is ProjectStatus => v === "uc" || v === "rtm" || v === "nl";

export function defaultProjectCriteria(
  overrides: Partial<ProjectSearchCriteria> = {},
): ProjectSearchCriteria {
  return {
    city: DEFAULT_CITY,
    q: "",
    status: [],
    localities: [],
    budget: [],
    years: [],
    views: [],
    page: 1,
    perPage: 9,
    ...overrides,
  };
}

export function parseProjectCriteria(params: ParamsLike): ProjectSearchCriteria {
  const perPage = positiveInt(params.get("per"), 9);
  return defaultProjectCriteria({
    city: params.get("city")?.trim() || DEFAULT_CITY,
    q: params.get("q")?.trim() ?? "",
    status: clean(params.getAll("status")).filter(isStatus),
    localities: clean(params.getAll("loc")),
    budget: clean(params.getAll("budget")),
    years: clean(params.getAll("year")).map(Number).filter((y) => Number.isInteger(y) && y > 2000),
    views: clean(params.getAll("view")),
    page: positiveInt(params.get("page"), 1),
    perPage: (PER_PAGE_OPTIONS as readonly number[]).includes(perPage) ? perPage : 9,
  });
}

export function serializeProjectCriteria(c: ProjectSearchCriteria): URLSearchParams {
  const p = new URLSearchParams();
  p.set("city", c.city);
  if (c.q) p.set("q", c.q);
  c.status.forEach((v) => p.append("status", v));
  c.localities.forEach((v) => p.append("loc", v));
  c.budget.forEach((v) => p.append("budget", v));
  c.years.forEach((v) => p.append("year", String(v)));
  c.views.forEach((v) => p.append("view", v));
  if (c.perPage !== 9) p.set("per", String(c.perPage));
  if (c.page > 1) p.set("page", String(c.page));
  return p;
}

export const projectSearchHref = (overrides: Partial<ProjectSearchCriteria> = {}) =>
  `/projects/search?${serializeProjectCriteria(defaultProjectCriteria(overrides)).toString()}`;
