/**
 * Glides a horizontal scroller to `left` over `duration` ms with an ease-out curve, like
 * rezide.in's (Embla) carousels, instead of the browser's quicker built-in smooth scroll.
 * Scroll snapping is paused while it moves (it would pull each frame back) and restored after.
 * It always glides, as rezide.in's carousels do. Returns a function that stops the glide.
 */
export function glideScroll(el: HTMLElement, left: number, duration = 600): () => void {
  const target = Math.max(0, Math.min(left, el.scrollWidth - el.clientWidth));
  const start = el.scrollLeft;
  if (Math.abs(target - start) < 1 || typeof requestAnimationFrame !== "function") {
    el.scrollLeft = target;
    return () => {};
  }
  const { scrollSnapType, scrollBehavior } = el.style;
  el.style.scrollSnapType = "none";
  el.style.scrollBehavior = "auto";
  const t0 = performance.now();
  // easeInOutCubic: an even glide (a sharp ease-out lurches, then crawls).
  const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
  let frame = 0;
  const restore = () => {
    el.style.scrollSnapType = scrollSnapType;
    el.style.scrollBehavior = scrollBehavior;
  };
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / duration);
    el.scrollLeft = start + (target - start) * ease(t);
    if (t < 1) frame = requestAnimationFrame(step);
    else restore();
  };
  frame = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(frame);
    restore();
  };
}
