import type {
  Facing,
  Furnishing,
  Intent,
  LatLng,
  MediaType,
  Property,
  PropertyCategory,
  Spec,
} from "@/types/models";
import { propertyDetailFields } from "./detail-extras";
import { PHOTO_IDS, unsplash } from "@/content/media";
import { ALL_REALTORS, REALTORS } from "./realtors";

/**
 * SAMPLE INVENTORY. A fixed, hand-authored dataset used by the mock API.
 * Searches filter this list; nothing is generated from the query.
 */

export const LOCALITY_GEO: Record<string, LatLng> = {
  Worli: [19.0176, 72.8162], "Thane West": [19.2183, 72.9781], "Goregaon East": [19.1663, 72.8526], Mahalaxmi: [18.9827, 72.8236],
  Powai: [19.1176, 72.906], "Andheri West": [19.1364, 72.8296], Chembur: [19.0522, 72.9005], "Bandra East": [19.0596, 72.8484],
  Whitefield: [12.9698, 77.75], Hebbal: [13.0358, 77.597], "Sarjapur Road": [12.91, 77.685], Indiranagar: [12.9784, 77.6408],
  Yelahanka: [13.1007, 77.5963], "Electronic City": [12.8452, 77.6602], Koramangala: [12.9352, 77.6245], Devanahalli: [13.2437, 77.7135],
  Hinjewadi: [18.5913, 73.7389], "Koregaon Park": [18.5362, 73.894], Baner: [18.559, 73.7868], Kharadi: [18.5515, 73.9348],
  Wakad: [18.5975, 73.77], Hadapsar: [18.5089, 73.926], Bavdhan: [18.5126, 73.781], "Viman Nagar": [18.5679, 73.9143],
  Gachibowli: [17.4401, 78.3489], "Jubilee Hills": [17.4326, 78.4071], Kokapet: [17.396, 78.327], Kondapur: [17.469, 78.364],
  Madhapur: [17.4483, 78.3915], "Banjara Hills": [17.4156, 78.4347],
  "Golf Course Road": [28.453, 77.097], "Sector 65": [28.402, 77.071], "Sohna Road": [28.41, 77.042], "Dwarka Expressway": [28.49, 76.99],
  "Sector 150": [28.41, 77.486], "Sector 128": [28.53, 77.36], "Noida Extension": [28.59, 77.44], "Sector 62": [28.627, 77.365],
  OMR: [12.95, 80.24], Adyar: [13.0012, 80.2565], "Anna Nagar": [13.085, 80.2101], Velachery: [12.9815, 80.218],
  "SG Highway": [23.045, 72.53], Bopal: [23.033, 72.465], "Prahlad Nagar": [23.012, 72.51], Thaltej: [23.05, 72.5],
};

type Row = {
  id: string;
  title: string;
  cat: PropertyCategory;
  intent: Intent;
  unit: string;
  city: string;
  loc: string;
  price: number;
  area: number;
  bhk?: number;
  bath?: number;
  park?: number;
  furn?: Furnishing;
  facing?: Facing;
  media: MediaType[];
  /** Index into REALTORS, or a realtor id (firm team members). */
  realtor: number | string;
  verified: boolean;
  updated: string;
  project?: [id: string, name: string];
  extra?: Spec[];
};

const L = 1_00_000;
const CR = 1_00_00_000;

const ROWS: Row[] = [
  // ---------- Mumbai · Homes · Buy ----------
  { id: "mum-worli-lodha-park-b1702", title: "B - 1702, Lodha Park", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Worli", price: 9.2 * CR, area: 1480, bhk: 3, bath: 3, park: 2, furn: "Semi Furnished", facing: "West", media: ["Photo", "Video"], realtor: 0, verified: true, updated: "2026-10-17", project: ["lodha-park", "Lodha Park"] },
  { id: "mum-worli-omkar-a3104", title: "A - 3104, Omkar 1973", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Worli", price: 12.4 * CR, area: 1890, bhk: 4, bath: 4, park: 2, furn: "Unfurnished", facing: "West", media: ["Photo", "VR Tour"], realtor: 0, verified: true, updated: "2026-10-15" },
  { id: "mum-mahalaxmi-vivarea-t2-2201", title: "T2 - 2201, Raheja Vivarea", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Mahalaxmi", price: 7.6 * CR, area: 1260, bhk: 3, bath: 3, park: 2, furn: "Semi Furnished", facing: "North", media: ["Photo"], realtor: 0, verified: true, updated: "2026-10-12", project: ["raheja-vivarea", "Raheja Vivarea"] },
  { id: "mum-goregaon-esquire-a904", title: "A - 904, Oberoi Esquire", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Goregaon East", price: 7.75 * CR, area: 1367, bhk: 3, bath: 4, park: 2, furn: "Unfurnished", facing: "East", media: ["Photo", "Video"], realtor: 5, verified: true, updated: "2026-10-14", project: ["oberoi-esquire", "Oberoi Esquire"] },
  { id: "mum-goregaon-gokuldham-c12", title: "C - 12, Gokul Dham Society", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Goregaon East", price: 1.35 * CR, area: 640, bhk: 2, bath: 2, park: 1, furn: "Semi Furnished", facing: "South", media: ["Photo"], realtor: 1, verified: false, updated: "2026-09-28" },
  { id: "mum-andheri-lokhandwala-1102", title: "1102, Lokhandwala Residency", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Andheri West", price: 2.85 * CR, area: 910, bhk: 2, bath: 2, park: 1, furn: "Fully Furnished", facing: "North East", media: ["Photo", "Video"], realtor: 1, verified: true, updated: "2026-10-10" },
  { id: "mum-andheri-versova-penthouse", title: "Penthouse, Versova Seaview", cat: "homes", intent: "buy", unit: "Penthouse", city: "Mumbai", loc: "Andheri West", price: 14.5 * CR, area: 3200, bhk: 5, bath: 5, park: 3, furn: "Fully Furnished", facing: "West", media: ["Photo", "Video", "VR Tour"], realtor: 2, verified: true, updated: "2026-10-16" },
  { id: "mum-powai-hiranandani-eden-804", title: "Eden 3 - 804, Hiranandani Gardens", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Powai", price: 3.9 * CR, area: 1150, bhk: 2, bath: 2, park: 1, furn: "Semi Furnished", facing: "East", media: ["Photo"], realtor: 3, verified: true, updated: "2026-10-09" },
  { id: "mum-chembur-diamond-garden-501", title: "501, Diamond Garden Heights", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Chembur", price: 2.2 * CR, area: 820, bhk: 2, bath: 2, park: 1, furn: "Unfurnished", facing: "North", media: ["Photo"], realtor: 3, verified: false, updated: "2026-09-30" },
  { id: "mum-thane-ghodbunder-villa-14", title: "Villa 14, Hiranandani Estate", cat: "homes", intent: "buy", unit: "Villa", city: "Mumbai", loc: "Thane West", price: 4.6 * CR, area: 2400, bhk: 4, bath: 4, park: 2, furn: "Semi Furnished", facing: "East", media: ["Photo", "Video"], realtor: 5, verified: true, updated: "2026-10-05" },
  { id: "mum-thane-majiwada-1402", title: "1402, Rustomjee Urbania", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Thane West", price: 1.12 * CR, area: 690, bhk: 2, bath: 2, park: 1, furn: "Unfurnished", facing: "North West", media: ["Photo"], realtor: 6, verified: true, updated: "2026-10-02" },
  { id: "mum-bandra-east-studio-305", title: "305, Kalpataru Sparkle", cat: "homes", intent: "buy", unit: "Studio", city: "Mumbai", loc: "Bandra East", price: 92 * L, area: 410, bhk: 1, bath: 1, park: 0, furn: "Fully Furnished", facing: "South", media: ["Photo"], realtor: 2, verified: true, updated: "2026-10-11" },

  // ---------- Mumbai · Homes · Rent ----------
  { id: "mum-andheri-splendor-d2401", title: "D Tower, Oberoi Splendor", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Andheri West", price: 1.45 * L, area: 863, bhk: 2, bath: 2, park: 1, furn: "Semi Furnished", facing: "East", media: ["Photo", "Video"], realtor: 1, verified: true, updated: "2026-10-17" },
  { id: "mum-andheri-springs-c1801", title: "C Tower, Oberoi Springs", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Andheri West", price: 1.3 * L, area: 847, bhk: 2, bath: 2, park: 1, furn: "Fully Furnished", facing: "North", media: ["Photo"], realtor: 2, verified: true, updated: "2026-10-12" },
  { id: "mum-worli-sea-face-1201", title: "1201, Worli Sea Face Towers", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Worli", price: 3.2 * L, area: 1650, bhk: 3, bath: 3, park: 2, furn: "Fully Furnished", facing: "West", media: ["Photo", "VR Tour"], realtor: 0, verified: true, updated: "2026-10-16" },
  { id: "mum-powai-chandivali-702", title: "702, Raheja Vistas", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Powai", price: 68_000, area: 760, bhk: 2, bath: 2, park: 1, furn: "Semi Furnished", facing: "East", media: ["Photo"], realtor: 3, verified: true, updated: "2026-10-08" },
  { id: "mum-goregaon-esquire-b904-rent", title: "B - 904, Oberoi Esquire", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Goregaon East", price: 2.1 * L, area: 1367, bhk: 3, bath: 4, park: 2, furn: "Unfurnished", facing: "East", media: ["Photo", "Video"], realtor: 5, verified: false, updated: "2026-10-16", project: ["oberoi-esquire", "Oberoi Esquire"] },
  { id: "mum-chembur-1rk-tilak-nagar", title: "12, Tilak Nagar Co-op Society", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Chembur", price: 28_000, area: 380, bhk: 1, bath: 1, park: 0, furn: "Unfurnished", facing: "South", media: ["Photo"], realtor: 3, verified: true, updated: "2026-10-01" },

  // ---------- Mumbai · Offices ----------
  { id: "mum-worli-supremus-702", title: "Unit 702, Lodha Supremus", cat: "offices", intent: "rent", unit: "Grade A office", city: "Mumbai", loc: "Worli", price: 6 * L, area: 2400, park: 4, media: ["Photo"], realtor: 4, verified: true, updated: "2026-10-10", extra: [{ label: "Seats", value: "26" }, { label: "Cabins", value: "3" }, { label: "Fit-out", value: "Warm shell" }] },
  { id: "mum-bandra-east-bkc-1204", title: "Unit 1204, One BKC", cat: "offices", intent: "buy", unit: "Grade A office", city: "Mumbai", loc: "Bandra East", price: 18.4 * CR, area: 4000, park: 6, media: ["Photo", "Video"], realtor: 4, verified: true, updated: "2026-10-16", extra: [{ label: "Seats", value: "44" }, { label: "Cabins", value: "4" }, { label: "Fit-out", value: "Furnished" }] },
  { id: "mum-goregaon-commerz-1101", title: "1101, Oberoi Commerz II", cat: "offices", intent: "rent", unit: "Office floor", city: "Mumbai", loc: "Goregaon East", price: 9.5 * L, area: 6200, park: 10, media: ["Photo"], realtor: 4, verified: true, updated: "2026-09-29", extra: [{ label: "Seats", value: "70" }, { label: "Cabins", value: "6" }, { label: "Fit-out", value: "Bare shell" }] },
  { id: "mum-andheri-cowork-hub", title: "Desk block, Andheri Co-work Hub", cat: "offices", intent: "rent", unit: "Co-working", city: "Mumbai", loc: "Andheri West", price: 1.8 * L, area: 900, park: 2, media: ["Photo", "VR Tour"], realtor: 2, verified: false, updated: "2026-10-06", extra: [{ label: "Seats", value: "18" }, { label: "Cabins", value: "1" }, { label: "Fit-out", value: "Furnished" }] },

  // ---------- Mumbai · Retail ----------
  { id: "mum-mahalaxmi-shop-8", title: "Shop 8, High Street Mahalaxmi", cat: "retail", intent: "buy", unit: "High-street shop", city: "Mumbai", loc: "Mahalaxmi", price: 6.2 * CR, area: 800, park: 2, media: ["Photo"], realtor: 4, verified: true, updated: "2026-10-04", extra: [{ label: "Frontage", value: "22 ft" }, { label: "Floor", value: "Ground" }, { label: "Washroom", value: "Private" }] },
  { id: "mum-powai-galleria-g14", title: "G-14, Powai Galleria", cat: "retail", intent: "rent", unit: "Mall unit", city: "Mumbai", loc: "Powai", price: 2.4 * L, area: 620, park: 1, media: ["Photo"], realtor: 3, verified: true, updated: "2026-10-07", extra: [{ label: "Frontage", value: "18 ft" }, { label: "Floor", value: "Ground" }, { label: "Washroom", value: "Shared" }] },

  // ---------- Mumbai · Industrial & Land ----------
  { id: "mum-thane-bhiwandi-warehouse-3", title: "Warehouse 3, Bhiwandi Logistics Park", cat: "industrial", intent: "rent", unit: "Warehouse", city: "Mumbai", loc: "Thane West", price: 11.5 * L, area: 50000, park: 12, media: ["Photo", "Video"], realtor: 6, verified: true, updated: "2026-09-22", extra: [{ label: "Clear height", value: "36 ft" }, { label: "Docks", value: "6" }, { label: "Power", value: "500 kVA" }] },
  { id: "mum-chembur-plot-42", title: "Plot 42, Chembur Enclave", cat: "land", intent: "buy", unit: "Commercial plot", city: "Mumbai", loc: "Chembur", price: 3.1 * CR, area: 4000, facing: "East", media: ["Photo"], realtor: 6, verified: true, updated: "2026-09-10", extra: [{ label: "Road width", value: "40 ft" }, { label: "Zone", value: "Commercial" }, { label: "Approval", value: "NA approved" }] },

  // ---------- Bengaluru ----------
  { id: "blr-whitefield-prestige-shantiniketan-1104", title: "1104, Prestige Shantiniketan", cat: "homes", intent: "buy", unit: "Apartment", city: "Bengaluru", loc: "Whitefield", price: 1.65 * CR, area: 1420, bhk: 3, bath: 3, park: 1, furn: "Semi Furnished", facing: "East", media: ["Photo", "Video"], realtor: 5, verified: true, updated: "2026-10-13" },
  { id: "blr-hebbal-godrej-reflections-702", title: "702, Godrej Reflections", cat: "homes", intent: "buy", unit: "Apartment", city: "Bengaluru", loc: "Hebbal", price: 2.4 * CR, area: 1650, bhk: 3, bath: 3, park: 2, furn: "Unfurnished", facing: "North", media: ["Photo"], realtor: 5, verified: true, updated: "2026-10-09" },
  { id: "blr-sarjapur-villa-27", title: "Villa 27, Sobha Lifestyle", cat: "homes", intent: "buy", unit: "Villa", city: "Bengaluru", loc: "Sarjapur Road", price: 5.8 * CR, area: 4100, bhk: 4, bath: 5, park: 3, furn: "Semi Furnished", facing: "East", media: ["Photo", "VR Tour"], realtor: 0, verified: true, updated: "2026-10-03" },
  { id: "blr-electronic-city-studio-214", title: "214, Brigade Metropolis", cat: "homes", intent: "buy", unit: "Studio", city: "Bengaluru", loc: "Electronic City", price: 48 * L, area: 520, bhk: 1, bath: 1, park: 1, furn: "Fully Furnished", facing: "South", media: ["Photo"], realtor: 2, verified: false, updated: "2026-09-26" },
  { id: "blr-indiranagar-floor-2", title: "2nd Floor, 12th Main Indiranagar", cat: "homes", intent: "rent", unit: "Independent Floor", city: "Bengaluru", loc: "Indiranagar", price: 95_000, area: 1800, bhk: 3, bath: 3, park: 1, furn: "Semi Furnished", facing: "North East", media: ["Photo", "Video"], realtor: 3, verified: true, updated: "2026-10-14" },
  { id: "blr-koramangala-402", title: "402, Salarpuria Sattva Greenage", cat: "homes", intent: "rent", unit: "Apartment", city: "Bengaluru", loc: "Koramangala", price: 72_000, area: 1250, bhk: 2, bath: 2, park: 1, furn: "Fully Furnished", facing: "East", media: ["Photo"], realtor: 3, verified: true, updated: "2026-10-11" },
  { id: "blr-whitefield-rent-1003", title: "1003, Prestige Lakeside Habitat", cat: "homes", intent: "rent", unit: "Apartment", city: "Bengaluru", loc: "Whitefield", price: 48_000, area: 1100, bhk: 2, bath: 2, park: 1, furn: "Semi Furnished", facing: "West", media: ["Photo"], realtor: 2, verified: true, updated: "2026-10-01", project: ["prestige-lakeside-blr", "Prestige Lakeside Habitat"] },
  { id: "blr-whitefield-itpl-office", title: "Level 6, ITPL Tech Park", cat: "offices", intent: "rent", unit: "IT park", city: "Bengaluru", loc: "Whitefield", price: 7.2 * L, area: 9000, park: 14, media: ["Photo"], realtor: 4, verified: true, updated: "2026-09-30", extra: [{ label: "Seats", value: "100" }, { label: "Cabins", value: "6" }, { label: "Fit-out", value: "Warm shell" }] },
  { id: "blr-koramangala-cowork", title: "Studio B, Koramangala Co-work", cat: "offices", intent: "rent", unit: "Co-working", city: "Bengaluru", loc: "Koramangala", price: 1.1 * L, area: 650, park: 1, media: ["Photo"], realtor: 2, verified: false, updated: "2026-10-08", extra: [{ label: "Seats", value: "12" }, { label: "Cabins", value: "1" }, { label: "Fit-out", value: "Furnished" }] },

  // ---------- Pune ----------
  { id: "pune-baner-kolte-patil-903", title: "903, Kolte Patil 24K Sereno", cat: "homes", intent: "buy", unit: "Apartment", city: "Pune", loc: "Baner", price: 1.9 * CR, area: 1380, bhk: 3, bath: 3, park: 2, furn: "Semi Furnished", facing: "East", media: ["Photo", "Video"], realtor: 5, verified: true, updated: "2026-10-12" },
  { id: "pune-hinjewadi-megapolis-1204", title: "1204, Megapolis Sunway", cat: "homes", intent: "buy", unit: "Apartment", city: "Pune", loc: "Hinjewadi", price: 78 * L, area: 760, bhk: 2, bath: 2, park: 1, furn: "Unfurnished", facing: "North", media: ["Photo"], realtor: 1, verified: true, updated: "2026-10-04" },
  { id: "pune-koregaon-park-row-house", title: "Row House 6, Koregaon Park Annexe", cat: "homes", intent: "buy", unit: "Row House", city: "Pune", loc: "Koregaon Park", price: 4.2 * CR, area: 2600, bhk: 4, bath: 4, park: 2, furn: "Fully Furnished", facing: "South East", media: ["Photo", "VR Tour"], realtor: 0, verified: true, updated: "2026-09-27" },
  { id: "pune-kharadi-eon-rent-601", title: "601, EON Waterfront", cat: "homes", intent: "rent", unit: "Apartment", city: "Pune", loc: "Kharadi", price: 42_000, area: 1050, bhk: 2, bath: 2, park: 1, furn: "Semi Furnished", facing: "East", media: ["Photo"], realtor: 3, verified: true, updated: "2026-10-10" },
  { id: "pune-viman-nagar-rent-1102", title: "1102, Konark Nagar", cat: "homes", intent: "rent", unit: "Apartment", city: "Pune", loc: "Viman Nagar", price: 55_000, area: 1250, bhk: 3, bath: 2, park: 1, furn: "Fully Furnished", facing: "North", media: ["Photo"], realtor: 2, verified: false, updated: "2026-10-02" },
  { id: "pune-wakad-plot-18", title: "Plot 18, Wakad Greens", cat: "land", intent: "buy", unit: "Residential plot", city: "Pune", loc: "Wakad", price: 1.15 * CR, area: 2400, facing: "North", media: ["Photo"], realtor: 6, verified: true, updated: "2026-09-18", extra: [{ label: "Road width", value: "30 ft" }, { label: "Zone", value: "Residential" }, { label: "Approval", value: "RERA approved" }] },

  // ---------- Hyderabad ----------
  { id: "hyd-gachibowli-my-home-1503", title: "1503, My Home Avatar", cat: "homes", intent: "buy", unit: "Apartment", city: "Hyderabad", loc: "Gachibowli", price: 1.75 * CR, area: 1550, bhk: 3, bath: 3, park: 2, furn: "Semi Furnished", facing: "East", media: ["Photo", "Video"], realtor: 4, verified: true, updated: "2026-10-15" },
  { id: "hyd-kokapet-villa-9", title: "Villa 9, Kokapet Hills", cat: "homes", intent: "buy", unit: "Villa", city: "Hyderabad", loc: "Kokapet", price: 6.4 * CR, area: 5200, bhk: 5, bath: 6, park: 3, furn: "Unfurnished", facing: "North East", media: ["Photo", "VR Tour"], realtor: 4, verified: true, updated: "2026-10-06" },
  { id: "hyd-kondapur-704", title: "704, Aparna Sarovar", cat: "homes", intent: "buy", unit: "Apartment", city: "Hyderabad", loc: "Kondapur", price: 98 * L, area: 1180, bhk: 2, bath: 2, park: 1, furn: "Unfurnished", facing: "West", media: ["Photo"], realtor: 2, verified: false, updated: "2026-09-25" },
  { id: "hyd-jubilee-hills-rent-house", title: "Road 36, Jubilee Hills", cat: "homes", intent: "rent", unit: "Independent House", city: "Hyderabad", loc: "Jubilee Hills", price: 2.8 * L, area: 4200, bhk: 4, bath: 5, park: 3, furn: "Fully Furnished", facing: "East", media: ["Photo", "Video"], realtor: 0, verified: true, updated: "2026-10-13" },
  { id: "hyd-madhapur-office-501", title: "501, Cyber Towers", cat: "offices", intent: "rent", unit: "Grade A office", city: "Hyderabad", loc: "Madhapur", price: 4.6 * L, area: 5100, park: 8, media: ["Photo"], realtor: 4, verified: true, updated: "2026-10-03", extra: [{ label: "Seats", value: "56" }, { label: "Cabins", value: "5" }, { label: "Fit-out", value: "Furnished" }] },

  // ---------- Gurugram ----------
  { id: "ggn-golf-course-camellias-1502", title: "1502, DLF The Camellias", cat: "homes", intent: "buy", unit: "Apartment", city: "Gurugram", loc: "Golf Course Road", price: 24 * CR, area: 7400, bhk: 4, bath: 5, park: 4, furn: "Semi Furnished", facing: "North", media: ["Photo", "Video", "VR Tour"], realtor: 0, verified: true, updated: "2026-10-16" },
  { id: "ggn-sector-65-m3m-1101", title: "1101, M3M Golf Estate", cat: "homes", intent: "buy", unit: "Apartment", city: "Gurugram", loc: "Sector 65", price: 3.8 * CR, area: 2350, bhk: 3, bath: 4, park: 2, furn: "Unfurnished", facing: "East", media: ["Photo"], realtor: 5, verified: true, updated: "2026-10-08" },
  { id: "ggn-dwarka-expressway-904", title: "904, Sobha City", cat: "homes", intent: "buy", unit: "Apartment", city: "Gurugram", loc: "Dwarka Expressway", price: 2.25 * CR, area: 1680, bhk: 3, bath: 3, park: 1, furn: "Unfurnished", facing: "South", media: ["Photo"], realtor: 1, verified: false, updated: "2026-09-21" },
  { id: "ggn-sohna-road-office", title: "Tower B Level 3, Sohna Road", cat: "offices", intent: "rent", unit: "Business centre", city: "Gurugram", loc: "Sohna Road", price: 3.2 * L, area: 3800, park: 6, media: ["Photo"], realtor: 4, verified: true, updated: "2026-10-05", extra: [{ label: "Seats", value: "40" }, { label: "Cabins", value: "4" }, { label: "Fit-out", value: "Furnished" }] },

  // ---------- Noida ----------
  { id: "noida-sector-150-ats-1802", title: "1802, ATS Pristine", cat: "homes", intent: "buy", unit: "Apartment", city: "Noida", loc: "Sector 150", price: 2.1 * CR, area: 1900, bhk: 3, bath: 3, park: 1, furn: "Semi Furnished", facing: "East", media: ["Photo"], realtor: 5, verified: true, updated: "2026-10-09" },
  { id: "noida-extension-gaur-604", title: "604, Gaur City 2", cat: "homes", intent: "buy", unit: "Apartment", city: "Noida", loc: "Noida Extension", price: 72 * L, area: 1095, bhk: 2, bath: 2, park: 1, furn: "Unfurnished", facing: "North", media: ["Photo"], realtor: 1, verified: false, updated: "2026-09-29" },
  { id: "noida-sector-128-rent-2301", title: "2301, Jaypee Wish Town", cat: "homes", intent: "rent", unit: "Apartment", city: "Noida", loc: "Sector 128", price: 45_000, area: 1550, bhk: 3, bath: 3, park: 1, furn: "Semi Furnished", facing: "East", media: ["Photo"], realtor: 2, verified: true, updated: "2026-10-12" },

  // ---------- Chennai & Ahmedabad ----------
  { id: "chn-omr-casagrand-1203", title: "1203, Casagrand First City", cat: "homes", intent: "buy", unit: "Apartment", city: "Chennai", loc: "OMR", price: 95 * L, area: 1210, bhk: 2, bath: 2, park: 1, furn: "Unfurnished", facing: "East", media: ["Photo"], realtor: 2, verified: true, updated: "2026-10-07" },
  { id: "chn-adyar-rent-floor", title: "1st Floor, Gandhi Nagar Adyar", cat: "homes", intent: "rent", unit: "Independent Floor", city: "Chennai", loc: "Adyar", price: 65_000, area: 1700, bhk: 3, bath: 3, park: 1, furn: "Semi Furnished", facing: "North", media: ["Photo"], realtor: 3, verified: true, updated: "2026-10-01" },
  { id: "amd-sg-highway-adani-1401", title: "1401, Adani Shantigram", cat: "homes", intent: "buy", unit: "Apartment", city: "Ahmedabad", loc: "SG Highway", price: 1.45 * CR, area: 1850, bhk: 3, bath: 3, park: 2, furn: "Semi Furnished", facing: "East", media: ["Photo", "Video"], realtor: 1, verified: true, updated: "2026-10-10" },
  { id: "amd-bopal-bungalow-11", title: "Bungalow 11, South Bopal", cat: "homes", intent: "buy", unit: "Independent House", city: "Ahmedabad", loc: "Bopal", price: 2.9 * CR, area: 3600, bhk: 4, bath: 4, park: 2, furn: "Unfurnished", facing: "North", media: ["Photo"], realtor: 1, verified: false, updated: "2026-09-24" },
  // ---------- Firm team listings (SAMPLE, for firm and agent profile pages) ----------
  { id: "mum-worli-sea-breeze-1801", title: "1801, Worli Sea Breeze", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Worli", price: 8.4 * CR, area: 1320, bhk: 3, bath: 3, park: 2, furn: "Semi Furnished", facing: "West", media: ["Photo"], realtor: 0, verified: true, updated: "2026-10-18" },
  { id: "mum-mahalaxmi-racecourse-view-902", title: "902, Racecourse View", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Mahalaxmi", price: 5.95 * CR, area: 1040, bhk: 2, bath: 2, park: 1, furn: "Unfurnished", facing: "North", media: ["Photo", "Video"], realtor: 0, verified: true, updated: "2026-10-06" },
  { id: "mum-mahalaxmi-vivarea-t1-1504", title: "T1 - 1504, Raheja Vivarea", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Mahalaxmi", price: 9.8 * CR, area: 1610, bhk: 3, bath: 4, park: 2, furn: "Semi Furnished", facing: "West", media: ["Photo"], realtor: "assetpro-meera-pillai", verified: true, updated: "2026-10-14", project: ["raheja-vivarea", "Raheja Vivarea"] },
  { id: "mum-worli-palm-court-603", title: "603, Palm Court", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Worli", price: 4.75 * CR, area: 880, bhk: 2, bath: 2, park: 1, furn: "Fully Furnished", facing: "South", media: ["Photo"], realtor: "assetpro-meera-pillai", verified: false, updated: "2026-09-30" },
  { id: "mum-mahalaxmi-tardeo-heights-2102", title: "2102, Tardeo Heights", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Mahalaxmi", price: 11.2 * CR, area: 1780, bhk: 4, bath: 4, park: 2, furn: "Unfurnished", facing: "North West", media: ["Photo", "VR Tour"], realtor: "assetpro-meera-pillai", verified: true, updated: "2026-10-09" },
  { id: "mum-worli-lodha-park-c2203-rent", title: "C - 2203, Lodha Park", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Worli", price: 2.4 * L, area: 1180, bhk: 3, bath: 3, park: 2, furn: "Fully Furnished", facing: "West", media: ["Photo", "Video"], realtor: "assetpro-rohan-desai", verified: true, updated: "2026-10-15", project: ["lodha-park", "Lodha Park"] },
  { id: "mum-worli-sea-face-704-rent", title: "704, Worli Sea Face Towers", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Worli", price: 1.65 * L, area: 920, bhk: 2, bath: 2, park: 1, furn: "Semi Furnished", facing: "West", media: ["Photo"], realtor: "assetpro-rohan-desai", verified: true, updated: "2026-10-11" },
  { id: "mum-mahalaxmi-residency-1104-rent", title: "1104, Mahalaxmi Residency", cat: "homes", intent: "rent", unit: "Studio", city: "Mumbai", loc: "Mahalaxmi", price: 62_000, area: 430, bhk: 1, bath: 1, park: 0, furn: "Fully Furnished", facing: "East", media: ["Photo"], realtor: "assetpro-rohan-desai", verified: false, updated: "2026-10-03" },
  { id: "mum-bandra-east-sparkle-1203-rent", title: "1203, Kalpataru Sparkle", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Bandra East", price: 1.1 * L, area: 780, bhk: 2, bath: 2, park: 1, furn: "Semi Furnished", facing: "North", media: ["Photo"], realtor: "skyline-aditi-shah", verified: true, updated: "2026-10-13" },
  { id: "mum-bandra-east-seasons-a1502-rent", title: "A - 1502, Rustomjee Seasons", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Bandra East", price: 1.9 * L, area: 1150, bhk: 3, bath: 3, park: 2, furn: "Fully Furnished", facing: "East", media: ["Photo", "Video"], realtor: "skyline-aditi-shah", verified: true, updated: "2026-10-07" },
  { id: "mum-andheri-workspaces-studio-3-rent", title: "Studio 3, Veera Desai Workspaces", cat: "offices", intent: "rent", unit: "Co-working", city: "Mumbai", loc: "Andheri West", price: 85_000, area: 520, park: 1, media: ["Photo"], realtor: "skyline-kunal-bhatt", verified: false, updated: "2026-10-04", extra: [{ label: "Seats", value: "10" }, { label: "Cabins", value: "1" }, { label: "Fit-out", value: "Furnished" }] },
  { id: "mum-powai-lake-homes-1602-rent", title: "1602, Lake Homes", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Powai", price: 78_000, area: 890, bhk: 2, bath: 2, park: 1, furn: "Semi Furnished", facing: "North", media: ["Photo"], realtor: "urbannest-aman-sheikh", verified: true, updated: "2026-10-12" },
  { id: "mum-chembur-gymkhana-road-804-rent", title: "804, Chembur Gymkhana Road", cat: "homes", intent: "rent", unit: "Apartment", city: "Mumbai", loc: "Chembur", price: 46_000, area: 610, bhk: 1, bath: 1, park: 1, furn: "Fully Furnished", facing: "East", media: ["Photo"], realtor: "urbannest-aman-sheikh", verified: false, updated: "2026-10-02" },
  { id: "mum-worli-business-bay-1401", title: "Unit 1401, Worli Business Bay", cat: "offices", intent: "buy", unit: "Grade A office", city: "Mumbai", loc: "Worli", price: 14.2 * CR, area: 3100, park: 4, media: ["Photo"], realtor: "keystone-farah-siddiqui", verified: true, updated: "2026-10-10", extra: [{ label: "Seats", value: "34" }, { label: "Cabins", value: "3" }, { label: "Fit-out", value: "Warm shell" }] },
  { id: "mum-goregaon-peninsula-warehouse-c-rent", title: "Block C, Peninsula Business Park", cat: "industrial", intent: "rent", unit: "Warehouse", city: "Mumbai", loc: "Goregaon East", price: 6.8 * L, area: 22000, park: 8, media: ["Photo"], realtor: "keystone-siddharth-joshi", verified: true, updated: "2026-09-26", extra: [{ label: "Clear height", value: "30 ft" }, { label: "Docks", value: "4" }, { label: "Power", value: "250 kVA" }] },
  { id: "mum-goregaon-garden-city-2004", title: "2004, Oberoi Garden City", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Goregaon East", price: 3.4 * CR, area: 1010, bhk: 2, bath: 2, park: 1, furn: "Unfurnished", facing: "East", media: ["Photo", "Video"], realtor: "networth-ishaan-verma", verified: true, updated: "2026-10-15" },
  { id: "mum-goregaon-aarey-road-a1203", title: "A - 1203, Aarey Road Residences", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Goregaon East", price: 2.65 * CR, area: 840, bhk: 2, bath: 2, park: 1, furn: "Unfurnished", facing: "North", media: ["Photo"], realtor: "networth-ishaan-verma", verified: false, updated: "2026-10-01" },
  { id: "mum-thane-hiranandani-meadows-904", title: "904, Hiranandani Meadows", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Thane West", price: 1.85 * CR, area: 980, bhk: 3, bath: 2, park: 1, furn: "Semi Furnished", facing: "East", media: ["Photo"], realtor: "networth-tanvi-kulkarni", verified: true, updated: "2026-10-08" },
  { id: "mum-worli-auction-lot-7", title: "Auction lot 7, Worli Naka", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Worli", price: 3.6 * CR, area: 760, bhk: 2, bath: 2, park: 1, furn: "Unfurnished", facing: "South", media: ["Photo"], realtor: 7, verified: false, updated: "2026-09-20" },
  { id: "mum-chembur-auction-lot-12", title: "Auction lot 12, Chembur Colony", cat: "homes", intent: "buy", unit: "Apartment", city: "Mumbai", loc: "Chembur", price: 1.05 * CR, area: 540, bhk: 1, bath: 1, park: 0, furn: "Unfurnished", facing: "West", media: ["Photo"], realtor: 7, verified: false, updated: "2026-09-17" },
];

const realtorOf = (r: Row) =>
  typeof r.realtor === "number" ? REALTORS[r.realtor] : ALL_REALTORS.find((x) => x.id === r.realtor)!;

const AMENITIES: Record<PropertyCategory, string[]> = {
  homes: ["Lift", "Power backup", "24×7 security", "Clubhouse", "Gymnasium", "Swimming pool", "Kids play area", "Visitor parking"],
  offices: ["Central air conditioning", "Power backup", "Cafeteria", "Lift", "24×7 security", "Visitor parking"],
  retail: ["High footfall", "Power backup", "Signage rights", "Lift", "Visitor parking"],
  industrial: ["Truck turning radius", "Fire safety", "Power backup", "24×7 security", "Office block"],
  land: ["Road access", "Water connection", "Boundary wall", "Clear title"],
};

const AREA_BASIS: Record<PropertyCategory, Property["areaBasis"]> = {
  homes: "Carpet",
  offices: "Carpet",
  retail: "Carpet",
  industrial: "Built-up",
  land: "Plot",
};

function specsFor(r: Row): Spec[] {
  if (r.cat === "homes") {
    return [
      { label: r.unit, value: r.bhk === 1 && r.unit === "Studio" ? "Studio" : `${r.bhk} BHK` },
      { label: "Bathrooms", value: `${r.bath} Baths` },
      { label: "Parking", value: r.park ? `${r.park} Park` : "None" },
      { label: "Furnishing", value: (r.furn ?? "Unfurnished").replace(" Furnished", "") },
    ];
  }
  if (r.cat === "land") {
    return [{ label: "Facing", value: r.facing ?? "—" }, ...(r.extra ?? [])];
  }
  return [...(r.extra ?? []), { label: "Parking", value: String(r.park ?? 0) }];
}

function describe(r: Row): string {
  const realtor = realtorOf(r);
  const what =
    r.cat === "homes"
      ? `${r.bhk === 1 && r.unit === "Studio" ? "studio" : `${r.bhk} BHK ${r.unit.toLowerCase()}`}`
      : r.unit.toLowerCase();
  return `A ${what} in ${r.loc}, ${r.city}, listed ${r.intent === "buy" ? "for sale" : "for rent"} with ${realtor.firm}. ${r.area.toLocaleString("en-IN")} sq ft ${AREA_BASIS[r.cat].toLowerCase()} area. This is sample listing content for the prototype; details will come from the listings service.`;
}

const jitter = (seed: number): number => ((seed * 9301 + 49297) % 233280) / 233280 - 0.5;

export const PROPERTIES: Property[] = ROWS.map((r, i) => {
  const base = LOCALITY_GEO[r.loc] ?? [19.07, 72.88];
  const coords: LatLng = [base[0] + jitter(i + 1) / 60, base[1] + jitter(i + 7) / 60];
  const pool = PHOTO_IDS[r.cat];
  const realtor = realtorOf(r);
  return {
    id: r.id,
    title: r.title,
    category: r.cat,
    intent: r.intent,
    unitType: r.unit,
    city: r.city,
    locality: r.loc,
    projectId: r.project?.[0],
    projectName: r.project?.[1],
    price: Math.round(r.price),
    areaSqft: r.area,
    areaBasis: AREA_BASIS[r.cat],
    bhk: r.bhk,
    bathrooms: r.bath,
    parking: r.park,
    furnishing: r.furn,
    facing: r.facing,
    media: r.media,
    specs: specsFor(r),
    amenities: AMENITIES[r.cat],
    description: describe(r),
    images: [0, 1, 2, 3, 4, 5].map((k) => unsplash(pool[(i + k) % pool.length], 1400, r.id)),
    coords,
    realtorId: realtor.id,
    realtorFirm: realtor.firm,
    verification: r.verified ? "verified" : "pending",
    updatedAt: r.updated,
    // Detail-page fields (v1 listing page): deterministic sample values.
    ...propertyDetailFields(
      { cat: r.cat, intent: r.intent, unit: r.unit, city: r.city, loc: r.loc, price: r.price, area: r.area, bhk: r.bhk, bath: r.bath, furn: r.furn, facing: r.facing, updated: r.updated, inProject: !!r.project },
      i,
      coords,
    ),
  };
});
