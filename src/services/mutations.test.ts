import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { sendListingEnquiry, submitListing, toListingLead } from "@/services/mutations";

describe("submitListing", () => {
  let backend: MockAdapter;
  const lister = { firstName: "Asha", lastName: "Rao", phone: "9820012345", email: "asha@example.com" };
  const draft = { intent: "rent", locality: "Lower Parel", projectName: "Lodha Park", unitNo: "1702", city: "Mumbai", price: "150000" } as const;

  beforeEach(() => {
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  it("sends rezide.in's lead, with the wizard's main answers", async () => {
    backend.onPost("/lead/developer-contact").reply(200, {});
    await submitListing(draft, lister);
    expect(JSON.parse(backend.history.post[0].data)).toEqual({
      type: "listProperty",
      fullName: "Asha Rao",
      mobile: "9820012345",
      email: "asha@example.com",
      locality: "Lower Parel",
      projectName: "Lodha Park",
      flatNo: "1702",
      lookingFor: "List property for rent",
      source: "Rezide.in property listing form",
      city: "Mumbai",
      price: "150000",
    });
  });

  it("words a sale, and sends blanks for what a listing doesn't have", () => {
    expect(toListingLead({ intent: "sell" }, { firstName: "Asha", lastName: "", phone: "9820012345" })).toMatchObject({
      fullName: "Asha",
      email: "",
      locality: "",
      projectName: "",
      flatNo: "",
      lookingFor: "List property for sale",
    });
  });

  it("fails when the backend refuses", async () => {
    backend.onPost("/lead/developer-contact").reply(500, { message: "No" });
    await expect(submitListing(draft, lister)).rejects.toThrow();
  });
});

describe("sendListingEnquiry", () => {
  let backend: MockAdapter;
  const URL = "/api/properties/l1/enquiry";
  const enquiry = { name: "Asha Rao", phone: "9820012345", firmId: "f1", brokerId: "b1", listingId: "l1", enquiryType: "I'm interested" };

  beforeEach(() => {
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  it("posts the enquiry through the same-origin listing proxy", async () => {
    backend.onPost(URL).reply(200, { message: "Thanks" });

    await expect(sendListingEnquiry(enquiry)).resolves.toEqual({ message: "Thanks" });
    expect(JSON.parse(backend.history.post[0].data)).toEqual({
      name: "Asha Rao",
      phone: "9820012345",
      enquiryType: "I'm interested",
    });
  });

  it("adds notes when there are some", async () => {
    backend.onPost(URL).reply(200, {});
    await sendListingEnquiry({ ...enquiry, notes: "Offer: ₹ 1,000." });
    expect(JSON.parse(backend.history.post[0].data).notes).toBe("Offer: ₹ 1,000.");
  });

  it("fails when the backend refuses", async () => {
    backend.onPost(URL).reply(500, { message: "No" });
    await expect(sendListingEnquiry(enquiry)).rejects.toThrow();
  });
});
