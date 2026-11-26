"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";
import { personName } from "@/lib/validation";
import { updateUserName } from "@/services/auth";
import { Icon } from "@/components/brand/icon";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";

import { PropertyCard } from "@/features/properties/property-card";
import { ProjectWideCard } from "@/features/projects/detail/project-wide-card";
import { formatDate, formatPhone, initials } from "@/lib/format";
import { accountQueries } from "@/lib/queries";
// import { cn } from "@/lib/utils";
import type { ActivityTab, Session } from "@/types/models";
import { useSession, useSessionStore } from "@/stores/session";
import { AccountSidebar, OWNER_MENU, SEEKER_MENU, type AccountTab } from "./account-sidebar";
// import { formatNumber } from "@/lib/format"; // Needed when My Listings is restored.
// import { ownerListingCard, ownerTotals } from "./presenters";

import { accountTabForPath, isOwnerAccountPath } from "./account-routes";

type Tab = AccountTab;
type Market = "buy" | "rent";
type ActivityFilter = Market | "project";

const TITLES: Record<Tab, (owner: boolean) => string> = {
  viewed: () => "Viewed by me",
  shared: () => "Shared by Broker",
  shortlisted: () => "Shortlisted by me",
  rejected: () => "Rejected by me",
  visits: (o) => (o ? "Visits for my property" : "My visits"),
  offers: (o) => (o ? "Offers received" : "My offers"),
  listings: () => "My listings",
  profile: () => "Profile",
  settings: () => "Settings",
};

const ACTIVITY_TABS: Tab[] = ["viewed", "shared", "shortlisted", "rejected"];

function hasProjectActivity(tab: Tab): tab is "viewed" | "shortlisted" {
  return tab === "viewed" || tab === "shortlisted";
}

function AccountEmptyState({ large = false }: { large?: boolean } = {}) {
  return (
    <div role="status" className={large ? "flex min-h-[calc(560px*var(--property-space-scale,1))] items-center justify-center lg:min-h-[calc(600px*var(--property-space-scale,1))]" : "flex min-h-[calc(480px*var(--property-space-scale,1))] items-center justify-center"}>
      <span className="sr-only">No results found.</span>
      <Image
        src="/images/empty.gif"
        alt=""
        width={large ? 640 : 480}
        height={large ? 640 : 480}
        unoptimized
        className={large ? "h-auto w-full max-w-[calc(640px*var(--property-space-scale,1))]" : "h-auto w-full max-w-[calc(480px*var(--property-space-scale,1))]"}
      />
    </div>
  );
}

function ComingSoon() {
  return (
    <div className="flex h-[420px] flex-col items-center justify-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={64}
        height={64}
        aria-hidden="true"
        focusable="false"
        className="h-16 w-16 text-black"
      >
        <g>
          <rect fill="none" height="24" width="24" />
        </g>
        <g fill="currentColor">
          <g>
            <path d="M21.16,7.26l-1.41-1.41L16.19,9.4l1.41,1.41C17.6,10.81,21.05,7.29,21.16,7.26z" />
            <rect height="5" width="2" x="11" y="3" />
            <path d="M6.4,10.81L7.81,9.4L4.26,5.84L2.84,7.26C2.95,7.29,6.4,10.81,6.4,10.81z" />
            <path d="M20,12h-5c0,1.66-1.34,3-3,3s-3-1.34-3-3H4c-1.1,0-2,0.9-2,2v5c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2v-5 C22,12.9,21.1,12,20,12z" />
          </g>
        </g>
      </svg>
      <h1 id="account-title" className="text-2xl leading-tight font-bold">Coming Soon</h1>
    </div>
  );
}

function ActivityList({ tab, filter, user }: { tab: ActivityTab; filter: ActivityFilter; user: Session["user"] }) {
  const { data, isPending, isError, refetch } = useQuery(accountQueries.activity(tab, user));
  if (isPending) return <div className="h-64 animate-pulse rounded-xl bg-rez-cloud" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  const items = data.filter((item) => {
    if (filter === "project") return item.kind === "project";
    return item.kind === "property" && item.property.intent === filter;
  });
  const groups = items.reduce<{ date: string; items: typeof items }[]>((acc, it) => {
    const g = acc.find((x) => x.date === it.date);
    if (g) g.items.push(it);
    else acc.push({ date: it.date, items: [it] });
    return acc;
  }, []);
  return (
    <div className="flex flex-col gap-6">
      {groups.length === 0 ? (
        <AccountEmptyState />
      ) : (
        groups.map((g) => (
          <section key={g.date} className="flex flex-col gap-6 md:gap-9" aria-label={formatDate(g.date)}>
            <div className="flex items-center gap-4" aria-hidden>
              <span className="h-px flex-1 bg-rez-smoke" />
              <span className="rounded-full bg-rez-cloud px-4 py-2 text-[13px] font-semibold text-rez-graphite md:text-[11px]">{formatDate(g.date)}</span>
              <span className="h-px flex-1 bg-rez-smoke" />
            </div>
            <ul className="flex flex-col gap-6">
              {g.items.map((it) => (
                <li key={it.kind === "project" ? it.projectId : it.propertyId} className="flex flex-col gap-2">
                  {it.note && <p className="rounded-xl border border-rez-smoke px-3.5 py-2.5 text-[13px] font-medium">{it.note}</p>}
                  {it.kind === "project"
                    ? <ProjectWideCard project={it.project} />
                    : <PropertyCard property={it.property} layout="row" />}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

// My Listings is temporarily disabled. Preserve this implementation for later.
// /** Listing actions that lead somewhere real in this build; the others stay hidden. */
// const LISTING_CTA: Record<string, Tab | undefined> = { "View Offers": "offers", "View Visits": "visits" };
// 
// function OwnerListings() {
//   const q = useQuery(accountQueries.listings());
//   if (q.isPending) return <div className="h-64 animate-pulse rounded-xl bg-rez-cloud" />;
//   if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
//   if (q.data.length === 0) return <AccountEmptyState />;
//   const statusTone = { Live: "bg-black text-rez-full-white", "Under review": "bg-rez-mocaccino text-black", Draft: "bg-white text-black" };
//   const totals = ownerTotals(q.data);
//   return (
//     <div className="flex flex-col gap-5">
//       <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
//         {[
//           ["Listings", formatNumber(totals.listings)],
//           ["Total views", formatNumber(totals.views)],
//           ["Visits", formatNumber(totals.visits)],
//           ["Offers", formatNumber(totals.offers)],
//         ].map(([l, v]) => (
//           <div key={l} className="flex flex-col-reverse gap-2 rounded-xl bg-rez-cloud px-5 py-[18px]">
//             <dt className="text-[13px] font-medium text-rez-graphite">{l}</dt>
//             <dd className="text-[max(12px,calc(28px*var(--property-type-scale,1)))] leading-none font-bold">{v}</dd>
//           </div>
//         ))}
//       </dl>
//       <ul className="flex flex-col gap-4">
//         {q.data.map(ownerListingCard).map((p) => (
//           <li key={p.id}>
//             <article className="grid grid-cols-1 overflow-hidden rounded-xl border border-rez-smoke bg-white sm:grid-cols-[240px_minmax(0,1fr)]">
//               <div className="relative min-h-[190px] bg-rez-cloud">
//                 <Image src={p.image} alt="" fill sizes="(min-width: 640px) 240px, 100vw" quality={70} className="object-cover" />
//                 <span className={cn("absolute top-3.5 left-3.5 flex h-7 items-center rounded-full px-3 text-xs font-semibold", statusTone[p.status])}>{p.status}</span>
//               </div>
//               <div className="flex flex-col gap-3.5 px-[22px] py-5">
//                 <div className="flex flex-wrap items-start justify-between gap-3">
//                   <div className="flex min-w-0 flex-col gap-1">
//                     <h3 className="text-[max(12px,calc(19px*var(--property-type-scale,1)))] leading-tight font-semibold">{p.title}</h3>
//                     <span className="text-sm text-rez-graphite">{p.locality}</span>
//                   </div>
//                   <div className="flex flex-col items-end gap-1">
//                     <span className="text-[max(12px,calc(22px*var(--property-type-scale,1)))] leading-none font-bold">{p.price}</span>
//                     <span className="text-xs font-medium text-rez-graphite">{p.intentLabel}</span>
//                   </div>
//                 </div>
//                 <dl className="grid grid-cols-4 gap-1 rounded-[14px] bg-rez-cloud px-2 py-3 text-center">
//                   {(
//                     [
//                       ["Views", p.stats.views],
//                       ["Shortlists", p.stats.shortlists],
//                       ["Visits", p.stats.visits],
//                       ["Offers", p.stats.offers],
//                     ] as const
//                   ).map(([l, v]) => (
//                     <div key={l} className="flex flex-col-reverse gap-1">
//                       <dt className="text-[11px] text-rez-graphite">{l}</dt>
//                       <dd className="text-base leading-none font-bold">{v}</dd>
//                     </div>
//                   ))}
//                 </dl>
//                 <div className="flex flex-wrap items-center justify-between gap-2.5">
//                   <span className="text-xs text-rez-graphite">{p.meta}</span>
//                   <div className="flex flex-wrap gap-2">
//                     <span className="contents" title="Listing management isn't connected in this prototype">
//                       {["Edit", "Delist", "Delete"].map((a) => (
//                         <Button key={a} variant={a === "Delete" ? "destructive" : "secondary"} size="sm" disabled>
//                           {a}
//                         </Button>
//                       ))}
//                     </span>
//                     {LISTING_CTA[p.cta] && (
//                       <Button asChild size="sm">
//                         <Link href={`/account?tab=${LISTING_CTA[p.cta]}`} scroll={false}>
//                           {p.cta.charAt(0) + p.cta.slice(1).toLowerCase()} <Icon name="arrow-right" size={14} />
//                         </Link>
//                       </Button>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </article>
//           </li>
//         ))}
//       </ul>
//       <DemoNotice>Sample listings. Editing, delisting and deleting will be enabled when the listings service is connected.</DemoNotice>
//     </div>
//   );
// }
// 
// 
function Settings() {
  return <AccountEmptyState large />;
}

const nameSchema = z.object({ firstName: personName("first name"), lastName: personName("last name") });
type NameValues = z.infer<typeof nameSchema>;

/** Profile details, with first and last name editable (PUT /user/user/{id}, as rezide.in's profile form). */
function Profile({ user, owner }: { user: Session["user"]; owner: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const editing = pathname === "/dashboard/profile/form";
  const setEditing = (next: boolean) => router.push(next ? "/dashboard/profile/form" : "/dashboard/profile");
  const queryClient = useQueryClient();
  const syncUser = useSessionStore((s) => s.syncUser);
  const name = `${user.firstName} ${user.lastName}`;
  const form = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    values: { firstName: user.firstName, lastName: user.lastName },
    mode: "onTouched",
  });
  const save = useMutation({
    mutationFn: (v: NameValues) => updateUserName(user.id, v),
    onSuccess: (record) => {
      // The header and sidebar read this record (useSyncSessionUser); the session updates now too.
      queryClient.setQueryData(accountQueries.user(user.id).queryKey, record);
      syncUser(record);
      setEditing(false);
      toast.success("Update successfully!");
    },
    // As on rezide.in, the backend's message is shown and the user stays signed in.
    onError: (error) => toast.error(errorMessage(error)),
  });
  const e = form.formState.errors;
  const cancel = () => {
    form.reset({ firstName: user.firstName, lastName: user.lastName });
    save.reset();
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-7 rounded-xl border border-rez-smoke p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-[18px]">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-black text-2xl font-bold text-rez-full-white sm:size-24">{initials(name)}</span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[max(12px,calc(22px*var(--property-type-scale,1)))] font-semibold break-words">{name}</span>
            <span className="text-[13px] font-medium text-rez-graphite">{owner ? "Property owner" : "Property seeker"}</span>
          </div>
        </div>
        {!editing && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Icon name="pencil" size={16} />
            Edit Profile
          </Button>
        )}
      </div>

      {editing ? (
        <form id="profile-form" noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name" required error={e.firstName?.message}>
              <Input autoComplete="given-name" autoFocus {...form.register("firstName")} />
            </Field>
            <Field label="Last name" required error={e.lastName?.message}>
              <Input autoComplete="family-name" {...form.register("lastName")} />
            </Field>
          </div>
        </form>
      ) : null}

      <dl className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
        {[
          ...(editing ? [] : [["First name", user.firstName], ["Last name", user.lastName]]),
          ["Mobile number", formatPhone(user.phone)],
          ["Email", user.email || "Not added"],
        ].map(([l, v]) => (
          <div key={l} className="flex flex-col gap-2 border-b border-rez-smoke pb-3.5">
            <dt className="text-[13px] font-semibold text-rez-graphite">{l}</dt>
            <dd className="text-base font-medium break-words">{v}</dd>
          </div>
        ))}
      </dl>

      {editing && (
        <div className="flex justify-center gap-3">
          <Button type="button" variant="secondary" onClick={cancel} disabled={save.isPending} className="min-w-[160px]">
            Cancel
          </Button>
          <Button type="submit" form="profile-form" disabled={save.isPending} className="min-w-[160px]">
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function AccountView() {
  const { session, status } = useSession();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => { if (status !== "loading" && !session) router.replace("/"); }, [status, session, router]);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("buy");

  if (status === "loading") {
    return <div className="mx-auto h-[60vh] w-full max-w-[1156px] animate-pulse px-4 py-2 md:w-[calc(100%_-_64px)] md:max-w-[1280px] md:px-0" aria-busy="true" />;
  }
  if (!session) return <div className="min-h-[60vh]" aria-busy="true" />;
  if (session.user.role === "realtor") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <h1 className="sr-only">Customer account</h1>
        <EmptyState icon="user" title="You’re signed in as a realtor." action={<Button asChild><Link href="/dashboard">Open realtor dashboard</Link></Button>}>
          Customer accounts are for property seekers and owners.
        </EmptyState>
      </div>
    );
  }

  const owner = isOwnerAccountPath(pathname);
  const menu = owner ? OWNER_MENU : SEEKER_MENU;
  const requested = (accountTabForPath(pathname) ?? params.get("tab")) as Tab | null;
  const tab: Tab = menu.some(([id]) => id === requested) ? (requested as Tab) : menu[0][0];
  const ownerActivity = owner && (tab === "visits" || tab === "offers");
  const comingSoon = !owner && (tab === "visits" || tab === "offers");

  const content = (() => {
    switch (tab) {
      case "viewed":
      case "shared":
      case "shortlisted":
      case "rejected":
        return (
          <ActivityList
            key={tab}
            tab={tab}
            filter={hasProjectActivity(tab) ? activityFilter : activityFilter === "project" ? "buy" : activityFilter}
            user={session.user}
          />
        );
      case "visits":
      case "offers":
        return owner ? <AccountEmptyState large /> : <ComingSoon />;
      // case "listings":
      //   return <OwnerListings />;
      case "settings":
        return <Settings />;
      case "profile":
        return <Profile user={session.user} owner={owner} />;
    }
  })();

  return (
    <div className="mx-auto grid w-full max-w-[1156px] flex-1 grid-cols-1 items-start gap-4 px-4 py-2 md:w-[calc(100%_-_64px)] md:max-w-[1280px] md:grid-cols-[calc(280px*var(--property-space-scale,1))_minmax(0,1fr)] md:gap-6 md:px-0 xl:grid-cols-[calc(364px*var(--property-space-scale,1))_minmax(0,1fr)] xl:gap-9">
      <div className="flex min-w-0 flex-col md:sticky md:top-5">
        <AccountSidebar key={pathname} session={session} active={tab} compact />
      </div>
      <section className="flex min-w-0 flex-col gap-6 pt-2 md:gap-9 md:pt-1" aria-label={tab === "settings" ? "Settings" : undefined} aria-labelledby={tab === "settings" ? undefined : "account-title"}>
        {comingSoon || tab === "settings" ? content : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 id="account-title" className={`text-[22px] md:text-[max(12px,calc(26px*var(--property-type-scale,1)))] leading-tight font-semibold tracking-[-0.02em] ${ownerActivity ? "lg:text-[max(12px,calc(26px*var(--property-type-scale,1)))]" : ""}`}>
                  {TITLES[tab](owner)}
                </h1>
              </div>
              {(ACTIVITY_TABS.includes(tab) || ownerActivity) && (
                <Segmented
                  label={hasProjectActivity(tab) ? "Activity type" : "Sale or rental"}
                  value={hasProjectActivity(tab) ? activityFilter : activityFilter === "project" ? "buy" : activityFilter}
                  onChange={(value) => {
                    if (value === "project" || value === "buy" || value === "rent") setActivityFilter(value);
                  }}
                  appearance="solid"
                  size="sm"
                  options={[
                    { value: "buy", label: "Sale" },
                    { value: "rent", label: "Rental" },
                    ...(hasProjectActivity(tab) ? [{ value: "project", label: "Projects" }] : []),
                  ]}
                  className="border border-rez-smoke bg-white"
                />
              )}
              {/* My Listings add action is temporarily disabled.
              {tab === "listings" && (
                <Button asChild>
                  <Link href="/list-property">
                    <Icon name="plus" size={18} /> Add listing
                  </Link>
                </Button>
              )}

              */}
            </div>
            {content}
          </>
        )}
      </section>
    </div>
  );
}