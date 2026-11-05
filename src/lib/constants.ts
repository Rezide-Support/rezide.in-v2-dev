import type { PropertyCategory } from "@/types/models";

/** Cities with locality data in the prototype. Others still work but have no sample inventory. */
export const LOCALITIES: Record<string, string[]> = {
  Mumbai: ["Worli", "Thane West", "Goregaon East", "Mahalaxmi", "Powai", "Andheri West", "Chembur", "Bandra East"],
  Bengaluru: ["Whitefield", "Hebbal", "Sarjapur Road", "Indiranagar", "Yelahanka", "Electronic City", "Koramangala", "Devanahalli"],
  Pune: ["Hinjewadi", "Koregaon Park", "Baner", "Kharadi", "Wakad", "Hadapsar", "Bavdhan", "Viman Nagar"],
  Hyderabad: ["Gachibowli", "Jubilee Hills", "Kokapet", "Kondapur", "Narsingi", "Tellapur", "Madhapur", "Banjara Hills"],
  Gurugram: ["Golf Course Road", "Sector 65", "Sohna Road", "Sector 106", "Dwarka Expressway", "Sector 79", "New Gurgaon", "Sector 49"],
  Noida: ["Sector 150", "Sector 128", "Noida Extension", "Sector 62", "Sector 94", "Yamuna Expressway", "Sector 107", "Sector 75"],
  Chennai: ["OMR", "Adyar", "Porur", "Anna Nagar", "Sholinganallur", "Pallavaram", "ECR", "Velachery"],
  Ahmedabad: ["SG Highway", "Bopal", "Prahlad Nagar", "Shela", "Gota", "Thaltej", "South Bopal", "Science City"],
  Delhi: ["Vasant Kunj", "Dwarka", "Saket", "Greater Kailash", "Rohini", "Janakpuri", "Karol Bagh", "Chanakyapuri"],
  "Navi Mumbai": ["Vashi", "Kharghar", "Nerul", "Belapur", "Panvel", "Airoli", "Ulwe", "Sanpada"],
  Thane: ["Ghodbunder Road", "Majiwada", "Kolshet", "Hiranandani Estate", "Pokhran Road", "Kasarvadavali", "Balkum", "Wagle Estate"],
  Kolkata: ["New Town", "Salt Lake", "Ballygunge", "Rajarhat", "Alipore", "EM Bypass", "Tollygunge", "Behala"],
  Lucknow: ["Gomti Nagar", "Hazratganj", "Aliganj", "Indira Nagar", "Shaheed Path", "Sushant Golf City", "Jankipuram", "Mahanagar"],
};

export const TOP_CITIES = [
  "Bengaluru",
  "Chennai",
  "Delhi",
  "Gurugram",
  "Hyderabad",
  "Kolkata",
  "Lucknow",
  "Mumbai",
  "Navi Mumbai",
  "Noida",
  "Pune",
  "Thane",
];

export const OTHER_CITIES = [
  "Agra", "Ahmedabad", "Ahmednagar", "Ajmer", "Amritsar", "Aurangabad", "Bhopal", "Bhubaneswar",
  "Chandigarh", "Coimbatore", "Dehradun", "Faridabad", "Ghaziabad", "Goa", "Guwahati", "Indore",
  "Jaipur", "Jodhpur", "Kochi", "Kolhapur", "Kozhikode", "Ludhiana", "Madurai", "Mangaluru",
  "Mysuru", "Nagpur", "Nashik", "Patna", "Raipur", "Rajkot", "Ranchi", "Surat",
  "Thiruvananthapuram", "Udaipur", "Vadodara", "Varanasi", "Vijayawada", "Visakhapatnam",
];

export const ALL_CITIES = [...TOP_CITIES, ...OTHER_CITIES];

/** Approximate city centres, used to pick the nearest city from browser geolocation. */
export const CITY_CENTRES: Record<string, [number, number]> = {
  Mumbai: [19.076, 72.8777],
  Bengaluru: [12.9716, 77.5946],
  Pune: [18.5204, 73.8567],
  Hyderabad: [17.385, 78.4867],
  Gurugram: [28.4595, 77.0266],
  Noida: [28.5355, 77.391],
  Chennai: [13.0827, 80.2707],
  Ahmedabad: [23.0225, 72.5714],
  Delhi: [28.6139, 77.209],
  "Navi Mumbai": [19.033, 73.0297],
  Thane: [19.2183, 72.9781],
  Kolkata: [22.5726, 88.3639],
  Lucknow: [26.8467, 80.9462],
  Jaipur: [26.9124, 75.7873],
  Surat: [21.1702, 72.8311],
  Indore: [22.7196, 75.8577],
  Kochi: [9.9312, 76.2673],
  Chandigarh: [30.7333, 76.7794],
  Goa: [15.2993, 74.124],
  Nagpur: [21.1458, 79.0882],
};

export const DEFAULT_CITY = "Mumbai";

export const localitiesFor = (city: string): string[] =>
  LOCALITIES[city] ?? ["City Centre", "North", "South", "East", "West", "Ring Road", "Airport Road", "New Town"];

export const CATEGORIES: { id: PropertyCategory; label: string; noun: string; lease: string }[] = [
  { id: "homes", label: "Homes", noun: "Homes", lease: "Rent" },
  { id: "offices", label: "Offices", noun: "Offices", lease: "Lease" },
  { id: "retail", label: "Retail", noun: "Retail", lease: "Lease" },
  { id: "industrial", label: "Industrial", noun: "Industrial", lease: "Lease" },
  { id: "land", label: "Land", noun: "Land", lease: "Lease" },
];

export const categoryById = (id: PropertyCategory) =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

export const UNIT_TYPES: Record<PropertyCategory, string[]> = {
  homes: ["Apartment", "Villa", "Independent House", "Penthouse", "Duplex", "Studio", "Independent Floor", "Row House"],
  offices: ["Grade A office", "Co-working", "IT park", "Business centre", "Office floor"],
  retail: ["High-street shop", "Mall unit", "Showroom", "Food & beverage", "Kiosk"],
  industrial: ["Warehouse", "Factory", "Industrial shed", "Cold storage", "Logistics park"],
  land: ["Residential plot", "Commercial plot", "Industrial plot", "Farmhouse land", "Agricultural land"],
};

export const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK"];
export const FURNISHING_OPTIONS = ["Fully Furnished", "Semi Furnished", "Unfurnished"];
export const BATHROOM_OPTIONS = ["1", "2", "3", "4", "5+"];
export const PARKING_OPTIONS = ["1", "2", "3", "4+"];
export const MEDIA_OPTIONS = ["Video", "Photo", "VR Tour"];
export const FACING_OPTIONS = ["East", "West", "North", "South", "North East", "North West", "South East", "South West"];

/**
 * Carpet-area bands (sq ft) for the home "Size" rail and the area filter.
 * Contiguous, unlike the prototype's list, which skipped 2,000–3,000 sq ft.
 * `min` is inclusive, `max` exclusive.
 */
export const AREA_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: "Above 10,000 sq ft", min: 10000 },
  { label: "5,000 – 10,000 sq ft", min: 5000, max: 10000 },
  { label: "2,000 – 5,000 sq ft", min: 2000, max: 5000 },
  { label: "1,000 – 2,000 sq ft", min: 1000, max: 2000 },
  { label: "500 – 1,000 sq ft", min: 500, max: 1000 },
  { label: "Below 500 sq ft", max: 500 },
];

/** Budget breakpoints in INR. Sale prices are totals; rent prices are monthly. */
export const BUDGET_POINTS = {
  buy: [
    { label: "₹50 L", value: 50_00_000 },
    { label: "₹1 Cr", value: 1_00_00_000 },
    { label: "₹3 Cr", value: 3_00_00_000 },
    { label: "₹5 Cr", value: 5_00_00_000 },
    { label: "₹10 Cr", value: 10_00_00_000 },
    { label: "₹25 Cr", value: 25_00_00_000 },
  ],
  rent: [
    { label: "₹25k", value: 25_000 },
    { label: "₹50k", value: 50_000 },
    { label: "₹1 L", value: 1_00_000 },
    { label: "₹3 L", value: 3_00_000 },
    { label: "₹5 L", value: 5_00_000 },
    { label: "₹10 L", value: 10_00_000 },
  ],
} as const;

/** Project budget tiers from the prototype, by starting price. */
export const BUDGET_TIERS: { id: string; label: string; range: string; min: number; max: number }[] = [
  { id: "ultra-luxury", label: "Ultra Luxury", range: "₹25 Cr or above", min: 25_00_00_000, max: Infinity },
  { id: "luxury", label: "Luxury", range: "₹10 – 25 Cr", min: 10_00_00_000, max: 25_00_00_000 },
  { id: "super-premium", label: "Super Premium", range: "₹5 – 10 Cr", min: 5_00_00_000, max: 10_00_00_000 },
  { id: "premium", label: "Premium", range: "₹3 – 5 Cr", min: 3_00_00_000, max: 5_00_00_000 },
  { id: "mid-segment", label: "Mid-segment", range: "₹1 – 3 Cr", min: 1_00_00_000, max: 3_00_00_000 },
  { id: "value", label: "Value", range: "Under ₹1 Cr", min: 0, max: 1_00_00_000 },
];

export const PROJECT_STATUS = [
  { id: "uc", label: "Under Construction", headline: "Built for what comes next." },
  { id: "rtm", label: "Ready to Move", headline: "Move in this season." },
  { id: "nl", label: "New Launches", headline: "First to the address." },
] as const;

export const PROJECT_STATUS_LABEL = { uc: "Under Construction", rtm: "Ready to Move", nl: "New Launch" } as const;

export const PROJECT_VIEWS = [
  { group: "Scenic Views", items: ["Forest", "Greenery", "Hill Side", "Landscape", "Panoramic", "Park", "Waterfront"] },
  { group: "Premium Views", items: ["Sea View", "Lake View", "Golf Course", "Racecourse", "River View"] },
  { group: "Urban & City Views", items: ["City Skyline", "Landmark", "Main Road", "Corner"] },
  { group: "Amenity Views", items: ["Pool", "Clubhouse", "Central Garden", "Courtyard"] },
];

export const REALTOR_SPECIALIZATIONS = [
  "Residential Lease",
  "Residential Sales",
  "Residential Primary",
  "Residential Pre-leased",
  "Commercial Lease",
  "Commercial Sales",
  "Commercial Pre-leased",
  "Retail",
  "Warehouse",
  "Dark Stores",
  "Land",
  "Holiday Homes",
  "Bank Auctions",
];

export const LANGUAGES = ["English", "Hindi", "Marathi", "Gujarati", "Tamil", "Telugu", "Kannada", "Malayalam", "Punjabi"];

/** OTP length used across every sign-in, sign-up and verification flow: the Rezide backend sends 4-digit codes. */
export const OTP_LENGTH = 4;

export type ContactType = "Customer" | "Broker" | "Developer" | "Vendor";

export const CONTACT_SUBTYPES: Record<ContactType, string[]> = {
  Customer: ["Buyer", "Seller", "Tenant", "Landlord", "Investor"],
  Broker: ["Individual Agent", "Firm", "Channel Partner"],
  Developer: ["Builder", "Promoter"],
  Vendor: ["Legal", "Interiors", "Home Loan", "Movers"],
};

/** CRM "Associate Property" taxonomy: property type → unit types (realtor dashboard). */
export const CRM_UNIT_TYPES: Record<"Residential" | "Commercial" | "Land", string[]> = {
  Residential: ["Apartment", "Penthouse", "Villa", "Row House"],
  Commercial: ["Office", "Shop", "Showroom", "Warehouse"],
  Land: ["Plot", "Agricultural Land"],
};
