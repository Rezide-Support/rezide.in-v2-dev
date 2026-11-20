import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { defaultPropertyCriteria } from "./criteria";
import { FilterDrawer } from "./filter-drawer";

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
});

describe("FilterDrawer dropdowns", () => {
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
