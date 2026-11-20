import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PROJECTS } from "@/mocks/fixtures/projects";
import type { Project } from "@/types/models";
import { ProjectCard } from "./project-card";

// The Shortlist and Compare buttons send guests to sign in.
vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/search",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const arbor = (over: Partial<Project> = {}): Project => ({
  ...PROJECTS[0],
  id: "6afbde57bc7b706a1f32495b",
  name: "Arbor Vista",
  configurations: "2 & 3 BHK",
  configurationPlans: [
    { bhk: "2 BHK", areaMin: 688, areaMax: 688, saleMin: 8200000, saleMax: 9200000 },
    { bhk: "3 BHK", areaMin: 811, areaMax: 1007, saleMin: 9202000, saleMax: 13700000, rentMin: 45000, rentMax: 60000 },
  ],
  ...over,
});

/** The Shortlist button reads the account's shortlist through TanStack Query, as under the app's Providers. */
const renderCard = (ui: ReactElement) =>
  render(ui, { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider> });

describe("project card: configurations Details (as rezide.in)", () => {
  it("opens the configurations table from DETAILS and closes it from HIDE DETAILS", async () => {
    const user = userEvent.setup();
    renderCard(<ProjectCard project={arbor()} />);
    expect(screen.getByText("2 & 3 BHK")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Details/ }));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Config.", "Carpet Area", "Sale Range", "Rent Range"]);
    const rows = within(table).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
    expect(rows).toEqual([
      ["2 BHK", "688 - 688", "₹82.00L - ₹92.00L", "-"],
      ["3 BHK", "811 - 1007", "₹92.02L - ₹1.37 Cr.", "Rs 45K - 60K"],
    ]);
    // The configuration text gives way to the table, as on rezide.in.
    expect(screen.queryByText("2 & 3 BHK")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Hide Details/ }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("2 & 3 BHK")).toBeInTheDocument();
  });

  it("also toggles from the Configurations chevron", async () => {
    const user = userEvent.setup();
    renderCard(<ProjectCard project={arbor()} />);
    const chevron = screen.getByRole("button", { name: "Show configuration details" });
    expect(chevron).toHaveAttribute("aria-expanded", "false");
    await user.click(chevron);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide configuration details" })).toHaveAttribute("aria-expanded", "true");
  });

  it("changes the photo with the arrows, up to 5 photos (as rezide.in)", async () => {
    const user = userEvent.setup();
    const images = ["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg", "/e.jpg", "/f.jpg"];
    renderCard(<ProjectCard project={arbor({ images })} />);
    expect(screen.getAllByRole("button", { name: /^Show photo/ })).toHaveLength(5);
    expect(screen.getByAltText("Arbor Vista, photo 1 of 5")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next photo of Arbor Vista" }));
    expect(screen.getByAltText("Arbor Vista, photo 2 of 5")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous photo of Arbor Vista" }));
    await user.click(screen.getByRole("button", { name: "Previous photo of Arbor Vista" }));
    expect(screen.getByAltText("Arbor Vista, photo 5 of 5")).toBeInTheDocument();
  });

  it("slides the photos (as rezide.in's carousel) instead of swapping them", async () => {
    const user = userEvent.setup();
    renderCard(<ProjectCard project={arbor({ images: ["/a.jpg", "/b.jpg", "/c.jpg"] })} />);
    // photo → its slide → the strip of slides
    const track = screen.getByAltText("Arbor Vista, photo 1 of 3").parentElement!.parentElement!;
    expect(track).toHaveClass("transition-transform");
    expect(track.getAttribute("style")).toContain("translateX(calc(0% + 0px))");
    await user.click(screen.getByRole("button", { name: "Next photo of Arbor Vista" }));
    expect(track.getAttribute("style")).toContain("translateX(calc(-100% + 0px))");
  });

  it("shows rezide.in's footer: status, possession date, RERA tooltip, Brochure and Contact", async () => {
    const user = userEvent.setup();
    renderCard(<ProjectCard project={arbor({ status: "uc", possessionLabel: "Possession Dec 2027", reraIds: ["P51800012345", "P51800067890"] })} />);
    // Twice: the footer badge, and the phone-only line under the name (CSS shows one of them).
    expect(screen.getAllByText("Under Construction")).toHaveLength(2);
    expect(screen.getByText("Dec 2027")).toBeInTheDocument();
    expect(screen.queryByText("Possession Dec 2027")).not.toBeInTheDocument();
    await user.hover(screen.getByRole("button", { name: "RERA ids of Arbor Vista" }));
    expect((await screen.findAllByText("P51800012345, P51800067890")).length).toBeGreaterThan(0);
    expect(screen.getByText("Brochure")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contact/ })).toBeInTheDocument();
  });

  it("shows rezide.in's phone status line under the name, with RERA ids on tap", async () => {
    const user = userEvent.setup();
    renderCard(<ProjectCard project={arbor({ status: "rtm", possessionLabel: "Completed Dec 2023", reraIds: ["P52100001234"] })} />);
    expect(screen.getByText("Completed: Dec '23")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show RERA ids of Arbor Vista" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("P52100001234");
  });

  it("hides RERA when the project has none", () => {
    renderCard(<ProjectCard project={arbor({ reraId: "NA", reraIds: [] })} />);
    expect(screen.queryByText("RERA")).not.toBeInTheDocument();
  });

  it("has rezide.in's Shortlist, Compare and Share buttons", () => {
    renderCard(<ProjectCard project={arbor()} />);
    expect(screen.getByRole("button", { name: /Shortlist Arbor Vista/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Compare Arbor Vista/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Share/i })).toBeInTheDocument();
  });

  it("opens rezide.in's 'Share this project' popup from the card's share icon", async () => {
    const user = userEvent.setup();
    renderCard(<ProjectCard project={arbor()} />);
    await user.click(screen.getByRole("button", { name: "Share Arbor Vista" }));
    expect(screen.getByRole("dialog", { name: "Share this project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Link" })).toBeInTheDocument();
  });

  it("offers neither when there are no configuration ranges", () => {
    renderCard(<ProjectCard project={arbor({ configurationPlans: undefined })} />);
    expect(screen.queryByRole("button", { name: /Details/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /configuration details/ })).not.toBeInTheDocument();
  });
});
