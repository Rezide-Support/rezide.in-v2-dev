import { describe, expect, it } from "vitest";
import {
  areaRangeLabel,
  countActiveFilters,
  defaultProjectCriteria,
  defaultPropertyCriteria,
  parseProjectCriteria,
  parsePropertyCriteria,
  propertySearchHref,
  serializeProjectCriteria,
  serializePropertyCriteria,
  sortOptionsFor,
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

  it("reads the previous sale-filter URL names and comma-separated selections", () => {
    const c = parse("searchQuery=Prestige&project_type=Apartment,Villa&bhk=64de062c4f5f0ae6e602328a,656730d08eb9d2295cb750ed&building_type=Standalone,Gated%20Amenities&exit_direction=E,NE&minBudget=10000000&maxArea=5000");
    expect(c).toMatchObject({
      q: "Prestige",
      unitTypes: ["Apartment", "Villa"],
      bhk: ["2 BHK", "5+ BHK"],
      buildingTypes: ["Standalone", "Gated Amenities"],
      facing: ["E", "NE"],
      budgetMin: 10_000_000,
      areaMax: 5_000,
    });
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
      furnishing: ["650eb6b2a1a78c56b3fac96e"],
      bathrooms: ["2"],
      parking: ["1"],
      media: ["Photo"],
      facing: ["W"],
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

  it("offers rate per sq ft sorts for sale only, as rezide.in does", () => {
    expect(sortOptionsFor("buy").map((o) => o.value)).toEqual(["latest", "price-asc", "price-desc", "rate-asc", "rate-desc", "area-asc", "area-desc"]);
    expect(sortOptionsFor("rent").map((o) => o.value)).toEqual(["latest", "price-asc", "price-desc", "area-asc", "area-desc"]);
    expect(parse("sort=rate-desc").sort).toBe("rate-desc");
    expect(parse("intent=rent&sort=rate-desc").sort).toBe("latest");
    expect(parse("intent=rent&sort=area-asc").sort).toBe("area-asc");
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
      "/properties?city=Mumbai&intent=buy&type=offices&minArea=10000",
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

  it("serializes sale filters using the previous API-facing names", () => {
    const criteria = defaultPropertyCriteria({
      q: "Example project",
      unitTypes: ["Apartment", "Villa"],
      bhk: ["2 BHK", "5+ BHK"],
      furnishing: ["650eb6b2a1a78c56b3fac96e"],
      bathrooms: ["2"],
      availability: ["659302fcd10433fa2dbb7c8a"],
      budgetMin: 10_000_000,
    });
    const params = serializePropertyCriteria(criteria);
    expect(params.get("searchQuery")).toBe("Example project");
    expect(params.get("project_type")).toBe("Apartment,Villa");
    expect(params.get("bhk")).toBe("64de062c4f5f0ae6e602328a,656730d08eb9d2295cb750ed");
    expect(params.get("furnishing")).toBe("650eb6b2a1a78c56b3fac96e");
    expect(params.get("no_of_bathrooms")).toBe("2");
    expect(params.get("availability")).toBe("659302fcd10433fa2dbb7c8a");
    expect(params.get("minBudget")).toBe("10000000");
    expect(parsePropertyCriteria(params)).toEqual(criteria);
  });

  it("serializes rent filters with legacy names, master ids, and the rent 5+ BHK id", () => {
    const criteria = defaultPropertyCriteria({
      intent: "rent",
      unitTypes: ["Apartment", "Pent House"],
      bhk: ["5+ BHK", "Studio"],
      furnishing: ["650eb6b2a1a78c56b3fac96e"],
      bathrooms: ["2", ">"],
      parking: ["1"],
      media: ["Video"],
      facing: ["E"],
      availability: ["0", "15", "6593031bd10433fa2dbb7c92"],
      buildingTypes: ["Gated Amenities"],
      balconies: ["1"],
      buildingAges: ["1 - 3 years"],
      preferredApartment: ["7"],
      floorRanges: ["1 - 5"],
      timeOnRezide: ["AnyTime"],
      budgetMin: 25_000,
      budgetMax: 100_000,
      areaMin: 100,
      areaMax: 500,
    });
    const params = serializePropertyCriteria(criteria);
    expect(params.get("project_type")).toBe("Apartment,Pent House");
    expect(params.get("bhk")).toBe("656730d08eb9d2295cb750ed,650eb55ea1a78c56b3fac910");
    expect(params.get("no_of_bathrooms")).toBe("2,>");
    expect(params.get("availability")).toBe("0,15,6593031bd10433fa2dbb7c92");
    expect(params.get("time_on_rezide")).toBe("AnyTime");
    expect(params.get("minBudget")).toBe("25000");
    expect(params.get("maxArea")).toBe("500");
    expect(parsePropertyCriteria(params)).toEqual(criteria);
  });
});

describe("project search criteria ↔ URL", () => {
  it("drops unknown statuses and non-year values", () => {
    const c = parseProjectCriteria(new URLSearchParams("status=uc&status=sold&year=2028&year=soon"));
    expect(c.status).toEqual(["uc"]);
    expect(c.years).toEqual([2028]);
  });

  it("round-trips through the URL", () => {
    const c = parseProjectCriteria(new URLSearchParams("city=Mumbai&q=Oberoi&status=rtm&loc=Worli&budget=luxury&view=Sea+View&year=2027&sort=plot-desc&page=2"));
    expect(c.sort).toBe("plot-desc");
    expect(parseProjectCriteria(serializeProjectCriteria(c))).toEqual(c);
  });

  it("round-trips the Filters drawer (type, unit, BHK, area, video / VR)", () => {
    const c = parseProjectCriteria(new URLSearchParams("ptype=650c6732a3021fab1835c045&unit=Villa&bhk=2+BHK&bhk=3+BHK&amin=500&amax=2000&with=VR+Tour"));
    expect(c).toMatchObject({ projectTypes: ["650c6732a3021fab1835c045"], unitTypes: ["Villa"], bhk: ["2 BHK", "3 BHK"], areaMin: 500, areaMax: 2000, media: ["VR Tour"] });
    expect(parseProjectCriteria(serializeProjectCriteria(c))).toEqual(c);
    expect(parseProjectCriteria(new URLSearchParams("amin=abc&amax=-5"))).toMatchObject({ areaMin: undefined, areaMax: undefined });
  });

  it("reads the project sort, falling back to Latest", () => {
    expect(parseProjectCriteria(new URLSearchParams("sort=yield-asc")).sort).toBe("yield-asc");
    expect(parseProjectCriteria(new URLSearchParams("sort=junk")).sort).toBe("latest");
    expect(serializeProjectCriteria(defaultProjectCriteria()).has("sort")).toBe(false);
  });
});
