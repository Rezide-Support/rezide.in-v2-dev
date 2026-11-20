import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { fetchShortlistIds, getActivity, recordView, setShortlisted, toActivityItems } from "@/services/activity";

/* The Rezide backend's activity endpoints, answered by a test double. Shapes follow rezide.in's use of them. */

const USER = { id: "u1", phone: "9820012345" };
const listing = (id: string, purpose = "sale") => ({ _id: id, commercial_details: { property_purpose: purpose, property_price: 1000 } });

describe("toActivityItems", () => {
  it("lists newest first, once per listing, by the day in India", () => {
    const items = toActivityItems([
      { listing: listing("a"), timestamp: "2026-11-01T10:00:00Z" },
      { listing: listing("b"), timestamp: "2026-11-02T19:00:00Z" },
      { listing: listing("a"), timestamp: "2026-11-03T10:00:00Z" },
    ]);
    expect(items.map((i) => [i.kind === "property" ? i.propertyId : i.projectId, i.date])).toEqual([
      ["a", "2026-11-03"],
      // 19:00 UTC is already the next day in India.
      ["b", "2026-11-03"],
    ]);
  });

  it("leaves out project rows, removed listings and undated rows", () => {
    expect(toActivityItems([{ listing: null, timestamp: "2026-11-01T10:00:00Z" }, { timestamp: "2026-11-01T10:00:00Z" }, { listing: listing("a") }])).toEqual([]);
  });

  it("never carries a withheld price", () => {
    const hidden = { ...listing("a"), commercial_details: { property_purpose: "sale", property_price: 5000, priceHide: true } };
    const [item] = toActivityItems([{ listing: hidden, timestamp: "2026-11-01T10:00:00Z" }]);
    expect(item.kind).toBe("property");
    if (item.kind !== "property") throw new Error("Expected property activity.");
    expect(item.property.price).toBe(0);
    expect(JSON.stringify(item)).not.toContain("5000");
  });

  it("maps project activity into project items", () => {
    const [item] = toActivityItems([{
      type: "project",
      project: { _id: "p1", project_name: "Project One", developer_name: "Developer", city: "Mumbai", locality: "Worli" },
      timestamp: "2026-11-01T10:00:00Z",
    }]);
    expect(item).toMatchObject({ kind: "project", projectId: "p1", date: "2026-11-01", project: { name: "Project One" } });
  });
});

describe("activity endpoints", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  it("reads viewed and shortlisted rows by user", async () => {
    const row = { listing: listing("a"), timestamp: "2026-11-01T10:00:00Z" };
    for (const type of ["sale", "rent", "project"]) {
      backend.onGet("/user/statistic/last/visit/u1", { params: { type, page: 1, pageSize: 24 } }).reply(200, { result: { visits: type === "sale" ? [row] : [] } });
      backend.onGet("/shortlist/user/statistic/u1", { params: { type, page: 1, pageSize: 24 } }).reply(200, { result: { shortlist: type === "sale" ? [row] : [] } });
    }

    await expect(getActivity("viewed", USER)).resolves.toMatchObject([{ kind: "property", propertyId: "a" }]);
    await expect(getActivity("shortlisted", USER)).resolves.toMatchObject([{ kind: "property", propertyId: "a" }]);
  });

  it("requests and returns project activity separately", async () => {
    backend.onGet("/user/statistic/last/visit/u1", { params: { type: "sale", page: 1, pageSize: 24 } }).reply(200, { result: { visits: [] } });
    backend.onGet("/user/statistic/last/visit/u1", { params: { type: "rent", page: 1, pageSize: 24 } }).reply(200, { result: { visits: [] } });
    backend.onGet("/user/statistic/last/visit/u1", { params: { type: "project", page: 1, pageSize: 24 } }).reply(200, {
      result: { visits: [{
        type: "project",
        project: { _id: "p1", project_name: "Project One", developer_name: "Developer", city: "Mumbai", locality: "Worli" },
        timestamp: "2026-11-01T10:00:00Z",
      }] },
    });

    await expect(getActivity("viewed", USER)).resolves.toMatchObject([{ kind: "project", projectId: "p1" }]);
  });

  it("loads a project by id when a project activity row is not populated", async () => {
    const projectId = "507f1f77bcf86cd799439012";
    for (const type of ["sale", "rent"]) {
      backend.onGet("/user/statistic/last/visit/u1", { params: { type, page: 1, pageSize: 24 } }).reply(200, { result: { visits: [] } });
    }
    backend.onGet("/user/statistic/last/visit/u1", { params: { type: "project", page: 1, pageSize: 24 } }).reply(200, {
      result: { visits: [{ type: "project", listing_id: projectId, timestamp: "2026-11-01T10:00:00Z" }] },
    });
    backend.onPost("/Inventory/project/filter/new").reply(200, {
      data: [{ _id: projectId, project_name: "Project One", developer_name: "Developer", city: "Mumbai", locality: "Worli" }],
    });

    await expect(getActivity("viewed", USER)).resolves.toMatchObject([{ kind: "project", projectId, project: { name: "Project One" } }]);
  });

  it("reads shared and rejected rows by phone, and skips a listing that can't be loaded", async () => {
    backend.onGet("/share/listing/user/shared", { params: { mobile_no: "919820012345" } }).reply(200, {
      data: [
        { listing_id: { _id: "a" }, createdAt: "2026-11-01T10:00:00Z" },
        { listing_id: { _id: "gone" }, createdAt: "2026-11-02T10:00:00Z" },
      ],
    });
    backend.onGet("/share/listing/user/shared", { params: { mobile_no: "919820012345", status: "reject" } }).reply(200, { data: [] });
    backend.onGet("/inventory/Listing/a").reply(200, listing("a"));
    backend.onGet("/inventory/Listing/gone").reply(404);

    await expect(getActivity("shared", USER)).resolves.toMatchObject([{ propertyId: "a", date: "2026-11-01" }]);
    await expect(getActivity("rejected", USER)).resolves.toEqual([]);
    await expect(getActivity("shared", { id: "u1" })).resolves.toEqual([]);
  });

  it("reads which listings are shortlisted", async () => {
    backend.onGet("/shortlist/user/statistic/u1").reply(200, { result: { shortlist: [{ listing_id: "a" }, { project_id: { _id: "p" } }] } });
    await expect(fetchShortlistIds("u1")).resolves.toEqual(["a", "p"]);
  });

  it("adds and removes with the listing's type, as rezide.in does", async () => {
    backend.onPost("/shortlist/user/statistic/u1").reply(200, { status: "success" });
    await setShortlisted("u1", "a", "buy", true);
    await setShortlisted("u1", "a", "rent", false);
    expect(backend.history.post.map((r) => r.params)).toEqual([
      { listing_id: "a", action: "add", type: "sale" },
      { listing_id: "a", action: "remove", type: "rent" },
    ]);
  });

  it("fails when the backend answers without updating the shortlist", async () => {
    backend.onPost("/shortlist/user/statistic/u1").reply(200, { status: "failed" });
    await expect(setShortlisted("u1", "a", "buy", true)).rejects.toThrow();
  });

  it("records a view with the listing's type", async () => {
    backend.onPost("/user/statistic/last/visit/u1").reply(200, {});
    await recordView("u1", "a", "rent");
    await recordView("u1", "p", "project");
    expect(backend.history.post[0].params).toEqual({ listing_id: "a", type: "rent" });
    expect(backend.history.post[1].params).toEqual({ listing_id: "p", type: "project" });
  });
});
