import { describe, expect, it } from "vitest";
import { formatListingPrice, priceText, roomValue, secondaryPriceText } from "@/features/compare/listing-compare";
import { compareDate } from "@/features/compare/project-compare";
import { toCompareListing } from "./compare-listings";

/* Shapes follow the live record of "Kiara A - Lower Floor, Lodha The Park" (POST /Inventory/listing/ids). */
const record = (over: Record<string, unknown> = {}, details: Record<string, unknown> = {}) => ({
  _id: "6ae58b9b3f64f87dd971a857",
  listing_details: {
    listing_name: "Kiara A - Lower Floor,  Lodha The Park",
    unit_type: "Apartment",
    area: 1701,
    area_type: "total_usable_area",
    floor_no: "14",
    floorHide: true,
    UnitFloorPosition: "Lower Floor",
    unitHide: true,
    towerHide: false,
    priceHide: false,
    bhk: { name: "4 BHK" },
    no_of_bathrooms: "6",
    no_of_balconies: "0",
    no_of_parkings: "3",
    view: "Waterfront",
    entry_direction: "W",
    exit_direction: "E",
    unit_no: { unit: "1401", config_id: "cfg1" },
    tower: { general_information: { tower_name: "Kiara A" }, levels_prefix: { no_of_levels_above: "67" }, series_suffix: { level_start: { value: "7" } } },
    project: {
      _id: "658eb34107130a3f09bc3ef9",
      general_information: { project_name: "Lodha The Park", completion_date: "2026-01-01T05:30:00.000Z" },
      locality_and_address: { address: { city: "Mumbai", locality: "Lower Parel" } },
      media: { images: [{ url: "proj" }], sample_flats: [] },
      amenities: ["Clubhouse", "Adult Swimming Pool"],
      configuration: [
        { _id: "other", partitions: [{ name: "Kitchen", length: "1", breadth: "1" }] },
        { _id: "cfg1", partitions: [{ name: "Entrance Lobby", length: "5.58", breadth: "3.42", total_area: "19.08" }] },
      ],
    },
    ...details,
  },
  commercial_details: {
    property_purpose: "sale",
    available_from: "2026-10-31 12:01:29.146327",
    monthly_rent: 0,
    discount_price: 0,
    security_amount: 0,
    property_price: 127500000,
    sale_considration: 127500000,
    avg_rate_per_sqft: 74956,
    furnishing: { name: "Semi Furnished" },
  },
  images: { apartment: [], ext_view_day: [], ext_view_night: [] },
  furnishingAmenities: [],
  apartmentAmenities: [],
  // Private fields the table must not copy.
  broker_and_agent: { broker_id: "BROKERSECRET" },
  commercial_details_internal: { internal_notes: "OWNERSECRET" },
  ...over,
});

describe("compare table listing (as rezide.in's compare page)", () => {
  it("reads the rows rezide.in shows", () => {
    const l = toCompareListing(record())!;
    expect(l).toMatchObject({
      name: "Kiara A - Lower Floor,  Lodha The Park",
      purpose: "sale",
      city: "Mumbai",
      locality: "Lower Parel",
      complexName: "Lodha The Park",
      propertyType: "Apartment",
      tower: "Kiara A",
      totalFloors: 61,
      floor: "Lower Floor",
      unitNo: "-",
      bedrooms: "4 BHK",
      bathrooms: "6",
      balconies: "0",
      carParks: "3",
      entry: "W",
      exit: "E",
      areaType: "total_usable_area",
      area: 1701,
      furnishing: "Semi Furnished",
      projectAmenities: ["Clubhouse", "Adult Swimming Pool"],
    });
    // The unit's own configuration, by its config id.
    expect(l.rooms).toEqual([{ name: "Entrance Lobby", length: "5.58", breadth: "3.42", area: undefined }]);
    expect(l.photo).toMatch(/\/file\/upload\/proj$/);
    expect(priceText(l)).toBe("₹ 12,75,00,000/-");
    expect(secondaryPriceText(l)).toBe("₹ 74,956/-");
    expect(JSON.stringify(l)).not.toMatch(/BROKERSECRET|OWNERSECRET|1401/);
  });

  it("shows the floor and unit only when the owner allows, and a one-letter tower as 'Tower A'", () => {
    const l = toCompareListing(record({}, { floorHide: false, unitHide: false, tower: { general_information: { tower_name: "A" } } }))!;
    expect(l).toMatchObject({ floor: "14", unitNo: "1401", tower: "Tower A", totalFloors: null });
    expect(toCompareListing(record({}, { towerHide: true }))!.tower).toBe("-");
  });

  it("keeps a hidden price on the server", () => {
    const l = toCompareListing(record({}, { priceHide: true }))!;
    expect(l.saleConsideration).toBeUndefined();
    expect(priceText(l)).toBe("₹ -/-");
  });

  it("writes rentals as rezide.in: rent per month and the security deposit", () => {
    const l = toCompareListing(record({ commercial_details: { property_purpose: "rent", monthly_rent: 85000, security_amount: 255000 } }))!;
    expect(priceText(l)).toBe("₹ 85,000/- p.m.");
    expect(secondaryPriceText(l)).toBe("₹ 2,55,000/-");
  });

  it("formats amounts, room sizes and dates as rezide.in", () => {
    expect(formatListingPrice(undefined, 0, 55000000)).toBe("5,50,00,000");
    expect(formatListingPrice(0, undefined)).toBe("0");
    expect(formatListingPrice(undefined)).toBe("-");
    expect(roomValue("16.92")).toBe(17);
    expect(roomValue(undefined)).toBe("-");
    expect(compareDate("2026-12-15 00:00:00.000")).toBe("Dec 15, 2026");
  });
});
