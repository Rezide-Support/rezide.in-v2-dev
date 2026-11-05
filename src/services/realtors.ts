import { api, ApiError } from "@/lib/api/client";
import { matchesRealtor, paginate } from "@/features/search/match";
import type { Firm, Intent, Paginated, Property, Realtor, RealtorSearchCriteria } from "@/types/models";
import type { AgentSummary, FirmDetail, RealtorDetail } from "./catalog";
import { toProperty, type BackendListingPage } from "./property-mapper";
import { realtorsOf, toFirm, type BackendFirm } from "./realtor-mapper";

/*
 * Server only: the realtor directory from the Rezide backend, the same endpoints
 * as rezide.in's find-broker pages. The backend has no working city, language or
 * specialization filter, and there are only a few dozen firms, so the directory
 * is fetched once, mapped (which drops private fields, see ./realtor-mapper.ts),
 * kept for a few minutes and filtered here. Contract: docs/API.md → Realtors.
 */

const TTL_MS = 10 * 60_000;
const PAGE_SIZE = 100;
/** The most listings a firm or agent page lists per purpose. It has no server paging. */
const MAX_LISTINGS = 100;
/** Counting is a call per person, so a page's counts are fetched a few at a time. */
const COUNT_CONCURRENCY = 8;

export type Directory = {
  firms: Firm[];
  /** Everyone, owner first within a firm. */
  people: Realtor[];
  /** A firm's listing counts, from the firm's own record. */
  firmCounts: Map<string, { sale: number; rent: number }>;
};

async function loadDirectory(): Promise<Directory> {
  const page = (n: number) =>
    api
      .post<{ data?: BackendFirm[]; broker_count?: number }>(
        "/brokers/filter/web",
        { status: "complete", active_status: "active", sortBy: [1] },
        { params: { page: n, pageSize: PAGE_SIZE, status: "complete" } },
      )
      .then((r) => r.data);
  const first = await page(1);
  const pageCount = Math.ceil((first.broker_count ?? 0) / PAGE_SIZE);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => page(i + 2)));
  const raw = [first, ...rest].flatMap((p) => p.data ?? []).filter((f) => f._id && f.general_information?.firm_name);
  return {
    firms: raw.map(toFirm),
    people: raw.flatMap(realtorsOf),
    firmCounts: new Map(raw.map((f) => [String(f._id), { sale: f.total_listing_sale_count ?? 0, rent: f.total_listing_rental_count ?? 0 }])),
  };
}

let directoryCache: { at: number; directory: Promise<Directory> } | null = null;

export function realtorDirectory(now = Date.now()): Promise<Directory> {
  if (directoryCache && now - directoryCache.at < TTL_MS) return directoryCache.directory;
  const directory = loadDirectory();
  const entry = { at: now, directory };
  directoryCache = entry;
  // A failed load isn't kept, so the next request tries again.
  directory.catch(() => {
    if (directoryCache === entry) directoryCache = null;
  });
  return directory;
}

/** Empties the caches (tests). */
export function resetRealtorCaches() {
  directoryCache = null;
  countCache.clear();
}

/* ---------------- Listing counts ---------------- */

type Counts = { sale: number; rent: number };

const countCache = new Map<string, { at: number; counts: Promise<Counts> }>();

function personCounts(brokerId: string, now = Date.now()): Promise<Counts> {
  const hit = countCache.get(brokerId);
  if (hit && now - hit.at < TTL_MS) return hit.counts;
  const counts = api
    .post<{ result_sale?: number; result_rent?: number }>("/inventory/Listing/mobile/filter/count", {}, { params: { broker_id: brokerId } })
    .then(({ data }) => ({ sale: data.result_sale ?? 0, rent: data.result_rent ?? 0 }));
  countCache.set(brokerId, { at: now, counts });
  counts.catch(() => countCache.delete(brokerId));
  return counts;
}

/** Counts a person's listings. A failed count reads as none, rather than failing the whole page. */
async function withCounts(people: Realtor[]): Promise<Realtor[]> {
  const out: Realtor[] = [];
  for (let i = 0; i < people.length; i += COUNT_CONCURRENCY) {
    const batch = people.slice(i, i + COUNT_CONCURRENCY);
    const counted = await Promise.all(
      batch.map(async (r) => {
        const c = await personCounts(r.id).catch(() => ({ sale: 0, rent: 0 }));
        return { ...r, saleListings: c.sale, rentalListings: c.rent };
      }),
    );
    out.push(...counted);
  }
  return out;
}

const toSummary = (r: Realtor): AgentSummary => ({ realtor: r, saleCount: r.saleListings, rentCount: r.rentalListings });

/* ---------------- Search ---------------- */

/** A person with no stated city is listed under every city, as rezide.in lists everyone. */
export const matchesDirectory = (r: Realtor, c: RealtorSearchCriteria) => {
  const cities = r.cities ?? [];
  if (c.city && cities.length > 0 && !cities.includes(c.city)) return false;
  return matchesRealtor({ ...r, city: c.city }, c);
};

/** One card per firm (its owner or first manager), carrying the firm's own listing counts. */
const principals = ({ people, firmCounts }: Directory) => {
  const seen = new Set<string>();
  return people.flatMap((r) => {
    if (seen.has(r.firmId)) return [];
    seen.add(r.firmId);
    const c = firmCounts.get(r.firmId);
    return [{ ...r, saleListings: c?.sale ?? 0, rentalListings: c?.rent ?? 0 }];
  });
};

/** The directory search: people by name, or firms. */
export async function searchRealtors(c: RealtorSearchCriteria, page = 1, perPage = 50): Promise<Paginated<Realtor>> {
  const directory = await realtorDirectory();
  const byFirm = c.by === "firm";
  const matched = (byFirm ? principals(directory) : directory.people).filter((r) => matchesDirectory(r, c));
  const result = paginate(matched, page, perPage);
  return byFirm ? result : { ...result, items: await withCounts(result.items) };
}

/* ---------------- Details ---------------- */

const notFound = (what: string) => new ApiError(`This ${what} doesn't exist or is no longer active.`, 404);

/** Newest listings of a firm or person, per purpose, in one list. */
async function listingsBy(param: { firm_id: string } | { broker_id: string }): Promise<Property[]> {
  const purpose = async (intent: Intent) => {
    const { data } = await api.post<BackendListingPage>(
      "/inventory/Listing/mobile/all",
      { page: 1, pageSize: MAX_LISTINGS, property_purpose: [intent === "rent" ? "rent" : "sale"] },
      { params: param },
    );
    return (data.data ?? []).map(toProperty);
  };
  const [sale, rent] = await Promise.all([purpose("buy"), purpose("rent")]);
  return [...sale, ...rent];
}

export async function getFirmDetail(firmId: string): Promise<FirmDetail> {
  const directory = await realtorDirectory();
  const firm = directory.firms.find((f) => f.id === firmId);
  if (!firm) throw notFound("firm");
  const [team, listings] = await Promise.all([withCounts(directory.people.filter((r) => r.firmId === firmId)), listingsBy({ firm_id: firmId })]);
  return { firm, team: team.map(toSummary), listings };
}

async function detailOf(realtor: Realtor, directory: Directory): Promise<RealtorDetail> {
  // Colleagues first, then others in the same city, up to 8.
  const colleagues = directory.people.filter((r) => r.firmId === realtor.firmId && r.id !== realtor.id);
  const sameCity = directory.people.filter((r) => r.firmId !== realtor.firmId && r.city === realtor.city);
  const [[counted], others, listings] = await Promise.all([
    withCounts([realtor]),
    withCounts([...colleagues, ...sameCity].slice(0, 8)),
    listingsBy({ broker_id: realtor.id }),
  ]);
  return {
    realtor: counted,
    listings,
    firm: directory.firms.find((f) => f.id === realtor.firmId) ?? null,
    others: others.map(toSummary),
  };
}

export async function getRealtorDetail(id: string): Promise<RealtorDetail> {
  const directory = await realtorDirectory();
  const realtor = directory.people.find((r) => r.id === id);
  if (!realtor) throw notFound("realtor");
  return detailOf(realtor, directory);
}

export async function getFirmAgentDetail(firmId: string, agentId: string): Promise<RealtorDetail> {
  const directory = await realtorDirectory();
  const realtor = directory.people.find((r) => r.firmId === firmId && r.slug === agentId);
  if (!realtor) throw notFound("realtor");
  return detailOf(realtor, directory);
}

/** The realtor on a listing, when they're in the active directory. A directory failure never fails the listing. */
export async function findRealtor(id: string): Promise<Realtor | null> {
  if (!id) return null;
  const directory = await realtorDirectory().catch(() => null);
  const realtor = directory?.people.find((r) => r.id === id);
  return realtor ? ((await withCounts([realtor]))[0] ?? null) : null;
}
