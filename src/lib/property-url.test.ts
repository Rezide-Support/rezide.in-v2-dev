import { describe, expect, it } from "vitest";
import { propertyHref, propertyIdFromSegment } from "./property-url";

describe("property URLs", () => {
  const id = "6b06dda4020601f5a2e9bffb";
  it("includes the description, intent, location and known area", () => {
    expect(propertyHref({ id, title: "Allura B - 7003, Lodha The Park", intent: "buy", locality: "Lower Parel", city: "Mumbai", areaSqft: 890 })).toBe(`/properties/allura-b-7003-lodha-the-park-for-sale-in-lower-parel-mumbai-890-sqft-pid-${id}`);
  });
  it("omits unavailable area and normalizes punctuation and accents", () => {
    const path = propertyHref({ id, title: "Caf\u00e9 / Apartment", intent: "rent", city: "Mumbai", areaKnown: false, areaSqft: 900 });
    expect(path).toBe(`/properties/cafe-apartment-for-rent-in-mumbai-pid-${id}`);
    expect(propertyIdFromSegment(path.split("/").at(-1)!)).toBe(id);
  });
  it("supports legacy ID links and ID-only callers", () => {
    expect(propertyHref({ id })).toBe(`/properties/${id}`);
    expect(propertyIdFromSegment(id)).toBe(id);
  });
  it("uses the final marker when the title contains pid", () => {
    expect(propertyIdFromSegment(`pid-residency-pid-${id}`)).toBe(id);
  });
});
