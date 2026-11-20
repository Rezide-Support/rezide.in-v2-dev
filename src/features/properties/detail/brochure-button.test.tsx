import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/stores/session";
import { BrochureButton, brochureDownloadPath, projectBrochureFileName } from "./brochure-button";

const URL_ = "https://cdn.rezide.in/images/l1_brochure.pdf";
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("BrochureButton", () => {
  beforeEach(() => { useSessionStore.setState({ session: null }); push.mockReset(); });

  it("downloads the brochure when signed in", () => {
    useSessionStore.getState().signIn({
      user: { id: "u1", role: "seeker", firstName: "Asha", lastName: "Rao", phone: "9820012345" },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    render(<BrochureButton url={URL_} path="/properties/l1" />);
    const link = screen.getByRole("link", { name: /brochure/i });
    expect(link).toHaveAttribute("href", URL_);
    expect(link).toHaveAttribute("download");
  });

  it("opens the shared sign-in popup without leaving the current page", async () => {
    const user = userEvent.setup();
    render(<BrochureButton url={URL_} path="/properties/l1" />);
    await user.click(screen.getByRole("button", { name: "Sign in to download the brochure" }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining("modal=signIn"), { scroll: false });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("also prompts guests when no brochure URL has been resolved", async () => {
    const user = userEvent.setup();
    render(<BrochureButton path="/properties/l1" />);
    await user.click(screen.getByRole("button", { name: "Sign in to download the brochure" }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining("modal=signIn"), { scroll: false });
  });

  it("names a project's brochure as rezide.in, fetched through the site so the name sticks", () => {
    expect(projectBrochureFileName(" Sarthak Sahayog ")).toBe("Sarthak-Sahayog_Project_Brochure.pdf");
    // No name: rezide.in falls back to "Project".
    expect(projectBrochureFileName("")).toBe("Project_Project_Brochure.pdf");
    expect(brochureDownloadPath("https://cdn.rezide.in/images/01c34d82b77dfc0eb2792ccee88f3fd5")).toBe("/v1/admin/file/upload/01c34d82b77dfc0eb2792ccee88f3fd5");
    expect(brochureDownloadPath("https://evil.example/images/x")).toBeNull();
  });

  it("downloads a named project brochure with a button when signed in", () => {
    useSessionStore.getState().signIn({
      user: { id: "u1", role: "seeker", firstName: "Asha", lastName: "Rao", phone: "9820012345" },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    render(<BrochureButton url="https://cdn.rezide.in/images/abc" fileName="P_Project_Brochure.pdf" path="/projects/p1" />);
    expect(screen.getByRole("button", { name: /brochure/i })).toBeEnabled();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("says so when the listing has no brochure", () => {
    useSessionStore.getState().signIn({ user: { id: "u1", role: "seeker", firstName: "Asha", lastName: "Rao", phone: "9820012345" }, expiresAt: new Date(Date.now() + 60_000).toISOString() });
    render(<BrochureButton path="/properties/l1" />);
    expect(screen.getByRole("button", { name: /brochure/i })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
