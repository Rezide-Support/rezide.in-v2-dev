import { getQueryClient } from "@/lib/query-client";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import {
  cityLabel,
  fetchCities,
  fetchCityId,
  fetchRegionLocalities,
  fetchRegions,
  fetchSearchSuggestions,
  fetchSubRegionLocalities,
  fetchSubRegions,
  toBackendCity,
  toSuggestion,
} from "@/services/locations";

/* The Rezide backend's city master and typeahead, answered here by a test double. */

describe("city names", () => {
  it("shows the master's Bangalore as Bengaluru and sends Bangalore back", () => {
    expect(cityLabel("Bangalore")).toBe("Bengaluru");
    expect(toBackendCity("Bengaluru")).toBe("Bangalore");
    expect(cityLabel("Navi Mumbai")).toBe("Navi Mumbai");
    expect(toBackendCity("Mumbai")).toBe("Mumbai");
  });
});

describe("toSuggestion", () => {
  it("normalises the backend's source names", () => {
    expect(toSuggestion({ _id: "a", name: "Worli", source: "Sub Region", city: "Mumbai" })).toEqual({
      id: "a",
      name: "Worli",
      kind: "subRegion",
      city: "Mumbai",
    });
    expect(toSuggestion({ id: "b", label: "Lodha Park", source: "project" })).toMatchObject({ name: "Lodha Park", kind: "project" });
    expect(toSuggestion({ _id: "c", name: "Asha", source: "Agent" }).kind).toBe("realtor");
    expect(toSuggestion({ _id: "d", name: "X", source: "Landmark", city: "Bangalore" })).toMatchObject({ kind: "other", city: "Bengaluru" });
  });
});

describe("backend reads", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    getQueryClient().clear();
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  it("loads the whole city master once, as shown names without blanks or duplicates", async () => {
    backend
      .onGet("/master/city/search", { params: { page: 1, pageSize: 5000 } })
      .reply(200, { data: [{ label: "Mumbai" }, { label: "Bangalore" }, { label: "" }, { label: "Mumbai" }, { label: "Pune" }] });
    await expect(fetchCities()).resolves.toEqual(["Mumbai", "Bengaluru", "Pune"]);
  });

  it("asks for suggestions with the text in the path and the backend's city name", async () => {
    backend
      .onGet("/repository/locality/search/list/worli%2Fnaka", { params: { city: "Bangalore" } })
      .reply(200, { result: [{ _id: "1", name: "Worli Naka", source: "locality" }, { _id: "2", name: " ", source: "locality" }] });
    await expect(fetchSearchSuggestions(" worli/naka ", { city: "Bengaluru" })).resolves.toEqual([
      { id: "1", name: "Worli Naka", kind: "locality", city: undefined },
    ]);
  });

  it("searches realtors with the broker scope", async () => {
    backend.onGet("/repository/locality/search/list/asha/broker").reply(200, { result: [{ _id: "9", name: "Asha", source: "Broker" }] });
    await expect(fetchSearchSuggestions("asha", { scope: "broker" })).resolves.toMatchObject([{ kind: "realtor" }]);
  });

  it("finds a city's id by the master's name", async () => {
    backend.onGet("/master/city/search").reply(200, { data: [{ _id: "c1", label: "Mumbai" }, { _id: "c2", label: "Bangalore" }] });
    await expect(fetchCityId("Bengaluru")).resolves.toBe("c2");
    await expect(fetchCityId("Nowhere")).resolves.toBeNull();
  });

  it("resolves alternate city labels but never returns a city label as its ID", async () => {
    backend.onGet("/master/city/search").reply(200, { data: [{ _id: "c1", name: "Mumbai" }, { _id: "c2", value: "Pune" }, { value: "Unknown city" }] });
    await expect(fetchCityId("Mumbai")).resolves.toBe("c1");
    await expect(fetchCityId("Pune")).resolves.toBe("c2");
    await expect(fetchCityId("Unknown city")).resolves.toBeNull();
  });

  it("walks the tree with the same requests as rezide.in, A–Z and one row per name", async () => {
    backend.onGet("/master/region", { params: { city: "c1" } }).reply(200, { data: [{ _id: "r2", name: "South Mumbai" }, { _id: "r1", name: "Eastern Suburbs" }] });
    backend.onPost("/repository/sub_region/regions", { regions: ["r1"] }).reply(200, [{ _id: "s1", name: "Powai" }, { _id: "s2", name: "Powai " }, { name: "No id" }]);
    backend.onPost("/repository/locality/sub-regions", { subRegions: ["s1"] }).reply(200, [{ _id: "l1", general_information: { locality_name: "Tunga Village" } }, { _id: "l2" }]);

    await expect(fetchRegions("c1")).resolves.toEqual([{ id: "r1", name: "Eastern Suburbs" }, { id: "r2", name: "South Mumbai" }]);
    await expect(fetchSubRegions("r1")).resolves.toEqual([{ id: "s2", name: "Powai" }]);
    await expect(fetchSubRegionLocalities("s1")).resolves.toEqual([{ id: "l1", name: "Tunga Village" }]);
  });

  it("omits an unresolved city and preserves distinct region identities with the same name", async () => {
    backend.onGet("/master/region").reply(config => {
      expect(config.params).toBeUndefined();
      return [200, { data: [{ _id: "r2", name: "West" }, { _id: "r1", name: "East" }, { _id: "r3", name: "East" }] }];
    });
    await expect(fetchRegions()).resolves.toEqual([{ id: "r1", name: "East" }, { id: "r3", name: "East" }, { id: "r2", name: "West" }]);
  });

  it("loads a region's localities a page at a time, searched by name, as rezide.in's Location filter", async () => {
    backend
      .onGet("/repository/sub_region/by-region", { params: { region: "r1", page: 2, pageSize: 10, searchQuery: "and" } })
      .reply(200, { totalCount: 12, data: [{ _id: "s1", name: "Andheri West " }, { _id: "s2", name: "" }, { name: "No id" }] });
    await expect(fetchRegionLocalities("r1", "and", 2)).resolves.toEqual({ items: [{ id: "s1", name: "Andheri West" }], total: 12, page: 2 });
  });

  it("doesn't call the backend for an empty box", async () => {
    await expect(fetchSearchSuggestions("   ")).resolves.toEqual([]);
    expect(backend.history.get).toHaveLength(0);
  });
});

it("shares the city-master request between names and ID lookups",async()=>{
  const backend=new MockAdapter(api);getQueryClient().clear();
  backend.onGet('/master/city/search').reply(200,{data:[{_id:'c1',label:'Mumbai'},{_id:'c2',label:'Bangalore'}]});
  try {const[names,id]=await Promise.all([fetchCities(),fetchCityId('Bengaluru')]);expect(names).toContain('Bengaluru');expect(id).toBe('c2');expect(backend.history.get).toHaveLength(1)}finally{backend.restore();getQueryClient().clear()}
});
