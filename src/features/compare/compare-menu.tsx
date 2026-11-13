"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Scale } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { CoverImage } from "@/components/common/cover-image";
import { Segmented } from "@/components/common/segmented";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCompareItems, useSavedStore, type CompareGroup } from "@/stores/saved";
import { useSession } from "@/stores/session";
import { COMPARE_TABS, compareHref, entryHref, entryImage, entrySummary, useCompareEntries, type CompareEntry } from "./compare-data";

/** Hovering opens the menu (as on rezide.in); a click or tap toggles it too. */
const CLOSE_DELAY = 150;

/**
 * Header Compare button: a count of compared items and, on hover, the list split into
 * Sale, Rental and Projects with a Compare link for each. Signed-in users only, as on rezide.in.
 */
export function CompareMenu() {
  const { session } = useSession();
  const items = useCompareItems();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<CompareGroup>("sale");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router = useRouter();
  const signedIn = !!session;
  const shown = signedIn ? items : [];
  const entries = useCompareEntries(shown, open);
  const total = shown.length;

  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };
  const hover = { onPointerEnter: show, onPointerLeave: hide };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={total ? `Compare (${total})` : "Compare"}
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white hover:bg-rez-cloud"
          {...hover}
        >
          <Scale className="size-[18px]" aria-hidden />
          {total > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-black text-[11px] leading-none font-bold text-rez-full-white">
              {total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-80 gap-3 rounded-xl border-rez-smoke bg-white p-3 shadow-rez-lg" {...hover}>
        {!signedIn ? (
          <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
            <p className="text-sm text-rez-graphite">Sign in to compare properties and projects side by side.</p>
            {/* The return path is read on click: reading it while rendering would need a Suspense boundary in the header. */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
              }}
              className="flex h-9 items-center rounded-full bg-black px-5 text-[13px] font-semibold text-rez-full-white hover:bg-rez-arsenic"
            >
              Sign in
            </button>
          </div>
        ) : (
          <>
            <Segmented
              label="Compare list"
              value={tab}
              onChange={setTab}
              fullWidth
              size="sm"
              appearance="solid"
              options={COMPARE_TABS.map((t) => ({
                value: t.group,
                label: `${t.label} (${entries.filter((e) => e.group === t.group).length})`,
              }))}
            />
            <CompareList entries={entries.filter((e) => e.group === tab)} empty={COMPARE_TABS.find((t) => t.group === tab)!.empty} />
            <Link
              href={compareHref(tab)}
              onClick={() => setOpen(false)}
              aria-disabled={!entries.some((e) => e.group === tab)}
              className={cn(
                "flex h-10 items-center justify-center rounded-full bg-black text-sm font-semibold text-rez-full-white hover:bg-rez-arsenic",
                !entries.some((e) => e.group === tab) && "pointer-events-none opacity-40",
              )}
            >
              Compare
            </Link>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CompareList({ entries, empty }: { entries: CompareEntry[]; empty: string }) {
  const remove = useSavedStore((s) => s.remove);
  if (!entries.length) return <p className="flex h-28 items-center justify-center text-sm text-rez-graphite">{empty}</p>;
  return (
    <ul className="flex flex-col divide-y divide-rez-smoke">
      {entries.map((e) => {
        const image = entryImage(e);
        return (
          <li key={`${e.item.kind}-${e.item.id}`} className="flex items-center gap-2.5 py-2.5 first:pt-0">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-rez-smoke bg-rez-cloud">
              {image && <CoverImage src={image} alt="" sizes="56px" />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Link href={entryHref(e)} className="truncate text-sm font-semibold hover:underline">
                {e.item.title}
              </Link>
              <span className="truncate text-xs font-medium text-rez-graphite">
                {e.loading ? "Loading…" : e.failed ? "Details unavailable" : entrySummary(e)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => remove("compare", e.item)}
              aria-label={`Remove ${e.item.title} from compare`}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-rez-burgundy hover:bg-rez-cloud"
            >
              <Icon name="trash" size={18} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
