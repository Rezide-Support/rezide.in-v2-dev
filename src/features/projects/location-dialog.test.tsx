import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { LocationDialog, MUMBAI_REGION_TABS } from "./location-dialog";

const URL = "/repository/sub_region/by-region";
const [western, eastern] = MUMBAI_REGION_TABS;

describe("projects Location dialog (as rezide.in's)", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
    backend.onGet(URL).reply((config) => {
      const { region, searchQuery } = config.params;
      if (region === western.id) {
        const names = ["Andheri East", "Andheri West", "Juhu"].filter((n) => n.toLowerCase().includes(String(searchQuery).toLowerCase()));
        return [200, { totalCount: names.length, data: names.map((name) => ({ _id: name, name })) }];
      }
      if (region === eastern.id) return [200, { totalCount: 1, data: [{ _id: "p", name: "Powai" }] }];
      return [200, { totalCount: 0, data: [] }];
    });
  });
  afterEach(() => backend.restore());

  const open = (props: Partial<Parameters<typeof LocationDialog>[0]> = {}) => {
    const onApply = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LocationDialog open onOpenChange={() => {}} city="Mumbai" selected={[]} onApply={onApply} applyLabel={() => "Apply"} {...props} />
      </QueryClientProvider>,
    );
    return { onApply };
  };

  it("shows rezide.in's six Mumbai regions and the first region's localities", async () => {
    open();
    const tabs = screen.getByRole("radiogroup", { name: "Regions" });
    expect(within(tabs).getAllByRole("radio").map((t) => t.textContent)).toEqual([
      "Western Suburbs",
      "Eastern Suburbs",
      "South Mumbai",
      "Harbour Suburbs",
      "Thane",
      "Navi Mumbai",
    ]);
    expect(await screen.findByText("Andheri West")).toBeInTheDocument();
  });

  it("loads another region's localities, and says when a region has none", async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("radio", { name: "Eastern Suburbs" }));
    expect(await screen.findByText("Powai")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Thane" }));
    expect(await screen.findByText("No Locality Available")).toBeInTheDocument();
  });

  it("searches within the open region on the backend", async () => {
    const user = userEvent.setup();
    open();
    await screen.findByText("Juhu");
    await user.type(screen.getByPlaceholderText("Search"), "andheri");
    expect(await screen.findByText("Andheri East")).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByText("Juhu")).not.toBeInTheDocument());
    expect(backend.history.get.some((r) => r.params.searchQuery === "andheri")).toBe(true);
  });

  it("applies the ticked localities by name, keeping ones chosen before", async () => {
    const user = userEvent.setup();
    const { onApply } = open({ selected: ["Worli"] });
    await user.click(await screen.findByRole("checkbox", { name: "Andheri West" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(["Worli", "Andheri West"]);
  });
});

describe("projects Location dialog: ten at a time", () => {
  let backend: MockAdapter;
  // 24 localities in one region, served ten per page as the backend does.
  const all = Array.from({ length: 24 }, (_, i) => `Locality ${String(i + 1).padStart(2, "0")}`);
  beforeEach(() => {
    backend = new MockAdapter(api);
    backend.onGet(URL).reply((config) => {
      const { page, pageSize } = config.params;
      const rows = all.slice((page - 1) * pageSize, page * pageSize);
      return [200, { totalCount: all.length, data: rows.map((name) => ({ _id: name, name })) }];
    });
  });
  afterEach(() => backend.restore());

  const rows = () => screen.queryAllByText(/^Locality \d+$/);
  const scrollToEnd = (list: HTMLElement) => {
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 1000 });
    Object.defineProperty(list, "clientHeight", { configurable: true, value: 400 });
    list.scrollTop = 600;
    fireEvent.scroll(list);
  };

  it("shows only the first ten on opening, and the next ten when the list is scrolled to the end", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LocationDialog open onOpenChange={() => {}} city="Mumbai" selected={[]} onApply={() => {}} applyLabel={() => "Apply"} />
      </QueryClientProvider>,
    );
    await screen.findByText("Locality 10");
    expect(rows()).toHaveLength(10);
    expect(backend.history.get).toHaveLength(1);

    scrollToEnd(screen.getByRole("list", { name: "Localities" }));
    await screen.findByText("Locality 20");
    expect(rows()).toHaveLength(20);

    // The last four, from the button at the end.
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByText("Locality 24");
    expect(rows()).toHaveLength(24);
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    // The full list ends without a note.
    expect(screen.queryByText(/localities in Western Suburbs are shown/)).not.toBeInTheDocument();
  });
});
