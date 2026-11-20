import { api } from "@/lib/api/client";
import type { ActivityItem, ActivityTab, Intent, Project } from "@/types/models";
import { toBackendPhone } from "./auth";
import { isObjectId, toProperty, type BackendListing } from "./property-mapper";
import { getProjectsByIds } from "./projects";
import { toListingProject } from "./project-mapper";
import { BACKEND_ID_PATTERN } from "@/lib/ids";

/*
 * A user's activity on the Rezide backend, the same endpoints as rezide.in's
 * dashboard and listing page. Rows that carry listings are read on this app's
 * server (src/app/api/account/activity), so a withheld price never reaches the
 * browser. Contract: docs/API.md → Customer account.
 */

const isServer = typeof window === "undefined";

/** One backend page per activity type, as on rezide.in. */
export const ACTIVITY_LIMIT = 24;

const SHORTLIST = (userId: string) => `/shortlist/user/statistic/${encodeURIComponent(userId)}`;
const VIEWED = (userId: string) => `/user/statistic/last/visit/${encodeURIComponent(userId)}`;

/** Who the activity belongs to. Shared rows are found by phone, the others by id. */
export type ActivityUser = { id: string; phone?: string };

/** How the backend names a listing's purpose in shortlist and view records. */
const listingType = (intent: Intent) => (intent === "rent" ? "rent" : "sale");

/* ---------------- Mapping ---------------- */

/** A row's date in India: rows are grouped per day as the customer saw them. */
const indianDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

type ActivityRow = {
  listing?: BackendListing | null;
  listing_id?: BackendListing | string | null;
  project?: unknown;
  project_id?: unknown;
  type?: string;
  timestamp?: string;
  createdAt?: string;
};

const rowDate = (row: ActivityRow) => row.timestamp ?? row.createdAt;

function rowId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value && typeof value._id === "string") return value._id;
  return undefined;
}

function listingOf(row: ActivityRow): BackendListing | null {
  if (row.listing?._id) return row.listing;
  if (row.listing_id && typeof row.listing_id === "object" && row.listing_id._id) return row.listing_id as BackendListing;
  return null;
}

function projectOf(row: ActivityRow): Project | undefined {
  const project = row.project ?? (row.project_id && typeof row.project_id === "object" ? row.project_id : undefined);
  if (!project || typeof project !== "object") return undefined;
  if ("id" in project && typeof project.id === "string" && "name" in project && typeof project.name === "string") {
    return project as Project;
  }
  const mapped = toListingProject(project, "");
  return mapped.id ? mapped : undefined;
}

function projectIdOf(row: ActivityRow): string | undefined {
  return projectOf(row)?.id ?? rowId(row.project_id) ?? rowId(row.project) ?? rowId(row.listing_id);
}

/**
 * Rows → the account page's items, newest first, one per property or project.
 * Rows without a populated entity are dropped.
 */
export function toActivityItems(rows: ActivityRow[]): ActivityItem[] {
  const newestFirst = rows
    .filter((row) => {
      const date = rowDate(row);
      return !!date && !Number.isNaN(Date.parse(date)) && (!!listingOf(row) || !!projectOf(row));
    })
    .sort((a, b) => Date.parse(rowDate(b)!) - Date.parse(rowDate(a)!));
  const items = new Map<string, ActivityItem>();
  for (const row of newestFirst) {
    const date = rowDate(row)!;
    const project = projectOf(row);
    if (project) {
      const key = `project:${project.id}`;
      if (!items.has(key)) items.set(key, { kind: "project", projectId: project.id, date: indianDay(date), project });
      continue;
    }
    const listing = listingOf(row);
    if (!listing) continue;
    const property = toProperty(listing);
    if (!items.has(`property:${property.id}`)) {
      items.set(`property:${property.id}`, { kind: "property", propertyId: property.id, date: indianDay(date), property });
    }
  }
  return [...items.values()];
}

/** Each listing's newest row only, so a listing viewed many times is loaded once. */
function latestPerEntity(rows: ActivityRow[]): ActivityRow[] {
  const latest = new Map<string, ActivityRow>();
  for (const row of rows) {
    const id = row.type === "project" ? projectIdOf(row) : (listingOf(row)?._id ?? rowId(row.listing_id));
    const timestamp = rowDate(row);
    if (!id || !timestamp || Number.isNaN(Date.parse(timestamp))) continue;
    const key = `${row.type === "project" ? "project" : "property"}:${id}`;
    const seen = latest.get(key);
    if (!seen || Date.parse(timestamp) > Date.parse(rowDate(seen) ?? "")) latest.set(key, row);
  }
  return [...latest.values()].sort((a, b) => Date.parse(rowDate(b) ?? "") - Date.parse(rowDate(a) ?? ""));
}

/* ---------------- Reading (server) ---------------- */

/**
 * Viewed and shortlist rows embed the listing without its lookups populated: project, BHK,
 * furnishing and availability come as bare ids, so the card would show ids and no project photos.
 */
function isUnpopulated(listing: BackendListing): boolean {
  const d = listing.listing_details ?? {};
  const c = listing.commercial_details ?? {};
  return [d.project, d.bhk, c.furnishing, c.availablility_status].some(isObjectId);
}

/** Replaces each unpopulated listing with its full record; one that fails keeps the row's copy. */
async function withFullListings(rows: ActivityRow[]): Promise<ActivityRow[]> {
  return Promise.all(
    rows.map(async (row) => {
      const listing = listingOf(row);
      const id = listing?._id;
      if (!id || !isUnpopulated(listing)) return listing ? { ...row, listing } : row;
      try {
        const { data } = await api.get<BackendListing>(`/inventory/Listing/${encodeURIComponent(id)}`);
        return data?._id ? { ...row, listing: data } : row;
      } catch {
        return row;
      }
    }),
  );
}

/** Populates project-only activity rows that contain an id instead of a project object. */
async function withFullProjects(rows: ActivityRow[]): Promise<ActivityRow[]> {
  return Promise.all(rows.map(async (row) => {
    if (projectOf(row)) return row;
    const id = projectIdOf(row);
    if (!id || !BACKEND_ID_PATTERN.test(id)) return row;
    const result = await getProjectsByIds([id], "");
    const project = result.items.find((item) => item.id === id);
    return project ? { ...row, project } : row;
  }));
}

/** A share row. `listing_id` comes populated, but only `_id` is used, as on rezide.in. */
type SharedRow = { listing_id?: { _id?: string } | string | null; createdAt?: string };

const sharedListingId = (row: SharedRow) => (typeof row.listing_id === "string" ? row.listing_id : row.listing_id?._id);

async function sharedRows(phone: string | undefined, status?: "reject"): Promise<ActivityRow[]> {
  if (!phone) return [];
  const { data } = await api.get<{ data?: SharedRow[] }>("/share/listing/user/shared", {
    params: { mobile_no: toBackendPhone(phone), ...(status ? { status } : {}) },
  });
  const rows = (data.data ?? [])
    .filter((row): row is SharedRow & { createdAt: string } =>
      !!row.createdAt && !Number.isNaN(Date.parse(row.createdAt)),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, ACTIVITY_LIMIT);
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
  switch (tab) {
    case "viewed": {
      const rows = await Promise.all(["sale", "rent", "project"].map(async (type) => {
        const { data } = await api.get<{ result?: { visits?: ActivityRow[] } }>(VIEWED(user.id), {
          params: { type, page: 1, pageSize: ACTIVITY_LIMIT },
        });
        return (data.result?.visits ?? []).map((row) => ({ ...row, type: row.type ?? type }));
      }));
      const latest = latestPerEntity(rows.flat());
      const properties = await withFullListings(latest.filter((row) => row.type !== "project"));
      const projects = await withFullProjects(latest.filter((row) => row.type === "project"));
      return toActivityItems([...properties, ...projects]);
    }
    case "shortlisted": {
      const rows = await Promise.all(["sale", "rent", "project"].map(async (type) => {
        const { data } = await api.get<{ result?: { shortlist?: ActivityRow[] } }>(SHORTLIST(user.id), {
          params: { type, page: 1, pageSize: ACTIVITY_LIMIT },
        });
        return (data.result?.shortlist ?? []).map((row) => ({ ...row, type: row.type ?? type }));
      }));
      const latest = latestPerEntity(rows.flat());
      const properties = await withFullListings(latest.filter((row) => row.type !== "project"));
      const projects = await withFullProjects(latest.filter((row) => row.type === "project"));
      return toActivityItems([...properties, ...projects]);
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

/** The ids of the user's shortlisted listings and projects. */
export async function fetchShortlistIds(userId: string): Promise<string[]> {
  const { data } = await api.get<{ result?: { shortlist?: { listing_id?: unknown; project_id?: unknown }[] } }>(SHORTLIST(userId));
  return (data.result?.shortlist ?? []).flatMap((row) => {
    const id = rowId(row.project_id) ?? rowId(row.listing_id);
    return id ? [id] : [];
  });
}

/** The ids of listings the user has opened, for the "Viewed" mark on cards. */
export async function fetchViewedIds(userId: string): Promise<string[]> {
  const { data } = await api.get<{ result?: { visits?: { listing_id?: unknown; listing?: { _id?: string } | null }[] } }>(VIEWED(userId));
  return (data.result?.visits ?? []).flatMap((r) => {
    const id = rowId(r.listing_id) ?? r.listing?._id;
    return id ? [id] : [];
  });
}

/**
 * Adds a listing, or a project ("project", as rezide.in's project cards send it), to the shortlist
 * or removes it. The backend can answer 200 without doing it, so that fails too.
 */
export async function setShortlisted(userId: string, listingId: string, intent: Intent | "project", shortlisted: boolean): Promise<void> {
  const { data } = await api.post<{ status?: string }>(SHORTLIST(userId), undefined, {
    params: { listing_id: listingId, action: shortlisted ? "add" : "remove", type: intent === "project" ? "project" : listingType(intent) },
  });
  if (data.status !== "success") throw new Error("The shortlist wasn't updated.");
}

/** Records that the user opened a listing. */
export async function recordView(userId: string, listingId: string, intent: Intent | "project"): Promise<void> {
  await api.post(VIEWED(userId), undefined, { params: { listing_id: listingId, type: intent === "project" ? "project" : listingType(intent) } });
}