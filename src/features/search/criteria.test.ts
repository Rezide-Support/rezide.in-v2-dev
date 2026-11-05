import { describe, expect, it } from "vitest";
import {
  areaRangeLabel,
  countActiveFilters,
  defaultPropertyCriteria,
  parseProjectCriteria,
  parsePropertyCriteria,
  propertySearchHref,
  serializeProjectCriteria,
  serializePropertyCriteria,
} from "./criteria";

const parse = (qs: string) => parsePropertyCriteria(new URLSearchParams(qs));

describe("property search criteria ↔ URL", () => {
  it("falls back to defaults for an empty or invalid query string", () => {
    expect(parse("")).toEqual(defaultPropertyCriteria());
    const c = parse("intent=lease&type=castle&sort=random&page=-3&per=7&view=globe");
    expect(c.intent).toBe("buy");
    expect(c.category).toBe("homes");
    expect(c.sort).toBe("latest");
    expect(c.page).toBe(1);
    expect(c.perPage).toBe(9);
    expect(c.view).toBe("list");
  });

  it("reads repeated keys as multi-value filters and de-duplicates them", () => {
    const c = parse("bhk=2+BHK&bhk=3+BHK&bhk=2+BHK&loc=Worli&loc=Powai");
    expect(c.bhk).toEqual(["2 BHK", "3 BHK"]);
    expect(c.localities).toEqual(["Worli", "Powai"]);
  });

  it("round-trips every field through the URL", () => {
    const original = defaultPropertyCriteria({
      city: "Bengaluru",
      intent: "rent",
      category: "homes",
      q: "Prestige Lakeside",
      localities: ["Whitefield"],
      unitTypes: ["Apartment"],
      bhk: ["2 BHK"],
      furnishing: ["Semi Furnished"],
      bathrooms: ["2"],
      parking: ["1"],
      media: ["Photo"],
      facing: ["West"],
      budgetMin: 25_000,
      budgetMax: 1_00_000,
      areaMin: 500,
      areaMax: 1_000,
      sort: "price-asc",
      page: 2,
      perPage: 18,
      view: "map",
    });
    expect(parsePropertyCriteria(serializePropertyCriteria(original))).toEqual(original);
  });

  it("omits defaults so shared URLs stay short", () => {
    const qs = serializePropertyCriteria(defaultPropertyCriteria()).toString();
    expect(qs).toBe("city=Mumbai&intent=buy&type=homes");
  });

  it("swaps an inverted budget range instead of matching nothing", () => {
    const c = parse("min=50000000&max=10000000");
    expect(c.budgetMin).toBe(10_000_000);
    expect(c.budgetMax).toBe(50_000_000);
  });

  it("reads area bands from areaMin / areaMax, ignores junk and swaps an inverted range", () => {
    expect(parse("areaMin=1000&areaMax=2000")).toMatchObject({ areaMin: 1000, areaMax: 2000 });
    expect(parse("areaMin=abc&areaMax=-5")).toMatchObject({ areaMin: undefined, areaMax: undefined });
    expect(parse("areaMin=5000&areaMax=3000")).toMatchObject({ areaMin: 3000, areaMax: 5000 });
    expect(propertySearchHref({ category: "offices", areaMin: 10_000 })).toBe(
      "/properties?city=Mumbai&intent=buy&type=offices&areaMin=10000",
    );
    expect(countActiveFilters(parse("areaMin=500&areaMax=1000"))).toBe(1);
  });

  it("labels area ranges with the prototype's band names", () => {
    expect(areaRangeLabel(500, 1_000)).toBe("500 – 1,000 sq ft");
    expect(areaRangeLabel(undefined, 500)).toBe("Below 500 sq ft");
    expect(areaRangeLabel(10_000, undefined)).toBe("Above 10,000 sq ft");
    expect(areaRangeLabel(2_000, 3_000)).toBe("2,000 – 3,000 sq ft");
  });

  it("counts active refinements but not city, intent, sort or paging", () => {
    expect(countActiveFilters(parse("city=Pune&sort=price-asc&page=3"))).toBe(0);
    expect(countActiveFilters(parse("bhk=2+BHK&bhk=3+BHK&media=Video&min=100"))).toBe(4);
  });

  it("builds links that land on matching search pages", () => {
    expect(propertySearchHref({ city: "Mumbai", localities: ["Worli"] })).toBe(
      "/properties?city=Mumbai&intent=buy&type=homes&loc=Worli",
    );
  });
});

describe("project search criteria ↔ URL", () => {
  it("drops unknown statuses and non-year values", () => {
    const c = parseProjectCriteria(new URLSearchParams("status=uc&status=sold&year=2028&year=soon"));
    expect(c.status).toEqual(["uc"]);
    expect(c.years).toEqual([2028]);
  });

  it("round-trips through the URL", () => {
    const c = parseProjectCriteria(new URLSearchParams("city=Mumbai&q=Oberoi&status=rtm&loc=Worli&budget=luxury&view=Sea+View&year=2027&page=2"));
    expect(parseProjectCriteria(serializeProjectCriteria(c))).toEqual(c);
  });
});
