import { CDN_ORIGIN, uploadUrl } from "@/lib/api/origins";
import { BUDGET_TIERS } from "@/lib/constants";
import type { DeveloperProfile, Project, ProjectConfiguration, ProjectRera, ProjectSearchCriteria, ProjectSortKey, ProjectStatus } from "@/types/models";
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
  city?: string;
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
type BackendLabel = { label?: string } | null | undefined;

/** The developer embedded in a project record (the public fields read; it also holds bank details). */
export type BackendDeveloper = {
  _id?: string;
  general_information?: { developer_name?: string; description?: string; estd_year?: string | number };
  media?: { images?: Media[] };
  contact_details?: { address?: { city?: BackendLabel; state?: BackendLabel }[] };
};

export type BackendProjectDetail = {
  project?: {
    general_information?: {
      developer_id?: BackendDeveloper | string;
      projectBrochure_fileID?: string;
      logo?: string;
      reraIDs?: { rera_id?: string; rera_link?: string; rera_image?: string }[];
    };
    locality_and_address?: {
      coordinates?: { latitude?: string | number; longitude?: string | number };
      address?: { line_1?: string; city?: string; locality?: string; sub_region?: string };
    };
    project_description?: { description?: string; highlights?: string[] };
    amenities?: string[];
    media?: { images?: Media[]; amenities?: Media[]; sample_flats?: Media[]; videos?: Media[] };
    configuration?: { bhk?: string; unit_plan?: string }[];
    price_range?: {
      name?: string;
      minArea?: string;
      maxArea?: string;
      minArea_search?: string | number;
      maxArea_search?: string | number;
      saleMin_search?: number | string;
      saleMax_search?: number | string;
      rentalMin_search?: number | string;
      rentalMax_search?: number | string;
    }[];
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

/** Prefer the project's own city; older responses fall back to the search city. */
export function toProject(row: BackendProjectRow, city: string, statusOverride?: ProjectStatus): Project {
  const status = statusOverride ?? STATUSES[(row.status ?? "").trim().toLowerCase()] ?? "uc";
  const possession = possessionOf(status, row.possession);
  const [areaMin, areaMax] = toAreaRange(row.area);
  const images = urls(row.images);
  return {
    id: String(row._id ?? ""),
    name: (row.project_name ?? "").trim(),
    developer: (row.developer_name ?? "").trim(),
    city: row.city?.trim() || city,
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

const cdnBrochure = (key: string) => `${CDN_ORIGIN}/images/${encodeURIComponent(key)}`;

/** Unit plans per BHK, with the areas from the project's price ranges. */
/** A positive amount, or undefined (the backend sends 0 or nothing when there's none). */
const amount = (n: unknown) => {
  const v = typeof n === "string" ? Number(n.replace(/,/g, "")) : n;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
};

/** Per-configuration area, sale and rent ranges (and unit plans), from a detail record or a /Inventory/project/ids row. */
export function toConfigurationPlans(project: Pick<NonNullable<BackendProjectDetail["project"]>, "price_range" | "configuration">): ProjectConfiguration[] {
  return (project.price_range ?? []).flatMap((range) => {
    const bhk = range.name?.trim();
    if (!bhk) return [];
    const plans = (project.configuration ?? []).filter((c) => c.bhk?.trim() === bhk && c.unit_plan).map((c) => cdnImage(c.unit_plan as string));
    return [
      {
        bhk,
        areaMin: amount(range.minArea_search) ?? firstNumber(range.minArea),
        areaMax: amount(range.maxArea_search) ?? firstNumber(range.maxArea),
        saleMin: amount(range.saleMin_search),
        saleMax: amount(range.saleMax_search),
        rentMin: amount(range.rentalMin_search),
        rentMax: amount(range.rentalMax_search),
        unitPlans: [...new Set(plans)],
      },
    ];
  });
}

/** RERA registrations with a real id, as rezide.in lists them (blank and "N/A" ids are left out). */
function toReras(project: NonNullable<BackendProjectDetail["project"]>): ProjectRera[] {
  return (project.general_information?.reraIDs ?? []).flatMap((r) => {
    const id = r.rera_id?.trim();
    if (!id || id.toLowerCase() === "n/a") return [];
    const link = r.rera_link?.trim();
    const qr = r.rera_image?.trim();
    return [{ id, link: link && /^https?:\/\//i.test(link) ? link : undefined, qr: qr ? uploadUrl(qr) : undefined }];
  });
}

/** The developer's public profile: name, logo, year founded and office cities. Never its bank or contact records. */
function toDeveloperProfile(project: NonNullable<BackendProjectDetail["project"]>, base: Project, city: string): DeveloperProfile | undefined {
  const dev = project.general_information?.developer_id;
  if (!dev || typeof dev !== "object") return undefined;
  const info = dev.general_information ?? {};
  const offices = dev.contact_details?.address ?? [];
  const head = offices[0];
  const headquarters = [head?.city?.label?.trim(), head?.state?.label?.trim()].filter(Boolean).join(", ");
  const logoKey = dev.media?.images?.find((i) => i.label === "Developer Logo")?.url?.trim() || project.general_information?.logo?.trim();
  const established = String(info.estd_year ?? "").trim();
  return {
    id: dev._id,
    name: info.developer_name?.trim() || base.developer,
    headquarters: headquarters || city,
    description: info.description?.trim() ?? "",
    logo: logoKey ? uploadUrl(logoKey) : undefined,
    established: /^\d{4}$/.test(established) ? established : undefined,
    cities: [...new Set(offices.map((a) => a.city?.label?.trim()).filter((c): c is string => !!c))],
  };
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
    reras: toReras(p),
    brochureUrl: brochure ? cdnBrochure(brochure) : base.brochureUrl,
    developerProfile: toDeveloperProfile(p, base, city),
  };
}

const tiersOf = (c: ProjectSearchCriteria) => BUDGET_TIERS.filter((t) => c.budget.includes(t.id));

/**
 * The filter body rezide.in sends to /Inventory/project/filter/new. As there, the Location
 * dialog's localities go in `subRegions` (any of them matches) and the search text on its
 * own, so the backend requires both.
 */
export function toProjectFilters(c: ProjectSearchCriteria) {
  const tiers = tiersOf(c);
  const min = tiers.length ? Math.min(...tiers.map((t) => t.min)) : 0;
  const max = tiers.length ? Math.max(...tiers.map((t) => t.max)) : Infinity;
  return {
    page: c.page,
    pageSize: c.perPage,
    city: [toBackendCity(c.city)],
    project_names_localities_subRegions: c.q.trim() ? [c.q.trim()] : [],
    subRegions: c.localities,
    project_age: c.status.map((s) => STATUS_FILTERS[s]),
    views: c.views,
    ...(min > 0 ? { budget_min: [min] } : {}),
    ...(Number.isFinite(max) ? { budget_max: [max] } : {}),
    sortBy: PROJECT_SORT_BY[c.sort],
    ids: [] as string[],
  };
}

/** The backend's sortBy values, as rezide.in sends them. */
const PROJECT_SORT_BY: Record<ProjectSortKey, string> = {
  latest: "Latest",
  "price-asc": "Sale Price Low to High",
  "price-desc": "Sale Price High to Low",
  "plot-asc": "Plot Area (Low to High)",
  "plot-desc": "Plot Area (High to Low)",
  "yield-asc": "Rental Yield (Low to High)",
  "yield-desc": "Rental Yield (High to Low)",
};

/** Whether a project's prices touch any chosen budget tier. */
export function inChosenBudgets(p: Project, c: ProjectSearchCriteria) {
  const tiers = tiersOf(c);
  if (tiers.length === 0) return true;
  if (!p.priceFrom) return false;
  return tiers.some((t) => p.priceFrom < t.max && (p.priceTo || p.priceFrom) >= t.min);
}
