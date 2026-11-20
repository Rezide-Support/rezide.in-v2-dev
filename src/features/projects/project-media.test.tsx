import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProjectMediaButtons, videoSource, youTubeId } from "./project-media";

describe("project video source (as rezide.in plays it)", () => {
  it("embeds YouTube links, whatever their form", () => {
    expect(youTubeId("https://www.youtube.com/watch?v=QKL-rlA0HG8&t=157s")).toBe("QKL-rlA0HG8");
    expect(youTubeId("https://youtu.be/fw8KovRUu74")).toBe("fw8KovRUu74");
    expect(videoSource("https://youtu.be/fw8KovRUu74")).toEqual({ kind: "youtube", src: "https://www.youtube.com/embed/fw8KovRUu74" });
  });

  it("plays any other video key from the CDN", () => {
    expect(videoSource("abc123")).toEqual({ kind: "file", src: "https://cdn.rezide.in/images/abc123.mp4" });
  });
});

describe("card video and 360 buttons", () => {
  it("shows a button for each, opening its player", async () => {
    const user = userEvent.setup();
    render(<ProjectMediaButtons project={{ name: "Oberoi Sky City", videoUrl: "https://youtu.be/fw8KovRUu74", vrTourUrl: "https://storage.net-fs.com/hosting/1/96/" }} />);
    await user.click(screen.getByRole("button", { name: "Play Oberoi Sky City video" }));
    expect(screen.getByTitle("Oberoi Sky City video")).toHaveAttribute("src", "https://www.youtube.com/embed/fw8KovRUu74");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Open Oberoi Sky City 360° virtual tour" }));
    expect(screen.getByTitle("Oberoi Sky City 360° virtual tour")).toHaveAttribute("src", "https://storage.net-fs.com/hosting/1/96/");
  });

  it("shows nothing when the project has neither", () => {
    const { container } = render(<ProjectMediaButtons project={{ name: "X" }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
