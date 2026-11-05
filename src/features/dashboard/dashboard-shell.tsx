"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { MenuIcon } from "lucide-react";
import { Icon, type IconName } from "@/components/brand/icon";
import { Logo } from "@/components/brand/logo";
import { EmptyState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession, useSessionStore } from "@/stores/session";
import { notAvailable } from "./ui";

export { PageHeader } from "./ui";

type Sub = { label: string; href?: string; match?: string[] };
type NavEntry = { label: string; icon: IconName; href?: string; match?: string[]; subs?: Sub[]; badge?: string };

const CONTACT_PATHS = ["/dashboard/contacts", "/dashboard/groups"];

const MAIN: NavEntry[] = [
  {
    label: "Contact",
    icon: "user-alt",
    href: "/dashboard/contacts",
    match: CONTACT_PATHS,
    subs: [
      { label: "All Contacts", href: "/dashboard/contacts", match: ["/dashboard/contacts"] },
      { label: "Groups", href: "/dashboard/groups", match: ["/dashboard/groups"] },
      { label: "Upload History" },
    ],
  },
  { label: "Database", icon: "folder", href: "/dashboard/database", match: ["/dashboard/database"] },
  { label: "Leads", icon: "star" },
  { label: "Listing", icon: "file-text" },
  { label: "Inventory", icon: "compass" },
  { label: "Marketing Center", icon: "share" },
];
const ADMIN: NavEntry[] = [
  { label: "Customisation", icon: "pencil" },
  { label: "WhatsApp Templates", icon: "message" },
  { label: "Integration", icon: "sliders" },
  { label: "Manage Teams", icon: "user-alt", href: "/dashboard/teams", match: ["/dashboard/teams"] },
  { label: "Subscription", icon: "badge-star", badge: "Coming Soon" },
];
const ACCOUNT: Sub[] = [
  { label: "Firm Profile", href: "/dashboard/firm", match: ["/dashboard/firm"] },
  { label: "My Profile", href: "/dashboard/profile", match: ["/dashboard/profile"] },
  { label: "View Credits", href: "/dashboard/credits", match: ["/dashboard/credits"] },
];

const inPaths = (pathname: string, paths?: string[]) => !!paths?.some((m) => pathname === m || pathname.startsWith(`${m}/`));

const itemClass = (on: boolean, strong = false) =>
  cn(
    "flex h-10 w-full items-center gap-3 rounded-[12px] px-3 text-left text-sm transition-colors",
    on ? (strong ? "bg-black font-semibold text-rez-full-white" : "bg-[#F4F4F4] font-semibold text-black") : "font-medium text-rez-arsenic hover:bg-[#F4F4F4]",
  );

function SubList({ subs, pathname, onNavigate, id }: { subs: Sub[]; pathname: string; onNavigate?: () => void; id?: string }) {
  return (
    <ul id={id} className="mt-1 mb-1 ml-[22px] flex flex-col gap-1 border-l border-[#E0E0E0] pl-3">
      {subs.map((s) => {
        const on = inPaths(pathname, s.match);
        return (
          <li key={s.label}>
            {s.href ? (
              <Link href={s.href} onClick={onNavigate} aria-current={on ? "page" : undefined} className={cn(itemClass(on, true), "h-9 px-3")}>
                {s.label}
              </Link>
            ) : (
              <button type="button" onClick={() => notAvailable(s.label)} className={cn(itemClass(false), "h-9 px-3")}>
                {s.label}
                <span className="sr-only"> (not in this prototype)</span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function NavItems({ items, pathname, onNavigate, strong }: { items: NavEntry[]; pathname: string; onNavigate?: () => void; strong?: boolean }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((n) => {
        const on = inPaths(pathname, n.match);
        const content = (
          <>
            <Icon name={n.icon} size={18} />
            <span className="flex-1">{n.label}</span>
            {n.badge && (
              <span className="rounded-full bg-rez-cloud px-2 py-0.5 text-[9px] leading-[1.1] font-bold tracking-[0.06em] text-rez-arsenic uppercase">{n.badge}</span>
            )}
          </>
        );
        return (
          <li key={n.label}>
            {n.href ? (
              <Link href={n.href} onClick={onNavigate} aria-current={on && !n.subs ? "page" : undefined} className={itemClass(on, strong)}>
                {content}
              </Link>
            ) : (
              <button type="button" onClick={() => notAvailable(n.label)} className={itemClass(false)}>
                {content}
                <span className="sr-only"> (not in this prototype)</span>
              </button>
            )}
            {n.subs && on && <SubList subs={n.subs} pathname={pathname} onNavigate={onNavigate} />}
          </li>
        );
      })}
    </ul>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const inAccount = ACCOUNT.some((a) => inPaths(pathname, a.match));
  const [open, setOpen] = useState(true);
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-5">
      <NavItems items={MAIN} pathname={pathname} onNavigate={onNavigate} />
      <div className="flex flex-col gap-2">
        <span className="px-3 text-sm text-rez-graphite">Admin</span>
        <NavItems items={ADMIN} pathname={pathname} onNavigate={onNavigate} strong />
        <div>
          <button type="button" aria-expanded={open} aria-controls="dash-account-menu" onClick={() => setOpen((o) => !o)} className={cn(itemClass(inAccount), "font-semibold text-black")}>
            <Icon name="settings" size={18} />
            <span className="flex-1">Manage Account</span>
            <Icon name="chevron-left" size={14} className={cn("transition-transform", open ? "-rotate-90" : "rotate-180")} aria-hidden />
          </button>
          {open && <SubList id="dash-account-menu" subs={ACCOUNT} pathname={pathname} onNavigate={onNavigate} />}
        </div>
      </div>
    </nav>
  );
}

function PathAwareNav({ onNavigate }: { onNavigate?: () => void }) {
  return <SidebarNav pathname={usePathname()} onNavigate={onNavigate} />;
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { session } = useSession();
  const signOut = useSessionStore((s) => s.signOut);
  const router = useRouter();
  const name = session ? `${session.user.firstName} ${session.user.lastName}` : "";
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-col gap-6 px-3.5 pt-6 pb-6">
        <Link href="/" aria-label="Rezide home" className="flex justify-center text-black">
          <Logo height={24} />
        </Link>
        <div className="flex items-center gap-2.5 rounded-[12px] border border-rez-smoke px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black text-[11px] font-bold text-rez-full-white">{initials(name)}</span>
          <span className="flex min-w-0 flex-col">
            <b className="truncate text-sm font-semibold">{name}</b>
            <span className="truncate text-xs text-rez-graphite">{session?.user.firm ?? "Buildstone Realty LLP"}</span>
          </span>
        </div>
        <Suspense fallback={<SidebarNav pathname="" />}>
          <PathAwareNav onNavigate={onNavigate} />
        </Suspense>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#E0E0E0] px-5 py-4">
        <span className="text-xs text-rez-graphite">Owner · Admin access</span>
        <button
          type="button"
          onClick={() => {
            signOut();
            router.push("/");
          }}
          className="text-xs font-semibold underline underline-offset-4 hover:text-rez-mocaccino-ink"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  if (status === "loading") return <div className="min-h-dvh bg-white" aria-busy="true" />;
  if (!session || session.user.role !== "realtor") {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center bg-rez-cloud px-4">
        <EmptyState
          icon="lock"
          title={session ? "The dashboard is for realtor accounts." : "Sign in to your realtor dashboard."}
          className="w-full max-w-md border-solid bg-white"
          action={
            <>
              <Button asChild size="lg">
                <Link href={`/login?role=realtor&next=${encodeURIComponent("/dashboard")}`}>Realtor sign in</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/">Back to Rezide</Link>
              </Button>
            </>
          }
        >
          {session ? "You’re signed in with a customer account." : "Use the mobile number registered with your firm."}
        </EmptyState>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh bg-white">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 overflow-y-auto border-r border-[#E0E0E0] bg-white lg:block">
        <SidebarBody />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#E0E0E0] bg-white px-4 py-3 lg:hidden">
          <Link href="/" aria-label="Rezide home">
            <Logo height={18} />
          </Link>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon" aria-label="Open dashboard menu">
                <MenuIcon className="size-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] overflow-y-auto p-0">
              <SheetTitle className="sr-only">Dashboard menu</SheetTitle>
              <SheetDescription className="sr-only">Dashboard navigation</SheetDescription>
              <SidebarBody onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
        <main id="main" className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-5 md:px-10 md:py-7">
          <p className="w-fit rounded-full border border-dashed border-rez-steel bg-rez-cream px-3.5 py-1 text-xs text-rez-arsenic" role="note">
            Demo dashboard · sample firm data · simulated session. Changes last until you reload.
          </p>
          {children}
        </main>
      </div>
    </div>
  );
}
