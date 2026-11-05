import type {
  Facing,
  Furnishing,
  MediaType,
  Paginated,
  Property,
  PropertySearchCriteria,
  SortKey,
  Spec,
} from "@/types/models";
import { cityLabel, toBackendCity } from "./locations";

/*
 * Translates between the UI's listing model and the Rezide backend's
 * (POST /inventory/Listing/mobile/all, GET /inventory/Listing/{id}), following
 * rezide.in's listing normaliser. Pure: runs on the server, so a withheld price
 * never leaves it (src/app/api/properties/*).
 */

/* ---------------- Backend shapes (the fields read here) ---------------- */

type Named = { _id?: string; name?: string } | string | null | undefined;
type MediaItem = { url?: string; label?: string };

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
  key_features?: unknown[];
  apartmentAmenities?: unknown[];
  furnishingAmenities?: unknown[];
  broker_and_agent?: { broker_id?: string; firm_id?: string };
  images?: { apartment?: MediaItem[]; plans?: MediaItem[]; ext_view_day?: MediaItem[] };
  listing_address?: { city?: string; region?: string; subregion?: string; locality?: string; latitude?: number; longitude?: number };
  listing_details?: {
    listing_name?: string;
    listing_status?: string;
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
    no_of_passenger_lifts?: number | string;
    entry_direction?: string;
    exit_direction?: string;
    view?: string;
    flooring_type?: string;
    priceHide?: boolean | string;
    project?: {
      _id?: string;
      general_information?: { project_name?: string };
      media?: { images?: MediaItem[]; sample_flats?: MediaItem[] };
    };
  };
  commercial_details?: {
    property_purpose?: string;
    property_price?: number;
    monthly_rent?: number;
    security_amount?: number;
    priceHide?: boolean | string;
    furnishing?: Named;
    available_from?: string;
    visit_day?: string;
    start_time?: string;
    end_time?: string;
    current_occupation_status?: string;
  };
  property_details?: { project_name?: string };
};

export type BackendListingPage = { data?: BackendListing[]; result_sale?: number; result_rent?: number };

/* ---------------- Helpers ---------------- */

/** Listing photos and videos live on the Rezide CDN under their key. */
const cdn = (key: string, ext: "jpeg" | "mp4") => (/^https?:\/\//.test(key) ? key : `https://cdn.rezide.in/images/${key}.${ext}`);
export const cdnImage = (key: string) => cdn(key, "jpeg");

/** Where a listing's brochure PDF lives on the CDN, as rezide.in links it. */
export const brochureUrlFor = (listingId: string) => `https://cdn.rezide.in/images/${encodeURIComponent(listingId)}_brochure.pdf`;

/** Shown for the few listings with no photo at all. */
export const PLACEHOLDER_IMAGE = "/images/listing-placeholder.jpg";

const named = (v: Named) => (typeof v === "string" ? v : (v?.name ?? "")).trim();

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const urls = (items: MediaItem[] | undefined) =>
  (items ?? []).map((i) => i.url?.trim() ?? "").filter(Boolean).map(cdnImage);

const strings = (items: unknown[] | undefined) =>
  (items ?? []).map((i) => (typeof i === "string" ? i : named(i as Named))).filter(Boolean);

/**
 * Whether the price is withheld. `commercial_details.priceHide` wins over
 * `listing_details.priceHide`, as in rezide.in.
 */
export function isPriceHidden(raw: BackendListing): boolean {
  const v = raw.commercial_details?.priceHide ?? raw.listing_details?.priceHide;
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

/** The photos rezide.in shows for a listing: its own, else the project's sample flats, else project photos. */
function photosOf(raw: BackendListing): string[] {
  const own = urls(raw.images?.apartment);
  if (own.length) return own;
  const media = raw.listing_details?.project?.media;
  const flats = urls(media?.sample_flats);
  if (flats.length) return flats;
  return urls(media?.images);
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

export function toProperty(raw: BackendListing): Property {
  const d = raw.listing_details ?? {};
  const c = raw.commercial_details ?? {};
  const address = raw.listing_address ?? {};
  const rent = c.property_purpose === "rent";
  const hidden = isPriceHidden(raw);

  const unitType = (d.unit_type || d.property_sub_type || "Apartment").trim();
  const bhkName = named(d.bhk);
  const bhk = num(bhkName.match(/[\d.]+/)?.[0]);
  const bathrooms = num(d.no_of_bathrooms);
  const parking = num(d.no_of_parkings);
  const furnishingName = named(c.furnishing);
  const furnishing = FURNISHINGS.find((f) => f === furnishingName);
  const areaType = (d.area_type ?? "").toLowerCase();
  const photos = photosOf(raw);
  const lat = num(address.latitude);
  const lng = num(address.longitude);
  const project = d.project;

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
    // The backend only holds homes today (listing_type "home").
    category: "homes",
    intent: rent ? "rent" : "buy",
    unitType,
    city: cityLabel((d.listing_city || address.city || "").trim()),
    locality: (d.subregion || d.sub_region || address.subregion || d.locality || address.locality || "").trim(),
    projectId: project?._id,
    projectName: project?.general_information?.project_name ?? raw.property_details?.project_name,
    // A withheld price is never read, so it can't reach the browser.
    price: hidden ? 0 : ((rent ? c.monthly_rent : c.property_price) ?? 0),
    priceHidden: hidden || undefined,
    areaSqft: num(d.area) ?? 0,
    // Carpet, RERA and usable areas are carpet; built-up and sellable areas are built-up.
    areaBasis: /built|sellable/.test(areaType) ? "Built-up" : areaType.includes("plot") ? "Plot" : "Carpet",
    bhk,
    bathrooms,
    parking,
    furnishing,
    facing: FACING[(d.exit_direction ?? "").toUpperCase()],
    media,
    specs,
    amenities: strings(raw.apartmentAmenities),
    description: "",
    images: photos.length ? photos : [PLACEHOLDER_IMAGE],
    coords: lat !== undefined && lng !== undefined ? [lat, lng] : [0, 0],
    realtorId: raw.broker_and_agent?.broker_id ?? "",
    realtorFirm: raw.firm_name ?? "",
    realtorFirmId: raw.broker_and_agent?.firm_id,
    verification: d.listing_status === "approved" ? "verified" : "pending",
    updatedAt: raw.lastUpdate ?? raw.updatedAt ?? raw.createdAt ?? "",

    listedAt: raw.createdAt,
    availableFrom: isoDate(c.available_from),
    securityDeposit: rent && !hidden ? num(c.security_amount) || undefined : undefined,
    keyFeatures: strings(raw.key_features),
    visit:
      c.visit_day || c.current_occupation_status
        ? {
            days: c.visit_day ?? "",
            timings: [visitTime(c.start_time), visitTime(c.end_time)].filter(Boolean).join(" – "),
            showingStatus: c.current_occupation_status ?? "",
          }
        : undefined,
    region: d.region || address.region,
    subRegion: d.subregion || d.sub_region || address.subregion,
    localityName: (d.locality || address.locality || "").trim() || undefined,
    projectType: d.project_type,
    vastuEntry: FACING[(d.entry_direction ?? "").toUpperCase()],
    vastuExit: FACING[(d.exit_direction ?? "").toUpperCase()],
    view: d.view,
    flooring: d.flooring_type,
    balconies: num(d.no_of_balconies),
    lifts: num(d.no_of_passenger_lifts),
    furnishingItems: strings(raw.furnishingAmenities),
    complexImages: urls(project?.media?.images),
    planImages: urls(raw.images?.plans),
    videoUrl: raw.video ? cdn(raw.video, "mp4") : undefined,
  };
}

/* ---------------- UI → backend ---------------- */

/** BHK master ids, as rezide.in's filters send them. "5+ BHK" covers 5 and above. */
const BHK_IDS: Record<string, string[]> = {
  Studio: ["650eb55ea1a78c56b3fac910"],
  "1 BHK": ["650eb48ea1a78c56b3fac901"],
  "1.5 BHK": ["650eb482a1a78c56b3fac8fa"],
  "2 BHK": ["64de062c4f5f0ae6e602328a"],
  "2.5 BHK": ["64de06494f5f0ae6e602328e"],
  "3 BHK": ["64de06554f5f0ae6e6023292"],
  "3.5 BHK": ["64de06594f5f0ae6e6023296"],
  "4 BHK": ["64de065d4f5f0ae6e602329a"],
  "4.5 BHK": ["64de06614f5f0ae6e602329e"],
  "5 BHK": ["64de06664f5f0ae6e60232a2"],
  "5+ BHK": ["64de06664f5f0ae6e60232a2", "656730d08eb9d2295cb750ed"],
};

/** Unit types the UI spells differently from the backend. */
const UNIT_TYPE_NAMES: Record<string, string> = { Penthouse: "Pent House" };

const FURNISHING_IDS: Record<string, string> = {
  "Semi Furnished": "650eb6b2a1a78c56b3fac96e",
  "Fully Furnished": "650eb6cda1a78c56b3fac97d",
  Unfurnished: "650eb699a1a78c56b3fac967",
};

/** Counts with a top bucket ("5+", "4+") send the number and the backend's ">" (more than). */
const countValues = (values: string[]) =>
  values.flatMap((v) => (v.endsWith("+") ? [v.slice(0, -1), ">"] : [v]));

const SORT_BY: Record<SortKey, string> = {
  latest: "Latest",
  "price-asc": "Price (Low to High)",
  "price-desc": "Price (High to Low)",
  "area-desc": "Area (High to Low)",
};

const list = (values: string[]) => (values.length ? values : undefined);
const bound = (n: number | undefined) => (n === undefined ? undefined : [String(n)]);

/**
 * The POST body for /inventory/Listing/mobile/all, as rezide.in's
 * buildListingFilters writes it. Media has no backend filter yet.
 */
export function toListingFilters(c: PropertySearchCriteria) {
  return {
    city: [toBackendCity(c.city)],
    page: c.page,
    pageSize: c.perPage,
    property_purpose: [c.intent === "rent" ? "rent" : "sale"],
    // Text and localities match project names and places; several values match any of them.
    project_names_localities: list([c.q.trim(), ...c.localities].filter(Boolean)),
    project_id: list(c.projects),
    // The backend filters unit type (Apartment, Duplex…) by project_type.
    project_type: list(c.unitTypes.map((u) => UNIT_TYPE_NAMES[u] ?? u)),
    bhk: list(c.bhk.flatMap((b) => BHK_IDS[b] ?? [])),
    furnishing: list(c.furnishing.map((f) => FURNISHING_IDS[f]).filter(Boolean)),
    no_of_bathrooms: list(countValues(c.bathrooms)),
    no_of_parkings: list(countValues(c.parking)),
    exit_direction: list(c.facing.map((f) => FACING_CODE[f as Facing]).filter(Boolean)),
    minBudget: bound(c.budgetMin),
    maxBudget: bound(c.budgetMax),
    minArea: bound(c.areaMin),
    maxArea: bound(c.areaMax),
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
