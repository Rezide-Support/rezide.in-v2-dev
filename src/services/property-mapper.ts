import { validCoordinates } from "@/lib/listing-locality";
import { CDN_ORIGIN } from "@/lib/api/origins";
import { listingMedia, uniqueGalleryPhotos } from "@/lib/listing-media";
import type {
  Facing,
  Furnishing,
  MediaType,
  Paginated,
  Property,
  PropertyCategory,
  PropertyPhoto,
  PropertySearchCriteria,
  RoomDimension,
  SortKey,
  Spec,
} from "@/types/models";
import { cityLabel, toBackendCity } from "./locations";
import { RENT_BHK_IDS, SALE_BHK_IDS } from "@/features/search/sale-filter-options";

/*
 * Translates between the UI's listing model and the Rezide backend's
 * (POST /inventory/Listing/mobile/all, GET /inventory/Listing/{id}), following
 * rezide.in's listing normaliser. Pure: runs on the server, so a withheld price
 * never leaves it (src/app/api/properties/*).
 */

/* ---------------- Backend shapes (the fields read here) ---------------- */

type Named = { _id?: string; name?: string } | string | null | undefined;
type MediaItem = { url?: string; label?: string };
/** A picker's choices in address_details: [{ label: "Mumbai" }]. */
type AddressPick = { label?: string }[];
export type ListingConfiguration = {
  _id?: string; config_type?: string; flooring?: string; carpet_area?: number | string;
  no_of_balconies?: number | string; no_of_bathrooms?: number | string;
  no_of_parkings?: number | string; no_of_lifts?: number | string; unit_plan?: string | MediaItem;
  /** "Habitable" configurations list their rooms (rezide.in's Dimensions tab). */
  layout?: string;
  partitions?: { name?: string; length?: number | string; breadth?: number | string; TotalArea?: number | string; total_area?: number | string }[];
};

export type BackendListing = {
  _id?: string;
  listing_type?: string;
  listing_id?: string;
  createdAt?: string;
  updatedAt?: string;
  lastUpdate?: string;
  firm_name?: string;
  broker_name?: string;
  video?: string | null;
  vrTour?: string;
  priceHide?: boolean | string;
  key_features?: unknown[];
  apartmentAmenities?: unknown[];
  furnishingAmenities?: unknown[];
  broker_and_agent?: { broker_id?: string; firm_id?: string };
  images?: { apartment?: MediaItem[]; plans?: MediaItem[]; ext_view_day?: MediaItem[] };
  listing_address?: { city?: string; region?: string; sub_region?: string; subregion?: string; locality?: string; latitude?: number; longitude?: number };
  listing_details?: {
    listing_name?: string;
    listing_status?: string;
    /** On records with no listing_address: "Santacruz West, Daulat Nagar STC". */
    listing_location?: string;
    address_details?: { city?: AddressPick; region?: AddressPick; sub_region?: AddressPick; locality?: AddressPick };
    listing_city?: string;
    region?: string;
    sub_region?: string;
    subregion?: string;
    locality?: string;
    unit_type?: string;
    property_sub_type?: string;
    project_type?: string;
    area?: number | string;
    area_type?: string;
    bhk?: Named;
    no_of_bathrooms?: number | string;
    no_of_parkings?: number | string;
    no_of_balconies?: number | string;
    building_type?: string;
    no_of_passenger_lifts?: number | string;
    no_of_lifts?: number | string;
    flooring?: Named;
    projectHide?: boolean | string;
    tower?: { zones?: { range?: { label?: string }[]; floorPlan?: string | MediaItem }[] };
    /** `config_id`: the unit's configuration in `project.configuration` (its room sizes). */
    unit_no?: { unit?: string; display_unit?: string; floor?: number | string; config_id?: string; levelName?: string; combineWith?: (string | number)[]; project_id?: string; tower_name?: string } | string | null;
    unit_number?: string;
    floor_no?: number | string;
    total_floor?: number | string;
    building_age?: number | string;
    unitHide?: boolean | string;
    floorHide?: boolean | string;
    entry_direction?: string;
    exit_direction?: string;
    view?: string;
    flooring_type?: string;
    priceHide?: boolean | string;
    /** Populated here; account activity rows send a bare id instead (checked at runtime with isObjectId). */
    project?: {
      _id?: string;
      general_information?: { project_name?: string };
      locality_and_address?: { coordinates?: { latitude?: number | string; longitude?: number | string }; address?: { locality?: string; sub_region?: string; region?: string; city?: string } };
      media?: { images?: MediaItem[]; sample_flats?: MediaItem[]; amenities?: MediaItem[] };
      /** The project's unit configurations; a "Habitable" one lists its rooms (partitions). */
      configuration?: ListingConfiguration[];
      amenities?: unknown[];
    };
  };
  commercial_details?: {
    availablility_status?: Named;
    avg_rate_per_sqft?: number | string;
    property_purpose?: string;
    property_price?: number;
    sale_consideration?: number | string;
    monthly_rent?: number;
    security_amount?: number;
    priceHide?: boolean | string;
    furnishing?: Named;
    available_from?: string;
    visit_day?: string;
    particular_day?: string;
    start_time?: string;
    end_time?: string;
    current_occupation_status?: string;
  };
  property_details?: { project_name?: string };
};

export type BackendListingPage = { data?: BackendListing[]; result_sale?: number; result_rent?: number };

/* ---------------- Helpers ---------------- */

/** Listing photos and videos live on the Rezide CDN under their key. */
const cdn = (key: string, ext: "jpeg" | "mp4") => listingMedia(key, ext) ?? "";
export const cdnImage = (key: string) => cdn(key, "jpeg");

/** Where a listing's brochure PDF lives on the CDN, as rezide.in links it. */
export const brochureUrlFor = (listingId: string) => `${CDN_ORIGIN}/images/${encodeURIComponent(listingId)}_brochure.pdf`;

/** Shown for the few listings with no photo at all. */
export const PLACEHOLDER_IMAGE = "/images/listing-placeholder.jpg";

/** A bare MongoDB id: what the backend sends for a lookup it didn't populate (e.g. in account activity rows). */
export const isObjectId = (v: unknown): v is string => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

/** Names of the master records a listing points at, for rows that carry only their ids. */
const MASTER_NAMES: Record<string, string> = {
  "659302fcd10433fa2dbb7c8a": "Available",
};

/** A lookup's display name. A bare id is never shown: it becomes its known name, or nothing. */
const named = (v: Named): string => {
  if (isObjectId(v)) return MASTER_NAMES[v] ?? BHK_NAMES[v] ?? FURNISHING_NAMES[v] ?? "";
  return (typeof v === "string" ? v : (v?.name ?? "")).trim();
};
const namedId = (v: Named): string | undefined =>
  typeof v === "object" && v ? v._id : isObjectId(v) ? v : undefined;

const detail = (v: AddressPick | undefined) => (v?.[0]?.label ?? "").trim();

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const areaTypeLabel = (value: string | undefined) =>
  value?.trim().replace(/[_-]+/g, " ").toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase()) || undefined;

const urls = (items: MediaItem[] | undefined) =>
  (Array.isArray(items) ? items : []).flatMap(i => { const url = listingMedia(typeof i === "string" ? i : i?.url); return url ? [url] : []; });

const propertyPhotosOf = (items: MediaItem[] | undefined): PropertyPhoto[] =>
  (Array.isArray(items) ? items : []).flatMap((item, index) => {
    const url = listingMedia(typeof item === "string" ? item : item?.url);
    const label = (typeof item === "string" ? "" : item?.label)?.trim() || `Photo ${index + 1}`;
    // Keep labelled missing entries so the first matching photo remains authoritative.
    if (!url && !(typeof item === "object" && item?.label?.trim())) return [];
    return [{ label, url: url ?? "" }];
  });

const strings = (items: unknown[] | undefined) =>
  (Array.isArray(items) ? items : []).map((i) => (typeof i === "string" ? i : named(i as Named))).filter(Boolean);

/**
 * Whether the price is withheld. `commercial_details.priceHide` wins over
 * `listing_details.priceHide`, as in rezide.in.
 */
const isTrue = (v: unknown) => v === true || v === "true";

/** Unit number and floor, read only when the owner hasn't hidden them (like the price). */
function unitOf(d: NonNullable<BackendListing["listing_details"]>): { unitNo?: string; tower?: string; floorLabel?: string; floor?: number } {
  const unit = typeof d.unit_no === "object" ? d.unit_no : undefined;
  return {
    unitNo: isTrue(d.unitHide) ? undefined : (unit?.display_unit || unit?.unit || d.unit_number || "").trim() || undefined,
    tower: unit?.tower_name?.trim() || undefined,
    floorLabel: isTrue(d.floorHide) ? undefined : unit?.levelName?.trim() || undefined,
    floor: isTrue(d.floorHide) ? undefined : num(d.floor_no ?? unit?.floor),
  };
}

export function isPriceHidden(raw: BackendListing): boolean {
  const v = raw.commercial_details?.priceHide ?? raw.listing_details?.priceHide ?? raw.priceHide;
  return v === true || v === "true";
}

const FACING: Record<string, Facing> = {
  N: "North",
  S: "South",
  E: "East",
  W: "West",
  NE: "North East",
  NW: "North West",
  SE: "South East",
  SW: "South West",
};
const FACING_CODE = Object.fromEntries(Object.entries(FACING).map(([code, name]) => [name, code])) as Record<Facing, string>;

const FURNISHINGS: Furnishing[] = ["Fully Furnished", "Semi Furnished", "Unfurnished"];

/** Resolve valid media and preserve its own caption in every image tab. */
const gallerySlidesOf = (items: unknown): PropertyPhoto[] =>
  (Array.isArray(items) ? items : []).flatMap(item => {
    const url = listingMedia(typeof item === "string" ? item : item?.url);
    if (!url) return [];
    return [{ url, label: typeof item?.label === "string" ? item.label : "" }];
  });

/** The photos rezide.in shows for a listing: its own, else the project's sample flats, else project photos. */
function photosOf(raw: BackendListing): PropertyPhoto[] {
  const own = gallerySlidesOf(raw.images?.apartment);
  if (own.length) return own;
  const project = raw.listing_details?.project;
  // The backend sends `project: null` on some listings, and typeof null is "object".
  const media = project && typeof project === "object" ? project.media : undefined;
  const flats = gallerySlidesOf(media?.sample_flats);
  if (flats.length) return flats;
  return gallerySlidesOf(media?.images);
}

function visitTime(value: string | undefined): string | undefined {
  const m = value?.match(/\b(\d{2}):(\d{2})/);
  if (!m) return undefined;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** "2026-05-18 17:20:37.392695" (naive, UTC) → ISO. */
function isoDate(value: string | undefined): string | undefined {
  const m = value?.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (m) return `${m[1]}T${m[2]}Z`;
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : undefined;
}

/* ---------------- Backend → UI ---------------- */

/** The backend's listing_type for each category. */
const LISTING_TYPES: Record<PropertyCategory, string> = { homes: "home", offices: "office", retail: "retail", industrial: "industrial", land: "land" };
const CATEGORIES = Object.fromEntries(Object.entries(LISTING_TYPES).map(([category, type]) => [type, category])) as Record<string, PropertyCategory>;

/** The unit type to show when a non-home record names none. Those records can hold a status in property_sub_type instead. */
const OTHER_UNIT_TYPES: Partial<Record<PropertyCategory, string>> = { offices: "Office", retail: "Retail", industrial: "Industrial", land: "Land" };
const STATUS_SUB_TYPE = /^(ready to|under construction|newly launched|bare shell|others$)/i;

function unitTypeOf(d: NonNullable<BackendListing["listing_details"]>, category: PropertyCategory) {
  const unit = (d.unit_type ?? "").trim();
  if (category === "homes") return unit || (d.property_sub_type ?? "").trim() || "Apartment";
  const subType = (d.property_sub_type ?? "").trim();
  return [unit, subType].find((t) => t && !STATUS_SUB_TYPE.test(t)) ?? OTHER_UNIT_TYPES[category] ?? "";
}

/**
 * The unit's room sizes, as rezide.in's "Dimensions": the rooms of the unit's configuration
 * (`unit_no.config_id`), unless that configuration is marked as something other than "Habitable".
 */
export function roomsOf(d: NonNullable<BackendListing["listing_details"]>): RoomDimension[] | undefined {
  const configId = d.unit_no && typeof d.unit_no === "object" ? d.unit_no.config_id : undefined;
  const project = d.project && typeof d.project === "object" ? d.project : undefined;
  const config = configId ? project?.configuration?.find((c) => c?._id === configId) : undefined;
  // A configuration marked as something other than "Habitable" (e.g. "Commercial") has no rooms to list.
  if (!config || (config.layout && config.layout !== "Habitable")) return undefined;
  const rooms = (config.partitions ?? []).flatMap((r): RoomDimension[] => {
    if (!r) return [];
    const name = r.name?.trim();
    const length = num(r.length);
    const width = num(r.breadth);
    if (!name || length === undefined || width === undefined) return [];
    const area = num(r.TotalArea ?? r.total_area);
    return [{ name, length, width, ...(area !== undefined ? { area } : {}) }];
  });
  return rooms.length ? rooms : undefined;
}

export function toProperty(raw: BackendListing): Property {
  const d = raw.listing_details ?? {};
  const c = raw.commercial_details ?? {};
  const address = raw.listing_address ?? {};
  const rent = c.property_purpose === "rent";
  const hidden = isPriceHidden(raw);
  const category = CATEGORIES[raw.listing_type ?? ""] ?? "homes";
  const details = d.address_details;
  const project = d.project && typeof d.project === "object" ? d.project : undefined;
  const unit = d.unit_no && typeof d.unit_no === "object" ? d.unit_no : undefined;
  const configurations = Array.isArray(project?.configuration) ? project.configuration : [];
  const configuration = configurations.find(item => item?._id === unit?.config_id);

  const unitType = unitTypeOf({ ...d, unit_type: d.unit_type || configuration?.config_type }, category);
  const bhkName = named(d.bhk);
  const bhk = num(bhkName.match(/[\d.]+/)?.[0]);
  const bathrooms = num(d.no_of_bathrooms ?? configuration?.no_of_bathrooms);
  const parking = num(d.no_of_parkings ?? configuration?.no_of_parkings);
  const furnishingName = named(c.furnishing);
  const furnishing = FURNISHINGS.find((f) => f === furnishingName);
  const areaType = (d.area_type ?? "").toLowerCase();
  const photos = photosOf(raw);
  const complexPhotos = [...gallerySlidesOf(project?.media?.images), ...gallerySlidesOf(project?.media?.amenities)];
  const floorPlans = (Array.isArray(d.tower?.zones) ? d.tower.zones : [])
    .filter(zone => unit?.levelName && Array.isArray(zone?.range) && zone.range.some(level => level?.label?.toLowerCase() === unit.levelName?.toLowerCase()))
    .map(zone => zone.floorPlan);
  const planPhotos = uniqueGalleryPhotos([
    ...gallerySlidesOf(raw.images?.plans),
    ...gallerySlidesOf([configuration?.unit_plan]).map(photo => ({
      ...photo, label: photo.label.trim() ? photo.label : "Unit Plan",
    })),
    ...gallerySlidesOf(floorPlans).map(photo => ({
      ...photo, label: photo.label.trim() ? photo.label : "Floor Plan",
    })),
  ]);
  const projectAddress = project?.locality_and_address?.address;
  // Few listings have their own coordinates; the rest are where their project is.
  const projectSpot = project?.locality_and_address?.coordinates;
  const lat = num(address.latitude) || num(projectSpot?.latitude);
  const lng = num(address.longitude) || num(projectSpot?.longitude);

  const specs: Spec[] = [
    { label: unitType, value: bhkName || unitType },
    { label: "Bathrooms", value: bathrooms !== undefined ? `${bathrooms} Baths` : "—" },
    { label: "Parking", value: parking ? `${parking} Park` : "None" },
    { label: "Furnishing", value: furnishingName ? furnishingName.replace(" Furnished", "") : "—" },
  ];
  const media: MediaType[] = [
    ...(photos.length ? (["Photo"] as const) : []),
    ...(raw.video ? (["Video"] as const) : []),
    ...(raw.vrTour ? (["VR Tour"] as const) : []),
  ];

  return {
    id: String(raw._id ?? ""),
    title: (d.listing_name ?? "").replace(/\s+/g, " ").trim(),
    category,
    intent: rent ? "rent" : "buy",
    unitType,
    city: cityLabel((address.city || projectAddress?.city || d.listing_city || detail(details?.city)).trim()),
    locality: (address.sub_region || address.subregion || projectAddress?.sub_region || d.subregion || d.sub_region || address.locality || d.locality || detail(details?.sub_region) || detail(details?.locality) || (d.listing_location ?? "").split(",")[0]).trim(),
    projectLocality: projectAddress?.locality?.trim() && validCoordinates(projectSpot?.latitude, projectSpot?.longitude) ? { name: projectAddress.locality.trim(), coords: [Number(projectSpot?.latitude), Number(projectSpot?.longitude)] } : undefined,
    projectId: project?._id ?? (isObjectId(d.project) ? d.project : undefined),
    projectName: project?.general_information?.project_name ?? raw.property_details?.project_name,
    // A withheld price is never read, so it can't reach the browser.
    price: hidden ? 0 : (num(rent ? c.monthly_rent : c.property_price ?? c.sale_consideration) ?? 0),
    priceHidden: hidden || undefined,
    areaSqft: num(d.area ?? configuration?.carpet_area) ?? 0,
    areaKnown: num(d.area ?? configuration?.carpet_area) !== undefined,
    areaType: areaTypeLabel(d.area_type),
    // Carpet, RERA and usable areas are carpet; built-up and sellable areas are built-up.
    areaBasis: /built|sellable/.test(areaType) ? "Built-up" : areaType.includes("plot") ? "Plot" : "Carpet",
    bhk,
    bhkLabel: bhkName || undefined,
    bathrooms,
    parking,
    furnishing,
    furnishingLabel: furnishingName || undefined,
    facing: FACING[(d.exit_direction ?? "").toUpperCase()],
    media,
    specs,
    amenities: strings(raw.apartmentAmenities),
    description: "",
    images: photos.length ? photos.map(photo => photo.url) : [PLACEHOLDER_IMAGE],
    galleryPhotos: photos,
    propertyPhotos: propertyPhotosOf(raw.images?.apartment),
    photoSource: urls(raw.images?.apartment).length ? "listing" : urls(project?.media?.sample_flats).length ? "sample-flat" : urls(project?.media?.images).length ? "project" : "placeholder",
    availability: named(c.availablility_status) || undefined,
    availabilityId: namedId(c.availablility_status),
    locationLabel: d.listing_location?.trim() || [projectAddress?.locality, projectAddress?.sub_region].filter(Boolean).join(", ") || undefined,
    ratePerSqft: hidden ? undefined : num(c.avg_rate_per_sqft),
    coords: lat && lng ? [lat, lng] : [0, 0],
    realtorId: raw.broker_and_agent?.broker_id ?? "",
    realtorFirm: raw.firm_name ?? "",
    realtorFirmId: raw.broker_and_agent?.firm_id,
    verification: d.listing_status === "approved" ? "verified" : "pending",
    updatedAt: raw.lastUpdate ?? raw.updatedAt ?? raw.createdAt ?? "",

    listedAt: raw.createdAt,
    availableFrom: isoDate(c.available_from),
    securityDeposit: rent && !hidden ? num(c.security_amount) : undefined,
    keyFeatures: strings(raw.key_features),
    visit:
      c.visit_day || c.current_occupation_status
        ? {
            days: [c.visit_day, c.particular_day].filter(Boolean).join(" · "),
            timings: [visitTime(c.start_time), visitTime(c.end_time)].filter(Boolean).join(" – "),
            showingStatus: c.current_occupation_status ?? "",
          }
        : undefined,
    region: address.region || projectAddress?.region || d.region || detail(details?.region) || undefined,
    subRegion: address.sub_region || address.subregion || projectAddress?.sub_region || d.subregion || d.sub_region || detail(details?.sub_region) || undefined,
    localityName: (address.locality || projectAddress?.locality || d.locality || detail(details?.locality)).trim() || undefined,
    projectType: d.project_type,
    buildingType: d.building_type ?? d.project_type,
    buildingAgeLabel:
      typeof d.building_age === "string" && !Number.isFinite(Number(d.building_age))
        ? d.building_age
        : undefined,
    vastuEntry: FACING[(d.entry_direction ?? "").toUpperCase()],
    vastuExit: FACING[(d.exit_direction ?? "").toUpperCase()],
    view: d.view,
    flooring: named(d.flooring) || d.flooring_type || configuration?.flooring,
    balconies: num(d.no_of_balconies ?? configuration?.no_of_balconies),
    lifts: num(d.no_of_lifts ?? d.no_of_passenger_lifts ?? configuration?.no_of_lifts),
    furnishingItems: strings(raw.furnishingAmenities),
    rooms: roomsOf(d),
    complexImages: complexPhotos.map(photo => photo.url),
    complexPhotos,
    planImages: planPhotos.map(photo => photo.url),
    planPhotos,
    videoUrl: raw.video ? cdn(raw.video, "mp4") : undefined,
    vrTourUrl: raw.vrTour && /^https?:\/\//i.test(raw.vrTour) ? raw.vrTour : undefined,
    projectHidden: isTrue(d.projectHide),
    projectAmenities: strings(project?.amenities),
    ...unitOf(d),
    totalFloors: num(d.total_floor) || undefined,
    // The backend sends -1 when the age isn't known.
    ageYears: (num(d.building_age) ?? -1) >= 0 ? num(d.building_age) : undefined,
  };
}

/* ---------------- UI → backend ---------------- */

/** BHK master ids; rental 5+ uses its dedicated master id. */
const BHK_IDS = SALE_BHK_IDS;

/** Unit types the UI spells differently from the backend. */
const UNIT_TYPE_NAMES: Record<string, string> = { Penthouse: "Pent House" };

const FURNISHING_IDS: Record<string, string> = {
  "Semi Furnished": "650eb6b2a1a78c56b3fac96e",
  "Fully Furnished": "650eb6cda1a78c56b3fac97d",
  Unfurnished: "650eb699a1a78c56b3fac967",
  "Builder Condition": "64ebfdd6771989afbc9c5659",
  "Bare Shell": "64df3f8e97c2b999c22290d6",
};

/** id → name for the BHK masters; 5+ has a separate id from 5 BHK. */
const BHK_NAMES: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(BHK_IDS).filter(([name]) => !name.endsWith("+")).flatMap(([name, ids]) => ids.map((id) => [id, name])),
  ),
  [BHK_IDS["5+ BHK"][1]]: "5+ BHK",
};
const FURNISHING_NAMES: Record<string, string> = Object.fromEntries(Object.entries(FURNISHING_IDS).map(([name, id]) => [id, name]));

/** Counts with a top bucket ("5+", "4+") send the number and the backend's ">" (more than). */
const countValues = (values: string[]) =>
  values.flatMap((v) => (v.endsWith("+") ? [v.slice(0, -1), ">"] : [v]));

const SORT_BY: Record<SortKey, string> = {
  latest: "Latest",
  "price-asc": "Price (Low to High)",
  "price-desc": "Price (High to Low)",
  "rate-asc": "Avg. Rate psf. (Low to High)",
  "rate-desc": "Avg. Rate psf. (High to Low)",
  // The backend sorts area as text ("998" before "5432"), so searchListings sorts these itself.
  "area-asc": "Area (Low to High)",
  "area-desc": "Area (High to Low)",
};

const list = (values: string[]) => (values.length ? values : undefined);
const bound = (n: number | undefined) => (n === undefined ? undefined : [String(n)]);
const timeFilter = (values: string[]) =>
  values.includes("AnyTime") || values.includes("Any Time") ? undefined : list(values);

/**
 * The POST body for /inventory/Listing/mobile/all, as rezide.in's
 * buildListingFilters writes it.
 */
export function toListingFilters(c: PropertySearchCriteria, projectNames: string[] = []) {
  return {
    city: [toBackendCity(c.city)],
    page: c.page,
    pageSize: c.perPage,
    property_purpose: [c.intent === "rent" ? "rent" : "sale"],
    // Without a type the backend answers homes.
    listing_type: c.category === "homes" ? undefined : [LISTING_TYPES[c.category]],
    // Text and localities match project names and places; several values match any of them.
    project_names_localities: list([c.q.trim(), ...c.localities, ...projectNames].filter(Boolean)),
    // The backend filters unit type (Apartment, Duplex…) by project_type.
    project_type: list(c.unitTypes.map((u) => UNIT_TYPE_NAMES[u] ?? u)),
    bhk: list(c.bhk.flatMap((b) => (c.intent === "rent" ? RENT_BHK_IDS : BHK_IDS)[b] ?? [])),
    furnishing: list(c.furnishing.map((f) => FURNISHING_IDS[f] ?? (isObjectId(f) ? f : undefined)).filter(Boolean)),
    no_of_bathrooms: list(countValues(c.bathrooms)),
    no_of_balconies: list(countValues(c.balconies)),
    no_of_parkings: list(countValues(c.parking)),
    building_type: list(c.buildingTypes),
    building_age: list(c.buildingAges),
    listing_with: list(c.media),
    preffered_apartment: list(c.preferredApartment),
    exit_direction: list(c.facing.map((f) => FACING_CODE[f as Facing] ?? (Object.hasOwn(FACING, f) ? f : undefined)).filter(Boolean)),
    floor_range: list(c.floorRanges),
    time_on_rezide: timeFilter(c.timeOnRezide),
    availability: list(c.availability),
    minBudget: bound(c.budgetMin),
    maxBudget: bound(c.budgetMax),
    minArea: bound(c.areaMin),
    maxArea: bound(c.areaMax),
    ...(c.intent === "buy" && c.category === "homes"
      ? {
          no_of_balconies: list(countValues(c.balconies)),
          building_type: list(c.buildingTypes),
          building_age: list(c.buildingAges),
          listing_with: list(c.media),
          preffered_apartment: list(c.preferredApartment),
          floor_range: list(c.floorRanges),
          time_on_rezide: timeFilter(c.timeOnRezide),
          availability: list(c.availability),
        }
      : {}),
    sortBy: SORT_BY[c.sort],
  };
}

export type ListingFilters = ReturnType<typeof toListingFilters>;

/** A page of results in the UI's shape; the total is the count for the searched purpose. */
export function toPropertyPage(body: BackendListingPage, c: Pick<PropertySearchCriteria, "intent" | "page" | "perPage">): Paginated<Property> {
  const total = (c.intent === "rent" ? body.result_rent : body.result_sale) ?? 0;
  return {
    items: (body.data ?? []).map(toProperty),
    total,
    page: c.page,
    perPage: c.perPage,
    pageCount: Math.max(1, Math.ceil(total / c.perPage)),
  };
}
