import { api } from "@/lib/api/client";
import type { ActivityItem, ActivityTab, Intent } from "@/types/models";
import { toBackendPhone } from "./auth";
import { toProperty, type BackendListing } from "./property-mapper";

/*
 * A user's activity on the Rezide backend, the same endpoints as rezide.in's
 * dashboard and listing page. Rows that carry listings are read on this app's
 * server (src/app/api/account/activity), so a withheld price never reaches the
 * browser. Contract: docs/API.md → Customer account.
 */

const isServer = typeof window === "undefined";

/** The most rows a tab shows. The account page has no paging. */
export const ACTIVITY_LIMIT = 50;

const SHORTLIST = (userId: string) => `/shortlist/user/statistic/${encodeURIComponent(userId)}`;
const VIEWED = (userId: string) => `/user/statistic/last/visit/${encodeURIComponent(userId)}`;

/** Who the activity belongs to. Shared rows are found by phone, the others by id. */
export type ActivityUser = { id: string; phone?: string };

/** How the backend names a listing's purpose in shortlist and view records. */
const listingType = (intent: Intent) => (intent === "rent" ? "rent" : "sale");

/* ---------------- Mapping ---------------- */

/** A row's date in India: rows are grouped per day as the customer saw them. */
const indianDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

type ActivityRow = { listing?: BackendListing | null; timestamp?: string };

/**
 * Rows → the account page's items, newest first, one per listing. Rows without
 * a listing are dropped: projects (the page lists properties) and removed listings.
 */
export function toActivityItems(rows: ActivityRow[]): ActivityItem[] {
  const newestFirst = rows
    .filter((r): r is { listing: BackendListing; timestamp: string } => !!r.listing?._id && !!r.timestamp && !Number.isNaN(Date.parse(r.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const items = new Map<string, ActivityItem>();
  for (const row of newestFirst) {
    const property = toProperty(row.listing);
    if (!items.has(property.id)) items.set(property.id, { propertyId: property.id, date: indianDay(row.timestamp), property });
  }
  return [...items.values()];
}

/* ---------------- Reading (server) ---------------- */

/** A share row. `listing_id` comes populated, but only `_id` is used, as on rezide.in. */
type SharedRow = { listing_id?: { _id?: string } | string | null; createdAt?: string };

const sharedListingId = (row: SharedRow) => (typeof row.listing_id === "string" ? row.listing_id : row.listing_id?._id);

async function sharedRows(phone: string | undefined, status?: "reject"): Promise<ActivityRow[]> {
  if (!phone) return [];
  const { data } = await api.get<{ data?: SharedRow[] }>("/share/listing/user/shared", {
    params: { mobile_no: toBackendPhone(phone), ...(status ? { status } : {}) },
  });
  const rows = (data.data ?? []).slice(0, ACTIVITY_LIMIT);
  // Share rows don't carry the whole listing. One that can't be loaded (removed) is left out.
  const settled = await Promise.allSettled(
    rows.map(async (row): Promise<ActivityRow> => {
      const id = sharedListingId(row);
      if (!id) return {};
      const { data: listing } = await api.get<BackendListing>(`/inventory/Listing/${encodeURIComponent(id)}`);
      return { listing, timestamp: row.createdAt };
    }),
  );
  return settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}

/** Server only: one account tab from the backend, in the UI's shape. */
export async function getActivity(tab: ActivityTab, user: ActivityUser): Promise<ActivityItem[]> {
  const params = { page: 1, pageSize: ACTIVITY_LIMIT };
  switch (tab) {
    case "viewed": {
      const { data } = await api.get<{ result?: { visits?: ActivityRow[] } }>(VIEWED(user.id), { params });
      return toActivityItems(data.result?.visits ?? []);
    }
    case "shortlisted": {
      const { data } = await api.get<{ result?: { shortlist?: ActivityRow[] } }>(SHORTLIST(user.id), { params });
      return toActivityItems(data.result?.shortlist ?? []);
    }
    case "shared":
      return toActivityItems(await sharedRows(user.phone));
    case "rejected":
      return toActivityItems(await sharedRows(user.phone, "reject"));
  }
}

/** One account tab: the browser goes through /api/account/activity. */
export async function fetchActivity(tab: ActivityTab, user: ActivityUser): Promise<ActivityItem[]> {
  if (!user.id) return [];
  if (isServer) return getActivity(tab, user);
  const { data } = await api.get<ActivityItem[]>("/api/account/activity", {
    // This app's own route, not the backend: no base URL.
    baseURL: "",
    params: { tab, userId: user.id, phone: user.phone },
  });
  return data;
}

/* ---------------- Shortlist and views (browser) ---------------- */

/** The ids of the user's shortlisted listings. The plain list carries no listing records. */
export async function fetchShortlistIds(userId: string): Promise<string[]> {
  const { data } = await api.get<{ result?: { shortlist?: { listing_id?: string | null }[] } }>(SHORTLIST(userId));
  return (data.result?.shortlist ?? []).flatMap((r) => (r.listing_id ? [r.listing_id] : []));
}

/** Adds a listing to the shortlist or removes it. The backend can answer 200 without doing it, so that fails too. */
export async function setShortlisted(userId: string, listingId: string, intent: Intent, shortlisted: boolean): Promise<void> {
  const { data } = await api.post<{ status?: string }>(SHORTLIST(userId), undefined, {
    params: { listing_id: listingId, action: shortlisted ? "add" : "remove", type: listingType(intent) },
  });
  if (data.status !== "success") throw new Error("The shortlist wasn't updated.");
}

/** Records that the user opened a listing. */
export async function recordView(userId: string, listingId: string, intent: Intent): Promise<void> {
  await api.post(VIEWED(userId), undefined, { params: { listing_id: listingId, type: listingType(intent) } });
}
