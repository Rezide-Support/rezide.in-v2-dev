"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Intent } from "@/types/models";

/**
 * Shortlist and Compare, saved ON THIS DEVICE ONLY (localStorage).
 * There is no account sync in this build; the UI says so whenever an item is
 * saved. Replace with the saved-items API once it exists.
 */

export type SavedKind = "property" | "project";
export type SavedList = "shortlist" | "compare";
/** `intent` sorts compared properties into Sale and Rental. */
export type SavedItem = { kind: SavedKind; id: string; title: string; intent?: Intent; savedAt: string };

/** Compare holds a handful of items per group (Sale, Rental, Projects), as on rezide.in. */
export const COMPARE_LIMIT = 3;

export type CompareGroup = "sale" | "rent" | "projects";

/** The compare group an item belongs to. Properties saved before `intent` was kept count as Sale. */
export const compareGroupOf = (item: Pick<SavedItem, "kind" | "intent">): CompareGroup =>
  item.kind === "project" ? "projects" : item.intent === "rent" ? "rent" : "sale";

export type ToggleResult = "added" | "removed" | "limit";

type SavedState = {
  shortlist: SavedItem[];
  compare: SavedItem[];
  toggle: (list: SavedList, item: Omit<SavedItem, "savedAt">, now?: Date) => ToggleResult;
  clear: (list: SavedList) => void;
  remove: (list: SavedList, item: Pick<SavedItem, "kind" | "id">) => void;
};

const same = (a: Pick<SavedItem, "kind" | "id">, b: Pick<SavedItem, "kind" | "id">) => a.kind === b.kind && a.id === b.id;

/** Old versions allowed four items per group; retain the first three in saved order. */
export function migrateSavedState(value: unknown): Pick<SavedState, "shortlist" | "compare"> {
  const state = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const valid = (items: unknown): SavedItem[] => Array.isArray(items) ? items.filter((item): item is SavedItem => !!item && typeof item === "object" && ["property", "project"].includes(item.kind) && typeof item.id === "string" && typeof item.title === "string" && typeof item.savedAt === "string") : [];
  const counts = { sale: 0, rent: 0, projects: 0 };
  const seen = new Set<string>();
  const compare = valid(state.compare).filter(item => {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return ++counts[compareGroupOf(item)] <= COMPARE_LIMIT;
  });
  return { shortlist: valid(state.shortlist), compare };
}

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
        if (list === "compare" && items.filter((x) => compareGroupOf(x) === compareGroupOf(item)).length >= COMPARE_LIMIT) return "limit";
        set({ [list]: [...items, { ...item, savedAt: now.toISOString() }] } as Partial<SavedState>);
        return "added";
      },
      clear: (list) => set({ [list]: [] as SavedItem[] } as Partial<SavedState>),
      remove: (list, item) => set({ [list]: get()[list].filter((x) => !same(x, item)) } as Partial<SavedState>),
    }),
    {
      name: "rezide-saved",
      version: 2,
      migrate: migrateSavedState,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ shortlist: s.shortlist, compare: s.compare }),
    },
  ),
);

const subscribe = (cb: () => void) => useSavedStore.persist.onFinishHydration(cb);

/** The compare list, empty until localStorage has been read so server and first client render agree. */
export function useCompareItems(): SavedItem[] {
  const hydrated = useSyncExternalStore(subscribe, () => useSavedStore.persist.hasHydrated(), () => false);
  const items = useSavedStore((s) => s.compare);
  return hydrated ? items : EMPTY;
}
const EMPTY: SavedItem[] = [];

/** Whether an item is saved; reads false until hydration so the first renders agree. */
export function useIsSaved(list: SavedList, kind: SavedKind, id: string) {
  const hydrated = useSyncExternalStore(subscribe, () => useSavedStore.persist.hasHydrated(), () => false);
  const on = useSavedStore((s) => s[list].some((x) => x.kind === kind && x.id === id));
  return hydrated && on;
}
