import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session";
import { Transactions } from "./transactions";

const renderTable = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Transactions title="Lodha Bellagio" path="/properties/l1" projectId="p1" />
    </QueryClientProvider>,
  );

describe("Transactions", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    useSessionStore.setState({ session: null });
    backend = new MockAdapter(api);
    backend.onPost("/transaction/filter").reply(200, {
      result_count: 1,
      data: [
        {
          _id: "t1",
          area: 845,
          bhk: "2.5 BHK",
          property_details: { tower: { label: "D" }, unit_no: { label: "2103" } },
          transaction_details: { transaction_date: "2026-08-21T00:00:00.000Z", rate_per_month: 81066480, security_deposit: 49994719, rpsf: 91600 },
        },
      ],
    });
  });
  afterEach(() => backend.restore());

  it("keeps records behind sign-in and doesn't fetch them for signed-out visitors", () => {
    renderTable();
    expect(screen.getByRole("link", { name: "Login to view" })).toHaveAttribute("href", "/login?next=%2Fproperties%2Fl1");
    expect(backend.history.post).toHaveLength(0);
  });

  it("shows the project's real transactions when signed in", async () => {
    useSessionStore.getState().signIn({
      user: { id: "u1", role: "seeker", firstName: "Asha", lastName: "Rao", phone: "9820012345" },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    renderTable();
    expect(await screen.findByRole("cell", { name: "2103" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Aug 21, 2026" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "₹ 8.11 Cr" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "₹ 91,600" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login to view" })).toBeNull();
  });
});
