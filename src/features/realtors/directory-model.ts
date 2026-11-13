/** Public directory DTOs. Never forward backend identity documents or private contact fields. */
export type DirectoryPerson = {
  id: string;
  name: string;
  photo: string;
  languages: string[];
  specializations: string[];
  memberOf?: string[];
  /** Public title used only as a temporary basis for the Gender filter. */
  salutation?: string;
};
export type DirectoryFirm = {
  id: string;
  name: string;
  logo: string;
  since: string;
  specializations: string[];
  subRegions: string[];
  localities: string[];
  projects: string[];
  rera: string;
  gst: string;
  rent: number | null;
  sale: number | null;
  people: DirectoryPerson[];
};
export type DirectoryPage = { data: DirectoryFirm[]; broker_count: number };
export type DirectoryFirmDetail = DirectoryFirm & {
  about: string;
  entityType: string;
  addresses: string[];
  socials: { label: string; url: string }[];
};
export type DirectorySuggestion = { source: string; name: string; id: string; firmName: string };
export type DirectoryFilters = { city?: string; subRegions: string[]; locality: string[]; projects: string[]; broker: string[]; specializations?: string[] };
export const EMPTY_DIRECTORY_FILTERS: DirectoryFilters = { subRegions: [], locality: [], projects: [], broker: [] };

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
export const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
export const labels = (value: unknown): string[] => [...new Set(array(value).map(v => text(v) || text(record(v).label)).filter(Boolean))];
export function count(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export function directoryBody(filters: DirectoryFilters) {
  return {
    status: "complete", active_status: "active", sortBy: [1],
    ...(filters.subRegions.length ? { subRegions: filters.subRegions } : {}),
    ...(filters.locality.length ? { locality: filters.locality } : {}),
    ...(filters.projects.length ? { projects: filters.projects } : {}),
    ...(filters.broker.length ? { searchParams: filters.broker } : {}),
    ...(filters.specializations?.length ? { specialization: filters.specializations } : {}),
  };
}
export function flattenPeople(firms: DirectoryFirm[]) {
  return firms.flatMap(firm => firm.people.map(person => ({ firm, person })));
}
export function suggestionFilter(suggestion: DirectorySuggestion): Partial<DirectoryFilters> | null {
  switch (suggestion.source) {
    case "locality": return { locality: [suggestion.name] };
    case "Sub Region": return { subRegions: [suggestion.name] };
    case "project": return { projects: [suggestion.name] };
    case "Broker": return { broker: [suggestion.name] };
    default: return null;
  }
}
export const directoryFirmHref = (firm: Pick<DirectoryFirm, "name">) => `/realtors/${encodeURIComponent(firm.name)}`;
/** Decode a route segment once; preserve literal percent signs in already-decoded names. */
export function decodeDirectorySegment(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}
export const directoryPersonHref = (firm: Pick<DirectoryFirm, "name">, person: Pick<DirectoryPerson, "id">) => `${directoryFirmHref(firm)}/${encodeURIComponent(person.id)}`;
