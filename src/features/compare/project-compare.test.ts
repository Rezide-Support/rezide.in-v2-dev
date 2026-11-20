import { describe, expect, it } from "vitest";
import { PROJECTS } from "@/mocks/fixtures/projects";
import { compareDate, configurationNames, projectAge } from "./project-compare";

describe("Compare Project (as rezide.in)", () => {
  it("writes the completion date and the project's age as rezide.in does", () => {
    expect(compareDate("2032-12-31T05:30:00.000Z")).toBe("Dec 31, 2032");
    const now = new Date("2026-11-17T00:00:00Z");
    expect(projectAge("2032-12-31T05:30:00.000Z", now)).toBe("6 years 1 month");
    expect(projectAge("2027-03-17T00:00:00Z", now)).toBe("0 year 4 months");
  });

  it("lists each configuration once, in the order the projects have them", () => {
    const plan = (bhk: string) => ({ bhk, areaMin: 0, areaMax: 0 });
    const a = { ...PROJECTS[0], configurationPlans: [plan("3 BHK"), plan("4 BHK")] };
    const b = { ...PROJECTS[0], configurationPlans: [plan("2 BHK"), plan("3 BHK")] };
    expect(configurationNames([a, undefined, b])).toEqual(["3 BHK", "4 BHK", "2 BHK"]);
  });});
