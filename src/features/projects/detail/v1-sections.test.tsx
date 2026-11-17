import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { PROJECTS } from "@/mocks/fixtures/projects";
import type { Project } from "@/types/models";
import { experienceLabel } from "./about-developer";
import { ConfigurationPlans } from "./configuration-plans";
import { validateContact } from "./contact-builder";
import { ProjectAmenities, ReraDetails } from "./project-sections";
import { downloadUrl, rsInr, shortInr } from "./v1-ui";

const project = (over: Partial<Project> = {}): Project => ({ ...PROJECTS[0], id: "p1", name: "Oberoi Esquire", ...over });
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

describe("rezide.in formats", () => {
  it("shortens amounts as rezide.in does", () => {
    expect(shortInr(56100000)).toBe("5.61 Cr.");
    expect(shortInr(200000)).toBe("2.00L");
    expect(shortInr(34000)).toBe("34K");
    expect(rsInr(56100000)).toBe("Rs 5,61,00,000");
  });

  it("downloads backend files through this site's own /v1/admin rewrite (the backend sends no CORS header)", () => {
    expect(downloadUrl("https://api.rezide.in/v1/admin/file/upload/abc")).toBe("/v1/admin/file/upload/abc");
    expect(downloadUrl("https://cdn.rezide.in/images/x.jpeg")).toBe("https://cdn.rezide.in/images/x.jpeg");
  });

  it("counts experience from the founding year", () => {
    expect(experienceLabel("1998", new Date("2026-11-16"))).toBe("28+ years");
    expect(experienceLabel(undefined)).toBe("N/A");
  });

  it("checks the Contact Builder form as rezide.in does", () => {
    const empty = { name: "", mobile: "", email: "", homeLoan: false, siteVisits: false, terms: false };
    expect(validateContact(empty)).toEqual({
      name: "Name cannot be empty",
      mobile: "Mobile cannot be empty",
      email: "Email cannot be empty",
      broker: "Please specify if you are a broker",
      terms: "You must accept the terms & conditions",
    });
    expect(validateContact({ ...empty, name: "A", mobile: "1", email: "e", broker: false, terms: true })).toEqual({ reason: "Reason to buy cannot be empty" });
    expect(validateContact({ ...empty, name: "A", mobile: "1", email: "e", broker: true, terms: true })).toEqual({});
  });
});

describe("Project amenities", () => {
  it("shows 11 with backend icons, then 'N More' that expands", async () => {
    const user = userEvent.setup();
    const amenities = Array.from({ length: 14 }, (_, i) => `Amenity ${i + 1}`);
    render(<ProjectAmenities project={project({ amenities })} />);
    const list = screen.getByRole("list");
    expect(within(list).getAllByText(/^Amenity \d+$/)).toHaveLength(11);
    expect(list.querySelector("img")?.getAttribute("src")).toBe("https://api.rezide.in/v1/admin/repository/amenities/icon/Amenity%201.svg");
    await user.click(screen.getByRole("button", { name: /3 More/ }));
    expect(within(list).getAllByText(/^Amenity \d+$/)).toHaveLength(14);
    expect(screen.getByRole("button", { name: /Show Less/ })).toBeInTheDocument();
  });
});

describe("Project RERA details", () => {
  it("lists each registration with its QR and the regulator's page, and hides without one", () => {
    const { rerender } = render(<ReraDetails project={project({ reras: [{ id: "P51800005229", link: "https://maharera.example/7040", qr: "https://api.rezide.in/v1/admin/file/upload/qr1" }] })} />);
    expect(screen.getByText("P51800005229")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /VIEW DETAILS/ })).toHaveAttribute("href", "https://maharera.example/7040");
    rerender(<ReraDetails project={project({ reras: [] })} />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});

describe("Configuration plans", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
    backend.onGet("/inventory/project/detail-price-range").reply((config) =>
      config.params.selected_price_range === "3 BHK"
        ? [200, { unit_plan_count: 2, result: [{ _id: "u1", unit_plan: "a", rera_area: 1367, partitions: [{ name: "Living", length: "23.00", breadth: "17.42", total_area: 400.58 }] }, { _id: "u2", unit_plan: "b", rera_area: 1371 }] }]
        : [200, { unit_plan_count: 0, result: [] }],
    );
    backend.onGet("/Inventory/project/floor-plan/p1").reply(200, [{ tower_name: "A", floorplans: ["f1", "f2", "f3"] }]);
  });
  afterEach(() => backend.restore());

  const plans = project({
    configurationPlans: [
      { bhk: "3 BHK", areaMin: 1367, areaMax: 1496, saleMin: 56100000, saleMax: 92000000, rentMin: 200000, rentMax: 340000 },
      { bhk: "4 BHK", areaMin: 2053, areaMax: 2068 },
    ],
  });

  it("shows a configuration's ranges and its unit plans one at a time", async () => {
    const user = userEvent.setup();
    wrap(<ConfigurationPlans project={plans} />);
    expect(screen.getByText("Sale Range").parentElement).toHaveTextContent("Rs 5.61 Cr. - 9.20 Cr.");
    expect(screen.getByText("Rent Range").parentElement).toHaveTextContent("Rs 2.00L - 3.40L");
    expect(await screen.findByText("1 of 2 Plans")).toBeInTheDocument();
    expect(screen.getByText("1367 sqft.")).toBeInTheDocument();
    expect(screen.getByText("Living")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Next plan" })[0]);
    expect(screen.getByText("2 of 2 Plans")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "4 BHK" }));
    expect(await screen.findAllByText("No Unit Plans Available")).not.toHaveLength(0);
  });

  it("shows floor plans per tower", async () => {
    const user = userEvent.setup();
    wrap(<ConfigurationPlans project={plans} />);
    await user.click(screen.getByRole("tab", { name: "Floor Plan" }));
    expect(await screen.findByRole("tab", { name: "Tower A" })).toBeInTheDocument();
    expect(screen.getByText("1 of 3 Plans")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("says so when there are no configurations", () => {
    wrap(<ConfigurationPlans project={project({ configurationPlans: [] })} />);
    expect(screen.getByText("No Unit Plans Available")).toBeInTheDocument();
  });
});
