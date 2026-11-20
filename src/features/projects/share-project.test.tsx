import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PROJECTS } from "@/mocks/fixtures/projects";
import { ShareProjectButton, shareLinks } from "./share-project";

const project = { ...PROJECTS[0], id: "65508fada9b4b8a3da0dc588", name: "Shankha Arion", locality: "Balewadi", subRegion: "Baner Belt" };

describe("project share (as rezide.in)", () => {
  it("opens 'Share this project' with the project and Copy Link · Email · Whatsapp", async () => {
    const user = userEvent.setup();
    render(<ShareProjectButton project={project} />);
    await user.click(screen.getByRole("button", { name: "Share Shankha Arion" }));
    expect(screen.getByRole("dialog", { name: "Share this project" })).toBeInTheDocument();
    expect(screen.getByText("Balewadi")).toBeInTheDocument();
    expect(screen.getByText("Baner Belt")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute("href", expect.stringContaining("mailto:?subject=Share%20Project%20-%20Shankha%20Arion"));
    expect(screen.getByRole("link", { name: "Whatsapp" })).toHaveAttribute("href", expect.stringMatching(/^https:\/\/web\.whatsapp\.com\/send\?text=.*\/projects\/65508fada9b4b8a3da0dc588$/));
    await user.click(screen.getByRole("button", { name: "Copy Link" }));
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("builds rezide.in's email and WhatsApp links", () => {
    expect(shareLinks("A & B", "https://rezide.in/projects/x")).toEqual({
      email: "mailto:?subject=Share%20Project%20-%20A%20%26%20B&body=https%3A%2F%2Frezide.in%2Fprojects%2Fx",
      whatsapp: "https://web.whatsapp.com/send?text=https://rezide.in/projects/x",
    });
  });
});
