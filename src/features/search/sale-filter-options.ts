export const SALE_PROPERTY_TYPES = [
  { value: "Apartment", label: "Apartment" },
  { value: "Villa", label: "Villa" },
  { value: "Independent Houses", label: "Independent Houses" },
  { value: "Pent House", label: "Penthouse" },
  { value: "Duplex", label: "Duplex" },
  { value: "Jodi", label: "Jodi" },
  { value: "Studio", label: "Studio" },
  { value: "Independent Floor", label: "Independent Floor" },
  { value: "Holiday Home", label: "Holiday Home" },
  { value: "Row/Town House", label: "Row/Town House" },
] as const;

export const SALE_FURNISHING_OPTIONS = [
  { value: "650eb6b2a1a78c56b3fac96e", label: "Semi Furnished" },
  { value: "650eb6cda1a78c56b3fac97d", label: "Fully Furnished" },
  { value: "650eb699a1a78c56b3fac967", label: "Unfurnished" },
  { value: "64ebfdd6771989afbc9c5659", label: "Builder Condition" },
  { value: "64df3f8e97c2b999c22290d6", label: "Bare Shell" },
] as const;

export const SALE_AVAILABILITY_OPTIONS = [
  { value: "659302fcd10433fa2dbb7c8a", label: "Available" },
  { value: "65f1e1a12eea64cbff9e7042", label: "Ready to move" },
  { value: "659ab5eed24fe157c663fbb6", label: "Under construction" },
  { value: "65930323d10433fa2dbb7c96", label: "Sold" },
  { value: "659ffb68f524ad70b2692abf", label: "Coming soon" },
] as const;

export const RENT_AVAILABILITY_OPTIONS = [
  { value: "0", label: "Immediately" },
  { value: "15", label: "Within 15 days" },
  { value: "30", label: "Within 30 days" },
  { value: "40", label: "Beyond 30 days" },
  { value: "6593031bd10433fa2dbb7c92", label: "Rented" },
  { value: "659ffb68f524ad70b2692abf", label: "Coming soon" },
] as const;

export const SALE_BHK_OPTIONS = [
  "Studio",
  "1 BHK",
  "1.5 BHK",
  "2 BHK",
  "2.5 BHK",
  "3 BHK",
  "3.5 BHK",
  "4 BHK",
  "4.5 BHK",
  "5 BHK",
  "5+ BHK",
];
export const SALE_BHK_IDS: Record<string, string[]> = {
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
export const RENT_BHK_OPTIONS = [
  "1 BHK",
  "1.5 BHK",
  "2 BHK",
  "2.5 BHK",
  "3 BHK",
  "3.5 BHK",
  "4 BHK",
  "4.5 BHK",
  "5 BHK",
  "5+ BHK",
  "Studio",
];
export const RENT_BHK_IDS: Record<string, string[]> = {
  ...SALE_BHK_IDS,
  "5+ BHK": ["656730d08eb9d2295cb750ed"],
};
export const RENT_BHK_URL_IDS: Record<string, string> = Object.fromEntries(
  Object.entries(RENT_BHK_IDS).map(([label, ids]) => [label, ids[0]]),
);
export const SALE_BHK_URL_IDS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(SALE_BHK_IDS).map(([label, ids]) => [label, label === "5+ BHK" ? ids[1] : ids[0]])),
};
export const SALE_BHK_ID_TO_LABEL = Object.fromEntries(
  Object.entries(SALE_BHK_URL_IDS).map(([label, id]) => [id, label]),
);
export const SALE_BUILDING_TYPES = [
  "Gated Amenities",
  "Standalone",
  "Gated No Amenities",
  "Standalone Amenities",
];
export const SALE_BATHROOM_OPTIONS = ["1", "2", "3", "4", "5", ">"];
export const SALE_BALCONY_OPTIONS = ["1", "2", "3", "4", ">"];
export const SALE_PARKING_OPTIONS = ["1", "2", "3", "4", ">"];
export const SALE_AGE_OPTIONS = [
  { value: "0-0", label: "<1 year" },
  { value: "1 - 3 years", label: "1 - 3 years" },
  { value: "3 - 5 years", label: "3 - 5 years" },
  { value: "5 - 10", label: "5 - 10 years" },
  { value: "10 - 20", label: "10 - 20 years" },
  { value: "> 20", label: ">20 years" },
  { value: "Under Construction", label: "Under Construction" },
] as const;
export const SALE_LISTING_OPTIONS = ["Video", "Photo", "VR Tour"];
export const SALE_PREFERRED_APARTMENT_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
export const SALE_EXIT_DIRECTIONS = [
  { value: "E", label: "East" },
  { value: "W", label: "West" },
  { value: "N", label: "North" },
  { value: "S", label: "South" },
  { value: "NE", label: "North East" },
  { value: "NW", label: "North West" },
  { value: "SE", label: "South East" },
  { value: "SW", label: "South West" },
] as const;
export const SALE_FLOOR_OPTIONS = [
  { value: "0", label: "Ground Floor" },
  { value: "1 - 5", label: "1-5" },
  { value: "6 - 10", label: "6-10" },
  { value: "11 - 20", label: "11-20" },
  { value: "20 - 40", label: "20-40" },
  { value: "40 - 70", label: "40-70" },
] as const;
export const SALE_TIME_OPTIONS = [
  "New lising",
  "Less than 3 days",
  "Less than 15 days",
  "Less than 30 days",
  "Less than 60 days",
  "Less than 90 days",
  "Any Time",
];
export const RENT_TIME_OPTIONS = [
  { value: "New lising", label: "New lising" },
  { value: "Less than 3 days", label: "Less than 3 days" },
  { value: "Less than 15 days", label: "Less than 15 days" },
  { value: "Less than 30 days", label: "Less than 30 days" },
  { value: "Less than 60 days", label: "Less than 60 days" },
  { value: "Less than 90 days", label: "Less than 90 days" },
  { value: "AnyTime", label: "Any Time" },
] as const;

export const SALE_BUDGET_MIN = Array.from({ length: 9 }, (_, i) => (i + 1) * 10_000_000);
export const SALE_BUDGET_MAX = Array.from({ length: 19 }, (_, i) => (i + 2) * 10_000_000);
export const SALE_AREA_MIN = [100, 200, 300, 400, 500, 1_000, 1_500, 2_000, 3_000, 4_000, 5_000, 10_000, 25_000];
export const SALE_AREA_MAX = [...SALE_AREA_MIN, 50_000];
export const RENT_BUDGET_OPTIONS = [
  { value: 25_000, label: "₹25,000" },
  { value: 30_000, label: "₹30,000" },
  { value: 35_000, label: "₹35,000" },
  { value: 40_000, label: "₹40,000" },
  { value: 50_000, label: "₹50,000" },
  { value: 60_000, label: "₹60,000" },
  { value: 85_000, label: "₹85,000" },
  { value: 100_000, label: "₹1 Lac" },
  { value: 150_000, label: "₹1.5 Lac" },
  { value: 200_000, label: "₹2 Lac" },
  { value: 400_000, label: "₹4 Lac" },
  { value: 700_000, label: "₹7 Lac" },
  { value: 1_000_000, label: "₹10 Lac" },
] as const;

export const SALE_BUDGET_LABELS = (value: number) => `₹${value / 10_000_000} Cr`;
export const SALE_AREA_LABELS = (value: number) => `${value.toLocaleString("en-IN")} sq ft`;

export const SALE_FURNISHING_ID_TO_LABEL = Object.fromEntries(
  SALE_FURNISHING_OPTIONS.map(({ value, label }) => [value, label]),
);
export const SALE_AVAILABILITY_ID_TO_LABEL = Object.fromEntries(
  SALE_AVAILABILITY_OPTIONS.map(({ value, label }) => [value, label]),
);
