"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "./segmented";

export type OptionGroup = { label: string; options: { value: string; label: string }[] };

/**
 * Searchable multi-select in a dialog (prototype "msel"). Selection is a draft
 * until applied. `applyLabel` receives the draft so callers can show a live count.
 */
export function MultiSelectDialog({
  open,
  onOpenChange,
  title,
  groups,
  selected,
  onApply,
  applyLabel,
  onDraftChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  groups: OptionGroup[];
  selected: string[];
  onApply: (values: string[]) => void;
  applyLabel: (draft: string[]) => string;
  /** Lets the parent preview results (e.g. a live count) for the unapplied draft. */
  onDraftChange?: (draft: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("0");

  // Reset the draft each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(selected);
      setQuery("");
      setTab("0");
    }
  }

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (q) return groups.flatMap((g) => g.options).filter((o) => o.label.toLowerCase().includes(q));
    return (groups[Number(tab)] ?? groups[0])?.options ?? [];
  }, [groups, q, tab]);

  const commit = (next: string[]) => {
    setDraft(next);
    onDraftChange?.(next);
  };
  const toggle = (v: string) => commit(draft.includes(v) ? draft.filter((x) => x !== v) : [...draft, v]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-48px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b border-rez-smoke px-7 pt-6 pb-[18px]">
          <DialogTitle className="text-[26px]">{title}</DialogTitle>
          <DialogDescription className="sr-only">Select one or more options, then apply.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3.5 px-7 pt-5">
          <label className="flex h-12 items-center gap-2.5 rounded-full border border-rez-smoke px-[18px] focus-within:border-rez-mocaccino">
            <Icon name="search" size={18} />
            <span className="sr-only">Search {title.toLowerCase()}</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            />
          </label>
          {!q && groups.length > 1 && (
            <Segmented
              label="Option groups"
              value={tab}
              onChange={setTab}
              options={groups.map((g, i) => {
                const n = g.options.filter((o) => draft.includes(o.value)).length;
                return { value: String(i), label: n ? `${g.label} (${n})` : g.label };
              })}
              size="sm"
            />
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-7 pt-1 pb-2" aria-label={`${title} options`}>
          {visible.length === 0 && <li className="py-6 text-sm text-rez-graphite">No options match “{query}”.</li>}
          {visible.map((o) => {
            const on = draft.includes(o.value);
            return (
              <li key={o.value}>
                <label className="flex h-14 cursor-pointer items-center justify-between gap-3 border-b border-rez-smoke text-base font-medium">
                  <span>{o.label}</span>
                  <Checkbox checked={on} onCheckedChange={() => toggle(o.value)} className="size-[22px] rounded-[4px]" />
                </label>
              </li>
            );
          })}
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
