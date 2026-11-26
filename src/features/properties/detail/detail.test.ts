import { beforeEach, describe, expect, it } from "vitest";
import { configurationPlans, haversineKm, landmarksFor } from "@/mocks/fixtures/detail-extras";
import { PROPERTIES } from "@/mocks/fixtures/properties";
import { PROJECTS } from "@/mocks/fixtures/projects";
import { COMPARE_LIMIT, useSavedStore } from "@/stores/saved";
import { formatAreaRange, formatFeet, formatKm, formatPriceRange, roomArea } from "./format";
import { leadSchema, toEnquiry, toListingEnquiry, type LeadValues } from "./lead-form";
import { propertyFields } from "./property-fields";

describe("detail formatting", () => {
  it("formats distances", () => {
    expect(formatKm(0.82)).toBe("0.82 km");
    expect(formatKm(1.2)).toBe("1.2 km");
    expect(formatKm(12.43)).toBe("12.4 km");
    expect(formatKm(38)).toBe("38 km");
  });

  it("formats feet and inches, carrying 12 inches into a foot", () => {
    expect(formatFeet(15.25)).toBe(`15' 3"`);
    expect(formatFeet(12)).toBe("12'");
    expect(formatFeet(9.99)).toBe("10'");
  });

  it("computes room areas", () => {
    expect(roomArea({ length: 22, width: 21.5 })).toBe(473);
    expect(roomArea({ length: 10.5, width: 4.5 })).toBe(47.25);
  });

  it("formats price and area ranges, with N/A for missing data", () => {
    expect(formatPriceRange(6.1e7, 1.4e8)).toBe("₹ 6.1 Cr – 14 Cr");
    expect(formatPriceRange(1.32e5, 3.03e5, { monthly: true })).toBe("₹ 1.32 L – 3.03 L / mo");
    expect(formatPriceRange(undefined, 5)).toBe("N/A");
    expect(formatAreaRange(728, 794)).toBe("728 – 794 sq ft");
  });
});

describe("listing enquiries, worded as on rezide.in", () => {
  const base: LeadValues = { mode: "contact", name: "Asha Rao", phone: "9820012345", intent: "", offer: "", date: "", slot: "", message: "" };
  const listing = { id: "l1", firmId: "f1", brokerId: "b1", name: "A-702, Satra", path: "/properties/l1" };
  const who = { name: "Asha Rao", phone: "9820012345", firmId: "f1", brokerId: "b1", listingId: "l1" };

  it("sends the option's exact value", () => {
    expect(toListingEnquiry({ ...base, intent: "I'm interested" }, listing)).toEqual({ ...who, enquiryType: "I'm interested" });
    expect(toListingEnquiry({ ...base, intent: "Request the price for this property" }, listing).enquiryType).toBe("I would like to request the price for this property");
    expect(toListingEnquiry({ ...base, intent: "I want to visit the property" }, listing).enquiryType).toBe(" I want to visit the property");
  });

  it("uses the offer interest and keeps the amount in the notes", () => {
    expect(toListingEnquiry({ ...base, mode: "offer", offer: "13500000", message: "Can close fast." }, listing)).toEqual({
      ...who,
      enquiryType: "I want to make an offer",
      notes: "Offer: ₹ 1,35,00,000. Can close fast.",
    });
  });

  it("words a visit with its day and slot", () => {
    const text = "Asha Rao wants to visit on 05 Nov 2026 at Evening (4 PM – 7 PM) for A-702, Satra. Please contact them.";
    expect(toListingEnquiry({ ...base, mode: "visit", date: "2026-11-05", slot: "Evening (4 PM – 7 PM)" }, listing)).toEqual({ ...who, enquiryType: text, notes: text });
  });
});

describe("lead form mapping", () => {
  const base: LeadValues = { mode: "contact", name: "Asha Rao", phone: "9820012345", intent: "", offer: "", date: "", slot: "", message: "" };

  it("requires an intent on the contact form", () => {
    expect(leadSchema.safeParse(base).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, intent: "I'm interested" }).success).toBe(true);
  });

  it("sends visit intents as visit requests and offers as call-backs", () => {
    expect(toEnquiry({ ...base, intent: "I want to visit the property" })).toMatchObject({ channel: "visit", name: "Asha Rao" });
    expect(toEnquiry({ ...base, mode: "offer", offer: "13500000" })).toMatchObject({ channel: "callback", message: "Offer: ₹ 1,35,00,000." });
  });

  it("rejects past visit dates", () => {
    expect(leadSchema.safeParse({ ...base, mode: "visit", date: "2000-01-01" }).success).toBe(false);
  });
});

describe("sample detail data", () => {
  it("is deterministic and keeps landmarks near the location", () => {
    const a = landmarksFor("Mumbai", "Worli", [19.0176, 72.8162], 3);
    const b = landmarksFor("Mumbai", "Worli", [19.0176, 72.8162], 3);
    expect(a).toEqual(b);
    for (const g of a.filter((g) => g.category !== "Airports")) {
      for (const l of g.items) expect(l.distanceKm).toBeLessThan(3.1);
      // Mumbai sample points stay east of the subject (landward).
      for (const l of g.items) expect(l.coords[1]).toBeGreaterThan(72.8162);
    }
    expect(haversineKm([19.0176, 72.8162], [19.0896, 72.8656])).toBeCloseTo(9.6, 0);
  });

  it("splits a project's area range across its configurations", () => {
    const plans = configurationPlans(["2 BHK", "3 BHK"], [1000, 2000]);
    expect(plans[0]).toEqual({ bhk: "2 BHK", areaMin: 1000, areaMax: 1490 });
    expect(plans[1].areaMax).toBe(2000);
  });

  it("builds v1 property fields by category", () => {
    const home = PROPERTIES.find((p) => p.id === "mum-worli-lodha-park-b1702")!;
    const labels = propertyFields(home).map((f) => f.label);
    expect(labels).toContain("Vastu: entry");
    expect(labels.at(-1)).toBe("Carpet area");
    const plot = PROPERTIES.find((p) => p.category === "land")!;
    expect(propertyFields(plot).map((f) => f.label)).not.toContain("BHK");
    expect(PROJECTS.every((p) => p.configurationPlans?.length === p.bhkOptions.length)).toBe(true);
  });

});

describe("saved store (device only)", () => {
  beforeEach(() => useSavedStore.setState({ shortlist: [], compare: [] }));

  it("toggles shortlist items", () => {
    const { toggle } = useSavedStore.getState();
    expect(toggle("shortlist", { kind: "property", id: "a", title: "A" }, new Date("2026-11-03T00:00:00Z"))).toBe("added");
    expect(useSavedStore.getState().shortlist).toEqual([{ kind: "property", id: "a", title: "A", savedAt: "2026-11-03T00:00:00.000Z" }]);
    expect(toggle("shortlist", { kind: "property", id: "a", title: "A" })).toBe("removed");
    expect(useSavedStore.getState().shortlist).toEqual([]);
  });

  it("caps compare per kind and persists to localStorage", () => {
    const { toggle } = useSavedStore.getState();
    for (let i = 0; i < COMPARE_LIMIT; i++) expect(toggle("compare", { kind: "project", id: `p${i}`, title: "P" })).toBe("added");
    expect(toggle("compare", { kind: "project", id: "extra", title: "P" })).toBe("limit");
    expect(toggle("compare", { kind: "property", id: "x", title: "X" })).toBe("added");
    expect(JSON.parse(localStorage.getItem("rezide-saved")!).state.compare).toHaveLength(COMPARE_LIMIT + 1);
  });

  it("caps Sale and Rental properties separately", () => {
    const { toggle } = useSavedStore.getState();
    for (let i = 0; i < COMPARE_LIMIT; i++) expect(toggle("compare", { kind: "property", id: `s${i}`, title: "S", intent: "buy" })).toBe("added");
    expect(toggle("compare", { kind: "property", id: "s-extra", title: "S", intent: "buy" })).toBe("limit");
    expect(toggle("compare", { kind: "property", id: "r0", title: "R", intent: "rent" })).toBe("added");
  });
});
