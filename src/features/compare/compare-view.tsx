"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/brand/icon";
import { CoverImage } from "@/components/common/cover-image";
import { EmptyState } from "@/components/common/feedback";
import { LinkTabs } from "@/components/common/link-tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCompareItems, useSavedStore, COMPARE_LIMIT, type CompareGroup } from "@/stores/saved";
import { useSession } from "@/stores/session";
import type { Project, Property } from "@/types/models";
import {
  COMPARE_TABS,
  PROJECT_ROWS,
  RENT_ROWS,
  SALE_ROWS,
  cellText,
  compareHref,
  entryHref,
  entryImage,
  useCompareEntries,
  type CompareEntry,
} from "./compare-data";

const BROWSE: Record<CompareGroup, { href: string; label: string }> = {
  sale: { href: "/properties?intent=buy", label: "Browse properties for sale" },
  rent: { href: "/properties?intent=rent", label: "Browse rentals" },
  projects: { href: "/projects/search", label: "Browse projects" },
};

/** /compare?type=sale|rental|projects — the compared items side by side, as on rezide.in. */
export function CompareView() {
  const { session, status } = useSession();
  const type = useSearchParams().get("type");
  const tab = COMPARE_TABS.find((t) => t.type === type)?.group ?? "sale";
  const items = useCompareItems();
  const entries = useCompareEntries(session ? items : []);
  const shown = entries.filter((e) => e.group === tab);

  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] md:text-[36px]">Compare</h1>
        {session && (
          <LinkTabs
            label="Compare list"
            appearance="track"
            items={COMPARE_TABS.map((t) => ({
              href: compareHref(t.group),
              label: `${t.label} (${entries.filter((e) => e.group === t.group).length})`,
              active: t.group === tab,
            }))}
          />
        )}
      </div>

      {status === "loading" ? (
        <Skeleton className="h-80 w-full rounded-[20px]" />
      ) : !session ? (
        <EmptyState
          icon="user"
          title="Sign in to compare"
          action={
            <Button asChild>
              <Link href={`/login?next=${encodeURIComponent(`/compare${type ? `?type=${type}` : ""}`)}`}>Sign in</Link>
            </Button>
          }
        >
          Compare up to {COMPARE_LIMIT} properties or projects side by side once you sign in.
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState
          title={COMPARE_TABS.find((t) => t.group === tab)!.empty}
          action={
            <Button asChild variant="secondary">
              <Link href={BROWSE[tab].href}>{BROWSE[tab].label}</Link>
            </Button>
          }
        >
          Use Compare on a property or project page to add it here (up to {COMPARE_LIMIT}).
        </EmptyState>
      ) : (
        <CompareTable group={tab} entries={shown} />
      )}
    </section>
  );
}

function CompareTable({ group, entries }: { group: CompareGroup; entries: CompareEntry[] }) {
  const remove = useSavedStore((s) => s.remove);
  const rows = group === "projects" ? PROJECT_ROWS : group === "rent" ? RENT_ROWS : SALE_ROWS;
  const valueOf = (row: (typeof rows)[number], e: CompareEntry) => {
    const x = group === "projects" ? e.project : e.property;
    if (e.loading) return <Skeleton className="h-4 w-24" />;
    if (!x) return "—";
    return group === "projects"
      ? cellText(row as (typeof PROJECT_ROWS)[number], x as Project)
      : cellText(row as (typeof SALE_ROWS)[number], x as Property);
  };

  return (
    <div className="overflow-x-auto rounded-[20px] border border-rez-smoke">
      <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className="w-[180px] md:w-[220px]" />
          {entries.map((e) => (
            <col key={e.item.id} />
          ))}
        </colgroup>
        <thead>
          <tr className="align-top">
            <th scope="col" className="sticky left-0 z-10 bg-white p-4 text-[13px] font-semibold text-rez-graphite">
              {entries.length} of {COMPARE_LIMIT} selected
            </th>
            {entries.map((e) => {
              const image = entryImage(e);
              return (
                <th key={e.item.id} scope="col" className="border-l border-rez-smoke p-4 font-normal">
                  <div className="flex flex-col gap-3">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-rez-cloud">
                      {image && <CoverImage src={image} alt={e.item.title} sizes="(min-width: 1024px) 340px, 50vw" />}
                      <button
                        type="button"
                        onClick={() => remove("compare", e.item)}
                        aria-label={`Remove ${e.item.title} from compare`}
                        className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-white/95 shadow-rez-sm hover:bg-white"
                      >
                        <Icon name="x" size={16} />
                      </button>
                    </div>
                    <Link href={entryHref(e)} className="line-clamp-2 text-[15px] leading-snug font-semibold hover:underline">
                      {e.item.title}
                    </Link>
                    {e.failed && <span className="text-xs text-rez-burgundy">These details couldn&apos;t be loaded.</span>}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label} className={cn(i % 2 === 0 && "bg-rez-cloud/60")}>
              <th scope="row" className={cn("sticky left-0 z-10 p-4 text-[13px] font-semibold text-rez-graphite", i % 2 === 0 ? "bg-[#f4f5fa]" : "bg-white")}>
                {row.label}
              </th>
              {entries.map((e) => (
                <td key={e.item.id} className="border-l border-rez-smoke p-4 font-medium">
                  {valueOf(row, e)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-white p-4" />
            {entries.map((e) => (
              <td key={e.item.id} className="border-l border-rez-smoke p-4">
                <Button asChild variant="secondary" className="w-full">
                  <Link href={entryHref(e)}>View details</Link>
                </Button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
