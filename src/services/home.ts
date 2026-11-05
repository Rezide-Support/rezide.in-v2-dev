import { api } from "@/lib/api/client";
import type { Intent, ProjectStatus } from "@/types/models";
import { cdnImage } from "./property-mapper";

/*
 * Home page rails from the Rezide backend, the same endpoints as rezide.in's
 * homeSlice (public reads, never mocked). They are not per city: the backend
 * ignores `location`, and the popular localities are all in Mumbai.
 */

const PROJECT_HOME = "/inventory/project/home-page";
const LISTING_HOME = "/inventory/listing/home-page";

/** The city the backend's popular localities are in (it returns no city with them). */
export const POPULAR_LOCALITIES_CITY = "Mumbai";

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
export type PropertyHome = { localities: HomeLocality[]; budgets: HomeBudget[]; unitTypes: HomeOption[]; bhks: HomeOption[] };

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

async function fetchLocalities(): Promise<HomeLocality[]> {
  const { data } = await api.get<BackendLocality[]>(`${PROJECT_HOME}/locality`);
  return data.map(toLocality).filter((l) => l.name);
}

/** The Properties home rails for buying or renting. */
export async function fetchPropertyHome(intent: Intent): Promise<PropertyHome> {
  const property = intent === "rent" ? "rent" : "sale";
  const listing = <T,>(subType: string) => api.get<T[]>(LISTING_HOME, { params: { property, subType } }).then((r) => r.data);
  const [localities, budgets, unitTypes, bhks] = await Promise.all([
    fetchLocalities(),
    listing<BackendBudget>("byBudget"),
    listing<BackendUnitType>("byType"),
    listing<BackendBhk>("byBhk"),
  ]);
  return {
    localities,
    budgets: budgets.map((b) => toBudget(b, b.totalListings)),
    unitTypes: unitTypes.map((t) => ({ label: (t.unitType ?? "").trim(), ...parseCount(t.totalListings) })),
    bhks: bhks.map((b) => ({ label: (b.bhkType ?? "").trim(), ...parseCount(b.totalListings) })),
  };
}

export type HomePossession = HomeCount & { label: string; year?: number };
export type ProjectHome = { localities: HomeLocality[]; budgets: HomeBudget[]; possession: HomePossession[] };

/**
 * The Projects home rails for one status. Only Under Construction shows a
 * possession rail, so the other statuses don't ask for it.
 */
export async function fetchProjectHome(city: string, status: ProjectStatus): Promise<ProjectHome> {
  const params = { location: city };
  const [localities, budgets, possession] = await Promise.all([
    fetchLocalities(),
    api.get<BackendBudget[]>(`${PROJECT_HOME}/budget`, { params }).then((r) => r.data),
    status === "uc"
      ? api.get<BackendPossession[]>(`${PROJECT_HOME}/possession`, { params: { ...params, status: "Under Construction" } }).then((r) => r.data)
      : Promise.resolve<BackendPossession[]>([]),
  ]);
  return {
    localities,
    budgets: budgets.map((b) => toBudget(b, b.totalProjects)),
    possession: possession.map((p) => ({
      label: (p.period ?? "").trim(),
      year: typeof p.possessionYear === "number" ? p.possessionYear : undefined,
      ...parseCount(p.totalProjects),
    })),
  };
}
