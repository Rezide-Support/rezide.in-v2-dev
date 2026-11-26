import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { defaultPropertyCriteria } from "./criteria";
import { FilterDrawer } from "./filter-drawer";
import { BuildingFilterDrawer } from "./building-filter-drawer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MockAdapter from "axios-mock-adapter";
import { api } from "@/lib/api/client";
import { getQueryClient } from "@/lib/query-client";

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
});

describe("FilterDrawer dropdowns", () => {
  it("shows prefetched localities immediately before facet counts arrive", () => {
    render(<FilterDrawer open onOpenChange={vi.fn()} criteria={defaultPropertyCriteria({ city: "Mumbai" })} update={vi.fn()} total={10} pending={false} prefetchedLocalities={["Juhu", "Parel"]} />);
    expect(screen.getByRole("button", { name: "Juhu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Parel" })).toBeInTheDocument();
  });

  it("uses IDs for locality filters, clears dependent IDs, and has no locality dropdown", async () => {
    getQueryClient().clear();
    const backend = new MockAdapter(api);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    try {
      backend.onGet("/master/city/search").reply(200, { data: [{ _id: "city-id", label: "Mumbai" }] });
      backend.onGet("/master/region").reply(200, { data: [{ _id: "region-id", name: "South Mumbai" }] });
      backend.onPost("/repository/sub_region/regions", { regions: ["region-id"] }).reply(200, [{ _id: "sub-id", name: "Parel" }]);
      const update = vi.fn();
      render(<QueryClientProvider client={client}><BuildingFilterDrawer localities open onOpenChange={vi.fn()} city="Mumbai" selected={{ region: ["region-id"], sub_region: ["sub-id"], locality: [] }} update={update} total={12} /></QueryClientProvider>);
      expect(await screen.findByRole("button", { name: "Parel" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.queryByText("Locality", { selector: "legend" })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Parel" }));
      expect(update).toHaveBeenLastCalledWith({ sub_region: [], locality: [] });
      await userEvent.click(screen.getByRole("button", { name: "South Mumbai" }));
      expect(update).toHaveBeenLastCalledWith({ region: [], sub_region: [], locality: [] });
      expect(backend.history.post).toHaveLength(1);
      expect(backend.history.post[0].url).toBe("/repository/sub_region/regions");
    } finally { backend.restore(); client.clear(); getQueryClient().clear(); }
  });
  it("restores building geography IDs from URL names and clears children on a region change", async () => {
    getQueryClient().clear();
    const backend = new MockAdapter(api);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    try {
      backend.onGet("/master/city/search").reply(200, { data: [{ _id: "city-id", label: "Mumbai" }] });
      backend.onGet("/master/region", { params: { city: "city-id" } }).reply(200, { data: [{ _id: "region-id", name: "South Mumbai" }] });
      backend.onPost("/repository/sub_region/regions", { regions: ["region-id"] }).reply(200, [{ _id: "sub-id", name: "Parel" }]);
      backend.onPost("/repository/locality/sub-regions", { subRegions: ["sub-id"] }).reply(200, [{ _id: "locality-id", general_information: { locality_name: "Lalbaug" } }]);
      const update = vi.fn();
      render(<QueryClientProvider client={client}><BuildingFilterDrawer open onOpenChange={vi.fn()} city="Mumbai" selected={{ region: ["South Mumbai"], sub_region: ["Parel"], locality: ["Lalbaug"] }} update={update} total={3} /></QueryClientProvider>);
      expect(await screen.findByRole("button", { name: "Lalbaug" })).toHaveAttribute("aria-pressed", "true");
      expect(backend.history.post.map(request => JSON.parse(request.data))).toEqual([{ regions: ["region-id"] }, { subRegions: ["sub-id"] }]);
      await userEvent.click(screen.getByRole("button", { name: "South Mumbai" }));
      expect(update).toHaveBeenLastCalledWith({ region: [], sub_region: [], locality: [] });
      expect(screen.queryByText("Sale Filters")).not.toBeInTheDocument();
    } finally { backend.restore(); client.clear(); getQueryClient().clear(); }
  });
  it("keeps option and reset changes separate from the Show results apply action", async () => {
    const user = userEvent.setup();
    const draftUpdate = vi.fn();
    const apply = vi.fn();
    render(<FilterDrawer open onOpenChange={vi.fn()} criteria={defaultPropertyCriteria()} update={draftUpdate} onApply={apply} total={10} pending={false} prefetchedLocalities={["Juhu"]} />);
    await user.click(screen.getByRole("button", { name: "Juhu" }));
    expect(draftUpdate).toHaveBeenLastCalledWith({ localities: ["Juhu"] });
    expect(apply).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(apply).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Show 10 results" }));
    expect(apply).toHaveBeenCalledOnce();
  });

  it("uses the custom option panel and preserves numeric budget and area values", async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    render(
      <FilterDrawer
        open
        onOpenChange={vi.fn()}
        criteria={defaultPropertyCriteria({ city: "Mumbai" })}
        update={update}
        total={10}
        pending={false}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Minimum budget" }));
    expect(await screen.findByText("Select option")).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "₹1 Cr" }));
    expect(update).toHaveBeenLastCalledWith({ budgetMin: 10_000_000, budgetMax: undefined });

    await user.click(screen.getByRole("combobox", { name: "Minimum area" }));
    expect(await screen.findByText("Select option")).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "100 sq ft" }));
    expect(update).toHaveBeenLastCalledWith({ areaMin: 100, areaMax: undefined });
  });
});
