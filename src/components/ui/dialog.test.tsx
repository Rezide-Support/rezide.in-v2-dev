import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

/** Opened from state, not a <DialogTrigger> (filter buttons, credential pills, …). */
function ControlledDialog({ kind }: { kind: "dialog" | "sheet" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open filters
      </button>
      {kind === "dialog" ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>Pick options.</DialogDescription>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Pick options.</SheetDescription>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

describe("Dialog / Sheet focus return", () => {
  it.each(["dialog", "sheet"] as const)("returns focus to the opener of a state-controlled %s on Escape", async (kind) => {
    const user = userEvent.setup();
    render(<ControlledDialog kind={kind} />);
    const opener = screen.getByRole("button", { name: "Open filters" });
    await user.click(opener);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
});
