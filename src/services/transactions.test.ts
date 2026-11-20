import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { fetchTransactions, toTransaction, type BackendTransaction } from "@/services/transactions";

/* The Rezide backend's POST /transaction/filter, answered by a test double. Shapes follow live responses. */

const row = (over: Partial<BackendTransaction> = {}): BackendTransaction => ({
  _id: "t1",
  area: 845,
  bhk: "2.5 BHK",
  property_details: { tower: { label: "D" }, unit_no: { label: "2103" } },
  transaction_details: { transaction_date: "2026-08-21T00:00:00.000Z", rate_per_month: 81066480, security_deposit: 49994719.7, rpsf: 91600 },
  ...over,
});

describe("toTransaction", () => {
  it("reads a sale's value and ready reckoner from the fields rezide.in labels them with", () => {
    expect(toTransaction(row(), "sale")).toEqual({
      id: "t1",
      date: "2026-08-21T00:00:00.000Z",
      wing: "D",
      flat: "2103",
      config: "2.5 BHK",
      areaSqft: 845,
      ratePerSqft: 91600,
      value: 81066480,
      readyReckoner: 49994719.7,
    });
  });

  it("reads a rental's monthly rent and deposit", () => {
    const t = toTransaction(row({ transaction_details: { rate_per_month: 175000, security_deposit: 525000, rpsf: 150 } }), "rent");
    expect(t).toMatchObject({ monthlyRent: 175000, securityDeposit: 525000, ratePerSqft: 150 });
    expect(t.value).toBeUndefined();
  });

  it("leaves out empty values", () => {
    expect(toTransaction({ _id: "x", transaction_details: { rate_per_month: 0 } }, "sale")).toEqual({
      id: "x",
      date: undefined,
      wing: undefined,
      flat: undefined,
      config: undefined,
      areaSqft: undefined,
      ratePerSqft: undefined,
      value: 0,
      readyReckoner: undefined,
    });
  });
});

describe("fetchTransactions", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  it("asks for the project's latest five of one kind, as rezide.in does", async () => {
    backend.onPost("/transaction/filter", undefined).reply((config) => {
      expect(config.params).toEqual({ page: 1, pageSize: 5 });
      expect(JSON.parse(config.data)).toEqual({ projectIds: ["p1"], transaction_type: "Rental" });
      return [200, { result_count: 42, data: [row()] }];
    });
    await expect(fetchTransactions("p1", "rent")).resolves.toMatchObject({ total: 42, items: [{ id: "t1", monthlyRent: 81066480 }] });
  });
});
