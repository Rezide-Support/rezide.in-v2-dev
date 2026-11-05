import { describe, expect, it } from "vitest";
import { formatDate, localIsoDate, possessive } from "@/lib/format";

describe("formatDate", () => {
  it("uses three-letter months and UTC days, same on server and browser", () => {
    expect(formatDate("2026-09-02")).toBe("Sep 02, 2026");
    expect(formatDate("2026-10-17T23:30:00Z")).toBe("Oct 17, 2026");
    expect(formatDate("not a date")).toBe("not a date");
  });
});

describe("localIsoDate", () => {
  it("uses the local calendar day, not the UTC one", () => {
    // 01:00 local time on 3 Nov: UTC may still be 2 Nov in zones ahead of UTC (e.g. IST).
    expect(localIsoDate(new Date(2026, 10, 3, 1, 0))).toBe("2026-11-03");
    expect(localIsoDate(new Date(2026, 0, 9, 23, 59))).toBe("2026-01-09");
  });
});

describe("possessive", () => {
  it("drops the extra s after names ending in s", () => {
    expect(possessive("Lodha Group")).toBe("Lodha Group's");
    expect(possessive("Godrej Properties")).toBe("Godrej Properties'");
  });
});
