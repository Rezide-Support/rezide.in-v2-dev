"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCompareItems, COMPARE_LIMIT, compareGroupOf } from "@/stores/saved";
import { useSession } from "@/stores/session";
import { COMPARE_TABS, compareHref, pageCompareHref, pageCompareIds } from "./compare-data";
import { ListingCompare } from "./listing-compare";
import { ProjectCompare } from "./project-compare";
import { usePageCompare } from "./page-compare";
import { useEffect } from "react";

/**
 * /compare?type=sale|rental|projects (rezide.in also links Sale, Rental, Projects): the compared
 * items side by side, as rezide.in's compare page. Each tab always shows its table; an empty
 * column offers "Add Property" / "Add Project".
 */
export function CompareView() {
  const { session, status } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const type = params.get("type")?.toLowerCase();
  const tab = COMPARE_TABS.find((t) => t.type === type)?.group ?? "sale";
  const items = useCompareItems();
  // Opened from a project page's navbar menu: just that page's projects (?ids=), not the saved list.
  const idsParam = params.get("ids");
  const listedIds = tab === "projects" && idsParam !== null ? (pageCompareIds(idsParam) ?? []) : null;
  const listed = listedIds ? { ids: listedIds, onChange: (ids: string[]) => router.replace(pageCompareHref(ids), { scroll: false }) } : undefined;
  // The navbar shows this view's projects and count, as it does on the project page it came from.
  const setPage = usePageCompare((s) => s.set);
  const listedKey = listedIds?.join(",") ?? null;
  useEffect(() => {
    if (listedKey === null) return;
    setPage(listedKey ? listedKey.split(",").map((id) => ({ kind: "project", id, title: "", savedAt: "" })) : []);
    return () => setPage(null);
  }, [listedKey, setPage]);
  const count = (group: (typeof COMPARE_TABS)[number]["group"]) =>
    !session ? 0 : group === "projects" && listedIds ? listedIds.length : items.filter((i) => compareGroupOf(i) === group).length;

  return (
    <section className="mx-auto mb-5 flex w-full max-w-[1280px] flex-col px-4 py-4 md:px-8">
      <div className="my-4 flex items-center justify-center lg:justify-between">
        <h1 className="hidden flex-1 text-[28px] leading-tight font-semibold tracking-[-0.02em] lg:flex">Compare</h1>
        {session && (
          <nav aria-label="Compare list" className="grid grid-cols-3 gap-2 rounded-full border border-gray-200 bg-white px-1 py-1 shadow-sm">
            {COMPARE_TABS.map((t) => (
              <Link
                key={t.group}
                href={compareHref(t.group)}
                aria-current={t.group === tab ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-center text-sm whitespace-nowrap text-gray-500 transition-shadow hover:bg-[#eee] hover:text-black hover:shadow-md",
                  t.group === tab && "bg-black text-white shadow-md hover:bg-black hover:text-white",
                )}
              >
                {t.label} ({count(t.group)})
              </Link>
            ))}
          </nav>
        )}
      </div>

      {status === "loading" ? (
        <Skeleton className="h-80 w-full rounded-md" />
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
      ) : tab === "projects" ? (
        <ProjectCompare listed={listed} />
      ) : (
        <ListingCompare key={tab} purpose={tab} />
      )}
    </section>
  );
}
