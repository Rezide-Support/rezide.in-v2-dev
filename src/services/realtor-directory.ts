import { queryOptions } from "@tanstack/react-query";
import { directoryBody, type DirectoryFilters, type DirectoryPage, type DirectorySuggestion, type DirectoryFirmDetail } from "@/features/realtors/directory-model";
import type { Paginated, Property } from "@/types/models";

export type FirmListingPage = Paginated<Property> & { sale: number; rent: number };
export class DirectoryRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Same-origin requests deliberately bypass the legacy Axios base URL and mock adapter. */
export async function directoryRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: body === undefined ? "GET" : "POST", headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal });
  const data = await response.json().catch(() => { throw new Error("The realtor service returned an invalid response."); });
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
  profile: (name: string) => queryOptions({ queryKey: ["realtor-directory", "profile", name], queryFn: ({ signal }) => directoryRequest<DirectoryFirmDetail>(`/api/brokers/profile?name=${encodeURIComponent(name)}`, undefined, signal), staleTime: 60_000 }),
  listings: (firmId: string, purpose: "sale" | "rent", page: number) => queryOptions({ queryKey: ["realtor-directory", "listings", firmId, purpose, page], queryFn: ({ signal }) => directoryRequest<FirmListingPage>(`/api/brokers/listings?firm_id=${encodeURIComponent(firmId)}&purpose=${purpose}&page=${page}`, undefined, signal), enabled: !!firmId, staleTime: 60_000 }),
  firms: (filters: DirectoryFilters, page: number) => queryOptions({ queryKey: ["realtor-directory", "firms", filters, page], queryFn: ({ signal }) => loadFirmPage(filters, page, 6, signal), staleTime: 60_000 }),
  people: (filters: DirectoryFilters) => queryOptions({ queryKey: ["realtor-directory", "people", filters], queryFn: ({ signal }) => loadAllFirms(filters, signal), staleTime: 60_000 }),
  suggestions: (q: string) => queryOptions({ queryKey: ["realtor-directory", "suggestions", q], queryFn: ({ signal }) => directoryRequest<{ result: DirectorySuggestion[] }>(`/api/search?scope=broker&q=${encodeURIComponent(q)}`, undefined, signal), enabled: !!q.trim(), staleTime: 300_000 }),
};
