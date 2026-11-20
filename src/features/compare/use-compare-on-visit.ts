"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { COMPARE_LIMIT, compareGroupOf, useSavedStore, type SavedItem } from "@/stores/saved";
import { useSession } from "@/stores/session";

const subscribe = (cb: () => void) => useSavedStore.persist.onFinishHydration(cb);
const hydratedNow = () => useSavedStore.persist.hasHydrated();

/**
 * As rezide.in: opening a project or listing page adds it to Compare for a signed-in visitor,
 * quietly (no toast), unless that group already holds COMPARE_LIMIT items, in which case it says
 * so (once). While the page is open the item stays: taken out (e.g. from the header's compare
 * menu), it goes straight back in, as rezide.in's page re-adds it. Leaving the page (going back
 * to the list, opening another page, closing or reloading the tab) takes it back out; an item
 * the visitor had added themselves stays.
 */
export function useCompareOnVisit(item: Omit<SavedItem, "savedAt"> | undefined, noun: "projects" | "listings") {
  const { session } = useSession();
  const hydrated = useSyncExternalStore(subscribe, hydratedNow, () => false);
  const added = useRef<string | null>(null);
  const warned = useRef<string | null>(null);
  // Set once the tab starts closing, so the item taken out then isn't put back.
  const leaving = useRef(false);
  const key = item ? `${item.kind}:${item.id}` : null;
  const group = item ? compareGroupOf(item) : null;
  const present = useSavedStore((s) => !!item && s.compare.some((x) => x.kind === item.kind && x.id === item.id));
  const groupCount = useSavedStore((s) => (group ? s.compare.filter((x) => compareGroupOf(x) === group).length : 0));

  useEffect(() => {
    if (!hydrated || !session || !item || !key || present || leaving.current) return;
    if (groupCount >= COMPARE_LIMIT) {
      if (warned.current !== key) toast.error(`You can only compare ${COMPARE_LIMIT} ${noun} at a time`);
      warned.current = key;
      return;
    }
    // Only an item this page put in is taken out when the tab closes.
    if (useSavedStore.getState().toggle("compare", item) === "added") added.current = key;
    // Re-checks when the item leaves the list or a slot frees up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, session, key, present, groupCount]);

  useEffect(() => {
    if (!item || !key) return;
    const takeOut = () => {
      if (added.current !== key) return;
      added.current = null;
      useSavedStore.getState().remove("compare", item);
    };
    const onUnload = () => {
      leaving.current = true;
      takeOut();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      // Leaving the page within the site (back to the list, another project): rezide.in meant to
      // take it out then too, so its compare button isn't left showing as compared.
      takeOut();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
