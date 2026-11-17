import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoadMore } from "./load-more";

describe("map list: load more on scroll", () => {
  const original = globalThis.IntersectionObserver;
  afterEach(() => {
    globalThis.IntersectionObserver = original;
  });

  it("loads the next batch when the end of the list scrolls into view", () => {
    let fire: (visible: boolean) => void = () => {};
    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        fire = (visible) => cb([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
    const onLoad = vi.fn();
    render(<LoadMore hasMore loading={false} onLoad={onLoad} shown={10} total={606} />);
    fire(false);
    expect(onLoad).not.toHaveBeenCalled();
    fire(true);
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it("has a button too, says when it's loading, and when everything is shown", async () => {
    const onLoad = vi.fn();
    const { rerender } = render(<LoadMore hasMore loading={false} onLoad={onLoad} shown={10} total={25} />);
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoad).toHaveBeenCalled();
    rerender(<LoadMore hasMore loading onLoad={onLoad} shown={10} total={25} />);
    expect(screen.getByText("Loading more listings…")).toBeInTheDocument();
    rerender(<LoadMore hasMore={false} loading={false} onLoad={onLoad} shown={25} total={25} />);
    expect(screen.getByText("You've seen all 25 listings.")).toBeInTheDocument();
  });
});
