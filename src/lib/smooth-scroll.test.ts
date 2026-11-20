import { afterEach, describe, expect, it, vi } from "vitest";
import { glideScroll } from "./smooth-scroll";

const scroller = () => {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollWidth", { value: 3000 });
  Object.defineProperty(el, "clientWidth", { value: 1000 });
  el.style.scrollSnapType = "x mandatory";
  return el;
};

describe("glideScroll", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("eases to the target over the duration, pausing snapping until it lands", () => {
    let now = 0;
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const el = scroller();
    glideScroll(el, 1000, 600);
    expect(el.style.scrollSnapType).toBe("none");
    // Ease-in-out: a gentle start, then halfway at half the time.
    now = 60;
    frames.shift()!(now);
    expect(el.scrollLeft).toBeLessThan(20);
    now = 300;
    frames.shift()!(now);
    expect(el.scrollLeft).toBe(500);
    now = 600;
    frames.shift()!(now);
    expect(el.scrollLeft).toBe(1000);
    expect(el.style.scrollSnapType).toBe("x mandatory");
  });

  it("never goes past the end", () => {
    const el = scroller();
    vi.stubGlobal("requestAnimationFrame", undefined);
    glideScroll(el, 9999);
    expect(el.scrollLeft).toBe(2000);
  });
});
