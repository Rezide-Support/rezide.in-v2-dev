import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { queryOptions } from "@tanstack/react-query";
import { directoryBody, type DirectoryFilters, type DirectoryPage, type DirectorySuggestion, type DirectoryFirmDetail, type DirectoryPersonDetail } from "@/features/realtors/directory-model";
import type { Paginated, Property } from "@/types/models";

export type FirmListingPage = Paginated<Property> & { sale: number; rent: number };
export class DirectoryRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Same-origin requests deliberately bypass the legacy Axios base URL and mock adapter. */
export async function directoryRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: body === undefined ? "GET" : "POST", headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal });
  const data = await response.json().catch(() => {
    throw new DirectoryRequestError(response.ok ? "The realtor service returned an invalid response." : "The realtor request failed. Please try again.", response.ok ? 502 : response.status);
  });
  if (!response.ok) throw new DirectoryRequestError(typeof data?.message === "string" ? data.message : "The realtor request failed.", response.status);
  return data;
}
export async function loadFirmPage(filters: DirectoryFilters, page: number, pageSize: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.city) params.set("city", filters.city);
  return directoryRequest<DirectoryPage>(`/api/brokers?${params}`, directoryBody(filters), signal);
}
/** People totals require every matching firm page, not just the first 100 firms. */
export async function loadAllFirms(filters: DirectoryFilters, signal?: AbortSignal) {
  const first = await loadFirmPage(filters, 1, 100, signal);
  const firms = [...first.data];
  const seen = new Set(firms.map(f => f.id));
  // Advance using the actual number served, even if upstream clamps below 100.
  let page = 1, received = first.data.length;
  while (received < first.broker_count) {
    if (!first.data.length || page >= 10000) throw new Error("The directory could not load all firms. Please retry.");
    const next = await loadFirmPage(filters, ++page, 100, signal);
    let added = 0;
    for (const firm of next.data) if (!seen.has(firm.id)) { seen.add(firm.id); firms.push(firm); added++; }
    if (!next.data.length || !added) throw new Error("The directory returned an incomplete set of firms. Please retry.");
    received += next.data.length;
  }
  return firms;
}
export const directoryQueries = {
  person: (lookupId: string) => queryOptions({ queryKey: ["realtor-directory", "person", lookupId], queryFn: ({ signal }) => directoryRequest<DirectoryPersonDetail>(`/api/brokers/person?lookupId=${encodeURIComponent(lookupId)}`, undefined, signal), enabled: BACKEND_ID_PATTERN.test(lookupId), staleTime: 60_000, retry: (attempt, error) => !(error instanceof DirectoryRequestError && error.status === 404) && attempt < 2 }),
  personListings: (personId: string, purpose: "sale" | "rent", page: number) => queryOptions({ queryKey: ["realtor-directory", "person-listings", personId, purpose, page], queryFn: ({ signal }) => directoryRequest<FirmListingPage>(`/api/brokers/listings?broker_id=${encodeURIComponent(personId)}&purpose=${purpose}&page=${page}`, undefined, signal), enabled: BACKEND_ID_PATTERN.test(personId), staleTime: 60_000 }),
  profile: (name: string) => queryOptions({ queryKey: ["realtor-directory", "profile", name], queryFn: ({ signal }) => directoryRequest<DirectoryFirmDetail>(`/api/brokers/profile?name=${encodeURIComponent(name)}`, undefined, signal), staleTime: 60_000 }),
  listings: (firmId: string, purpose: "sale" | "rent", page: number) => queryOptions({ queryKey: ["realtor-directory", "listings", firmId, purpose, page], queryFn: ({ signal }) => directoryRequest<FirmListingPage>(`/api/brokers/listings?firm_id=${encodeURIComponent(firmId)}&purpose=${purpose}&page=${page}`, undefined, signal), enabled: !!firmId, staleTime: 60_000 }),
  firms: (filters: DirectoryFilters, page: number) => queryOptions({ queryKey: ["realtor-directory", "firms", filters, page], queryFn: ({ signal }) => loadFirmPage(filters, page, 6, signal), staleTime: 60_000 }),
  people: (filters: DirectoryFilters) => queryOptions({ queryKey: ["realtor-directory", "people", filters], queryFn: ({ signal }) => loadAllFirms(filters, signal), staleTime: 60_000 }),
  suggestions: (q: string) => queryOptions({ queryKey: ["realtor-directory", "suggestions", q], queryFn: ({ signal }) => directoryRequest<{ result: DirectorySuggestion[] }>(`/api/search?scope=broker&q=${encodeURIComponent(q)}`, undefined, signal), enabled: !!q.trim(), staleTime: 300_000 }),
};

/** Which of a firm's areas a count is for (rezide.in's /brokers/{kind}/count/{firmId}). */
export type FirmAreaKind = "sub-region" | "locality" | "project";
const AREA_BODY_KEY: Record<FirmAreaKind, string> = { "sub-region": "sub_region", locality: "localities", project: "projects" };

/**
 * How many of the firm's listings are in each of its areas, as rezide.in's firm page shows them
 * (the number next to "Chembur"): POST /brokers/{kind}/count/{firmId} on the Rezide backend.
 */
export async function fetchFirmAreaCounts(firmId: string, kind: FirmAreaKind, names: string[]): Promise<Record<string, number>> {
  const { api } = await import("@/lib/api/client");
  const { data } = await api.post<{ data?: { _id?: string; listing_count?: number }[] }>(
    `/brokers/${kind}/count/${encodeURIComponent(firmId)}`,
    { type: "firm_id", [AREA_BODY_KEY[kind]]: names },
  );
  return Object.fromEntries((data?.data ?? []).flatMap((r) => (r._id ? [[r._id, Number(r.listing_count) || 0]] : [])));
}

export const firmAreaQueries = {
  counts: (firmId: string, kind: FirmAreaKind, names: string[]) =>
    queryOptions({ queryKey: ["realtor-directory", "area-counts", firmId, kind, names], queryFn: () => fetchFirmAreaCounts(firmId, kind, names), staleTime: 60_000, enabled: names.length > 0 }),
};
