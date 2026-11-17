import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PROJECTS } from "@/mocks/fixtures/projects";
import type { Project } from "@/types/models";
import { ProjectCard } from "./project-card";

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

describe("project card: configurations Details (as rezide.in)", () => {
  it("opens the configurations table from DETAILS and closes it from HIDE DETAILS", async () => {
    const user = userEvent.setup();
    render(<ProjectCard project={arbor()} />);
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
    render(<ProjectCard project={arbor()} />);
    const chevron = screen.getByRole("button", { name: "Show configuration details" });
    expect(chevron).toHaveAttribute("aria-expanded", "false");
    await user.click(chevron);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide configuration details" })).toHaveAttribute("aria-expanded", "true");
  });

  it("offers neither when there are no configuration ranges", () => {
    render(<ProjectCard project={arbor({ configurationPlans: undefined })} />);
    expect(screen.queryByRole("button", { name: /Details/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /configuration details/ })).not.toBeInTheDocument();
  });
});
