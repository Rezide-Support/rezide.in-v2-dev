/**
 * Domain models shared by the UI, services and mock layer.
 * These mirror the data the prototype renders. Field names are the proposed
 * API contract; adjust them here once the backend schema is confirmed.
 */

export type PropertyCategory = "homes" | "offices" | "retail" | "industrial" | "land";
export type Intent = "buy" | "rent";
export type Furnishing = "Fully Furnished" | "Semi Furnished" | "Unfurnished";
export type MediaType = "Video" | "Photo" | "VR Tour";
export type Facing =
  | "East"
  | "West"
  | "North"
  | "South"
  | "North East"
  | "North West"
  | "South East"
  | "South West";

export type LatLng = [lat: number, lng: number];

export type Spec = { label: string; value: string };

/** Verification is shown as a sample badge only. No verification service is connected. */
export type VerificationStatus = "verified" | "pending";

export interface Property {
  id: string;
  title: string;
  category: PropertyCategory;
  intent: Intent;
  /** e.g. Apartment, Villa, Grade A office, Warehouse, Residential plot */
  unitType: string;
  city: string;
  locality: string;
  projectId?: string;
  projectName?: string;
  /** Total sale price, or monthly rent when intent is "rent". In INR. 0 when `priceHidden`. */
  price: number;
  /** The owner withholds the price: show "Price on request" (the figure is never sent). */
  priceHidden?: boolean;
  areaSqft: number;
  areaBasis: "Carpet" | "Built-up" | "Plot";
  bhk?: number;
  bathrooms?: number;
  parking?: number;
  furnishing?: Furnishing;
  facing?: Facing;
  media: MediaType[];
  specs: Spec[];
  amenities: string[];
  description: string;
  images: string[];
  photoSource?: "listing" | "sample-flat" | "project" | "placeholder";
  availability?: string;
  locationLabel?: string;
  ratePerSqft?: number;
  coords: LatLng;
  realtorId: string;
  /** Denormalised for cards; the full profile comes from the realtor endpoint. */
  realtorFirm: string;
  /** The realtor's firm, which an enquiry about this listing is sent to. */
  realtorFirmId?: string;
  verification: VerificationStatus;
  updatedAt: string;

  /* ---- Detail-page fields (optional; v1 listing page). Sample values in fixtures. ---- */
  /** ISO date the listing went live. */
  listedAt?: string;
  /** ISO date the unit is available from. Omitted means available now. */
  availableFrom?: string;
  /** Monthly-rent listings: refundable security deposit in INR. */
  securityDeposit?: number;
  /** Short bullet highlights ("Pet Friendly", "Secure Gated Entry"). */
  keyFeatures?: string[];
  visit?: PropertyVisit;
  /** Administrative region, e.g. "Western Suburbs". */
  region?: string;
  subRegion?: string;
  /** e.g. "Gated Community", "Standalone Building". */
  projectType?: string;
  vastuEntry?: string;
  vastuExit?: string;
  view?: string;
  flooring?: string;
  balconies?: number;
  lifts?: number;
  /** Room-by-room dimensions (v1 "Dimensions" tab). */
  rooms?: RoomDimension[];
  /** Fittings that come with the unit (v1 "Furnishing amenities"). */
  furnishingItems?: string[];
  /** Building / complex photos (v1 "Complex" gallery tab). */
  complexImages?: string[];
  /** Floor-plan images (v1 "Plans" gallery tab). None in the sample data. */
  planImages?: string[];
  /** Brochure PDF, set on the detail page only when one exists. */
  brochureUrl?: string;
  /** Walkthrough video URL. None in the sample data. */
  videoUrl?: string;
  /** Nearby places by category (v1 "Locality" tab). Only sample listings carry them; real ones load per project. */
  landmarks?: LandmarkGroup[];
  /** The backend's locality for this listing; `locality` prefers the wider sub-region. */
  localityName?: string;
  /** Unit number and floor, unless the owner hides them. */
  unitNo?: string;
  floor?: number;
  /** Floors in the building. */
  totalFloors?: number;
  /** Age of the building in years. */
  ageYears?: number;
}

export type PropertyVisit = {
  /** e.g. "Everyday", "Weekends" */
  days: string;
  /** e.g. "11:00 AM – 6:00 PM" */
  timings: string;
  /** e.g. "Vacant with keys", "Tenant occupied" */
  showingStatus: string;
};

export type RoomDimension = { name: string; /** feet */ length: number; /** feet */ width: number };

export type LandmarkCategory = "Schools" | "Railway Stations" | "Metro Stations" | "Airports" | "Malls" | "Hospitals";

export type Landmark = { name: string; distanceKm: number; coords: LatLng };

export type LandmarkGroup = { category: LandmarkCategory; items: Landmark[] };

export type ProjectStatus = "uc" | "rtm" | "nl";

/** One BHK configuration in a project (v1 "Configuration plans"). */
export type ProjectConfiguration = {
  bhk: string;
  areaMin: number;
  areaMax: number;
  /** The configuration's sale and monthly-rent ranges (INR), as the v1 plan tabs show them. */
  saleMin?: number;
  saleMax?: number;
  rentMin?: number;
  rentMax?: number;
  /** Unit-plan images. None in the sample data. */
  unitPlans?: string[];
  /** Floor-plan images. None in the sample data. */
  floorPlans?: string[];
};

/** One RERA registration of a project, with its QR code and the regulator's page. */
export type ProjectRera = { id: string; link?: string; qr?: string };

export type DeveloperProfile = {
  /** The developer's backend id (contact details are looked up by it). */
  id?: string;
  name: string;
  /** e.g. "Mumbai, Maharashtra" */
  headquarters: string;
  description: string;
  logo?: string;
  /** Year founded, e.g. "1998". */
  established?: string;
  /** Cities of the developer's offices. */
  cities?: string[];
};

export interface Project {
  id: string;
  name: string;
  developer: string;
  city: string;
  locality: string;
  status: ProjectStatus;
  /** Possession year for under-construction projects. */
  possessionYear?: number;
  possessionLabel: string;
  configurations: string;
  bhkOptions: string[];
  /** Starting price in INR. */
  priceFrom: number;
  priceTo: number;
  ratePerSqft: number;
  areaMin: number;
  areaMax: number;
  acres: number;
  towers: number;
  units: number;
  amenities: string[];
  views: string[];
  reraId: string;
  images: string[];
  coords: LatLng;
  description: string;

  /* ---- Detail-page fields (optional; v1 project page). Sample values in fixtures. ---- */
  address?: string;
  highlights?: string[];
  /** Monthly rent range in INR, when units are offered on rent. */
  rentFrom?: number;
  rentTo?: number;
  configurationPlans?: ProjectConfiguration[];
  /** RERA registrations with a real id (v1 "Project RERA details"). */
  reras?: ProjectRera[];
  /** Amenity / clubhouse photos (v1 "Amenities" gallery tab). */
  amenityImages?: string[];
  /** View photos (v1 "Views" gallery tab). */
  viewImages?: string[];
  /** Master / site plan images. None in the sample data. */
  planImages?: string[];
  videoUrl?: string;
  landmarks?: LandmarkGroup[];
  developerProfile?: DeveloperProfile;
  /** Brochure file, when the developer has shared one. */
  brochureUrl?: string;
  /** The real locality's photo, when the backend has one. */
  localityPhoto?: string;
}

export type RealtorCredential = "RERA" | "GST" | "NAR-India";

export interface Realtor {
  id: string;
  name: string;
  firm: string;
  firmInitials: string;
  firmColor: string;
  reraId: string;
  gstin?: string;
  association?: string;
  since: number;
  teamSize: number;
  saleListings: number;
  rentalListings: number;
  city: string;
  /** Every city they work in; empty when the backend states none. */
  cities?: string[];
  localities: string[];
  buildings: string[];
  specializations: string[];
  languages: string[];
  /** Read from the salutation; not everyone has one. */
  gender?: "Female" | "Male";
  credentials: RealtorCredential[];
  photo: string;
  /** Only in sample data: the backend has no ratings or deal counts. */
  rating?: number;
  deals?: number;
  bio: string;
  /** Slug of the firm this realtor belongs to (`Firm.id`). */
  firmId: string;
  /** URL slug, unique within the firm: /realtors/<firmId>/<slug>. */
  slug: string;
  /** Broader areas served, e.g. "South Mumbai". */
  subRegions?: string[];
  /** Role inside the firm, e.g. "Owner", "Associate". */
  role?: string;
  /** Office address when it differs from the firm's registered address. */
  address?: PostalAddress;
  /** Only real profile URLs; buttons render only for keys that are present. */
  socials?: RealtorSocials;
}

export interface RealtorSocials {
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export interface PostalAddress {
  lines: string[];
  city: string;
  pincode?: string;
}

/** A brokerage firm. Agents (`Realtor`) reference it by `firmId`. */
export interface Firm {
  /** URL slug, /realtors/<id>. */
  id: string;
  name: string;
  entityType: string;
  initials: string;
  color: string;
  since: number;
  teamSize: number;
  city: string;
  address?: PostalAddress;
  specializations: string[];
  about?: string;
  reraId?: string;
  gstin?: string;
  logo?: string;
}

export type UserRole = "seeker" | "owner" | "realtor";

export interface User {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  firm?: string;
}

export interface Session {
  user: User;
  /** ISO timestamp. The session expires after this. */
  expiresAt: string;
}

export type EnquiryChannel = "callback" | "whatsapp" | "visit";

export interface EnquiryInput {
  propertyId?: string;
  projectId?: string;
  realtorId?: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  channel: EnquiryChannel;
  preferredDate?: string;
}

export interface Enquiry extends EnquiryInput {
  id: string;
  createdAt: string;
  status: "received";
}

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
};

/* ---------- Listing draft (List Property wizard) ---------- */

export type ListingCategory = "home" | "office" | "industrial" | "retail" | "land";
export type ListerRole = "Property Owner" | "Contact Person" | "POA Holder";
export type ListingIntent = "sell" | "rent";

export interface ListingDraft {
  // Profile
  role?: ListerRole;
  ownerName?: string;
  ownerMobile?: string;
  city?: string;
  // Property type
  category?: ListingCategory;
  unitType?: string;
  // Property
  projectName?: string;
  projectSource?: "rezide" | "manual";
  address?: string;
  region?: string;
  subRegion?: string;
  locality?: string;
  pincode?: string;
  tower?: string;
  totalFloors?: string;
  unitNo?: string;
  floor?: string;
  projectStatus?: string;
  propertyAge?: string;
  buildingType?: string;
  plotArea?: string;
  passengerLifts?: string;
  serviceLifts?: string;
  // Commercials
  intent?: ListingIntent;
  price?: string;
  visitDays?: string;
  visitFrom?: string;
  visitTo?: string;
  visitNotice?: string;
  keys?: string;
  // Realtor assist
  assist?: "yes" | "no";
  realtorIds?: string[];
  handover?: "self" | "realtor";
  // Unit details
  configuration?: string;
  area?: string;
  areaType?: string;
  bathrooms?: string;
  balconies?: string;
  furnishing?: string;
  facing?: string;
  parking?: string;
  areaUnit?: string;
  flooring?: string;
  heightFt?: string;
  heightIn?: string;
  vastu?: string;
  viewType?: string;
  unitFacing?: string;
  ventilation?: string;
  naturalLight?: string;
  parkingType?: string;
  plotType?: string;
  roadWidth?: string;
  // Key features
  features?: string[];
  amenities?: string[];
  highlights?: string;
  // Media
  photoNames?: string[];
  videoUrl?: string;
  // Furniture & fixtures
  furniture?: string[];
  appliances?: string[];
  fixtures?: string[];
}

/* ---------- Customer account (/account/*) ---------- */

export type AccountRole = "seeker" | "owner";
export type ActivityTab = "viewed" | "shared" | "shortlisted" | "rejected";

/** A property in one of the seeker's activity lists, with the property embedded. */
export interface ActivityItem {
  propertyId: string;
  /** ISO date the activity happened. */
  date: string;
  /** e.g. who shared it and their message, or why it was rejected. */
  note?: string;
  property: Property;
}

export type VisitKind = "site_visit" | "video_tour";
export type VisitStatus = "requested" | "confirmed" | "completed" | "cancelled";

/** A site visit or video tour, seen by the seeker who booked it or the owner of the property. */
export interface AccountVisit {
  id: string;
  propertyId?: string;
  intent: Intent;
  /** Unit and building, e.g. "D Tower, Oberoi Splendor". */
  listingTitle: string;
  locality: string;
  kind: VisitKind;
  /** ISO date. */
  date: string;
  /** Local (IST) time "HH:mm", once agreed. */
  time?: string;
  status: VisitStatus;
  /** Seeker view: the realtor or firm hosting. Owner view: the prospective buyer or tenant. */
  counterpart: string;
  /** Owner view: the realtor bringing the buyer, if any. */
  via?: string;
}

export type OfferStatus = "submitted" | "under_review" | "countered" | "accepted" | "declined";

/** An offer made by the seeker, or received by the owner. */
export interface AccountOffer {
  id: string;
  propertyId?: string;
  intent: Intent;
  listingTitle: string;
  /** ISO date the offer was made. */
  date: string;
  /** Offered amount in INR (total price, or monthly rent for rentals). */
  amount: number;
  /** Asking price in INR at the time of the offer. */
  askingPrice?: number;
  status: OfferStatus;
  /** Owner view: who made the offer. */
  counterpart?: string;
  /** Realtor handling the offer; absent for direct offers. */
  via?: string;
}

export type OwnerListingStatus = "live" | "under_review" | "draft";

/** A listing owned by the signed-in owner. */
export interface OwnerListing {
  id: string;
  /** Public listing id once live. */
  propertyId?: string;
  title: string;
  locality: string;
  city: string;
  category: PropertyCategory;
  intent: Intent;
  /** INR: total price, or monthly rent when intent is "rent". */
  price: number;
  status: OwnerListingStatus;
  /** Engagement counts; null until the listing is live. */
  stats: { views: number; shortlists: number; visits: number; offers: number } | null;
  /** ISO date the listing went live. */
  listedAt?: string;
  /** ISO date it was submitted for verification. */
  submittedAt?: string;
  /** Realtor assisting with the listing. */
  assistedBy?: string;
  /** What is still missing or pending, e.g. "Photos and video pending". */
  pendingNote?: string;
  image: string;
}

/* ---------- Search criteria ---------- */

export type SortKey = "latest" | "price-asc" | "price-desc" | "rate-asc" | "rate-desc" | "area-asc" | "area-desc";
/** list / map show listings; "loc" and "proj" group them by locality or project (prototype view tabs). */
export type ResultsView = "list" | "map" | "loc" | "proj";

export interface PropertySearchCriteria {
  city: string;
  intent: Intent;
  category: PropertyCategory;
  q: string;
  localities: string[];
  unitTypes: string[];
  bhk: string[];
  furnishing: string[];
  bathrooms: string[];
  parking: string[];
  media: string[];
  facing: string[];
  /** Project ids (listings inside these projects). */
  projects: string[];
  budgetMin?: number;
  budgetMax?: number;
  /** Area band in sq ft: inclusive minimum. */
  areaMin?: number;
  /** Area band in sq ft: exclusive maximum. */
  areaMax?: number;
  sort: SortKey;
  page: number;
  perPage: number;
  view: ResultsView;
}

/** Project result orders, as on rezide.in. */
export type ProjectSortKey = "latest" | "price-asc" | "price-desc" | "plot-asc" | "plot-desc" | "yield-asc" | "yield-desc";

export interface ProjectSearchCriteria {
  city: string;
  q: string;
  status: ProjectStatus[];
  localities: string[];
  budget: string[];
  years: number[];
  views: string[];
  sort: ProjectSortKey;
  page: number;
  perPage: number;
}

export interface RealtorSearchCriteria {
  city: string;
  by: "name" | "firm";
  q: string;
  specializations: string[];
  locality: string;
  language: string;
  gender: string;
}
