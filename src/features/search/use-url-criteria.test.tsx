import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parsePropertyCriteria, serializePropertyCriteria } from "./criteria";
import { useUrlCriteria } from "./use-url-criteria";

const nav = vi.hoisted(() => ({ query: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.query),
  usePathname: () => "/properties",
}));

// The URL changes through the History API (no server round trip); the url is its third argument.
let pushState: ReturnType<typeof vi.fn>;
let scrollTo: ReturnType<typeof vi.fn>;
const pushed = () => pushState.mock.calls.map((c) => c[2]);

const setup = (query: string) => {
  nav.query = query;
  return renderHook(() => useUrlCriteria(parsePropertyCriteria, serializePropertyCriteria));
};

describe("filter ↔ URL synchronisation", () => {
  beforeEach(() => {
    pushState = vi.fn();
    window.history.pushState = pushState as unknown as History["pushState"];
    scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  });

  it("derives criteria from the current URL", () => {
    const { result } = setup("city=Pune&intent=rent&bhk=2+BHK&page=3");
    expect(result.current.criteria).toMatchObject({ city: "Pune", intent: "rent", bhk: ["2 BHK"], page: 3 });
  });

  it("writes filter changes to the URL and resets to page 1", () => {
    const { result } = setup("city=Mumbai&intent=buy&type=homes&page=4");
    act(() => result.current.update({ bhk: ["3 BHK"], localities: ["Worli"] }));
    expect(pushed()).toEqual(["/properties?city=Mumbai&intent=buy&type=homes&loc=Worli&bhk=3+BHK"]);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("keeps the requested page when paging, and scrolls to the top", () => {
    const { result } = setup("city=Mumbai&intent=buy&type=homes");
    act(() => result.current.update({ page: 2 }, { scroll: true }));
    expect(pushed()).toEqual(["/properties?city=Mumbai&intent=buy&type=homes&page=2"]);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it("removes a filter value from the URL when it is cleared", () => {
    const { result } = setup("city=Mumbai&intent=buy&type=homes&bhk=2+BHK&bhk=3+BHK&min=5000000");
    act(() => result.current.update({ bhk: ["3 BHK"], budgetMin: undefined }));
    expect(pushed()[0]).toBe("/properties?city=Mumbai&intent=buy&type=homes&bhk=3+BHK");
  });
});
