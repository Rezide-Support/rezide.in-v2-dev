"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";
import { personName } from "@/lib/validation";
import { updateUserName } from "@/services/auth";
import { Icon } from "@/components/brand/icon";
import { ToggleChip } from "@/components/common/chip";
import { DemoNotice, EmptyState, ErrorState, SampleBadge } from "@/components/common/feedback";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PropertyCard } from "@/features/properties/property-card";
import { CATEGORIES } from "@/lib/constants";
import { formatDate, formatNumber, formatPhone, initials } from "@/lib/format";
import { accountQueries } from "@/lib/queries";
import { ACCOUNT_RECORDS_AVAILABLE } from "@/services/account";
import { cn } from "@/lib/utils";
import type { ActivityTab, Session } from "@/types/models";
import { useSession, useSessionStore } from "@/stores/session";
import { AccountSidebar, OWNER_MENU, SEEKER_MENU, type AccountTab } from "./account-sidebar";
import { ownerListingCard, ownerTotals, type ActivityRow } from "./presenters";

type Tab = AccountTab;
type Market = "buy" | "rent";

const TITLES: Record<Tab, (owner: boolean) => string> = {
  viewed: () => "Viewed by me",
  shared: () => "Shared with me",
  shortlisted: () => "Shortlisted by me",
  rejected: () => "Rejected by me",
  visits: (o) => (o ? "Visits for my property" : "My visits"),
  offers: (o) => (o ? "Offers on my property" : "My offers"),
  listings: () => "My listings",
  profile: () => "Profile",
  settings: () => "Settings",
};

const ACTIVITY_TABS: Tab[] = ["viewed", "shared", "shortlisted", "rejected", "visits", "offers"];

const TONES = { ok: "bg-black text-rez-full-white", warm: "bg-rez-mocaccino text-black", muted: "bg-rez-full-white text-black" };

function ActivityList({ tab, intent, user }: { tab: ActivityTab; intent: Market; user: Session["user"] }) {
  const { data, isPending, isError, refetch } = useQuery(accountQueries.activity(tab, user));
  const [category, setCategory] = useState("all");
  if (isPending) return <div className="h-64 animate-pulse rounded-xl bg-rez-cloud" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  const items = data.filter((i) => (category === "all" || i.property.category === category) && i.property.intent === intent);
  const groups = items.reduce<{ date: string; items: typeof items }[]>((acc, it) => {
    const g = acc.find((x) => x.date === it.date);
    if (g) g.items.push(it);
    else acc.push({ date: it.date, items: [it] });
    return acc;
  }, []);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none" role="group" aria-label="Property type">
        {[{ id: "all", label: "All" }, ...CATEGORIES].map((c) => (
          <ToggleChip key={c.id} size="sm" pressed={category === c.id} onClick={() => setCategory(c.id)}>
            {c.label}
          </ToggleChip>
        ))}
      </div>
      {groups.length === 0 ? (
        <EmptyState title="Nothing here yet." icon="compass">
          No {intent === "buy" ? "sale" : "rental"} properties{category !== "all" ? " of this type" : ""} in this list.
        </EmptyState>
      ) : (
        groups.map((g) => (
          <section key={g.date} className="flex flex-col gap-4" aria-label={formatDate(g.date)}>
            <div className="flex items-center gap-4" aria-hidden>
              <span className="h-px flex-1 bg-rez-smoke" />
              <span className="rounded-full bg-rez-cloud px-4 py-2 text-[13px] font-semibold text-rez-graphite">{formatDate(g.date)}</span>
              <span className="h-px flex-1 bg-rez-smoke" />
            </div>
            <ul className="flex flex-col gap-5">
              {g.items.map((it) => (
                <li key={it.propertyId} className="flex flex-col gap-2">
                  {it.note && <p className="rounded-xl border border-rez-smoke px-3.5 py-2.5 text-[13px] font-medium">{it.note}</p>}
                  <PropertyCard property={it.property} layout="row" />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function Rows({ rows }: { rows: ActivityRow[] }) {
  return (
    <ul className="overflow-hidden rounded-xl border border-rez-smoke">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-5 gap-y-4 border-b border-rez-smoke bg-white px-[22px] py-[18px] last:border-b-0">
          <div className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-[14px] bg-rez-cloud py-2.5">
            <span className="text-xl leading-none font-bold">{r.day}</span>
            <span className="text-[11px] font-semibold tracking-[0.08em] text-rez-graphite">{r.month}</span>
          </div>
          <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
            <span className="text-base font-semibold">{r.title}</span>
            <span className="text-[13px] leading-snug text-rez-graphite">{r.subtitle}</span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-base font-bold">{r.value}</span>
            <span className={cn("flex h-[26px] items-center rounded-full px-3 text-xs font-semibold", TONES[r.tone])}>{r.status}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function VisitsOrOffers({ kind, owner, intent }: { kind: "visits" | "offers"; owner: boolean; intent: Market }) {
  const role = owner ? "owner" : "seeker";
  const visits = useQuery({ ...accountQueries.visits(role), enabled: kind === "visits" });
  const offers = useQuery({ ...accountQueries.offers(role), enabled: kind === "offers" });
  const q = kind === "visits" ? visits : offers;
  if (q.isPending) return <div className="h-48 animate-pulse rounded-xl bg-rez-cloud" />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  // The sample visits and offers are all on sale listings, as in the prototype.
  if (q.data.length === 0 || intent === "rent") {
    return (
      <EmptyState title="Nothing here yet." icon={kind === "visits" ? "map-pin" : "bag"}>
        {intent === "rent" ? (kind === "visits" ? "Rental visits you book will appear here." : "Offers on rentals will appear here.") : null}
      </EmptyState>
    );
  }
  return <Rows rows={q.data} />;
}

/** Listing actions that lead somewhere real in this build; the others stay hidden. */
const LISTING_CTA: Record<string, Tab | undefined> = { "View Offers": "offers", "View Visits": "visits" };

function OwnerListings() {
  const q = useQuery(accountQueries.listings());
  if (q.isPending) return <div className="h-64 animate-pulse rounded-xl bg-rez-cloud" />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const statusTone = { Live: "bg-black text-rez-full-white", "Under review": "bg-rez-mocaccino text-black", Draft: "bg-white text-black" };
  const totals = ownerTotals(q.data);
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Listings", formatNumber(totals.listings)],
          ["Total views", formatNumber(totals.views)],
          ["Visits", formatNumber(totals.visits)],
          ["Offers", formatNumber(totals.offers)],
        ].map(([l, v]) => (
          <div key={l} className="flex flex-col-reverse gap-2 rounded-xl bg-rez-cloud px-5 py-[18px]">
            <dt className="text-[13px] font-medium text-rez-graphite">{l}</dt>
            <dd className="text-[28px] leading-none font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-col gap-4">
        {q.data.map(ownerListingCard).map((p) => (
          <li key={p.id}>
            <article className="grid grid-cols-1 overflow-hidden rounded-xl border border-rez-smoke bg-white sm:grid-cols-[240px_minmax(0,1fr)]">
              <div className="relative min-h-[190px] bg-rez-cloud">
                <Image src={p.image} alt="" fill sizes="(min-width: 640px) 240px, 100vw" quality={70} className="object-cover" />
                <span className={cn("absolute top-3.5 left-3.5 flex h-7 items-center rounded-full px-3 text-xs font-semibold", statusTone[p.status])}>{p.status}</span>
              </div>
              <div className="flex flex-col gap-3.5 px-[22px] py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-[19px] leading-tight font-semibold">{p.title}</h3>
                    <span className="text-sm text-rez-graphite">{p.locality}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[22px] leading-none font-bold">{p.price}</span>
                    <span className="text-xs font-medium text-rez-graphite">{p.intentLabel}</span>
                  </div>
                </div>
                <dl className="grid grid-cols-4 gap-1 rounded-[14px] bg-rez-cloud px-2 py-3 text-center">
                  {(
                    [
                      ["Views", p.stats.views],
                      ["Shortlists", p.stats.shortlists],
                      ["Visits", p.stats.visits],
                      ["Offers", p.stats.offers],
                    ] as const
                  ).map(([l, v]) => (
                    <div key={l} className="flex flex-col-reverse gap-1">
                      <dt className="text-[11px] text-rez-graphite">{l}</dt>
                      <dd className="text-base leading-none font-bold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <span className="text-xs text-rez-graphite">{p.meta}</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="contents" title="Listing management isn't connected in this prototype">
                      {["Edit", "Delist", "Delete"].map((a) => (
                        <Button key={a} variant={a === "Delete" ? "destructive" : "secondary"} size="sm" disabled>
                          {a}
                        </Button>
                      ))}
                    </span>
                    {LISTING_CTA[p.cta] && (
                      <Button asChild size="sm">
                        <Link href={`/account?tab=${LISTING_CTA[p.cta]}`} scroll={false}>
                          {p.cta.charAt(0) + p.cta.slice(1).toLowerCase()} <Icon name="arrow-right" size={14} />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <DemoNotice>Sample listings. Editing, delisting and deleting will be enabled when the listings service is connected.</DemoNotice>
    </div>
  );
}

function Settings() {
  const [prefs, setPrefs] = useState({ visits: true, offers: true, shared: true, whatsapp: true, newsletter: false });
  const rows: [keyof typeof prefs, string, string][] = [
    ["visits", "Visit reminders", "A reminder a day before and an hour before every visit."],
    ["offers", "Offer updates", "New offers, counters and acceptances."],
    ["shared", "Shared by realtors", "When a realtor shares a home with you."],
    ["whatsapp", "WhatsApp updates", "Get the same alerts on WhatsApp."],
    ["newsletter", "Weekly newsletter", "Stay updated in the loop, once a week."],
  ];
  return (
    <div className="flex flex-col gap-4">
      <ul className="overflow-hidden rounded-xl border border-rez-smoke">
        {rows.map(([k, l, d]) => (
          <li key={k} className="flex items-center gap-4 border-b border-rez-smoke px-[22px] py-[18px] last:border-b-0">
            <label htmlFor={`pref-${k}`} className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[15px] font-semibold">{l}</span>
              <span className="text-[13px] text-rez-graphite">{d}</span>
            </label>
            <Switch id={`pref-${k}`} checked={prefs[k]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [k]: v }))} />
          </li>
        ))}
      </ul>
      <DemoNotice>Notification preferences are not saved in this prototype and reset when you reload.</DemoNotice>
    </div>
  );
}

const nameSchema = z.object({ firstName: personName("first name"), lastName: personName("last name") });
type NameValues = z.infer<typeof nameSchema>;

/** Profile details, with first and last name editable (PUT /user/user/{id}, as rezide.in's profile form). */
function Profile({ user, owner }: { user: Session["user"]; owner: boolean }) {
  const [editing, setEditing] = useState(false);
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
            <span className="text-[22px] font-semibold break-words">{name}</span>
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
        <form noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name" required error={e.firstName?.message}>
              <Input autoComplete="given-name" autoFocus {...form.register("firstName")} />
            </Field>
            <Field label="Last name" required error={e.lastName?.message}>
              <Input autoComplete="family-name" {...form.register("lastName")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <Button type="button" variant="secondary" onClick={cancel} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
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
    </div>
  );
}

export function AccountView() {
  const { session, status } = useSession();
  const params = useSearchParams();
  const [intent, setIntent] = useState<Market>("buy");

  if (status === "loading") {
    return <div className="mx-auto h-[60vh] w-full max-w-[1280px] animate-pulse p-8" aria-busy="true" />;
  }
  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center bg-rez-cloud px-4 py-16">
        <EmptyState
          icon="lock"
          title="Sign in to see your account."
          className="w-full max-w-md border-solid bg-white"
          action={
            <>
              <Button asChild size="lg">
                <Link href={`/login?next=${encodeURIComponent("/account")}`}>Sign in</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/signup">Create account</Link>
              </Button>
            </>
          }
        >
          Your saved homes, visits and offers appear here.
        </EmptyState>
      </div>
    );
  }
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

  const owner = session.user.role === "owner";
  const menu = owner ? OWNER_MENU : SEEKER_MENU;
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = menu.some(([id]) => id === requested) ? (requested as Tab) : menu[0][0];

  const content = (() => {
    switch (tab) {
      case "viewed":
      case "shared":
      case "shortlisted":
      case "rejected":
        return <ActivityList key={tab} tab={tab} intent={intent} user={session.user} />;
      case "visits":
      case "offers":
        return <VisitsOrOffers kind={tab} owner={owner} intent={intent} />;
      case "listings":
        return <OwnerListings />;
      case "settings":
        return <Settings />;
      case "profile":
        return <Profile user={session.user} owner={owner} />;
    }
  })();

  return (
    <div className="mx-auto grid grid-cols-1 w-full max-w-[1280px] flex-1 items-start gap-4 p-4 md:grid-cols-[280px_minmax(0,1fr)] md:gap-10 md:p-8">
      <div className="flex min-w-0 flex-col gap-3.5 md:sticky md:top-5">
        <AccountSidebar session={session} active={tab} />
        <p className="px-1 text-xs text-rez-graphite">Demo session · expires {formatDate(session.expiresAt)}</p>
      </div>
      <section className="flex min-w-0 flex-col gap-6" aria-labelledby="account-title">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 id="account-title" className="text-[28px] leading-tight font-semibold tracking-[-0.02em] md:text-[36px]">
              {TITLES[tab](owner)}
            </h1>
            {(tab === "visits" || tab === "offers") && ACCOUNT_RECORDS_AVAILABLE && <SampleBadge>Sample activity</SampleBadge>}
          </div>
          {ACTIVITY_TABS.includes(tab) && (
            <Segmented
              label="Sale or rental"
              value={intent}
              onChange={setIntent}
              appearance="solid"
              options={[
                { value: "buy", label: "Sale" },
                { value: "rent", label: "Rental" },
              ]}
              className="border border-rez-smoke bg-white"
            />
          )}
          {tab === "listings" && (
            <Button asChild>
              <Link href="/list-property">
                <Icon name="plus" size={18} /> Add listing
              </Link>
            </Button>
          )}
        </div>
        {content}
      </section>
    </div>
  );
}
