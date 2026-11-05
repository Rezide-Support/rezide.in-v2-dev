"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { Icon, type IconName } from "@/components/brand/icon";
import { Segmented } from "@/components/common/segmented";
import { formatPhone, initials } from "@/lib/format";
import { accountQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ActivityTab } from "@/services/account";
import { useSessionStore } from "@/stores/session";
import type { Session } from "@/types/models";

export type AccountTab = ActivityTab | "visits" | "offers" | "listings" | "profile" | "settings";

export const SEEKER_MENU: [AccountTab, string, IconName][] = [
  ["viewed", "Viewed", "compass"],
  ["shared", "Shared", "share"],
  ["shortlisted", "Shortlisted", "star"],
  ["visits", "Visits", "map-pin"],
  ["offers", "Offers", "bag"],
  ["rejected", "Rejected", "x"],
  ["profile", "Profile", "user"],
  ["settings", "Settings", "settings"],
];
export const OWNER_MENU: [AccountTab, string, IconName][] = [
  ["listings", "My Listings", "file-text"],
  ["visits", "Visits", "map-pin"],
  ["offers", "Offers", "bag"],
  ["profile", "Profile", "user"],
  ["settings", "Settings", "settings"],
];

const ACTIVITY: ActivityTab[] = ["viewed", "shared", "shortlisted", "rejected"];

/** Item counts for the menu badges, taken from the same data the tabs show. */
function useMenuCounts(owner: boolean, user: Session["user"]): Partial<Record<AccountTab, number>> {
  const role = owner ? "owner" : "seeker";
  const results = useQueries({
    queries: [
      ...ACTIVITY.map((t) => ({ ...accountQueries.activity(t, user), enabled: !owner })),
      accountQueries.visits(role),
      accountQueries.offers(role),
      { ...accountQueries.listings(), enabled: owner },
    ],
  });
  const counts: Partial<Record<AccountTab, number>> = {};
  ACTIVITY.forEach((t, i) => {
    if (results[i].data) counts[t] = results[i].data.length;
  });
  const [visits, offers, listings] = results.slice(ACTIVITY.length);
  if (visits.data) counts.visits = visits.data.length;
  if (offers.data) counts.offers = offers.data.length;
  if (listings.data) counts.listings = listings.data.length;
  return counts;
}

/**
 * Customer account sidebar: identity, seeker/owner switch and the account menu
 * with item counts. Shared by the account page and the List Property wizard,
 * as in the prototype.
 */
export function AccountSidebar({ session, active, className }: { session: Session; active?: AccountTab; className?: string }) {
  const router = useRouter();
  const setCustomerRole = useSessionStore((s) => s.setCustomerRole);
  const signOut = useSessionStore((s) => s.signOut);
  const owner = session.user.role === "owner";
  const menu = owner ? OWNER_MENU : SEEKER_MENU;
  const counts = useMenuCounts(owner, session.user);
  const name = `${session.user.firstName} ${session.user.lastName}`;

  return (
    <aside className={cn("flex min-w-0 flex-col gap-3.5", className)}>
      <div className="flex items-center gap-3 rounded-xl border border-rez-smoke bg-white px-4 py-3.5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-black text-base font-bold text-rez-full-white">{initials(name)}</span>
        <span className="flex min-w-0 flex-col gap-1">
          <b className="truncate text-base font-semibold">{name}</b>
          <span className="text-[13px] text-rez-graphite">{formatPhone(session.user.phone)}</span>
        </span>
      </div>
      <Segmented
        label="Account view"
        value={owner ? "owner" : "seeker"}
        onChange={(r) => {
          setCustomerRole(r);
          router.push(`/account?tab=${r === "owner" ? "listings" : "viewed"}`, { scroll: false });
        }}
        appearance="solid"
        fullWidth
        options={[
          { value: "seeker", label: "Seeker" },
          { value: "owner", label: "Owner" },
        ]}
        className="border border-rez-smoke bg-white"
      />
      <nav aria-label="Account" className="rounded-xl border border-rez-smoke bg-white p-2">
        <ul className="flex gap-1 overflow-x-auto scrollbar-none md:flex-col">
          {menu.map(([id, label, icon]) => {
            const on = active === id;
            const count = counts[id];
            return (
              <li key={id} className="shrink-0">
                <Link
                  href={`/account?tab=${id}`}
                  scroll={false}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "relative flex h-11 w-full items-center gap-3 rounded-[14px] px-4 text-left text-[15px] hover:bg-rez-cloud md:h-12",
                    on ? "bg-rez-cloud font-bold" : "font-medium",
                  )}
                >
                  <Icon name={icon} size={18} />
                  <span className="flex-1">{label}</span>
                  {count ? (
                    <span
                      className={cn(
                        "ml-2 flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                        on ? "bg-rez-mocaccino text-black" : "bg-rez-cloud text-black",
                      )}
                    >
                      {count}
                      <span className="sr-only"> items</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
          <li className="shrink-0">
            <button
              type="button"
              onClick={() => {
                signOut();
                router.push("/");
              }}
              className="flex h-11 w-full items-center gap-3 rounded-[14px] px-4 text-left text-[15px] font-medium hover:bg-rez-cloud md:h-12"
            >
              <Icon name="arrow-right" size={18} />
              Sign out
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
