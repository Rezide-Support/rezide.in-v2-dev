import { ApiError, api } from "@/lib/api/client";
import { defaultPropertyCriteria } from "@/features/search/criteria";
import { AREA_BANDS } from "@/lib/constants";
import type { Intent, ProjectStatus, PropertyCategory } from "@/types/models";
import { toBackendCity } from "./locations";
import { fetchProperties, fetchPropertyFacets, fetchPropertyGroups } from "./properties";
import { cdnImage } from "./property-mapper";

/*
 * Home page rails from the Rezide backend (public reads, never mocked). Budget,
 * possession and localities take a city, and listing budgets a property type.
 * byType and byBhk stay nationwide: the backend ignores filters on them.
 * Contract: docs/API.md → Home page rails.
 */

const PROJECT_HOME = "/inventory/project/home-page";
const LISTING_HOME = "/inventory/listing/home-page";

/** The city of the old popular-localities endpoint, used until the per-city one is deployed. */
const POPULAR_LOCALITIES_CITY = "Mumbai";

/** The backend's property_type for a category. Its API doc has no type for industrial. */
const PROPERTY_TYPES: Partial<Record<PropertyCategory, string>> = { homes: "home", offices: "office", retail: "retail", land: "land" };

/** A count as the backend words it: "326+ listings" is at least 326. */
export type HomeCount = { count: number; plus: boolean };

/** "326+ listings" → { count: 326, plus: true }; anything else counts as none. */
export function parseCount(text: unknown): HomeCount {
  const m = typeof text === "string" ? text.match(/(\d[\d,]*)(\+?)/) : null;
  return m ? { count: Number(m[1].replace(/,/g, "")), plus: m[2] === "+" } : { count: 0, plus: false };
}

export type HomeLocality = { name: string; image?: string; forSale: number; forRent: number; projects: number };
export type HomeBudget = HomeCount & { label: string; min?: number; max?: number };
export type HomeOption = HomeCount & { label: string };
export type HomeArea = { label: string; count: number; min?: number; max?: number };
/** `localityCity` is the city the localities are in, for their links. `areas` are only for categories other than homes. */
export type PropertyHome = { localities: HomeLocality[]; localityCity: string; budgets: HomeBudget[]; unitTypes: HomeOption[]; bhks: HomeOption[]; areas: HomeArea[] };

type BackendLocality = { locality?: string; media?: { url?: string }[]; totalProjects?: number; totalPropertiesForSale?: number; totalPropertiesForRent?: number };
type BackendBudget = { budgetCategory?: string; min?: number | null; max?: number | null; totalListings?: string; totalProjects?: string };
type BackendUnitType = { unitType?: string; totalListings?: string };
type BackendBhk = { bhkType?: string; totalListings?: string };
/** `possessionYear` is text ("3+ yr") on the open-ended "Beyond" row. */
type BackendPossession = { period?: string; possessionYear?: number | string; totalProjects?: string };

export const toLocality = (l: BackendLocality): HomeLocality => {
  const photo = l.media?.[0]?.url;
  return {
    name: (l.locality ?? "").trim(),
    image: photo ? cdnImage(photo) : undefined,
    forSale: l.totalPropertiesForSale ?? 0,
    forRent: l.totalPropertiesForRent ?? 0,
    projects: l.totalProjects ?? 0,
  };
};

const toBudget = (b: BackendBudget, total: string | undefined): HomeBudget => ({
  label: (b.budgetCategory ?? "").trim(),
  // 0 and null both mean "no bound" in a search.
  min: b.min || undefined,
  max: b.max ?? undefined,
  ...parseCount(total),
});

const toLocalities = (data: unknown) => (Array.isArray(data) ? (data as BackendLocality[]) : []).map(toLocality).filter((l) => l.name);

type Localities = { localities: HomeLocality[]; localityCity: string };

/**
 * A city's top localities. A 404 means the per-city endpoint isn't deployed, so this falls back.
 */
async function fetchLocalities(city: string): Promise<Localities> {
  try {
    const { data } = await api.get(`${PROJECT_HOME}/locality/city`, { params: { city: toBackendCity(city) } });
    return { localities: toLocalities(data), localityCity: city };
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
    const { data } = await api.get(`${PROJECT_HOME}/locality`);
    return { localities: toLocalities(data), localityCity: POPULAR_LOCALITIES_CITY };
  }
}

/**
 * The Properties home rails for buying or renting. The backend's rails only cover homes, apart from
 * budgets, so other categories count their locations, types and sizes from the listings themselves.
 */
export async function fetchPropertyHome(intent: Intent, city: string, category: PropertyCategory = "homes"): Promise<PropertyHome> {
  const property = intent === "rent" ? "rent" : "sale";
  const propertyType = PROPERTY_TYPES[category];
  const listing = <T,>(subType: string, filters = {}) => api.get<T[]>(LISTING_HOME, { params: { property, subType, ...filters } }).then((r) => r.data);
  const budgetsFor = () => listing<BackendBudget>("byBudget", { city: toBackendCity(city), property_type: propertyType });

  if (category !== "homes") {
    const criteria = defaultPropertyCriteria({ city, intent, category });
    const [budgets, groups, facets, areas] = await Promise.all([
      propertyType ? budgetsFor() : Promise.resolve<BackendBudget[]>([]),
      fetchPropertyGroups(criteria, "locality"),
      fetchPropertyFacets(criteria),
      // Each count is the search its card links to.
      Promise.all(
        AREA_BANDS.map((band) =>
          fetchProperties({ ...criteria, areaMin: band.min, areaMax: band.max, perPage: 1 }).then((page) => ({ ...band, count: page.total })),
        ),
      ),
    ]);
    const localities = [...groups.groups]
      .sort((a, b) => b.count - a.count)
      .map((g) => ({ name: g.key, image: g.image ?? undefined, forSale: g.count, forRent: g.count, projects: g.projectCount }));
    const unitTypes = Object.entries(facets.facets.unitTypes)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count, plus: false }));
    return { localities, localityCity: city, budgets: budgets.map((b) => toBudget(b, b.totalListings)), unitTypes, bhks: [], areas };
  }

  const [{ localities, localityCity }, budgets, unitTypes, bhks] = await Promise.all([
    fetchLocalities(city),
    budgetsFor(),
    listing<BackendUnitType>("byType"),
    listing<BackendBhk>("byBhk"),
  ]);
  return {
    localities,
    localityCity,
    budgets: budgets.map((b) => toBudget(b, b.totalListings)),
    unitTypes: unitTypes.map((t) => ({ label: (t.unitType ?? "").trim(), ...parseCount(t.totalListings) })),
    bhks: bhks.map((b) => ({ label: (b.bhkType ?? "").trim(), ...parseCount(b.totalListings) })),
    areas: [],
  };
}

export type HomePossession = HomeCount & { label: string; year?: number };
export type ProjectHome = { localities: HomeLocality[]; localityCity: string; budgets: HomeBudget[]; possession: HomePossession[] };

/**
 * The Projects home rails for one status. The possession endpoint words its rows
 * per status: possession year (Under Construction), years since completion
 * (Ready to Move) or months since launch (New Launches).
 */
/** The backend's wording for each status on the possession endpoint. */
const POSSESSION_STATUS: Record<ProjectStatus, string> = { uc: "Under Construction", rtm: "Ready to Move", nl: "New Launches" };

export async function fetchProjectHome(city: string, status: ProjectStatus): Promise<ProjectHome> {
  const params = { city: toBackendCity(city) };
  const [{ localities, localityCity }, budgets, possession] = await Promise.all([
    fetchLocalities(city),
    api.get<BackendBudget[]>(`${PROJECT_HOME}/budget`, { params }).then((r) => r.data),
    api
      .get<BackendPossession[]>(`${PROJECT_HOME}/possession`, { params: { ...params, status: POSSESSION_STATUS[status] } })
      .then((r) => r.data),
  ]);
  return {
    localities,
    localityCity,
    budgets: budgets.map((b) => toBudget(b, b.totalProjects)),
    possession: possession.map((p) => ({
      label: (p.period ?? "").trim(),
      year: typeof p.possessionYear === "number" ? p.possessionYear : undefined,
      ...parseCount(p.totalProjects),
    })),
  };
}
