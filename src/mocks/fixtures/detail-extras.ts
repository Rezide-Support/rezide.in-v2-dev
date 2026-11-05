import type {
  DeveloperProfile,
  Facing,
  Furnishing,
  Intent,
  LandmarkCategory,
  LandmarkGroup,
  LatLng,
  Property,
  PropertyCategory,
  ProjectConfiguration,
  RoomDimension,
} from "@/types/models";
import { PHOTO_IDS, unsplash } from "@/content/media";

/**
 * SAMPLE DETAIL-PAGE DATA for the property and project detail pages (v1 layout).
 * Everything here is derived deterministically from the fixture rows: no
 * randomness, so server and client renders agree. Landmark names are generic
 * placeholders; only the airports are real places (distances are straight-line).
 */

/* ---------- Geometry ---------- */

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Deterministic pseudo-random in [0, 1). */
const unit = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------- Landmarks ---------- */

const AIRPORTS: Record<string, { name: string; coords: LatLng }> = {
  Mumbai: { name: "Chhatrapati Shivaji Maharaj International Airport", coords: [19.0896, 72.8656] },
  Bengaluru: { name: "Kempegowda International Airport", coords: [13.1986, 77.7066] },
  Pune: { name: "Pune International Airport", coords: [18.5821, 73.9197] },
  Hyderabad: { name: "Rajiv Gandhi International Airport", coords: [17.2403, 78.4294] },
  Gurugram: { name: "Indira Gandhi International Airport", coords: [28.5562, 77.1] },
  Noida: { name: "Indira Gandhi International Airport", coords: [28.5562, 77.1] },
  Chennai: { name: "Chennai International Airport", coords: [12.9941, 80.1709] },
  Ahmedabad: { name: "Sardar Vallabhbhai Patel International Airport", coords: [23.0734, 72.6266] },
};

const LANDMARK_NAMES: Record<Exclude<LandmarkCategory, "Airports">, (loc: string) => string[]> = {
  Schools: (loc) => [`${loc} Public School`, `${loc} International School`, `Little Steps Preschool, ${loc}`, `Greenfield High School`],
  "Railway Stations": (loc) => [`${loc} Railway Station`, "Suburban Railway Halt"],
  "Metro Stations": (loc) => [`${loc} Metro Station`, `${loc} Junction Metro`],
  Malls: (loc) => [`${loc} Central Mall`, "City Square Mall", `${loc} High Street`],
  Hospitals: (loc) => [`${loc} Multispeciality Hospital`, "City Care Hospital", `${loc} Clinic & Diagnostics`],
};

/** Sample nearby places, by category, for a location. */
export function landmarksFor(city: string, loc: string, at: LatLng, seed: number): LandmarkGroup[] {
  const groups: LandmarkGroup[] = [];
  const order: LandmarkCategory[] = ["Schools", "Railway Stations", "Metro Stations", "Airports", "Malls", "Hospitals"];
  order.forEach((category, ci) => {
    if (category === "Airports") {
      const a = AIRPORTS[city];
      if (a) groups.push({ category, items: [{ name: a.name, coords: a.coords, distanceKm: round2(haversineKm(at, a.coords)) }] });
      return;
    }
    const names = LANDMARK_NAMES[category](loc);
    const items = names.map((name, k) => {
      // Spread points 0.3–3 km away at varying bearings.
      const r = 0.3 + unit(seed * 31 + ci * 7 + k) * (category === "Railway Stations" || category === "Metro Stations" ? 2.7 : 1.8);
      // Coastal cities: keep sample points on the landward side (east of Mumbai's coast, west of Chennai's).
      const u = unit(seed * 17 + ci * 3 + k * 11);
      const bearing = city === "Mumbai" ? 0.15 * Math.PI + u * 0.7 * Math.PI : city === "Chennai" ? 1.15 * Math.PI + u * 0.7 * Math.PI : u * Math.PI * 2;
      const coords: LatLng = [at[0] + (r / 111) * Math.cos(bearing), at[1] + (r / (111 * Math.cos((at[0] * Math.PI) / 180))) * Math.sin(bearing)];
      return { name, coords, distanceKm: round2(haversineKm(at, coords)) };
    });
    items.sort((a, b) => a.distanceKm - b.distanceKm);
    groups.push({ category, items });
  });
  return groups;
}

/* ---------- Dates ---------- */

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ---------- Properties ---------- */

export type PropertyDetailInput = {
  cat: PropertyCategory;
  intent: Intent;
  unit: string;
  city: string;
  loc: string;
  price: number;
  area: number;
  bhk?: number;
  bath?: number;
  furn?: Furnishing;
  facing?: Facing;
  updated: string;
  inProject: boolean;
};

const REGIONS: Record<string, string> = {
  Worli: "South Central Mumbai",
  Mahalaxmi: "South Central Mumbai",
  "Goregaon East": "Western Suburbs",
  "Andheri West": "Western Suburbs",
  "Bandra East": "Western Suburbs",
  Powai: "Central Suburbs",
  Chembur: "Eastern Suburbs",
  "Thane West": "Thane",
  Whitefield: "East Bengaluru",
  "Sarjapur Road": "East Bengaluru",
  Indiranagar: "East Bengaluru",
  Koramangala: "South Bengaluru",
  "Electronic City": "South Bengaluru",
  Hebbal: "North Bengaluru",
  Yelahanka: "North Bengaluru",
  Devanahalli: "North Bengaluru",
  Hinjewadi: "West Pune",
  Baner: "West Pune",
  Wakad: "West Pune",
  Bavdhan: "West Pune",
  "Koregaon Park": "East Pune",
  Kharadi: "East Pune",
  "Viman Nagar": "East Pune",
  Hadapsar: "East Pune",
  Gachibowli: "West Hyderabad",
  Kokapet: "West Hyderabad",
  Kondapur: "West Hyderabad",
  Madhapur: "West Hyderabad",
  "Jubilee Hills": "Central Hyderabad",
  "Banjara Hills": "Central Hyderabad",
  "Golf Course Road": "Central Gurugram",
  "Sector 65": "Golf Course Extension",
  "Sohna Road": "South Gurugram",
  "Dwarka Expressway": "New Gurugram",
  "Sector 150": "Noida Expressway",
  "Sector 128": "Noida Expressway",
  "Noida Extension": "Greater Noida West",
  "Sector 62": "Central Noida",
  OMR: "South Chennai",
  Adyar: "South Chennai",
  Velachery: "South Chennai",
  "Anna Nagar": "West Chennai",
  "SG Highway": "West Ahmedabad",
  Bopal: "West Ahmedabad",
  "Prahlad Nagar": "West Ahmedabad",
  Thaltej: "West Ahmedabad",
};

const KEY_FEATURES: Record<PropertyCategory, string[]> = {
  homes: [
    "Building with Amenities",
    "Double Heighted Lobby",
    "Pet Friendly",
    "Secure Gated Entry",
    "Quiet Neighbourhood",
    "Great Connectivity",
    "Secure Covered Parking",
    "Spacious Layout",
    "Excellent View from Apartment",
    "Convenient Location",
  ],
  offices: ["Grade A Building", "Double Heighted Lobby", "Ample Natural Light", "Great Connectivity", "Power Backup", "Dedicated Parking", "Reception Area"],
  retail: ["High Street Frontage", "High Footfall", "Signage Rights", "Great Connectivity", "Ample Parking"],
  industrial: ["Wide Approach Road", "Truck Docks", "High Clear Height", "24×7 Security", "Power Backup"],
  land: ["Clear Title", "Corner Plot", "Wide Approach Road", "Great Connectivity", "Boundary Wall"],
};

const OPPOSITE: Record<string, string> = { N: "S", S: "N", E: "W", W: "E", NE: "SW", SW: "NE", NW: "SE", SE: "NW" };
const initialsOf = (f: Facing) =>
  f
    .split(" ")
    .map((w) => w[0])
    .join("");

/** Round to the nearest quarter foot. */
const q = (n: number) => Math.round(n * 4) / 4;

function roomsFor(x: PropertyDetailInput): RoomDimension[] | undefined {
  const s = Math.sqrt(x.area / 1000);
  if (x.cat === "homes") {
    const bhk = x.bhk ?? 1;
    const rooms: RoomDimension[] = [
      { name: "Living Area", length: q(18 * s), width: q(13 * s) },
      { name: "Kitchen", length: q(10 * s), width: q(8 * s) },
    ];
    if (x.unit === "Studio") return rooms;
    for (let b = 1; b <= bhk; b++) {
      rooms.push({ name: `Bedroom ${b}`, length: q((b === 1 ? 14 : 12) * s), width: q(11 * s) });
      if (b <= (x.bath ?? 1)) rooms.push({ name: `Bedroom ${b} Washroom`, length: q(8 * s), width: q(5 * s) });
    }
    if (bhk >= 2) rooms.push({ name: "Living Area Balcony", length: q(10 * s), width: 4 });
    return rooms;
  }
  if (x.cat === "offices") {
    return [
      { name: "Workstation Area", length: q(40 * s), width: q(18 * s) },
      { name: "Conference Room", length: q(14 * s), width: q(10 * s) },
      { name: "Cabin", length: q(10 * s), width: q(9 * s) },
      { name: "Pantry", length: q(9 * s), width: q(7 * s) },
    ];
  }
  if (x.cat === "retail") {
    return [
      { name: "Shop Floor", length: q(30 * s), width: q(20 * s) },
      { name: "Storage", length: q(8 * s), width: q(6 * s) },
    ];
  }
  return undefined;
}

const FURNISHING_ITEMS: Record<Furnishing, string[]> = {
  "Fully Furnished": ["Wardrobes", "Modular Kitchen", "Air Conditioners", "Geysers", "Beds", "Sofa", "Dining Table", "Light Fittings"],
  "Semi Furnished": ["Wardrobes", "Modular Kitchen", "Geysers", "Light Fittings"],
  Unfurnished: [],
};

const VISIT_DAYS = ["Everyday", "Mon – Sat", "Weekends"];
const VISIT_TIMES = ["11:00 AM – 6:00 PM", "10:00 AM – 1:00 PM", "4:00 PM – 8:00 PM"];
const VIEWS = ["City View", "Garden View", "Pool View", "Open View"];
const SEA_FACING = new Set(["Worli", "Andheri West", "Mahalaxmi", "Adyar"]);
const FLOORING = ["Vitrified Tiles", "Italian Marble", "Wooden Flooring"];

/** Optional v1 detail-page fields for one property fixture row. */
export function propertyDetailFields(x: PropertyDetailInput, i: number, coords: LatLng): Partial<Property> {
  const rent = x.intent === "rent";
  const homes = x.cat === "homes";
  const features = KEY_FEATURES[x.cat];
  const featureCount = Math.min(features.length, 5 + (i % 3));
  const availableIn = rent ? (i % 3) * 15 : i % 4 === 0 ? 120 : 0;
  const projectType = x.inProject
    ? "Gated Community"
    : ({ homes: x.unit === "Villa" || x.unit === "Row House" ? "Villa Community" : "Standalone Building", offices: "Commercial Complex", retail: "Commercial Complex", industrial: "Industrial Park", land: "Plotted Development" } as const)[x.cat];
  const apartmentLike = homes && !["Villa", "Row House", "Independent House"].includes(x.unit);

  return {
    listedAt: addDays(x.updated, -(12 + (i % 5) * 9)),
    availableFrom: availableIn ? addDays(x.updated, availableIn) : undefined,
    securityDeposit: rent ? Math.round(x.price * (homes ? 3 : 6)) : undefined,
    keyFeatures: Array.from({ length: featureCount }, (_, k) => features[(i + k) % features.length]),
    visit: {
      days: VISIT_DAYS[i % VISIT_DAYS.length],
      timings: VISIT_TIMES[i % VISIT_TIMES.length],
      showingStatus: rent ? "Vacant with keys" : ["Vacant with keys", "Owner occupied", "Tenant occupied"][i % 3],
    },
    region: REGIONS[x.loc],
    subRegion: x.loc,
    projectType,
    vastuEntry: homes && x.facing ? initialsOf(x.facing) : undefined,
    vastuExit: homes && x.facing ? OPPOSITE[initialsOf(x.facing)] : undefined,
    view: homes ? (SEA_FACING.has(x.loc) && i % 2 === 0 ? "Sea View" : VIEWS[i % VIEWS.length]) : undefined,
    flooring: homes ? FLOORING[i % FLOORING.length] : x.cat === "offices" ? "Vinyl" : undefined,
    balconies: homes ? Math.max(0, (x.bhk ?? 1) - 1) : undefined,
    lifts: apartmentLike ? 2 + (i % 3) : x.cat === "offices" ? 4 : undefined,
    rooms: roomsFor(x),
    furnishingItems: x.furn ? FURNISHING_ITEMS[x.furn] : undefined,
    complexImages: [0, 1].map((k) => unsplash(PHOTO_IDS.projects[(i + k) % PHOTO_IDS.projects.length], 1400, `property-${i}`)),
    landmarks: landmarksFor(x.city, x.loc, coords, i + 1),
  };
}

/* ---------- Projects ---------- */

const STATES: Record<string, string> = {
  Mumbai: "Maharashtra",
  Pune: "Maharashtra",
  Bengaluru: "Karnataka",
  Hyderabad: "Telangana",
  Gurugram: "Haryana",
  Noida: "Uttar Pradesh",
  Chennai: "Tamil Nadu",
  Ahmedabad: "Gujarat",
};

const DEVELOPER_HQ: Record<string, string> = {
  "Lodha Group": "Mumbai",
  "Oberoi Realty": "Mumbai",
  "K Raheja Corp": "Mumbai",
  "Godrej Properties": "Mumbai",
  "Piramal Realty": "Mumbai",
  "Tata Housing": "Mumbai",
  "Mahindra Lifespaces": "Mumbai",
  "Prestige Group": "Bengaluru",
  "Sobha Ltd": "Bengaluru",
  "Brigade Group": "Bengaluru",
  "Kolte Patil": "Pune",
  "Panchshil Realty": "Pune",
  "My Home Group": "Hyderabad",
  DLF: "Gurugram",
};

export type ProjectDetailInput = {
  name: string;
  dev: string;
  city: string;
  loc: string;
  status: "uc" | "rtm" | "nl";
  poss: string;
  bhk: string[];
  from: number;
  to: number;
  area: [number, number];
  acres: number;
  towers: number;
  amen: string[];
  views: string[];
};

/** Split the project's area range across its BHK options. */
export function configurationPlans(bhk: string[], area: [number, number]): ProjectConfiguration[] {
  const [min, max] = area;
  const step = (max - min) / bhk.length;
  return bhk.map((b, k) => ({
    bhk: b,
    areaMin: Math.round(min + step * k),
    areaMax: Math.round(k === bhk.length - 1 ? max : min + step * (k + 1) - 10),
  }));
}

/** Optional v1 detail-page fields for one project fixture row. */
export function projectDetailFields(x: ProjectDetailInput, i: number, coords: LatLng) {
  const state = STATES[x.city];
  const airport = AIRPORTS[x.city];
  const airportKm = airport ? Math.round(haversineKm(coords, airport.coords)) : undefined;
  const developerProfile: DeveloperProfile = {
    name: x.dev,
    headquarters: [DEVELOPER_HQ[x.dev] ?? x.city, STATES[DEVELOPER_HQ[x.dev] ?? x.city]].filter(Boolean).join(", "),
    description: `${x.dev} is the developer of ${x.name} in ${x.loc}, ${x.city}. This is a sample developer profile for the prototype; the developer's own description, history and track record will come from the projects service.`,
  };
  return {
    address: [x.loc, x.city, state].filter(Boolean).join(", ") + ", India",
    highlights: [
      `${x.views[0]} from upper floors`,
      `${x.acres}-acre land parcel with ${x.towers} ${x.towers === 1 ? "tower" : "towers"}`,
      `${x.amen.slice(0, 2).join(" and ")}`,
      x.poss,
      ...(airport && airportKm !== undefined ? [`About ${airportKm} km from ${airport.name}`] : []),
    ],
    // Rentals exist only in completed projects; ~2.6% gross yield.
    rentFrom: x.status === "rtm" ? Math.round((x.from * 0.026) / 12 / 1000) * 1000 : undefined,
    rentTo: x.status === "rtm" ? Math.round((x.to * 0.026) / 12 / 1000) * 1000 : undefined,
    configurationPlans: configurationPlans(x.bhk, x.area),
    amenityImages: [0, 1].map((k) => unsplash(PHOTO_IDS.homes[(i + k + 3) % PHOTO_IDS.homes.length], 1400, `project-${i}`)),
    viewImages: [0, 1].map((k) => unsplash(PHOTO_IDS.land[(i + k) % PHOTO_IDS.land.length], 1400, `project-${i}`)),
    landmarks: landmarksFor(x.city, x.loc, coords, 100 + i),
    developerProfile,
  };
}
