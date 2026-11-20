import { api } from "@/lib/api/client";
import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { uploadUrl } from "@/lib/api/origins";

/*
 * Server only: the Sale / Rental compare table, read as rezide.in's compare page reads it
 * (POST /Inventory/listing/ids, the partition labels, and the listing search for "Add
 * Property"). Listing records hold the broker's and owner's details, so only the fields the
 * table shows are copied, and a hidden unit, floor or price never leaves the server.
 */

type Media = { label?: string; url?: string };
type Partition = { name?: string; length?: string | number; breadth?: string | number; TotalArea?: string | number };
type BackendCompareListing = {
  _id?: string;
  listing_details?: {
    listing_name?: string;
    unit_type?: string;
    area?: string | number;
    area_type?: string;
    floor_no?: string | number;
    floorHide?: boolean;
    UnitFloorPosition?: string;
    unitHide?: boolean;
    towerHide?: boolean;
    priceHide?: boolean;
    bhk?: { name?: string } | null;
    no_of_bathrooms?: string | number;
    no_of_balconies?: string | number;
    no_of_parkings?: string | number;
    view?: string;
    entry_direction?: string;
    exit_direction?: string;
    unit_no?: { unit?: string; config_id?: string } | null;
    tower?: {
      general_information?: { tower_name?: string };
      levels_prefix?: { no_of_levels_above?: string | number };
      series_suffix?: { level_start?: { value?: string | number } };
    } | null;
    project?: {
      _id?: string;
      general_information?: { project_name?: string; completion_date?: string };
      locality_and_address?: { address?: { city?: string; locality?: string } };
      media?: { images?: Media[]; sample_flats?: Media[] };
      amenities?: string[];
      configuration?: { _id?: string; partitions?: Partition[] }[];
    } | null;
  };
  commercial_details?: {
    property_purpose?: string;
    available_from?: string;
    monthly_rent?: number | string;
    property_price?: number | string;
    discount_price?: number | string;
    sale_considration?: number | string;
    avg_rate_per_sqft?: number | string;
    security_amount?: number;
    furnishing?: { name?: string } | null;
  };
  images?: { apartment?: Media[]; ext_view_day?: Media[]; ext_view_night?: Media[] };
  furnishingAmenities?: string[];
  apartmentAmenities?: string[];
};

export type CompareRoom = { name: string; length?: string | number; breadth?: string | number; area?: string | number };
export type ComparePhoto = { label: string; url: string };

/** One listing in the Sale / Rental compare table (public fields only). */
export type CompareListing = {
  id: string;
  name: string;
  purpose: "sale" | "rent";
  /** The header photo: the unit's, else the project's sample flat or photo. */
  photo?: string;
  availableFrom?: string;
  /** Price amounts as rezide.in picks from them (left out when the owner hides the price). */
  monthlyRent?: number;
  propertyPrice?: number;
  discountPrice?: number;
  saleConsideration?: number;
  ratePerSqft?: number;
  securityDeposit?: number;
  city?: string;
  locality?: string;
  complexName?: string;
  propertyType?: string;
  /** "-" when the owner hides it; one letter becomes "Tower A". */
  tower: string;
  completionDate?: string;
  /** Floors above the tower's first level; null when the tower doesn't say. */
  totalFloors: number | null;
  /** The floor, or its position ("Lower Floor") when the owner hides it. */
  floor: string;
  /** "-" when the owner hides it. */
  unitNo: string;
  bedrooms?: string;
  bathrooms?: string;
  balconies?: string;
  carParks?: string;
  view?: string;
  entry?: string;
  exit?: string;
  /** e.g. "total_usable_area" (rezide.in labels it "Usable Area"). */
  areaType: string;
  area: string | number;
  rooms: CompareRoom[];
  photos: ComparePhoto[];
  viewsDay: ComparePhoto[];
  viewsNight: ComparePhoto[];
  furnishing?: string;
  furnishingItems: string[];
  apartmentAmenities: string[];
  projectAmenities: string[];
};

const text = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : String(v));
const amount = (v: unknown) => {
  const n = Number(v);
  return v === undefined || v === null || v === "" || !Number.isFinite(n) ? undefined : n;
};
const photos = (items: Media[] | undefined): ComparePhoto[] =>
  (items ?? []).flatMap((m) => (m.url?.trim() && m.label ? [{ label: m.label, url: uploadUrl(m.url.trim()) }] : []));
const names = (items: unknown) => (Array.isArray(items) ? items.filter((x): x is string => typeof x === "string" && x.trim() !== "") : []);

/** rezide.in shows a one-letter tower name as "Tower A". */
const towerName = (name: string) => (name.length === 1 ? `Tower ${name}` : name);

export function toCompareListing(r: BackendCompareListing): CompareListing | null {
  const id = String(r._id ?? "");
  if (!id) return null;
  const d = r.listing_details ?? {};
  const c = r.commercial_details ?? {};
  const project = d.project ?? undefined;
  const config = project?.configuration?.find((x) => x._id && x._id === d.unit_no?.config_id);
  const firstPhoto = [r.images?.apartment, project?.media?.sample_flats, project?.media?.images].find((list) => (list ?? []).length > 0)?.[0]?.url?.trim();
  const levels = parseInt(String(d.tower?.levels_prefix?.no_of_levels_above ?? ""), 10) - parseInt(String(d.tower?.series_suffix?.level_start?.value ?? ""), 10) + 1;
  const tower = d.tower?.general_information?.tower_name;
  const priceHidden = d.priceHide === true;
  const price = (v: unknown) => (priceHidden ? undefined : amount(v));
  return {
    id,
    name: (d.listing_name ?? "").trim(),
    purpose: c.property_purpose === "rent" ? "rent" : "sale",
    photo: firstPhoto ? uploadUrl(firstPhoto) : undefined,
    availableFrom: text(c.available_from),
    monthlyRent: price(c.monthly_rent),
    propertyPrice: price(c.property_price),
    discountPrice: price(c.discount_price),
    saleConsideration: price(c.sale_considration),
    ratePerSqft: price(c.avg_rate_per_sqft),
    securityDeposit: price(c.security_amount),
    city: text(project?.locality_and_address?.address?.city),
    locality: text(project?.locality_and_address?.address?.locality),
    complexName: text(project?.general_information?.project_name),
    propertyType: text(d.unit_type),
    tower: tower ? (d.towerHide === false ? towerName(tower) : "-") : "-",
    completionDate: text(project?.general_information?.completion_date),
    totalFloors: Number.isFinite(levels) ? levels : null,
    floor: d.floor_no ? (d.floorHide === false ? String(d.floor_no) : (d.UnitFloorPosition ?? "")) : "-",
    unitNo: d.unit_no?.unit ? (d.unitHide === false ? d.unit_no.unit : "-") : "-",
    bedrooms: text(d.bhk?.name),
    bathrooms: text(d.no_of_bathrooms),
    balconies: text(d.no_of_balconies),
    carParks: text(d.no_of_parkings),
    view: text(d.view),
    entry: text(d.entry_direction),
    exit: text(d.exit_direction),
    areaType: d.area_type || "rera_area",
    area: d.area || "0",
    rooms: (config?.partitions ?? []).flatMap((p) => (p.name ? [{ name: p.name, length: p.length, breadth: p.breadth, area: p.TotalArea }] : [])),
    photos: photos(r.images?.apartment),
    viewsDay: photos(r.images?.ext_view_day),
    viewsNight: photos(r.images?.ext_view_night),
    furnishing: text(c.furnishing?.name),
    furnishingItems: names(r.furnishingAmenities),
    apartmentAmenities: names(r.apartmentAmenities),
    projectAmenities: names(project?.amenities),
  };
}

/** The compared listings, in the order asked for, with the room labels in rezide.in's order. */
export async function getCompareListings(ids: string[]): Promise<{ roomLabels: string[]; listings: CompareListing[] }> {
  const wanted = ids.filter((id) => BACKEND_ID_PATTERN.test(id)).slice(0, 3);
  const [records, labels] = await Promise.all([
    wanted.length
      ? api.post<{ data?: BackendCompareListing[] }>("/Inventory/listing/ids", { listingIds: wanted }).then((r) => r.data.data ?? [])
      : Promise.resolve([]),
    api
      .get<{ data?: { name?: string }[] }>("/repository/partitionLabel/")
      .then((r) => (r.data.data ?? []).flatMap((l) => (l.name ? [l.name] : [])))
      .catch(() => [] as string[]),
  ]);
  const byId = new Map(records.flatMap((r) => (r._id ? [[String(r._id), r] as const] : [])));
  const listings = wanted.flatMap((id) => {
    const r = byId.get(id);
    const l = r ? toCompareListing(r) : null;
    return l ? [l] : [];
  });
  return { roomLabels: [...new Set(labels)], listings };
}

type ListingRow = { _id?: string; listing_details?: { listing_name?: string; project?: { _id?: string; general_information?: { project_name?: string } } | null } };

/** "Add Property": the projects of the listings matching what's typed (rezide.in's searchQuery). */
export async function searchCompareProjects(query: string): Promise<{ id: string; name: string }[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const { data } = await api.post<{ data?: ListingRow[] }>("/inventory/Listing/mobile/all", { searchQuery: q });
  const seen = new Map<string, string>();
  for (const l of data.data ?? []) {
    const p = l.listing_details?.project;
    const name = p?.general_information?.project_name?.trim();
    if (p?._id && name && !seen.has(p._id)) seen.set(p._id, name);
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}

/** "Select unit": the project's live listings for the tab's purpose. Found by name, kept by id (as the detail page does). */
export async function compareUnits(projectId: string, projectName: string, purpose: "sale" | "rent"): Promise<{ id: string; name: string }[]> {
  if (!BACKEND_ID_PATTERN.test(projectId) || !projectName.trim()) return [];
  const { data } = await api.post<{ data?: ListingRow[] }>("/inventory/Listing/mobile/all", {
    page: 1,
    pageSize: 100,
    project_names_localities: [projectName.trim()],
    property_purpose: [purpose],
  });
  return (data.data ?? []).flatMap((l) =>
    l._id && l.listing_details?.project?._id === projectId && l.listing_details.listing_name ? [{ id: String(l._id), name: l.listing_details.listing_name.trim() }] : [],
  );
}
