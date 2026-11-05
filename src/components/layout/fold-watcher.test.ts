import { describe, expect, it } from "vitest";
import { readFold } from "./fold-watcher";

describe("readFold", () => {
  it("ignores ordinary single-screen viewports", () => {
    expect(readFold(undefined)).toBeNull();
    expect(readFold([{ x: 0, y: 0, width: 400, height: 800 }])).toBeNull();
  });

  it("reads a vertical hinge (book posture / Surface Duo)", () => {
    const r = readFold([
      { x: 0, y: 0, width: 543, height: 705 },
      { x: 571, y: 0, width: 543, height: 705 },
    ]);
    expect(r?.fold).toBe("x");
    expect(r?.vars).toEqual({ "--seg-0-width": 543, "--seg-1-left": 571, "--seg-1-width": 543, "--hinge-width": 28 });
  });

  it("reads a horizontal hinge (table-top posture)", () => {
    const r = readFold([
      { x: 0, y: 0, width: 701, height: 420 },
      { x: 0, y: 420, width: 701, height: 421 },
    ]);
    expect(r?.fold).toBe("y");
    expect(r?.vars).toEqual({ "--seg-0-height": 420, "--seg-1-top": 420, "--seg-1-height": 421, "--hinge-height": 0 });
  });
});
