import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navigation";
import { SiteHeader } from "./site-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/realtors",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

/** The header's city picker loads cities through TanStack Query, as under the app's Providers. */
const renderHeader = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SiteHeader />
    </QueryClientProvider>,
  );

const hrefs = (root: HTMLElement) => within(root).getAllByRole("link").map((a) => a.getAttribute("href"));

describe("primary navigation", () => {
  it("opens the same routes from the desktop bar and the mobile menu", async () => {
    renderHeader();
    const expected = NAV_ITEMS.map((i) => i.href);
    // Read the desktop bar first: the open menu is modal and hides the rest of the page.
    expect(hrefs(screen.getByRole("navigation", { name: "Primary" }))).toEqual(expected);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const mobile = await screen.findByRole("navigation", { name: "Menu" });
    expect(hrefs(mobile)).toEqual(expected);
  });

  it("marks the current section in both menus", async () => {
    renderHeader();
    const desktop = screen.getByRole("navigation", { name: "Primary" });
    expect(within(desktop).getByRole("link", { name: "Find Realtor" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const mobile = await screen.findByRole("navigation", { name: "Menu" });
    expect(within(mobile).getByRole("link", { name: "Find Realtor" })).toHaveAttribute("aria-current", "page");
  });

  it("matches section prefixes without false positives", () => {
    const properties = NAV_ITEMS.find((i) => i.id === "properties")!;
    const projects = NAV_ITEMS.find((i) => i.id === "projects")!;
    expect(isNavItemActive(properties, "/")).toBe(true);
    expect(isNavItemActive(properties, "/properties/abc")).toBe(true);
    expect(isNavItemActive(properties, "/projects")).toBe(false);
    expect(isNavItemActive(projects, "/projects/search")).toBe(true);
    expect(isNavItemActive(projects, "/projectsx")).toBe(false);
  });
});
