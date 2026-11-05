"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Shortlist and Compare, saved ON THIS DEVICE ONLY (localStorage).
 * There is no account sync in this build; the UI says so whenever an item is
 * saved. Replace with the saved-items API once it exists.
 */

export type SavedKind = "property" | "project";
export type SavedList = "shortlist" | "compare";
export type SavedItem = { kind: SavedKind; id: string; title: string; savedAt: string };

/** Compare only makes sense for a handful of items of the same kind. */
export const COMPARE_LIMIT = 4;

export type ToggleResult = "added" | "removed" | "limit";

type SavedState = {
  shortlist: SavedItem[];
  compare: SavedItem[];
  toggle: (list: SavedList, item: Omit<SavedItem, "savedAt">, now?: Date) => ToggleResult;
  clear: (list: SavedList) => void;
};

const same = (a: Pick<SavedItem, "kind" | "id">, b: Pick<SavedItem, "kind" | "id">) => a.kind === b.kind && a.id === b.id;

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      shortlist: [],
      compare: [],
      toggle: (list, item, now = new Date()) => {
        const items = get()[list];
        if (items.some((x) => same(x, item))) {
          set({ [list]: items.filter((x) => !same(x, item)) } as Partial<SavedState>);
          return "removed";
        }
        if (list === "compare" && items.filter((x) => x.kind === item.kind).length >= COMPARE_LIMIT) return "limit";
        set({ [list]: [...items, { ...item, savedAt: now.toISOString() }] } as Partial<SavedState>);
        return "added";
      },
      clear: (list) => set({ [list]: [] as SavedItem[] } as Partial<SavedState>),
    }),
    {
      name: "rezide-saved",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ shortlist: s.shortlist, compare: s.compare }),
    },
  ),
);

const subscribe = (cb: () => void) => useSavedStore.persist.onFinishHydration(cb);

/**
 * Whether an item is in a list. Reads false until localStorage has been read,
 * so server and first client render agree.
 */
export function useIsSaved(list: SavedList, kind: SavedKind, id: string) {
  const hydrated = useSyncExternalStore(subscribe, () => useSavedStore.persist.hasHydrated(), () => false);
  const on = useSavedStore((s) => s[list].some((x) => x.kind === kind && x.id === id));
  return hydrated && on;
}
