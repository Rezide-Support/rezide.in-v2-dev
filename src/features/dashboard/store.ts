"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_COLUMNS, type ColumnPref, type ContactFilters } from "./contact-model";

type ContactsUi = ContactFilters & {
  columns: ColumnPref[];
  set: (patch: Partial<ContactFilters>) => void;
  clear: () => void;
  setColumns: (c: ColumnPref[]) => void;
};

const EMPTY: ContactFilters = { type: "", group: "", label: "", q: "", sort: 1 };

/** Contact filters are shared by the table and list views; the column layout is remembered per browser. */
export const useContactsUi = create<ContactsUi>()(
  persist(
    (set) => ({
      ...EMPTY,
      columns: DEFAULT_COLUMNS,
      set: (patch) => set(patch),
      clear: () => set({ type: "", group: "", label: "", q: "" }),
      setColumns: (columns) => set({ columns }),
    }),
    {
      name: "rezide-dashboard-columns",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ columns: s.columns }),
    },
  ),
);
