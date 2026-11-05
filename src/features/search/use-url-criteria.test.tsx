import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parsePropertyCriteria, serializePropertyCriteria } from "./criteria";
import { useUrlCriteria } from "./use-url-criteria";

const nav = vi.hoisted(() => ({ query: "", push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.query),
  usePathname: () => "/properties",
  useRouter: () => ({ push: nav.push, replace: vi.fn(), prefetch: vi.fn() }),
}));

const setup = (query: string) => {
  nav.query = query;
  return renderHook(() => useUrlCriteria(parsePropertyCriteria, serializePropertyCriteria));
};

describe("filter ↔ URL synchronisation", () => {
  beforeEach(() => nav.push.mockReset());

  it("derives criteria from the current URL", () => {
    const { result } = setup("city=Pune&intent=rent&bhk=2+BHK&page=3");
    expect(result.current.criteria).toMatchObject({ city: "Pune", intent: "rent", bhk: ["2 BHK"], page: 3 });
  });

  it("writes filter changes to the URL and resets to page 1", () => {
    const { result } = setup("city=Mumbai&intent=buy&type=homes&page=4");
    act(() => result.current.update({ bhk: ["3 BHK"], localities: ["Worli"] }));
    expect(nav.push).toHaveBeenCalledTimes(1);
    const [url, opts] = nav.push.mock.calls[0];
    expect(url).toBe("/properties?city=Mumbai&intent=buy&type=homes&loc=Worli&bhk=3+BHK");
    expect(opts).toEqual({ scroll: false });
  });

  it("keeps the requested page when paging", () => {
    const { result } = setup("city=Mumbai&intent=buy&type=homes");
    act(() => result.current.update({ page: 2 }, { scroll: true }));
    expect(nav.push).toHaveBeenCalledWith("/properties?city=Mumbai&intent=buy&type=homes&page=2", { scroll: true });
  });

  it("removes a filter value from the URL when it is cleared", () => {
    const { result } = setup("city=Mumbai&intent=buy&type=homes&bhk=2+BHK&bhk=3+BHK&min=5000000");
    act(() => result.current.update({ bhk: ["3 BHK"], budgetMin: undefined }));
    expect(nav.push.mock.calls[0][0]).toBe("/properties?city=Mumbai&intent=buy&type=homes&bhk=3+BHK");
  });
});
