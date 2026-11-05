import type { Property } from "@/types/models";

/* Sale / Rental split and pagination for firm and agent listing sections. */

export type ListingIntent = "buy" | "rent";
export const LISTINGS_PAGE_SIZE = 9;

/** Reads `?intent=rent&page=2`. Anything unrecognised falls back to sale, page 1. */
export function parseListingParams(params: Pick<URLSearchParams, "get">): { intent: ListingIntent; page: number } {
  const intent: ListingIntent = params.get("intent") === "rent" ? "rent" : "buy";
  const page = Number.parseInt(params.get("page") ?? "", 10);
  return { intent, page: Number.isFinite(page) && page > 0 ? page : 1 };
}

/** Query string for a listing view; defaults (sale, page 1) are omitted so URLs stay clean. */
export function listingQuery({ intent, page }: { intent: ListingIntent; page: number }): string {
  const sp = new URLSearchParams();
  if (intent === "rent") sp.set("intent", "rent");
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export type ListingPage = {
  intent: ListingIntent;
  saleCount: number;
  rentCount: number;
  /** Requested page clamped to the available range. */
  page: number;
  pageCount: number;
  items: Property[];
};

export function paginateListings(
  listings: Property[],
  { intent, page }: { intent: ListingIntent; page: number },
  pageSize = LISTINGS_PAGE_SIZE,
): ListingPage {
  const sale = listings.filter((p) => p.intent === "buy");
  const rent = listings.filter((p) => p.intent === "rent");
  const pool = intent === "rent" ? rent : sale;
  const pageCount = Math.max(1, Math.ceil(pool.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    intent,
    saleCount: sale.length,
    rentCount: rent.length,
    page: current,
    pageCount,
    items: pool.slice((current - 1) * pageSize, current * pageSize),
  };
}
