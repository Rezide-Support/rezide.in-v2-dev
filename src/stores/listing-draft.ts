"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ListingDraft } from "@/types/models";
import type { StepId } from "@/features/listing/schema";

/**
 * List Property wizard draft. Kept client-side so data survives moving
 * between steps and page reloads. Cleared after a successful submission.
 */
type ListingDraftState = {
  started: boolean;
  draft: ListingDraft;
  step: StepId;
  /** Steps the user has completed (passed validation), used to unlock the stepper. */
  completed: StepId[];
  start: (patch?: Partial<ListingDraft>) => void;
  update: (patch: Partial<ListingDraft>) => void;
  goTo: (step: StepId) => void;
  complete: (step: StepId) => void;
  reset: () => void;
};

const initial = { started: false, draft: {} as ListingDraft, step: "profile" as StepId, completed: [] as StepId[] };

export const useListingDraftStore = create<ListingDraftState>()(
  persist(
    (set) => ({
      ...initial,
      start: (patch) => set((s) => ({ started: true, draft: { ...s.draft, ...patch } })),
      update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      goTo: (step) => set({ step }),
      complete: (step) => set((s) => ({ completed: s.completed.includes(step) ? s.completed : [...s.completed, step] })),
      reset: () => set(initial),
    }),
    {
      name: "rezide-listing-draft",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: () => initial,
    },
  ),
);
