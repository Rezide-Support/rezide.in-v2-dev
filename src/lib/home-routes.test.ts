import { describe, expect, it } from "vitest";
import { CATEGORIES, PROJECT_STATUS } from "@/lib/constants";
import {
  parseProjectsHomePath,
  parsePropertiesHomePath,
  projectsHomeHref,
  propertiesHomeHref,
} from "@/lib/home-routes";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navigation";

describe("discovery tab URLs", () => {
  it("gives every category and intent its own path, and reads it back", () => {
    const paths = new Set<string>();
    for (const c of CATEGORIES) {
      for (const intent of ["buy", "rent"] as const) {
        const href = propertiesHomeHref(c.id, intent);
        paths.add(href);
        expect(parsePropertiesHomePath(href)).toEqual({ category: c.id, intent });
      }
    }
    expect(paths.size).toBe(CATEGORIES.length * 2);
    expect(propertiesHomeHref("homes", "buy")).toBe("/");
    expect(propertiesHomeHref("homes", "rent")).toBe("/homes/rent");
    expect(propertiesHomeHref("offices", "rent")).toBe("/offices/lease");
  });

  it("rejects paths that aren't discovery tabs", () => {
    for (const path of ["/homes", "/offices/rent", "/homes/lease", "/search", "/offices/lease/x", "/villas"]) {
      expect(parsePropertiesHomePath(path)).toBeNull();
    }
  });

  it("round-trips project status tabs", () => {
    for (const s of PROJECT_STATUS) expect(parseProjectsHomePath(projectsHomeHref(s.id))).toBe(s.id);
    expect(projectsHomeHref("uc")).toBe("/projects");
    expect(parseProjectsHomePath("/projects/lodha-park")).toBeNull();
  });

  it("keeps Properties active in the nav on every category tab", () => {
    const properties = NAV_ITEMS.find((i) => i.id === "properties")!;
    for (const c of CATEGORIES) {
      expect(isNavItemActive(properties, propertiesHomeHref(c.id, "buy"))).toBe(true);
      expect(isNavItemActive(properties, propertiesHomeHref(c.id, "rent"))).toBe(true);
    }
    expect(isNavItemActive(properties, "/projects/ready-to-move")).toBe(false);
  });
});
