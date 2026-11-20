"use client";

import Link from "next/link";
import { useState } from "react";
import { accountHref, isOwnerAccountPath } from "./account-routes";
import { useSavedStore } from "@/stores/saved";
import { usePathname, useRouter } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import {
  CalendarDays,
  Eye,
  FileText,
  Heart,
  LogOut,
  Settings,
  Share2,
  Tag,
  ThumbsDown,
  UserRound,
  type LucideIcon,
} from "lucide-react";
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
  // ["listings", "My Listings", "file-text"], // Temporarily disabled; retain for later.
  ["visits", "Visits", "map-pin"],
  ["offers", "Offers", "bag"],
  ["profile", "Profile", "user"],
  ["settings", "Settings", "settings"],
];

const ACTIVITY: ActivityTab[] = ["viewed", "shared", "shortlisted", "rejected"];
const COMPACT_ICONS: Partial<Record<AccountTab, LucideIcon>> = {
  viewed: Eye,
  shared: Share2,
  shortlisted: Heart,
  visits: CalendarDays,
  offers: Tag,
  rejected: ThumbsDown,
  listings: FileText,
  profile: UserRound,
  settings: Settings,
};

/** Item counts for the menu badges, taken from the same data the tabs show. */
function useMenuCounts(owner: boolean, user: Session["user"], enabled: boolean): Partial<Record<AccountTab, number>> {
  const role = owner ? "owner" : "seeker";
  const results = useQueries({
    queries: [
      ...ACTIVITY.map((t) => ({ ...accountQueries.activity(t, user), enabled: enabled && !owner })),
      { ...accountQueries.visits(role), enabled },
      { ...accountQueries.offers(role), enabled },
      // { ...accountQueries.listings(), enabled: enabled && owner }, // My Listings is disabled.
    ],
  });
  const counts: Partial<Record<AccountTab, number>> = {};
  ACTIVITY.forEach((t, i) => {
    if (results[i].data) counts[t] = results[i].data.length;
  });
  const [visits, offers] = results.slice(ACTIVITY.length);
  if (visits.data) counts.visits = visits.data.length;
  if (offers.data) counts.offers = offers.data.length;
  // if (listings.data) counts.listings = listings.data.length;
  return counts;
}

/**
 * Customer account sidebar, shared by the account page and List Property wizard.
 */
export function AccountSidebar({ session, active, className, compact = false }: { session: Session; active?: AccountTab; className?: string; compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [owner, setOwner] = useState(() => isOwnerAccountPath(pathname));
  const signOut = useSessionStore((s) => s.signOut);

  const menu = owner ? OWNER_MENU : SEEKER_MENU;
  const counts = useMenuCounts(owner, session.user, !compact);
  const name = `${session.user.firstName} ${session.user.lastName}`;

  return (
    <aside
      className={cn(
        "flex min-w-0 flex-col gap-3.5",
        compact && "md:gap-0 md:overflow-hidden md:border md:border-rez-smoke md:bg-white",
        className,
      )}
    >
      {!compact && (
        <div className="flex items-center gap-3 rounded-xl border border-rez-smoke bg-white px-4 py-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-black text-base font-bold text-rez-full-white">{initials(name)}</span>
          <span className="flex min-w-0 flex-col gap-1">
            <b className="truncate text-base font-semibold">{name}</b>
            <span className="text-[13px] text-rez-graphite">{formatPhone(session.user.phone)}</span>
          </span>
        </div>
      )}
      <Segmented
        label="Account view"
        value={owner ? "owner" : "seeker"}
        onChange={(r) => {
          setOwner(r === "owner");
        }}
        appearance="solid"
        size="md"
        fullWidth
        options={[
          { value: "seeker", label: compact ? "Home Seeker" : "Seeker" },
          { value: "owner", label: compact ? "Home Owner" : "Owner" },
        ]}
        className={cn(
          "border border-rez-smoke bg-white",
          compact && "md:my-[10px] md:mx-[10px] md:h-[60px] md:w-[calc(100%_-_20px)] md:gap-0 md:rounded-full md:p-2.5",
        )}
      />
      <nav
        aria-label="Account"
        className={cn(
          "rounded-xl border border-rez-smoke bg-white p-2",
          compact && "md:rounded-none md:border-0 md:p-0",
        )}
      >
        <ul className={cn("flex gap-1 overflow-x-auto scrollbar-none md:flex-col", compact && "md:gap-0")}>
          {menu.map(([id, label, icon]) => {
            const on = pathname === accountHref(id, owner) || (id === "profile" && pathname === "/dashboard/profile/form") || (pathname === "/account" && active === id);
            const count = counts[id];
            const MenuIcon = COMPACT_ICONS[id];
            return (
              <li key={id} className={cn("shrink-0", compact && "md:border-b md:border-rez-smoke md:last:border-0")}>
                <Link
                  href={accountHref(id, owner)}
                  scroll={false}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "relative flex h-11 w-full items-center gap-3 rounded-[14px] px-4 text-left text-[15px] hover:bg-rez-cloud md:h-12",
                    on ? "bg-rez-cloud font-bold" : "font-medium",
                    compact && "md:h-[71px] md:gap-4 md:rounded-none md:px-5 md:text-[18px] md:font-normal",
                    compact && on && "md:bg-[#F3F4F6] md:font-medium",
                  )}
                >
                  {compact && MenuIcon ? (
                    <MenuIcon size={20} strokeWidth={1.8} aria-hidden />
                  ) : (
                    <Icon name={icon} size={18} />
                  )}
                  <span className="flex-1">{label}</span>
                  {!compact && count ? (
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
          <li className={cn("shrink-0", compact && "md:border-b md:border-rez-smoke md:last:border-0")}>
            <button
              type="button"
              onClick={() => {
                useSavedStore.getState().clear("compare");
                signOut();
                router.push("/");
              }}
              className={cn(
                "flex h-11 w-full items-center gap-3 rounded-[14px] px-4 text-left text-[15px] font-medium hover:bg-rez-cloud md:h-12",
                compact && "md:h-[71px] md:gap-4 md:rounded-none md:px-5 md:text-[18px]",
              )}
            >
              {compact ? <LogOut size={20} strokeWidth={1.8} aria-hidden /> : <Icon name="arrow-right" size={18} />}
              {compact ? "Logout" : "Sign out"}
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
