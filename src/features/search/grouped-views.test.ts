import { describe, expect, it } from "vitest";
import { PROJECTS } from "@/mocks/fixtures/projects";
import { PROPERTIES } from "@/mocks/fixtures/properties";
import { localitiesFor } from "@/lib/constants";
import { defaultPropertyCriteria, parsePropertyCriteria, serializePropertyCriteria } from "./criteria";
import { groupByLocality, groupByProject } from "./grouped-views";
import { groupProperties, matchesProperty, propertyFacets } from "./match";

const mumbaiHomes = PROPERTIES.filter((p) => matchesProperty(p, defaultPropertyCriteria()));
const byLocality = groupProperties(PROPERTIES, defaultPropertyCriteria(), "locality");
const byProject = groupProperties(PROPERTIES, defaultPropertyCriteria(), "project");

describe("grouped result views", () => {
  it("counts listings per locality from the dataset", () => {
    const groups = groupByLocality(localitiesFor("Mumbai"), byLocality, "homes");
    expect(groups.map((g) => g.name)).toEqual(localitiesFor("Mumbai"));
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(mumbaiHomes.length);
  });

  it("puts projects with listings first and computes their price range", () => {
    const projects = PROJECTS.filter((p) => p.city === "Mumbai");
    const groups = groupByProject(projects, byProject);
    expect(groups).toHaveLength(projects.length);
    const counts = groups.map((g) => g.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    const lodha = groups.find((g) => g.project.id === "lodha-park")!;
    expect(lodha.count).toBeGreaterThan(0);
    expect(lodha.min).toBeLessThanOrEqual(lodha.max!);
  });

  it("computes disjunctive facet counts", () => {
    const c = defaultPropertyCriteria({ bhk: ["2 BHK"] });
    const { total, facets } = propertyFacets(PROPERTIES, c, { bhk: ["1 BHK", "2 BHK", "3 BHK"] });
    expect(total).toBe(PROPERTIES.filter((p) => matchesProperty(p, c)).length);
    // A group's own selection is ignored when counting its options...
    expect(facets.bhk["3 BHK"]).toBe(mumbaiHomes.filter((p) => p.bhk === 3).length);
    // ...while other groups' selections still apply.
    const locs = Object.values(facets.localities).reduce((a, b) => a + b, 0);
    expect(locs).toBe(total);
  });

  it("round-trips the grouped views and project drill-down through the URL", () => {
    const c = defaultPropertyCriteria({ view: "proj", projects: ["lodha-park"] });
    expect(serializePropertyCriteria(c).toString()).toBe("city=Mumbai&intent=buy&type=homes&project=lodha-park&view=proj");
    expect(parsePropertyCriteria(serializePropertyCriteria(c))).toEqual(c);
    expect(parsePropertyCriteria(new URLSearchParams("view=loc")).view).toBe("loc");
  });
});
