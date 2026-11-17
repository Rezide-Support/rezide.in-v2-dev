import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { getDeveloperContact } from "@/services/developers";
import { sendDeveloperContactLead } from "@/services/mutations";
import { toTransaction } from "@/services/transactions";

const ID = "65116bbd32a52c26604a9511";

describe("Contact Builder", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  it("returns the developer's public contact details and never its bank details", async () => {
    backend.onGet(`/repository/developer/${ID}`).reply(200, {
      general_information: { developer_name: "Oberoi Realty", legal_name: "Oberoi Realty Ltd", description: "About.", cin: "L45200MH1998PLC114818", estd_year: "1998" },
      contact_details: {
        contact: [{ name: "Sales", contact_number: "02266773333", email_id: "sales@example.com" }, { name: "Nobody" }],
        address: [
          {
            address_type: { label: "Head Office" },
            line_1: "Commerz, 3rd Floor",
            line_2: "",
            locality: { label: "Yashodham" },
            city: { label: "Mumbai" },
            state: { label: "Maharashtra" },
            country: { label: "India" },
            pincode: "400063",
          },
        ],
      },
      account_details: { bank_name: "BANKSECRET", account_number: "123456789" },
    });
    const contact = await getDeveloperContact(ID);
    expect(contact).toEqual({
      name: "Oberoi Realty",
      legalName: "Oberoi Realty Ltd",
      description: "About.",
      cin: "L45200MH1998PLC114818",
      established: "1998",
      contacts: [{ name: "Sales", phone: "02266773333", email: "sales@example.com" }],
      office: { type: "Head Office", lines: ["Commerz, 3rd Floor"], place: "Yashodham, Mumbai, Maharashtra, India, 400063" },
    });
    expect(JSON.stringify(contact)).not.toMatch(/BANKSECRET|123456789/);
  });

  it("rejects an id that isn't a backend id without asking the backend", async () => {
    await expect(getDeveloperContact("../users")).rejects.toMatchObject({ status: 404 });
    expect(backend.history.get).toHaveLength(0);
  });

  it("sends rezide.in's lead body, without a budget or buyer questions for a broker", async () => {
    backend.onPost("/lead/developer-contact").reply(200, {});
    const base = { name: " Asha ", mobile: "9820012345", email: "a@b.in", developerName: "Oberoi Realty", projectName: "Oberoi Esquire", location: "Goregaon, Mumbai", pageUrl: "https://x/projects/1" };
    await sendDeveloperContactLead({ ...base, isPropertyBroker: false, reasonToBuy: "Self Use", needPropertyIn: "Less than 3 months", homeLoanInterest: true, siteVisitInterest: false, budgetMin: 5, budgetMax: 9 });
    await sendDeveloperContactLead({ ...base, isPropertyBroker: true, reasonToBuy: "Investment", homeLoanInterest: true, budgetMin: 5 });
    const [buyer, broker] = backend.history.post.map((r) => JSON.parse(r.data));
    expect(buyer).toMatchObject({ name: "Asha", isPropertyBroker: "No", reasonToBuy: "Self Use", needPropertyIn: "Less than 3 months", homeLoanInterest: true, siteVisitInterest: false, budgetMin: 5, budgetMax: 9, source: "Rezide.in contact widget" });
    expect(broker).toMatchObject({ isPropertyBroker: "Yes", reasonToBuy: "", needPropertyIn: "", homeLoanInterest: false });
    expect(broker).not.toHaveProperty("budgetMin");
  });
});

describe("transactions", () => {
  it("reads rental amounts the backend sends as text", () => {
    const rent = toTransaction({ area: 2053, bhk: "4 BHK", transaction_details: { transaction_date: "2026-10-21T00:00:00.000Z", rate_per_month: "490891", security_deposit: "1,100,000", rpsf: 239 } }, "rent");
    expect(rent).toMatchObject({ monthlyRent: 490891, securityDeposit: 1100000, ratePerSqft: 239, areaSqft: 2053, config: "4 BHK" });
    const sale = toTransaction({ transaction_details: { rate_per_month: 56100000, security_deposit: 44515823.74, rpsf: "41038" } }, "sale");
    expect(sale).toMatchObject({ value: 56100000, readyReckoner: 44515823.74, ratePerSqft: 41038 });
  });
});
