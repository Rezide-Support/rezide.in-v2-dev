"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type UIEvent } from "react";
import { Icon } from "@/components/brand/icon";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { locationQueries } from "@/lib/queries";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export type RegionTab = { id: string; label: string };

/**
 * rezide.in's region tabs for Mumbai, in its order. Thane and Navi Mumbai are regions of
 * other cities in the backend, but rezide.in offers them here, so they're kept.
 */
export const MUMBAI_REGION_TABS: RegionTab[] = [
  { id: "652f80b3e8970d4f09aef4d6", label: "Western Suburbs" },
  { id: "652f80b3e8970d4f09aef4d7", label: "Eastern Suburbs" },
  { id: "652f80b3e8970d4f09aef4d9", label: "South Mumbai" },
  { id: "652f80b3e8970d4f09aef4d8", label: "Harbour Suburbs" },
  { id: "66a77b6e79bc1a243448f47b", label: "Thane" },
  { id: "66b9b2297cb31128e54f7025", label: "Navi Mumbai" },
];

/** Region tabs for a city: rezide.in's list for Mumbai, the city's regions from the backend elsewhere. */
function useRegionTabs(city: string, enabled: boolean): { tabs: RegionTab[]; loading: boolean } {
  const isMumbai = city.trim().toLowerCase() === "mumbai";
  const cityId = useQuery({ ...locationQueries.cityId(city), enabled: enabled && !isMumbai });
  const regions = useQuery({ ...locationQueries.regions(cityId.data ?? ""), enabled: enabled && !isMumbai && !!cityId.data });
  if (isMumbai) return { tabs: MUMBAI_REGION_TABS, loading: false };
  return {
    tabs: (regions.data ?? []).map((r) => ({ id: r.id, label: r.name })),
    loading: cityId.isPending || (!!cityId.data && regions.isPending),
  };
}

/**
 * The projects page's Location filter, working as rezide.in's: pick a region tab, then tick
 * localities. They load from the backend ten at a time (more as the list scrolls), and the
 * search looks within the open tab. The choice is a draft until applied.
 */
export function LocationDialog({
  open,
  onOpenChange,
  city,
  selected,
  onApply,
  applyLabel,
  onDraftChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  city: string;
  selected: string[];
  onApply: (values: string[]) => void;
  applyLabel: (draft: string[]) => string;
  /** Lets the parent preview results (a live count) for the unapplied draft. */
  onDraftChange?: (draft: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [search, setSearch] = useState("");
  const [tabId, setTabId] = useState("");
  const { tabs, loading: tabsLoading } = useRegionTabs(city, open);
  const activeTab = tabs.find((t) => t.id === tabId) ?? tabs[0];

  // Reset the draft, search and tab each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(selected);
      setSearch("");
      setTabId("");
    }
  }

  const query = useDebouncedValue(search, 300);
  const localities = useInfiniteQuery({
    ...locationQueries.regionLocalities(activeTab?.id ?? "", query),
    enabled: open && !!activeTab,
  });
  const items = localities.data?.pages.flatMap((p) => p.items) ?? [];

  // The first ten show on opening; the next ten load only when the user scrolls to the end
  // of the list (a visibility check could fire while the dialog is still opening and load 20).
  const listRef = useRef<HTMLUListElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = localities;
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };
  const onListScroll = (e: UIEvent<HTMLUListElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 48) loadMore();
  };

  // A new tab or search starts at the top of the list.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [activeTab?.id, query]);

  const commit = (next: string[]) => {
    setDraft(next);
    onDraftChange?.(next);
  };
  const toggle = (v: string) => commit(draft.includes(v) ? draft.filter((x) => x !== v) : [...draft, v]);

  const loadingFirst = tabsLoading || (localities.isPending && !!activeTab);
  const typing = search.trim() !== query.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-48px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b border-rez-smoke px-7 pt-6 pb-[18px]">
          <DialogTitle className="text-[26px]">Location</DialogTitle>
          <DialogDescription className="sr-only">Choose a region, then select one or more localities and apply.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3.5 px-7 pt-5">
          <label className="flex h-12 items-center gap-2.5 rounded-full border border-rez-smoke px-[18px] focus-within:border-rez-mocaccino">
            <Icon name="search" size={18} />
            <span className="sr-only">Search localities{activeTab ? ` in ${activeTab.label}` : ""}</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            />
          </label>
          {tabs.length > 0 && activeTab && (
            <Segmented label="Regions" value={activeTab.id} onChange={setTabId} options={tabs.map((t) => ({ value: t.id, label: t.label }))} size="sm" />
          )}
        </div>
        <ul ref={listRef} onScroll={onListScroll} className="min-h-[200px] flex-1 overflow-y-auto px-7 pt-1 pb-2" aria-label="Localities" aria-busy={loadingFirst || isFetchingNextPage}>
          {loadingFirst ? (
            <li className="py-6 text-sm text-rez-graphite">Loading localities…</li>
          ) : localities.isError ? (
            <li className="flex items-center gap-3 py-6 text-sm text-rez-graphite">
              Couldn&apos;t load localities.
              <Button variant="link" className="px-0 text-sm" onClick={() => void localities.refetch()}>
                Retry
              </Button>
            </li>
          ) : !activeTab || items.length === 0 ? (
            <li className="py-6 text-sm text-rez-graphite">{typing ? "Searching…" : "No Locality Available"}</li>
          ) : (
            items.map((o) => {
              const on = draft.includes(o.name);
              return (
                <li key={o.id}>
                  <label className="flex h-14 cursor-pointer items-center justify-between gap-3 border-b border-rez-smoke text-base font-medium">
                    <span>{o.name}</span>
                    <Checkbox checked={on} onCheckedChange={() => toggle(o.name)} className="size-[22px] rounded-[4px]" />
                  </label>
                </li>
              );
            })
          )}
          {isFetchingNextPage ? (
            <li className="py-3 text-center text-sm text-rez-graphite">Loading more…</li>
          ) : hasNextPage && items.length > 0 ? (
            // For keyboards, and for screens tall enough that ten rows don't scroll.
            <li className="py-3 text-center">
              <Button variant="link" className="text-sm" onClick={loadMore}>
                Load more
              </Button>
            </li>
          ) : (
            // The end of the region's list, said plainly so it doesn't look stuck (Western Suburbs has 24).
            !loadingFirst &&
            !localities.isError &&
            activeTab &&
            items.length > 0 && (
              <li className="py-4 text-center text-sm text-rez-graphite">
                {query.trim()
                  ? `That's every match in ${activeTab.label}.`
                  : `All ${items.length} ${items.length === 1 ? "locality" : "localities"} in ${activeTab.label} are shown.`}
              </li>
            )
          )}
        </ul>
        <DialogFooter className="flex-row items-center gap-3 border-t border-rez-smoke px-7 pt-4 pb-6">
          {draft.length > 0 && (
            <Button variant="secondary" size="xl" onClick={() => commit([])} className="px-5">
              Clear
            </Button>
          )}
          <Button
            size="xl"
            className="flex-1"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            {applyLabel(draft)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
