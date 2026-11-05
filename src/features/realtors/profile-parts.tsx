"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Icon } from "@/components/brand/icon";
import { EmptyState } from "@/components/common/feedback";
import { Pagination } from "@/components/common/pagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PropertyCard } from "@/features/properties/property-card";
import { cn } from "@/lib/utils";
import type { AgentSummary } from "@/services/catalog";
import type { PostalAddress, Property, RealtorSocials } from "@/types/models";
import { realtorHref } from "./links";
import { listingQuery, paginateListings, parseListingParams, type ListingIntent } from "./listings";

/* Building blocks shared by the firm and agent pages (layout follows rezide.in v1). */

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.label} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <Icon name="chevron-left" size={12} className="rotate-180 text-rez-graphite" />}
            {item.href ? (
              <Link href={item.href} className="font-semibold text-rez-mocaccino-ink hover:text-black hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate font-semibold text-black">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Label over value, as in v1's "Operating since / Team Size / Address" rows. */
export function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <dt className="text-[15px] font-semibold text-black">{label}</dt>
      <dd className="text-sm leading-relaxed text-rez-graphite">{children}</dd>
    </div>
  );
}

export const listOrNone = (values: string[] | undefined) =>
  values && values.length ? values.join(", ") : <span className="italic">Not listed</span>;

/** "Address: View" opens the address in a dialog. */
export function AddressDialog({ title, address }: { title: string; address?: PostalAddress | null }) {
  if (!address) return <span className="italic">Not listed</span>;
  return (
    <Dialog>
      <DialogTrigger className="font-semibold text-rez-mocaccino-ink underline-offset-4 hover:text-black hover:underline">
        View<span className="sr-only"> {title.toLowerCase()}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-xs text-rez-graphite">As provided by the firm.</DialogDescription>
        </DialogHeader>
        <address className="rounded-xl border border-rez-smoke px-5 py-4 text-[15px] leading-relaxed text-rez-arsenic not-italic">
          {address.lines.map((l) => (
            <span key={l} className="block">
              {l},
            </span>
          ))}
          <span className="block">
            {address.city}
            {address.pincode ? ` - ${address.pincode}` : ""}
          </span>
        </address>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Listings: Sale / Rental toggle + pagination, state in the URL ---------- */

export function ListingsSection({ heading, listings, emptyWho }: { heading: string; listings: Property[]; emptyWho: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const sectionRef = useRef<HTMLElement>(null);
  const view = paginateListings(listings, parseListingParams(params));
  const hrefFor = (intent: ListingIntent, page = 1) => `${pathname}${listingQuery({ intent, page })}`;

  const goToPage = (page: number) => {
    startTransition(() => router.push(hrefFor(view.intent, page), { scroll: false }));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sectionRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const tabs: { intent: ListingIntent; label: string; count: number }[] = [
    { intent: "buy", label: "Available Sale", count: view.saleCount },
    { intent: "rent", label: "Available Rental", count: view.rentCount },
  ];

  return (
    <section ref={sectionRef} aria-labelledby="profile-listings" className="flex scroll-mt-6 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="profile-listings" className="text-[24px] leading-tight font-semibold tracking-[-0.01em] md:text-[26px]">
          {heading}
        </h2>
        <nav aria-label="Listing type">
          <ul className="inline-flex items-center gap-0.5 rounded-full border border-rez-smoke bg-white p-1">
            {tabs.map((t) => {
              const active = view.intent === t.intent;
              return (
                <li key={t.intent}>
                  <Link
                    href={hrefFor(t.intent)}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-full pr-1.5 pl-3.5 text-[13px] whitespace-nowrap transition-colors duration-200 ease-rez sm:pl-4 sm:text-sm",
                      active ? "bg-black font-semibold text-rez-full-white" : "font-medium text-rez-graphite hover:text-black",
                    )}
                  >
                    {/* "Available" hides visually on very narrow screens (e.g. foldable cover displays). */}
                    <span className="max-[399px]:sr-only">Available </span>
                    {t.label.replace(/^Available /, "")}
                    <span
                      className={cn(
                        "flex h-6 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold",
                        active ? "bg-white text-black" : "bg-rez-cloud text-black",
                      )}
                    >
                      {t.count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div aria-busy={pending} className={cn("transition-opacity", pending && "opacity-60")}>
        {view.items.length === 0 ? (
          <EmptyState icon="file-text" title={`No ${view.intent === "rent" ? "rental" : "sale"} listings yet.`}>
            {emptyWho} has no {view.intent === "rent" ? "rental" : "sale"} listings right now.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {view.items.map((p) => (
              <li key={p.id}>
                <PropertyCard property={p} />
              </li>
            ))}
          </ul>
        )}
        <Pagination page={view.page} pageCount={view.pageCount} onChange={goToPage} label={`${heading} pages`} />
      </div>
    </section>
  );
}

/* ---------- Agent carousel (TEAM MEMBERS / OTHER AGENTS) ---------- */

function AgentTile({ agent: { realtor: r, saleCount, rentCount } }: { agent: AgentSummary }) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-rez-smoke bg-white transition-shadow hover:shadow-rez-md">
      <div className="relative aspect-[4/5] bg-rez-cloud">
        <Image src={r.photo} alt={`Portrait of ${r.name}`} fill sizes="240px" quality={70} className="object-cover object-top" />
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 pt-3 pb-4">
        <h3 className="text-[15px] leading-tight font-semibold">
          <Link href={realtorHref(r)} className="after:absolute after:inset-0">
            {r.name}
          </Link>
        </h3>
        <p className="truncate text-xs text-rez-graphite">{r.role ?? r.firm}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
          <div className="col-span-2 flex gap-1 whitespace-nowrap">
            <dt className="text-rez-graphite">Operating since:</dt>
            <dd className="font-semibold">{r.since || "Not provided"}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-rez-graphite">Rental:</dt>
            <dd className="font-semibold">{rentCount}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-rez-graphite">Sale:</dt>
            <dd className="font-semibold">{saleCount}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export function AgentCarousel({ id, heading, agents, note }: { id: string; heading: string; agents: AgentSummary[]; note?: string }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, agents.length]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  if (agents.length === 0) return null;
  const arrow =
    "flex size-10 shrink-0 items-center justify-center rounded-full border border-rez-smoke bg-white transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <section aria-labelledby={id} aria-roledescription="carousel" className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <span className="w-[88px] max-sm:hidden" aria-hidden />
        <h2 id={id} className="text-xl font-semibold tracking-[0.06em] uppercase sm:flex-1 sm:text-center md:text-2xl">
          {heading}
        </h2>
        <div className="flex gap-2">
          <button type="button" className={arrow} onClick={() => page(-1)} disabled={edges.start} aria-label={`Previous ${heading.toLowerCase()}`}>
            <Icon name="arrow-right" size={16} className="rotate-180" />
          </button>
          <button type="button" className={arrow} onClick={() => page(1)} disabled={edges.end} aria-label={`More ${heading.toLowerCase()}`}>
            <Icon name="arrow-right" size={16} />
          </button>
        </div>
      </div>
      <ul
        ref={scroller}
        onScroll={measure}
        tabIndex={0}
        aria-label={`${heading}, scroll sideways for more`}
        className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2 scrollbar-none focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rez-mocaccino motion-reduce:scroll-auto"
      >
        {agents.map((a, i) => (
          <li
            key={a.realtor.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${agents.length}`}
            className="w-[calc((100%-16px)/2)] shrink-0 snap-start sm:w-[220px]"
          >
            <AgentTile agent={a} />
          </li>
        ))}
      </ul>
      {note && <p className="text-xs text-rez-graphite">{note}</p>}
    </section>
  );
}

/* ---------- Social profile buttons (rendered only for URLs we have) ---------- */

const SOCIAL_LABEL: Record<keyof RealtorSocials, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
};

function SocialGlyph({ name }: { name: keyof RealtorSocials }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": true, focusable: false } as const;
  switch (name) {
    case "linkedin":
      return (
        <svg {...common} fill="currentColor">
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.6h.06c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.77 2.5 4.77 5.75V21h-4v-5.2c0-1.24-.02-2.84-1.8-2.84-1.8 0-2.07 1.35-2.07 2.75V21h-4V9.75Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46h1.55V4.46A20 20 0 0 0 14.3 4.3c-2.25 0-3.8 1.37-3.8 3.9v2.3H8v3h2.5V21h3Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common} fill="currentColor">
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.27 5 12 5 12 5s-6.27 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.77 1.77C5.73 19 12 19 12 19s6.27 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
        </svg>
      );
  }
}

export function SocialLinks({ socials, name }: { socials?: RealtorSocials; name: string }) {
  const entries = (Object.keys(SOCIAL_LABEL) as (keyof RealtorSocials)[]).filter((k) => socials?.[k]);
  if (!entries.length) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-3" aria-label={`${name} on social media`}>
      {entries.map((k) => (
        <li key={k}>
          <a
            href={socials![k]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-10 items-center justify-center rounded-lg bg-black text-rez-full-white hover:bg-rez-arsenic"
          >
            <SocialGlyph name={k} />
            <span className="sr-only">
              {SOCIAL_LABEL[k]} (opens in a new tab)
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
