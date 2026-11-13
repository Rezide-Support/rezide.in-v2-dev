import { BUDGET_TIERS } from "@/lib/constants";
import type { Project, ProjectConfiguration, ProjectSearchCriteria, ProjectStatus } from "@/types/models";
import { cityLabel, toBackendCity } from "./locations";
import { cdnImage, PLACEHOLDER_IMAGE } from "./property-mapper";

/*
 * Rezide backend projects → the UI's Project, and the UI's search → the backend's filter body.
 * Project records also hold the developer's bank and PAN details, so only the fields named
 * here are copied, and none of those can reach the browser.
 */

type Media = { url?: string; label?: string };
const urls = (items: Media[] | undefined) => (items ?? []).map((m) => m.url?.trim() ?? "").filter(Boolean).map(cdnImage);

/** A row of POST /Inventory/project/filter/new (the fields read). */
export type BackendProjectRow = {
  _id?: string;
  project_name?: string;
  developer_name?: string;
  locality?: string;
  sub_region?: string;
  status?: string;
  possession?: string;
  bhk?: string;
  area?: string;
  acres?: string;
  tower_count?: number;
  no_of_units?: number;
  amenities?: string;
  apartment_view_groups?: string;
  rera_id?: string;
  images?: Media[];
  amenities_image?: Media[];
  saleRange?: { minimumPriceRange?: number; maximumPriceRange?: number; avgRate?: number };
  rentRange?: { minimumPriceRange?: number; maximumPriceRange?: number };
  projectBrochureId?: string;
};

/** The record of GET /Inventory/project/{id} (the fields read). */
export type BackendProjectDetail = {
  project?: {
    general_information?: {
      developer_id?: { general_information?: { description?: string } } | string;
      projectBrochure_fileID?: string;
    };
    locality_and_address?: {
      coordinates?: { latitude?: string | number; longitude?: string | number };
      address?: { line_1?: string; city?: string; locality?: string; sub_region?: string };
    };
    project_description?: { description?: string; highlights?: string[] };
    amenities?: string[];
    media?: { images?: Media[]; amenities?: Media[]; sample_flats?: Media[]; videos?: Media[] };
    configuration?: { bhk?: string; unit_plan?: string }[];
    price_range?: { name?: string; minArea?: string; maxArea?: string }[];
    similar_projects?: { value?: string }[];
  };
};

const STATUSES: Record<string, ProjectStatus> = { "ready to move": "rtm", "under construction": "uc", "new launch": "nl" };
const STATUS_FILTERS: Record<ProjectStatus, string> = { rtm: "Ready to Move", uc: "Under Construction", nl: "New Launch" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const firstNumber = (s: string | undefined) => Number.parseFloat((s ?? "").replace(/,/g, "")) || 0;

const splitList = (s: string | undefined, separator: string | RegExp) =>
  (s ?? "").split(separator).map((v) => v.trim()).filter(Boolean);

/** "1, 2, 3 & 4 BHK" → ["1 BHK", "2 BHK", "3 BHK", "4 BHK"]. */
export function toBhkOptions(bhk: string | undefined): string[] {
  return splitList(bhk, /,|&/).map((b) => {
    const value = b.replace(/\s*BHK\s*$/i, "");
    return /^[\d.]+$/.test(value) ? `${value} BHK` : b;
  });
}

/** "472 - 1416 sqft." → [472, 1416]. */
export function toAreaRange(area: string | undefined): [number, number] {
  const numbers = (area ?? "").replace(/,/g, "").match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  return [numbers[0] ?? 0, numbers[numbers.length - 1] ?? 0];
}

function possessionOf(status: ProjectStatus, iso: string | undefined): { year?: number; label: string } {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return { label: status === "rtm" ? "Ready to move" : "Possession not stated" };
  const when = `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  return status === "rtm" ? { label: `Completed ${when}` } : { year: date.getUTCFullYear(), label: `Possession ${when}` };
}

/** A list row in the UI's shape. Rows carry no city, so the caller says which one they were searched in. */
export function toProject(row: BackendProjectRow, city: string, statusOverride?: ProjectStatus): Project {
  const status = statusOverride ?? STATUSES[(row.status ?? "").trim().toLowerCase()] ?? "uc";
  const possession = possessionOf(status, row.possession);
  const [areaMin, areaMax] = toAreaRange(row.area);
  const images = urls(row.images);
  return {
    id: String(row._id ?? ""),
    name: (row.project_name ?? "").trim(),
    developer: (row.developer_name ?? "").trim(),
    city,
    locality: (row.locality || row.sub_region || "").trim(),
    status,
    possessionYear: possession.year,
    possessionLabel: possession.label,
    configurations: (row.bhk ?? "").trim(),
    bhkOptions: toBhkOptions(row.bhk),
    priceFrom: row.saleRange?.minimumPriceRange ?? 0,
    priceTo: row.saleRange?.maximumPriceRange ?? 0,
    ratePerSqft: Math.round(row.saleRange?.avgRate ?? 0),
    rentFrom: row.rentRange?.minimumPriceRange || undefined,
    rentTo: row.rentRange?.maximumPriceRange || undefined,
    areaMin,
    areaMax,
    acres: firstNumber(row.acres),
    towers: row.tower_count ?? 0,
    units: row.no_of_units ?? 0,
    amenities: splitList(row.amenities, /,\s*/),
    views: splitList(row.apartment_view_groups, ","),
    reraId: splitList(row.rera_id, ",")[0] ?? "",
    images: images.length ? images : urls(row.amenities_image).length ? urls(row.amenities_image) : [PLACEHOLDER_IMAGE],
    coords: [0, 0],
    description: "",
    brochureUrl: row.projectBrochureId ? cdnBrochure(row.projectBrochureId) : undefined,
  };
}

const cdnBrochure = (key: string) => `https://cdn.rezide.in/images/${encodeURIComponent(key)}`;

/** Unit plans per BHK, with the areas from the project's price ranges. */
function toConfigurationPlans(project: NonNullable<BackendProjectDetail["project"]>): ProjectConfiguration[] {
  return (project.price_range ?? []).flatMap((range) => {
    const bhk = range.name?.trim();
    if (!bhk) return [];
    const plans = (project.configuration ?? []).filter((c) => c.bhk?.trim() === bhk && c.unit_plan).map((c) => cdnImage(c.unit_plan as string));
    return [{ bhk, areaMin: firstNumber(range.minArea), areaMax: firstNumber(range.maxArea), unitPlans: [...new Set(plans)] }];
  });
}

/** A row with the detail record's fields added. */
export function withProjectDetail(base: Project, detail: BackendProjectDetail): Project {
  const p = detail.project;
  if (!p) return base;
  const address = p.locality_and_address?.address;
  const coords = p.locality_and_address?.coordinates;
  const lat = Number(coords?.latitude);
  const lng = Number(coords?.longitude);
  const city = address?.city ? cityLabel(address.city.trim()) : base.city;
  const developer = p.general_information?.developer_id;
  const description = typeof developer === "object" ? developer.general_information?.description?.trim() : undefined;
  const brochure = p.general_information?.projectBrochure_fileID;
  const photos = [...urls(p.media?.images), ...urls(p.media?.sample_flats)];
  return {
    ...base,
    city,
    address: address?.line_1?.trim() || undefined,
    coords: Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng) ? [lat, lng] : base.coords,
    description: p.project_description?.description?.trim() ?? "",
    highlights: p.project_description?.highlights?.map((h) => h.trim()).filter(Boolean),
    images: photos.length ? photos : base.images,
    // The list row only carries some of them.
    amenities: p.amenities?.length ? p.amenities.map((x) => x.trim()).filter(Boolean) : base.amenities,
    amenityImages: urls(p.media?.amenities),
    videoUrl: p.media?.videos?.[0]?.url?.trim() || undefined,
    configurationPlans: toConfigurationPlans(p),
    brochureUrl: brochure ? cdnBrochure(brochure) : base.brochureUrl,
    developerProfile: description ? { name: base.developer, headquarters: city, description } : undefined,
  };
}

const tiersOf = (c: ProjectSearchCriteria) => BUDGET_TIERS.filter((t) => c.budget.includes(t.id));

/** The filter body rezide.in sends to /Inventory/project/filter/new. Text and localities go together, and any of them can match. */
export function toProjectFilters(c: ProjectSearchCriteria) {
  const tiers = tiersOf(c);
  const min = tiers.length ? Math.min(...tiers.map((t) => t.min)) : 0;
  const max = tiers.length ? Math.max(...tiers.map((t) => t.max)) : Infinity;
  const text = c.localities.length ? c.localities : c.q.trim() ? [c.q.trim()] : [];
  return {
    page: c.page,
    pageSize: c.perPage,
    city: [toBackendCity(c.city)],
    project_names_localities_subRegions: text,
    project_age: c.status.map((s) => STATUS_FILTERS[s]),
    views: c.views,
    ...(min > 0 ? { budget_min: [min] } : {}),
    ...(Number.isFinite(max) ? { budget_max: [max] } : {}),
    ids: [] as string[],
  };
}

/** Whether a project's prices touch any chosen budget tier. */
export function inChosenBudgets(p: Project, c: ProjectSearchCriteria) {
  const tiers = tiersOf(c);
  if (tiers.length === 0) return true;
  if (!p.priceFrom) return false;
  return tiers.some((t) => p.priceFrom < t.max && (p.priceTo || p.priceFrom) >= t.min);
}
