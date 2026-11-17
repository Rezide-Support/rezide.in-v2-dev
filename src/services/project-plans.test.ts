import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { fetchFloorPlans, fetchUnitPlans, towerLabel, toUnitPlan } from "@/services/project-plans";

const UPLOAD = "https://api.rezide.in/v1/admin/file/upload/";

describe("unit plans (rezide.in's detail-price-range)", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  it("asks per configuration and reads each plan's area, drawing and rooms", async () => {
    backend.onGet("/inventory/project/detail-price-range", { params: { project_id: "p1", selected_price_range: "3 BHK" } }).reply(200, {
      unit_plan_count: 2,
      result: [
        { _id: "u1", combined: false, unit_plan: "img1", rera_area: 1367, carpet_area: 0, partitions: [{ name: "Living", length: "23.00", breadth: "17.42", total_area: 400.58, TotalArea: 400.58 }, { name: "" }] },
        { _id: "u2", combined: false, unit_plan: "", rera_area: 1400 },
      ],
    });
    const { plans, total } = await fetchUnitPlans("p1", "3 BHK");
    expect(total).toBe(1);
    expect(plans).toEqual([
      { id: "u1", combined: false, label: undefined, area: 1367, parts: [{ label: "", bhk: "", area: 1367, image: `${UPLOAD}img1`, rooms: [{ name: "Living", length: "23.00", breadth: "17.42", area: 400.58 }] }] },
    ]);
  });

  it("reads a combined plan's parts, dropping rezide.in's 'Level 0' prefix", () => {
    const plan = toUnitPlan(
      {
        _id: "c1",
        combined: true,
        rera_area: 2400,
        combined_config: [
          { label: "Level 0", config_name_data: { bhk: "3 BHK", carpet_area: 1200, unit_plan: "a" } },
          { label: "Level 1", config_name_data: { bhk: "2 BHK", rera_area: 1100, unit_plan: "b", partitions: [{ name: "Bed", length: "10", breadth: "12", total_area: 120 }] } },
          { label: "Level 2", config_name_data: { bhk: "1 BHK" } },
        ],
      },
      0,
    );
    expect(plan).toMatchObject({ id: "c1", combined: true, area: 2400 });
    expect(plan?.parts).toEqual([
      { label: "", bhk: "3 BHK", area: 1200, image: `${UPLOAD}a`, rooms: [] },
      { label: "Level 1 -", bhk: "2 BHK", area: 1100, image: `${UPLOAD}b`, rooms: [{ name: "Bed", length: "10", breadth: "12", area: 120 }] },
    ]);
  });

  it("names towers as rezide.in does and reads their floor plans", async () => {
    expect(towerLabel("A")).toBe("Tower A");
    expect(towerLabel("Tower 3")).toBe("Tower 3");
    backend.onGet("/Inventory/project/floor-plan/p1").reply(200, [{ tower_name: "A", floorplans: ["f1", "", "f2"] }, { tower_name: "B" }]);
    await expect(fetchFloorPlans("p1")).resolves.toEqual([
      { tower: "Tower A", images: [`${UPLOAD}f1`, `${UPLOAD}f2`] },
      { tower: "Tower B", images: [] },
    ]);
  });
});
