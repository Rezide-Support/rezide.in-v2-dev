"use client";

import { create } from "zustand";
import type { SavedItem } from "@/stores/saved";

/**
 * The comparison of the project page that's open (its own project first, then what's added in
 * its Compare section), so the header's Compare count and menu show that page's comparison
 * while it's open. Null on every other page, where the header shows the compare list.
 */
export const usePageCompare = create<{ items: SavedItem[] | null; set: (items: SavedItem[] | null) => void }>()((set) => ({
  items: null,
  set: (items) => set({ items }),
}));
