import { describe, expect, it } from "vitest";
import { rankCities } from "./city-search";

describe("rankCities", () => {
  // The backend's order: alphabetical.
  const master = ["Alappuzha", "Jaipur", "Kanpur", "Pudukkottai", "Pune", "Thane"];

  it("ranks prefix matches above matches inside the name", () => {
    expect(rankCities(master, "pu")).toEqual(["Pudukkottai", "Pune", "Alappuzha", "Jaipur", "Kanpur"]);
  });

  it("puts an exact match first, ignoring case and spaces", () => {
    expect(rankCities(master, "  PUNE ")).toEqual(["Pune"]);
  });

  it("returns everything for an empty query and nothing for no match", () => {
    expect(rankCities(master, "")).toEqual(master);
    expect(rankCities(master, "zzz")).toEqual([]);
  });
});
