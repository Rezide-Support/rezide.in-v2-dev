import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { clearListingIndex, listingIndex, warmListingIndex } from "@/services/listing-index";

const URL = "/inventory/Listing/mobile/all";
const page = (...ids: string[]) => ({ data: ids.map((_id) => ({ _id, listing_type: "home" })), result_sale: ids.length, result_rent: 0 });
const MIN = 60_000;
/** Lets pending promise callbacks (a background refresh) run. */
const settle = () => new Promise((r) => setTimeout(r, 0));

describe("city listing index", () => {
  let backend: MockAdapter;
  let calls = 0;
  beforeEach(() => {
    clearListingIndex();
    calls = 0;
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  const ids = async (now: number) => (await listingIndex("Mumbai", "buy", "homes", now)).map((p) => p.id);

  it("reuses fresh listings without asking the backend again", async () => {
    backend.onPost(URL).reply(() => (calls++, [200, page("a")]));
    expect(await ids(0)).toEqual(["a"]);
    expect(await ids(9 * MIN)).toEqual(["a"]);
    expect(calls).toBe(1);
  });

  it("serves older listings at once and refreshes them in the background", async () => {
    let next = page("a");
    backend.onPost(URL).reply(() => (calls++, [200, next]));
    await ids(0);
    next = page("b");
    // Past the 10-minute freshness: still answers with what it has, and starts one refresh.
    expect(await ids(11 * MIN)).toEqual(["a"]);
    expect(await ids(11 * MIN)).toEqual(["a"]);
    await settle();
    expect(calls).toBe(2);
    expect(await ids(12 * MIN)).toEqual(["b"]);
  });

  it("keeps the older listings when a refresh fails", async () => {
    backend.onPost(URL).replyOnce(200, page("a")).onPost(URL).replyOnce(500).onPost(URL).reply(200, page("c"));
    await ids(0);
    expect(await ids(11 * MIN)).toEqual(["a"]);
    await settle();
    expect(await ids(11 * MIN)).toEqual(["a"]);
    await settle();
    expect(await ids(12 * MIN)).toEqual(["c"]);
  });

  it("waits for a new load when the listings are over an hour old", async () => {
    let next = page("a");
    backend.onPost(URL).reply(() => [200, next]);
    await ids(0);
    next = page("b");
    expect(await ids(61 * MIN)).toEqual(["b"]);
  });

  it("warms the index without waiting, and the next request reuses that load", async () => {
    backend.onPost(URL).reply(() => (calls++, [200, page("a")]));
    warmListingIndex("Mumbai", "buy", "homes");
    expect((await listingIndex("Mumbai", "buy", "homes")).map((p) => p.id)).toEqual(["a"]);
    expect(calls).toBe(1);
  });
});
