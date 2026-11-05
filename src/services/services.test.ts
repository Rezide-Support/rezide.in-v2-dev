import { describe, expect, it } from "vitest";
import { offerRow, ownerListingCard, ownerTotals, visitRow } from "@/features/account/presenters";
import { fetchOffers, fetchOwnerListings, fetchVisits } from "@/services/account";
import { fetchPropertyStats } from "@/services/catalog";
import { createContact, fetchAssociableProjects, fetchAssociableUnits } from "@/services/dashboard";
import { requestCallback, requestTrial } from "@/services/mutations";

/* Listing search, detail, filter counts and groups are live: see src/services/properties.test.ts. */
describe("catalogue service contract (mock)", () => {
  it("reads the stats category from `type`, like the search", async () => {
    const homes = await fetchPropertyStats({ city: "Mumbai", intent: "buy", category: "homes" });
    const offices = await fetchPropertyStats({ city: "Mumbai", intent: "buy", category: "offices" });
    expect(homes.total).toBeGreaterThan(0);
    expect(homes.total).not.toBe(offices.total);
  });

});

describe("account service contract (mock)", () => {
  it("returns raw records that the presenters format", async () => {
    const [visits, offers, listings] = await Promise.all([fetchVisits("seeker"), fetchOffers("owner"), fetchOwnerListings()]);
    expect(visits[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof offers[0].amount).toBe("number");
    expect(visitRow(visits[1], "seeker")).toMatchObject({
      day: "23",
      month: "OCT",
      subtitle: "Worli · Video tour with AssetPro Investment & Realty · 7:30 PM",
      value: "Video tour",
      status: "Requested",
      tone: "warm",
    });
    expect(offerRow(offers[0], "owner")).toMatchObject({ value: "₹ 8.85 Cr", status: "New offer", subtitle: "From Ananya Desai · via Skyline Realty" });
    expect(ownerListingCard(listings[0])).toMatchObject({ status: "Live", cta: "View Offers", intentLabel: "Home · For Sale", stats: { views: "1,284" } });
    expect(ownerListingCard(listings[1])).toMatchObject({ status: "Under review", cta: "View Status", stats: { views: "—" } });
    expect(ownerTotals(listings)).toEqual({ listings: 4, views: 1926, visits: 11, offers: 2 });
  });
});

describe("write endpoints return field errors", () => {
  it("callbacks, trial requests and CRM contacts", async () => {
    await expect(requestCallback({ firstName: "", mobile: "1" })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { firstName: expect.any(String), mobile: expect.any(String) },
    });
    await expect(
      requestTrial({ mobile: "9820012345", firstName: "A", lastName: "B", firm: "", reraId: "", city: "Mumbai", membership: "nar", associations: [] }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { firm: expect.any(String), reraId: expect.any(String) } });
    await expect(createContact({ firstName: "A", mobile: "123" })).rejects.toMatchObject({ status: 422, fieldErrors: { mobile: expect.any(String) } });
  });
});

describe("dashboard associate-property endpoints", () => {
  it("filters projects and lists units per tower", async () => {
    const projects = await fetchAssociableProjects({ propertyType: "Residential", unitType: "Penthouse" });
    expect(projects.map((p) => p.id)).toEqual(["osg", "oe"]);
    expect(await fetchAssociableProjects({ propertyType: "Residential", unitType: "Apartment", q: "sunteck" })).toHaveLength(1);
    expect((await fetchAssociableUnits("osg", "G")).length).toBeGreaterThan(0);
    await expect(fetchAssociableUnits("osg", "Z")).rejects.toMatchObject({ status: 422 });
    await expect(fetchAssociableUnits("missing", "A")).rejects.toMatchObject({ status: 404 });
  });
});
