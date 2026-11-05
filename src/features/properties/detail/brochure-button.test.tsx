import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "@/stores/session";
import { BrochureButton } from "./brochure-button";

const URL_ = "https://cdn.rezide.in/images/l1_brochure.pdf";

describe("BrochureButton", () => {
  beforeEach(() => useSessionStore.setState({ session: null }));

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

  it("asks a signed-out visitor to sign in first, then come back", () => {
    render(<BrochureButton url={URL_} path="/properties/l1" />);
    expect(screen.getByRole("link", { name: "Sign in to download the brochure" })).toHaveAttribute(
      "href",
      "/login?next=%2Fproperties%2Fl1",
    );
  });

  it("says so when the listing has no brochure", () => {
    render(<BrochureButton path="/properties/l1" />);
    expect(screen.getByRole("button", { name: /brochure/i })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
