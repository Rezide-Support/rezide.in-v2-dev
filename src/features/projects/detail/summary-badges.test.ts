import { describe, expect, it } from "vitest";
import { summaryBadges } from "./project-sections";

const now = new Date("2026-11-18T00:00:00Z");

describe("Project summary badges (as rezide.in)", () => {
  it("reads Ready to Move and 'Jan, 2024' from a past completion date", () => {
    expect(summaryBadges({ completionDate: "2024-01-15T05:30:00.000Z", status: "uc", possessionLabel: "Possession Jan 2024" }, now)).toEqual({
      ready: true,
      status: "Ready to Move",
      date: "Jan, 2024",
    });
  });

  it("reads Under Construction from a future completion date", () => {
    expect(summaryBadges({ completionDate: "2031-07-01 05:30:00.000Z", status: "uc", possessionLabel: "Possession Jul 2031" }, now)).toEqual({
      ready: false,
      status: "Under Construction",
      date: "Jul, 2031",
    });
  });

  it("falls back to the listed status and possession without a completion date", () => {
    expect(summaryBadges({ status: "rtm", possessionLabel: "Completed Jul 2022" }, now)).toMatchObject({ ready: true, date: "Jul 2022" });
  });
});
