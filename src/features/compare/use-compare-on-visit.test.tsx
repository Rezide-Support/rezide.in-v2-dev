import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSavedStore } from "@/stores/saved";
import { useCompareOnVisit } from "./use-compare-on-visit";

const auth = vi.hoisted(() => ({ session: { name: "A" } as object | null }));
const toastError = vi.hoisted(() => vi.fn());
vi.mock("@/stores/session", () => ({ useSession: () => ({ session: auth.session, status: auth.session ? "signed-in" : "signed-out" }) }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

const project = (id: string) => ({ kind: "project" as const, id, title: `P${id}` });
const ids = () => useSavedStore.getState().compare.map((x) => x.id);

describe("adding the opened page to Compare, as rezide.in", () => {
  beforeEach(() => {
    auth.session = { name: "A" };
    toastError.mockReset();
    useSavedStore.setState({ compare: [], shortlist: [] });
  });

  it("adds the project quietly for a signed-in visitor", () => {
    renderHook(() => useCompareOnVisit(project("1"), "projects"));
    expect(ids()).toEqual(["1"]);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("does nothing for a signed-out visitor", () => {
    auth.session = null;
    renderHook(() => useCompareOnVisit(project("1"), "projects"));
    expect(ids()).toEqual([]);
  });

  it("says so when three projects are already compared", () => {
    for (const id of ["a", "b", "c"]) useSavedStore.getState().toggle("compare", project(id));
    renderHook(() => useCompareOnVisit(project("1"), "projects"));
    expect(ids()).toEqual(["a", "b", "c"]);
    expect(toastError).toHaveBeenCalledWith("You can only compare 3 projects at a time");
  });

  it("puts the page's project straight back if it's taken out while the page is open", () => {
    renderHook(() => useCompareOnVisit(project("1"), "projects"));
    act(() => useSavedStore.getState().remove("compare", project("1")));
    expect(ids()).toEqual(["1"]);
  });

  it("takes the auto-added project out when the visitor leaves the page, so its card isn't left compared", () => {
    useSavedStore.getState().toggle("compare", project("mine"));
    const page = renderHook(() => useCompareOnVisit(project("1"), "projects"));
    const mine = renderHook(() => useCompareOnVisit(project("mine"), "projects"));
    expect(ids()).toEqual(["mine", "1"]);
    page.unmount();
    mine.unmount();
    expect(ids()).toEqual(["mine"]);
  });

  it("takes an auto-added item out when the tab closes, but keeps one the visitor added", () => {
    useSavedStore.getState().toggle("compare", project("mine"));
    renderHook(() => useCompareOnVisit(project("1"), "projects"));
    renderHook(() => useCompareOnVisit(project("mine"), "projects"));
    act(() => {
      window.dispatchEvent(new Event("beforeunload"));
    });
    expect(ids()).toEqual(["mine"]);
  });
});
