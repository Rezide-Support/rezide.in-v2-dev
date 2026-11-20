import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultProjectCriteria } from "@/features/search/criteria";
import { ProjectFilterDrawer, countDrawerFilters, drawerChips } from "./project-filter-drawer";

describe("project Filters drawer (rezide.in's Project Filters)", () => {
  it("offers rezide.in's sections and updates the search as options are chosen", async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    render(<ProjectFilterDrawer open onOpenChange={() => {}} criteria={defaultProjectCriteria({ bhk: ["2 BHK"] })} update={update} total={12} pending={false} />);
    for (const legend of ["Project type", "Unit type", "BHK", "Area range (250 - 10,000 sq. ft)", "Project with Video / VR"]) {
      expect(screen.getByText(legend)).toBeInTheDocument();
    }
    await user.click(screen.getByRole("button", { name: "3 BHK" }));
    expect(update).toHaveBeenLastCalledWith({ bhk: ["2 BHK", "3 BHK"] });
    await user.click(screen.getByRole("button", { name: "Standalone" }));
    expect(update).toHaveBeenLastCalledWith({ projectTypes: ["650c6732a3021fab1835c045"] });
    await user.selectOptions(screen.getByLabelText("Minimum area"), "1000");
    expect(update).toHaveBeenLastCalledWith({ areaMin: 1000 });
    expect(screen.getByRole("button", { name: "Show 12 projects" })).toBeInTheDocument();
  });

  it("names and counts the chosen filters", () => {
    const c = defaultProjectCriteria({ projectTypes: ["650c671ba3021fab1835c038"], media: ["VR Tour"], areaMin: 500 });
    expect(drawerChips(c).map((chip) => chip.label)).toEqual(["Gated amenities", "VR Tour", "Above 500 sq. ft"]);
    expect(countDrawerFilters(c)).toBe(3);
  });
});
