import { describe, expect, it } from "vitest";
import { toProject, withProjectDetail } from "@/services/project-mapper";
import { projectIdFromParam, projectPath, projectRowSlug, slugFromParts, slugify } from "./project-url";

/* The live search row of Suraj Nova (Nov 2026). */
const SURAJ_NOVA = { _id: "6b0682747304fc72e16b46f4", project_name: "Suraj Nova", bhk: "1 & 2 BHK", status: "Under Construction", locality: "Lady Jamsedji Rd.", sub_region: "Mahim" };

describe("project SEO URLs", () => {
  it("slugifies: lowercase, dashes, no symbols or accents, abbreviations spelled out", () => {
    expect(slugify("Lady Jamsedji Rd.")).toBe("lady-jamsedji-road");
    expect(slugify("Andheri (W)")).toBe("andheri-west");
    expect(slugify("  L&T Crescent Bay ")).toBe("l-t-crescent-bay");
    expect(slugify("Café Résidences")).toBe("cafe-residences");
    expect(slugify("---")).toBe("");
  });

  it("builds name, BHKs, status, locality, sub-region and city from the search row", () => {
    expect(projectRowSlug(SURAJ_NOVA, "Mumbai")).toBe("suraj-nova-1-2-bhk-under-construction-lady-jamsedji-road-mahim-mumbai");
    // Without a known city, the URL just leaves it out.
    expect(projectRowSlug(SURAJ_NOVA)).toBe("suraj-nova-1-2-bhk-under-construction-lady-jamsedji-road-mahim");
  });

  it("never repeats a place, and leaves out a configuration that isn't a BHK count", () => {
    expect(projectRowSlug({ project_name: "Lodha Park Worli", bhk: "Office", status: "Ready to Move", locality: "Worli", sub_region: "Worli" }, "Mumbai")).toBe(
      "lodha-park-worli-ready-to-move-mumbai",
    );
    expect(projectRowSlug({ project_name: "Omkar 1973", bhk: "3, 4 & 5 BHK", locality: "Worli Naka", sub_region: "Worli" }, "Mumbai")).toBe("omkar-1973-3-4-5-bhk-worli-naka-mumbai");
  });

  it("cuts long URLs at a word boundary", () => {
    const slug = slugFromParts(["word ".repeat(60)]);
    expect(slug.length).toBeLessThanOrEqual(110);
    expect(slug).toMatch(/^(word-)*word$/);
  });

  it("puts the id last, and reads it back with or without the words", () => {
    const path = projectPath({ id: SURAJ_NOVA._id, slug: projectRowSlug(SURAJ_NOVA, "Mumbai") });
    expect(path).toBe("/projects/suraj-nova-1-2-bhk-under-construction-lady-jamsedji-road-mahim-mumbai-6b0682747304fc72e16b46f4");
    expect(projectIdFromParam(path.split("/")[2])).toBe(SURAJ_NOVA._id);
    expect(projectIdFromParam(SURAJ_NOVA._id)).toBe(SURAJ_NOVA._id);
    expect(projectIdFromParam("suraj-nova-mahim")).toBeUndefined();
    expect(projectIdFromParam("search")).toBeUndefined();
    expect(projectPath({ id: SURAJ_NOVA._id })).toBe(`/projects/${SURAJ_NOVA._id}`);
  });

  it("gives a card and the detail page the same URL (the detail record never changes the row's slug)", () => {
    const cityOf = (id: string) => (id === SURAJ_NOVA._id ? "Mumbai" : undefined);
    const card = toProject(SURAJ_NOVA, "Pune", "nl", cityOf);
    const detail = withProjectDetail(card, { project: { locality_and_address: { address: { city: "Mumbai", sub_region: "Mahim West", locality: "Elsewhere" } } } });
    expect(projectPath(detail)).toBe(projectPath(card));
    expect(projectPath(card)).toBe("/projects/suraj-nova-1-2-bhk-under-construction-lady-jamsedji-road-mahim-mumbai-6b0682747304fc72e16b46f4");
  });
});
