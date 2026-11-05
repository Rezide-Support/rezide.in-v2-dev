import { beforeEach, describe, expect, it } from "vitest";
import { useListingDraftStore } from "@/stores/listing-draft";
import { amountInWords, stepsFor, validateStep } from "./schema";

describe("listing wizard steps", () => {
  it("shows five steps until the owner chooses how to continue", () => {
    expect(stepsFor({})).toHaveLength(5);
    expect(stepsFor({ assist: "yes", handover: "realtor" })).toHaveLength(5);
    expect(stepsFor({ assist: "no" })).toHaveLength(10);
    expect(stepsFor({ assist: "yes", handover: "self" })).toHaveLength(10);
  });
});

describe("listing step validation", () => {
  it("requires role and city on the profile step", () => {
    expect(validateStep("profile", {})).toMatchObject({ role: expect.any(String), city: expect.any(String) });
    expect(validateStep("profile", { role: "Property Owner", city: "Mumbai" })).toBeNull();
  });

  it("requires the owner's name when listing on someone's behalf", () => {
    expect(validateStep("profile", { role: "POA Holder", city: "Pune" })).toHaveProperty("ownerName");
    expect(validateStep("profile", { role: "POA Holder", city: "Pune", ownerName: "A. Rao", ownerMobile: "12345" })).toHaveProperty("ownerMobile");
    expect(validateStep("profile", { role: "POA Holder", city: "Pune", ownerName: "A. Rao" })).toBeNull();
  });

  it("requires unit details for buildings but not for land", () => {
    const base = { address: "Plot 4, Sector 2", locality: "Wakad" };
    expect(validateStep("property", { ...base, category: "home" })).toMatchObject({ unitNo: expect.any(String), projectStatus: expect.any(String), buildingType: expect.any(String) });
    expect(validateStep("property", { ...base, category: "land" })).toBeNull();
  });

  it("checks floor numbers and PIN codes", () => {
    const ok = { category: "home" as const, address: "x", locality: "Worli", unitNo: "1702", projectStatus: "Ready to Move", buildingType: "Standalone" };
    expect(validateStep("property", { ...ok, floor: "40", totalFloors: "32" })).toHaveProperty("floor");
    expect(validateStep("property", { ...ok, pincode: "4000" })).toHaveProperty("pincode");
    expect(validateStep("property", { ...ok, pincode: "400018", floor: "17", totalFloors: "32" })).toBeNull();
  });

  it("validates price and realtor assistance", () => {
    expect(validateStep("commercials", { intent: "sell", price: "abc" })).toHaveProperty("price");
    expect(validateStep("commercials", { intent: "sell", price: "92000000" })).toBeNull();
    expect(validateStep("assist", { assist: "yes" })).toMatchObject({ realtorIds: expect.any(String), handover: expect.any(String) });
    expect(validateStep("assist", { assist: "yes", realtorIds: ["a", "b", "c", "d"], handover: "self" })).toHaveProperty("realtorIds");
    expect(validateStep("assist", { assist: "no" })).toBeNull();
  });

  it("validates unit details by category and video links", () => {
    expect(validateStep("unit", { category: "home", area: "1250", areaType: "Carpet" })).toMatchObject({ configuration: expect.any(String) });
    expect(validateStep("unit", { category: "office", area: "1250", areaType: "Carpet" })).toBeNull();
    expect(validateStep("video", { videoUrl: "http://example.com" })).toHaveProperty("videoUrl");
    expect(validateStep("video", { videoUrl: "https://youtu.be/abc" })).toBeNull();
  });

  it("formats amounts in lakh and crore", () => {
    expect(amountInWords("92000000")).toBe("9.2 Cr");
    expect(amountInWords("145000")).toBe("1.45 L");
    expect(amountInWords("68000")).toBe("68k");
    expect(amountInWords("")).toBe("");
  });
});

describe("listing draft preservation", () => {
  beforeEach(() => useListingDraftStore.getState().reset());

  it("keeps entered data when moving between steps", () => {
    const s = useListingDraftStore.getState();
    s.start({ intent: "rent" });
    s.update({ role: "Property Owner", city: "Mumbai" });
    s.complete("profile");
    s.goTo("type");
    useListingDraftStore.getState().update({ category: "home", unitType: "Apartment" });
    useListingDraftStore.getState().goTo("profile");
    expect(useListingDraftStore.getState().draft).toEqual({ intent: "rent", role: "Property Owner", city: "Mumbai", category: "home", unitType: "Apartment" });
    expect(useListingDraftStore.getState().completed).toEqual(["profile"]);
  });

  it("persists the draft to storage so a reload can resume it", () => {
    useListingDraftStore.getState().start({ intent: "sell" });
    useListingDraftStore.getState().update({ address: "B - 1702, Lodha Park" });
    const saved = JSON.parse(localStorage.getItem("rezide-listing-draft") ?? "{}");
    expect(saved.state.draft).toMatchObject({ intent: "sell", address: "B - 1702, Lodha Park" });
    expect(saved.state.started).toBe(true);
  });

  it("clears everything on reset", () => {
    useListingDraftStore.getState().start({ intent: "sell" });
    useListingDraftStore.getState().reset();
    expect(useListingDraftStore.getState()).toMatchObject({ started: false, draft: {}, step: "profile", completed: [] });
  });
});
