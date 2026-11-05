"use client";

import { useEffect } from "react";

type Segment = { x: number; y: number; width: number; height: number };
type ViewportWithSegments = { segments?: readonly Segment[] | null };

const VARS = ["--seg-0-width", "--seg-1-left", "--seg-1-width", "--hinge-width", "--seg-0-height", "--seg-1-top", "--seg-1-height", "--hinge-height"];

/** Reads the device's screen segments; null on ordinary single-screen devices. */
export function readFold(segments: readonly Segment[] | null | undefined) {
  if (!segments || segments.length !== 2) return null;
  const [a, b] = segments;
  if (b.x >= a.x + a.width - 1) {
    return {
      fold: "x" as const,
      vars: { "--seg-0-width": a.width, "--seg-1-left": b.x, "--seg-1-width": b.width, "--hinge-width": b.x - (a.x + a.width) },
    };
  }
  return {
    fold: "y" as const,
    vars: { "--seg-0-height": a.height, "--seg-1-top": b.y, "--seg-1-height": b.height, "--hinge-height": b.y - (a.y + a.height) },
  };
}

/**
 * Foldable / dual-screen support. Mirrors the Viewport Segments API onto
 * <html data-fold="x|y"> with pixel geometry, which the `fold-x` / `fold-y`
 * Tailwind variants and the overlay rules in globals.css use. Updates on
 * resize, which fires when the device is folded, unfolded or rotated.
 */
export function FoldWatcher() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const result = readFold((window as unknown as { viewport?: ViewportWithSegments }).viewport?.segments);
      VARS.forEach((v) => root.style.removeProperty(v));
      if (!result) {
        delete root.dataset.fold;
        return;
      }
      root.dataset.fold = result.fold;
      Object.entries(result.vars).forEach(([k, v]) => root.style.setProperty(k, `${Math.round(v)}px`));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return null;
}
