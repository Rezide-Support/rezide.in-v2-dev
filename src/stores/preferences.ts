"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_CITY } from "@/lib/constants";

/** Shared UI preferences that are not part of any URL. */
type PreferencesState = {
  city: string;
  setCity: (city: string) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      city: DEFAULT_CITY,
      setCity: (city) => set({ city }),
    }),
    { name: "rezide-preferences", storage: createJSONStorage(() => localStorage) },
  ),
);

const subscribe = (cb: () => void) => usePreferencesStore.persist.onFinishHydration(cb);

/** Preferred city, falling back to the default until storage has been read. */
export function usePreferredCity() {
  const hydrated = useSyncExternalStore(subscribe, () => usePreferencesStore.persist.hasHydrated(), () => false);
  const city = usePreferencesStore((s) => s.city);
  const setCity = usePreferencesStore((s) => s.setCity);
  return { city: hydrated ? city : DEFAULT_CITY, setCity, hydrated };
}
