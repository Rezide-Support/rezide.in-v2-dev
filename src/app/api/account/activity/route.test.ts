import { beforeEach, describe, expect, it, vi } from "vitest";

const getActivity = vi.hoisted(() => vi.fn());
vi.mock("@/services/activity", () => ({ getActivity }));

import { GET } from "./route";

describe("GET /api/account/activity", () => {
  beforeEach(() => getActivity.mockReset());

  it("maps a valid activity request for the supplied session user", async () => {
    const items = [{ kind: "property", propertyId: "listing-1" }];
    getActivity.mockResolvedValue(items);
    const response = await GET(new Request("http://localhost/api/account/activity?tab=viewed&userId=507f1f77bcf86cd799439011"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual(items);
    expect(getActivity).toHaveBeenCalledWith("viewed", { id: "507f1f77bcf86cd799439011", phone: undefined });
  });

  it("rejects invalid tabs and identities without calling the backend", async () => {
    const invalidTab = await GET(new Request("http://localhost/api/account/activity?tab=other&userId=507f1f77bcf86cd799439011"));
    const invalidUser = await GET(new Request("http://localhost/api/account/activity?tab=viewed&userId=not-an-id"));

    expect(invalidTab.status).toBe(400);
    expect(invalidUser.status).toBe(400);
    expect(getActivity).not.toHaveBeenCalled();
  });

  it("requires a phone number for shared and rejected lists", async () => {
    const response = await GET(new Request("http://localhost/api/account/activity?tab=shared&userId=507f1f77bcf86cd799439011"));

    expect(response.status).toBe(400);
    expect(getActivity).not.toHaveBeenCalled();
  });
});
