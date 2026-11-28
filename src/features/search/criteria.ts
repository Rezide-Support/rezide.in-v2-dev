import { AREA_BANDS, CATEGORIES, DEFAULT_CITY } from "@/lib/constants";
import type {
  Intent,
  ProjectSearchCriteria,
  ProjectSortKey,
  ProjectStatus,
  PropertyCategory,
  PropertySearchCriteria,
  ResultsView,
  SortKey,
} from "@/types/models";
import {
  SALE_BHK_ID_TO_LABEL,
  SALE_BHK_URL_IDS,
  SALE_EXIT_DIRECTIONS,
  SALE_FURNISHING_OPTIONS,
  RENT_BHK_URL_IDS,
} from "./sale-filter-options";

/**
 * Search criteria live in the URL so results are shareable and survive reloads.
 * Multi-value filters use repeated keys, e.g. `?bhk=2+BHK&bhk=3+BHK`.
 */

export const PER_PAGE_OPTIONS = [9, 18, 27, 36] as const;
/** Sort options and labels as on rezide.in. Rate per sq ft is offered for sale only, as there. */
export const SORT_OPTIONS: { value: SortKey; label: string; saleOnly?: true }[] = [
  { value: "latest", label: "Latest" },
  { value: "price-asc", label: "Price: (Low to High)" },
  { value: "price-desc", label: "Price: (High to Low)" },
  { value: "rate-asc", label: "Avg. Rate psf. (Low to High)", saleOnly: true },
  { value: "rate-desc", label: "Avg. Rate psf. (High to Low)", saleOnly: true },
  { value: "area-asc", label: "Area (Low to High)" },
  { value: "area-desc", label: "Area (High to Low)" },
];

/** The sort options for buying or renting. */
export const sortOptionsFor = (intent: Intent) => SORT_OPTIONS.filter((o) => intent === "buy" || !o.saleOnly);

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
  availability: "availability",
  buildingTypes: "building_type",
  balconies: "no_of_balconies",
  buildingAges: "building_age",
  preferredApartment: "preffered_apartment",
  floorRanges: "floor_range",
  timeOnRezide: "time_on_rezide",
} as const satisfies Partial<Record<keyof PropertySearchCriteria, string>>;

export type PropertyArrayFilter = keyof typeof ARRAY_KEYS;

export const PROPERTY_ARRAY_FILTERS = Object.keys(ARRAY_KEYS) as PropertyArrayFilter[];
const ARRAY_ALIASES: Partial<Record<PropertyArrayFilter, string[]>> = {
  unitTypes: ["project_type"],
  bathrooms: ["no_of_bathrooms"],
  parking: ["no_of_parkings"],
  media: ["listing_with"],
  facing: ["exit_direction"],
};
const SALE_URL_KEYS: Partial<Record<PropertyArrayFilter, string>> = {
  unitTypes: "project_type",
  bhk: "bhk",
  furnishing: "furnishing",
  bathrooms: "no_of_bathrooms",
  parking: "no_of_parkings",
  media: "listing_with",
  facing: "exit_direction",
  availability: "availability",
  buildingTypes: "building_type",
  balconies: "no_of_balconies",
  buildingAges: "building_age",
  preferredApartment: "preffered_apartment",
  floorRanges: "floor_range",
  timeOnRezide: "time_on_rezide",
};

const isCategory = (v: string | null): v is PropertyCategory =>
  !!v && CATEGORIES.some((c) => c.id === v);
const isIntent = (v: string | null): v is Intent => v === "buy" || v === "rent";
/** A sort offered for this intent (a rent search with a sale-only sort falls back to Latest). */
const isSort = (v: string | null, intent: Intent): v is SortKey =>
  !!v && sortOptionsFor(intent).some((o) => o.value === v);
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
    availability: [],
    buildingTypes: [],
    balconies: [],
    buildingAges: [],
    preferredApartment: [],
    floorRanges: [],
    timeOnRezide: [],
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
  const intent: Intent = isIntent(params.get("intent")) ? (params.get("intent") as Intent) : "buy";
  const criteria = defaultPropertyCriteria({
    city: params.get("city")?.trim() || DEFAULT_CITY,
    intent,
    category: isCategory(params.get("type")) ? (params.get("type") as PropertyCategory) : "homes",
    q: (params.get("q") ?? params.get("searchQuery"))?.trim() ?? "",
    budgetMin: optionalAmount(params.get("minBudget") ?? params.get("min")),
    budgetMax: optionalAmount(params.get("maxBudget") ?? params.get("max")),
    areaMin: optionalAmount(params.get("minArea") ?? params.get("areaMin")),
    areaMax: optionalAmount(params.get("maxArea") ?? params.get("areaMax")),
    sort: isSort(params.get("sort"), intent) ? (params.get("sort") as SortKey) : "latest",
    page: positiveInt(params.get("page"), 1),
    perPage: (PER_PAGE_OPTIONS as readonly number[]).includes(perPage) ? perPage : 9,
    view: isView(params.get("view")) ? (params.get("view") as ResultsView) : "list",
  });
  for (const key of PROPERTY_ARRAY_FILTERS) {
    const values = [ARRAY_KEYS[key], ...(ARRAY_ALIASES[key] ?? [])]
      .flatMap((name) => params.getAll(name))
      .flatMap((value) => value.split(","));
    criteria[key] = clean(key === "bhk"
      ? values.map((value) => SALE_BHK_ID_TO_LABEL[value] ?? value)
      : key === "facing" && criteria.category === "homes"
        ? values.map((value) => SALE_EXIT_DIRECTIONS.find((direction) => direction.label === value)?.value ?? value)
        : key === "furnishing" && criteria.category === "homes"
          ? values.map((value) => SALE_FURNISHING_OPTIONS.find((option) => option.label === value)?.value ?? value)
          : values);
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
  if (c.q) p.set("searchQuery", c.q);
  for (const key of PROPERTY_ARRAY_FILTERS) {
    const homeFilters = c.category === "homes";
    const urlKey = homeFilters ? SALE_URL_KEYS[key] : undefined;
    const values = key === "facing" && homeFilters
      ? c.facing.map((value) => SALE_EXIT_DIRECTIONS.find((direction) => direction.label === value)?.value ?? value)
      : key === "bhk" && homeFilters
        ? c.bhk.map((value) => (c.intent === "rent" ? RENT_BHK_URL_IDS[value] : SALE_BHK_URL_IDS[value]) ?? value)
        : key === "furnishing" && homeFilters
          ? c.furnishing.map((value) => SALE_FURNISHING_OPTIONS.find((option) => option.label === value)?.value ?? value)
        : c[key];
    if (urlKey && values.length) p.set(urlKey, values.join(","));
    else for (const v of values) p.append(ARRAY_KEYS[key], v);
  }
  if (c.budgetMin !== undefined) p.set("minBudget", String(c.budgetMin));
  if (c.budgetMax !== undefined) p.set("maxBudget", String(c.budgetMax));
  if (c.areaMin !== undefined) p.set("minArea", String(c.areaMin));
  if (c.areaMax !== undefined) p.set("maxArea", String(c.areaMax));
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

/** A carpet area bound (sq ft) from the URL, or undefined. */
const optionalArea = (v: string | null) => {
  const n = Number(v);
  return v && Number.isFinite(n) && n > 0 ? n : undefined;
};

const isStatus = (v: string): v is ProjectStatus => v === "uc" || v === "rtm" || v === "nl";

/** Project sort options and labels as on rezide.in's project list. */
export const PROJECT_SORT_OPTIONS: { value: ProjectSortKey; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "price-asc", label: "Price: (Low to High)" },
  { value: "price-desc", label: "Price: (High to Low)" },
  { value: "plot-asc", label: "Plot Area: (Low to High)" },
  { value: "plot-desc", label: "Plot Area: (High to Low)" },
  { value: "yield-asc", label: "Rental Yield: (Low to High)" },
  { value: "yield-desc", label: "Rental Yield: (High to Low)" },
];

const isProjectSort = (v: string | null): v is ProjectSortKey => !!v && PROJECT_SORT_OPTIONS.some((o) => o.value === v);

export function defaultProjectCriteria(
  overrides: Partial<ProjectSearchCriteria> = {},
): ProjectSearchCriteria {
  return {
    city: DEFAULT_CITY,
    q: "",
    status: [],
    localities: [],
    localityNames: [],
    budget: [],
    years: [],
    views: [],
    projectTypes: [],
    unitTypes: [],
    bhk: [],
    media: [],
    sort: "latest",
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
    localityNames: clean(params.getAll("locality")),
    budget: clean(params.getAll("budget")),
    years: clean(params.getAll("year")).map(Number).filter((y) => Number.isInteger(y) && y > 2000),
    views: clean(params.getAll("view")),
    projectTypes: clean(params.getAll("ptype")),
    unitTypes: clean(params.getAll("unit")),
    bhk: clean(params.getAll("bhk")),
    areaMin: optionalArea(params.get("amin")),
    areaMax: optionalArea(params.get("amax")),
    media: clean(params.getAll("with")),
    sort: isProjectSort(params.get("sort")) ? (params.get("sort") as ProjectSortKey) : "latest",
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
  c.localityNames.forEach((v) => p.append("locality", v));
  c.budget.forEach((v) => p.append("budget", v));
  c.years.forEach((v) => p.append("year", String(v)));
  c.views.forEach((v) => p.append("view", v));
  c.projectTypes.forEach((v) => p.append("ptype", v));
  c.unitTypes.forEach((v) => p.append("unit", v));
  c.bhk.forEach((v) => p.append("bhk", v));
  if (c.areaMin !== undefined) p.set("amin", String(c.areaMin));
  if (c.areaMax !== undefined) p.set("amax", String(c.areaMax));
  c.media.forEach((v) => p.append("with", v));
  if (c.sort !== "latest") p.set("sort", c.sort);
  if (c.perPage !== 9) p.set("per", String(c.perPage));
  if (c.page > 1) p.set("page", String(c.page));
  return p;
}

export const projectSearchHref = (overrides: Partial<ProjectSearchCriteria> = {}) =>
  `/projects/search?${serializeProjectCriteria(defaultProjectCriteria(overrides)).toString()}`;
