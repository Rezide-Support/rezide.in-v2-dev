"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Building2, Home, House, Scale, UserRound } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useOpenSignIn } from "@/features/auth/sign-in-modal";
import { useCompareItems } from "@/stores/saved";
import { useSession } from "@/stores/session";
import { cn } from "@/lib/utils";

const SECTIONS = [
  ["overview", "Overview"], ["key", "Key features"], ["visit", "Visit details"],
  ["brokers", "Listing broker"], ["property", "Property"], ["dimensions", "Dimensions"],
  ["amenities", "Amenities"], ["project", "Project"], ["neighborhood", "Locality"],
  ["recent", "Transactions"], ["similar", "Similar apartments"], ["compare", "Compare apartments"],
] as const;

/** Listing-only navigation; dialogs use z-50 and stay above this z-40 bar. */
export function MobileListingNav() {
  const { status } = useSession();
  const saved = useCompareItems();
  const signIn = useOpenSignIn();
  const [drawer, setDrawer] = useState<"compare" | "account" | null>(null);
  const [visible, setVisible] = useState<string[]>([]);
  const [active, setActive] = useState("overview");
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const sections = SECTIONS.filter(([id]) => {
        if ((id === "recent" || id === "compare") && status !== "authenticated") return false;
        return !!document.getElementById(id)?.getClientRects().length;
      });
      const ids = sections.map(([id]) => id);
      setVisible(previous => previous.join() === ids.join() ? previous : ids);
      // Account for both the main header and the mobile city row.
      const offset = (document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 60) + 12;
      let next = ids[0] ?? "overview";
      for (const id of ids) {
        if (document.getElementById(id)!.getBoundingClientRect().top <= offset + 4) next = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) next = ids.at(-1) ?? next;
      setActive(next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.querySelector("[data-listing-detail]") ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["id"] });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [status]);

  useEffect(() => {
    const button = strip.current?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!button || !strip.current) return;
    const left = button.offsetLeft - strip.current.clientWidth / 2 + button.clientWidth / 2;
    strip.current.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [active]);

  const jump = (id: string) => {
    const section = document.getElementById(id);
    if (!section) return;
    const offset = (document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 60) + 12;
    window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - offset, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setActive(id);
  };
  const open = (kind: "compare" | "account") => status === "authenticated" ? setDrawer(kind) : signIn();
  const navItem = "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] text-rez-graphite";

  return <>
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_#00000014] lg:hidden">
      <nav aria-label="Listing sections" ref={strip} className="relative flex gap-4 overflow-x-auto bg-black px-3 py-2.5 text-xs text-white scrollbar-none">
        {SECTIONS.filter(([id]) => visible.includes(id)).map(([id, label]) => <button key={id} type="button" data-section={id} onClick={() => jump(id)} aria-current={active === id ? "location" : undefined} className={cn("shrink-0 border-b-2 border-transparent pb-1 whitespace-nowrap", active === id && "border-white font-semibold")}>{label}</button>)}
      </nav>
      <nav aria-label="Mobile navigation" className="flex border-t border-rez-smoke">
        <Link href="/" className={navItem}><Home size={20} />Home</Link>
        <Link href="/projects" className={navItem}><Building2 size={20} />Projects</Link>
        <Link href="/properties" className={cn(navItem, "font-semibold text-black")}><House size={20} />Properties</Link>
        <button type="button" onClick={() => open("compare")} className={navItem}><Scale size={20} />Compare{status === "authenticated" && saved.length > 0 && <span className="absolute top-0.5 left-1/2 ml-2 rounded-full bg-black px-1.5 text-[9px] text-white">{saved.length}</span>}</button>
        <button type="button" onClick={() => open("account")} className={navItem}><UserRound size={20} />Account</button>
      </nav>
    </div>
    <Sheet open={drawer !== null} onOpenChange={open => { if (!open) setDrawer(null); }}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl px-5 pt-5 pb-[max(24px,env(safe-area-inset-bottom))]">
        <SheetHeader><SheetTitle>{drawer === "compare" ? "Your comparison" : "Your account"}</SheetTitle><SheetDescription>{drawer === "compare" ? "Review your selected properties and projects." : "Manage your profile and property activity."}</SheetDescription></SheetHeader>
        {drawer === "compare" ? <>
          {saved.length ? <ul className="divide-y divide-rez-smoke">{saved.map(item => <li key={`${item.kind}:${item.id}`} className="py-3"><Link href={`/${item.kind === "project" ? "projects" : "properties"}/${item.id}`} onClick={() => setDrawer(null)}>{item.title}</Link></li>)}</ul> : <p>No properties selected yet. Use Compare on a listing to add one.</p>}
          <Link href="/compare" onClick={() => setDrawer(null)} className="rounded-full bg-black px-4 py-3 text-center font-semibold text-white">Open comparison table</Link>
        </> : <nav className="flex flex-col gap-1">{[["/dashboard/my-searches/viewed", "My account"], ["/dashboard/my-searches/viewed", "Viewed properties"], ["/dashboard/my-searches/shortlisted", "Shortlisted properties"], ["/dashboard/profile", "Profile"]].map(([href, label]) => <Link key={href} href={href} onClick={() => setDrawer(null)} className="rounded-lg p-3 hover:bg-rez-cloud">{label}</Link>)}</nav>}
      </SheetContent>
    </Sheet>
  </>;
}
