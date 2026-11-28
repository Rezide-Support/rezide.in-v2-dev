"use client";
import { BACKEND_ID_PATTERN } from "@/lib/ids";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Phone } from "lucide-react";
import { LeadDialog } from "@/features/properties/detail/lead-dialog";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { propertyHref } from "@/features/properties/property-card";
import Link from "next/link";
import { CoverImage } from "@/components/common/cover-image";
import { DirectoryRequestError, directoryQueries } from "@/services/realtor-directory";
import type { DirectoryPersonDetail } from "./directory-model";
import { directoryFirmHref, directoryPersonHref } from "./directory-model";
import { DirectoryPhoto } from "./directory-cards";
import { DirectoryLeadForm } from "./directory-forms";
import { Breadcrumbs } from "./profile-parts";
import { FirmListings } from "./firm-listings";
import { cn } from "@/lib/utils";

/** What rezide.in's realtor page shows for a field the realtor hasn't filled in. */
const NA = "N/A";

/**
 * rezide.in's Address "View" button. It's always shown: it opens the realtor's own addresses
 * or, when they have none (most realtors), their firm's office addresses, read only once opened.
 */
function PersonAddressButton({ person }: { person: DirectoryPersonDetail }) {
  const [open, setOpen] = useState(false);
  const ownAddresses = person.addresses;
  const firm = useQuery({ ...directoryQueries.profile(person.firmName), enabled: open && ownAddresses.length === 0 && !!person.firmName });
  const firmCards = firm.data?.addressCards ?? [];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="font-semibold text-[#0066ff] underline-offset-4 hover:underline">
        View<span className="sr-only"> address of {person.name}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Address</DialogTitle>
          <DialogDescription className="text-xs text-rez-graphite">
            {ownAddresses.length ? `${person.name}'s address, as provided.` : person.firmName ? `${person.firmName}'s office address, as provided by the firm.` : "As provided by the realtor."}
          </DialogDescription>
        </DialogHeader>
        {ownAddresses.length ? (
          <div className="flex flex-wrap items-stretch gap-3">
            {ownAddresses.map((address, i) => (
              <address key={`${address}-${i}`} className="min-w-[220px] flex-1 rounded-xl border border-rez-smoke p-6 text-[15px] leading-relaxed whitespace-pre-line text-rez-graphite not-italic shadow-sm">
                {address}
              </address>
            ))}
          </div>
        ) : firm.isFetching && !firm.data ? (
          <div aria-busy="true" aria-label="Loading address" className="h-28 animate-pulse rounded-xl bg-rez-cloud" />
        ) : firmCards.length ? (
          <div className="flex flex-wrap items-stretch gap-3">
            {firmCards.map((a, i) => (
              <div key={i} className="min-w-[220px] flex-1 rounded-xl border border-rez-smoke p-6 shadow-sm">
                {/* As on the firm page: the first card is the registered address. */}
                <h3 className="mb-4 text-lg font-medium">{a.type || i === 0 ? "Registered Address" : "Office Address"}</h3>
                <address className="text-[15px] leading-relaxed text-rez-graphite not-italic">
                  {a.line1 && <>{a.line1},<br /></>}
                  {a.line2 && <>{a.line2},<br /></>}
                  {[a.city, a.pincode].filter(Boolean).join(" - ")}
                </address>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-rez-smoke p-6 text-[15px] text-rez-graphite">{firm.isError ? "The address couldn't be loaded. Please try again." : NA}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PersonDetails({ person, popup = false }: { person: DirectoryPersonDetail; popup?: boolean }) {
  const Heading = popup ? "h2" : "h1";
  return <div className={cn("grid min-w-0 gap-6", popup ? "lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8" : "lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-4")}>
    <div className={cn("flex min-w-0 flex-col gap-6", !popup && "max-sm:contents")}>
      <header className="border-b border-rez-smoke pb-1 max-sm:order-1"><Heading className="text-base font-semibold [overflow-wrap:anywhere]">{person.name}</Heading><p className="mt-1 text-sm text-rez-graphite">{person.firmName || "Firm not provided"}</p></header>
      <section className="max-sm:order-3"><h2 className="mb-2 text-base font-semibold">About me</h2><p className="text-sm leading-normal whitespace-pre-line text-rez-graphite [overflow-wrap:anywhere]">{person.about || NA}</p></section>
      <dl className={cn("grid gap-x-6 gap-y-7 text-sm max-sm:order-4 max-sm:gap-y-5 sm:grid-cols-3 [&_dt]:font-semibold [&_dd]:mt-2 [&_dd]:text-sm [&_dd]:leading-normal [&_dd]:text-rez-graphite", !popup && "lg:text-base")}>
        <div><dt>Working since</dt><dd>{person.since || NA}</dd></div>
        <div><dt>Spoken Language</dt><dd>{person.languages.join(", ") || NA}</dd></div>
        {/* As rezide.in: Address is always a "View" button (the realtor's or, failing that, the firm's address). */}
        <div><dt>Address</dt><dd><PersonAddressButton person={person} /></dd></div>
        {/* Sub Regions and Localities always read "N/A", as on rezide.in's realtor page (the backend's values aren't shown there). */}
        {[["Area of Specialization", person.specializations], ["Sub Regions", []], ["Localities", []], ["Projects", person.projects]].map(([label, values]) => <div key={String(label)} className="sm:col-span-3"><dt>{String(label)}</dt><dd>{(values as string[]).join(", ") || NA}</dd></div>)}
      </dl>
    </div>
    <aside className={cn("mx-auto flex w-full min-w-0 max-w-[400px] flex-col gap-3 lg:max-w-none", !popup && "max-sm:order-2 max-sm:mb-5")}>
      <DirectoryPhoto src={person.photo} name={person.name} portrait className={cn("aspect-[8/7] min-h-0 w-full rounded-[12px] border border-rez-smoke bg-white p-0 sm:w-full [&_img]:object-contain [&_img]:p-1", !popup && "max-sm:aspect-[1.95/1] max-sm:[&_img]:p-0")} />
      <nav aria-label="Realtor social links" className={cn("flex justify-around gap-3", !popup && "max-sm:mt-1 max-sm:border-t max-sm:border-rez-smoke max-sm:pt-3")}>
        {[{ label: "LinkedIn", icon: "linkedin" }, { label: "Facebook", icon: "facebook" }, { label: "Instagram", icon: "instagram" }, { label: "YouTube", icon: "youtube" }].map(social => {
          const url = person.socials.find(link => link.label.toLowerCase() === social.label.toLowerCase())?.url;
          const safeUrl = url && (url.startsWith("https://") || url.startsWith("http://")) ? url : undefined;
          const icon = <Image src={`/images/social-${social.icon}.svg`} width={18} height={18} alt="" />;
          const className = "flex size-9 items-center justify-center rounded-[6px] bg-black text-white shadow-sm";
          return safeUrl ? <a key={social.label} href={safeUrl} target="_blank" rel="noopener noreferrer" aria-label={social.label} className={className}>{icon}</a> : <span key={social.label} role="img" aria-label={`${social.label} unavailable`} title={`${social.label} unavailable`} className={className}>{icon}</span>;
        })}
      </nav>
      {popup && <div className="mt-6"><DirectoryLeadForm firmId={person.firmId} recipient={person.name} stacked /></div>}
    </aside>
  </div>;
}

function PersonFeedback({ lookupId, popup = false }: { lookupId: string; popup?: boolean }) {
  const query = useQuery(directoryQueries.person(lookupId));
  if (!BACKEND_ID_PATTERN.test(lookupId) || query.error instanceof DirectoryRequestError && query.error.status === 404) return <EmptyState icon="user" title="Realtor not found." />;
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  if (!query.data) return <div aria-busy="true" aria-label="Loading realtor profile" className="h-80 animate-pulse rounded-xl bg-rez-cloud" />;
  return <PersonDetails person={query.data} popup={popup} />;
}

export function LivePersonProfile({ lookupId }: { lookupId: string }) {
  const query = useQuery(directoryQueries.person(lookupId));
  const person = query.data;
  return <div className="mx-auto flex w-full max-w-[1400px] flex-col px-3 py-5 sm:px-6 sm:py-6">
    <div className="mb-6 [&_a]:text-[#0066ff] [&_nav]:text-sm"><Breadcrumbs items={[{ label: "Find-realtor", href: "/realtors" }, ...(person?.firmName ? [{ label: person.firmName, href: directoryFirmHref({ name: person.firmName }) }] : []), { label: person?.name || "Realtor profile" }]} /></div>
    <PersonFeedback lookupId={lookupId} />
    {person && <div className="mx-auto mt-8 w-full max-w-[1100px]"><DirectoryLeadForm firmId={person.firmId} recipient={person.name} wide /></div>}
    {person && <div className="min-w-0 max-sm:[&_section>div>h2]:text-center max-sm:[&_section>div>h2]:text-base"><FirmListings brokerId={person.id} heading={`${person.name} Listings`} /></div>}
  </div>;
}

function PersonListingCarousel({ personId, firstName, purpose }: { personId: string; firstName: string; purpose: "sale" | "rent" }) {
  const list = useRef<HTMLUListElement>(null), headingId = useId();
  const query = useQuery(directoryQueries.personListings(personId, purpose, 1));
  const data = query.data;
  const [arrows, setArrows] = useState({ previous: false, next: false });
  useEffect(() => {
    const node = list.current;
    if (!node) return;
    const update = () => setArrows({ previous: node.scrollLeft > 2, next: node.scrollLeft + node.clientWidth < node.scrollWidth - 2 });
    update();
    node.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => { node.removeEventListener("scroll", update); observer.disconnect(); };
  }, [data]);
  const move = (direction: number) => {
    const node = list.current;
    if (!node) return;
    const step = (node.firstElementChild as HTMLElement | null)?.offsetWidth ?? 264;
    const gap = parseFloat(getComputedStyle(node).columnGap) || 0;
    node.scrollBy({ left: direction * (step + gap), behavior: "smooth" });
  };
  return <section className="mt-8 min-w-0" aria-labelledby={headingId} aria-busy={query.isFetching}>
    <div className="mb-[clamp(12px,3.8dvh,24px)] flex items-center justify-between gap-3"><h3 id={headingId} className="text-[clamp(16px,3.5dvh,20px)] font-semibold">{firstName || "Realtor"} Listings</h3><div className="flex h-8 shrink-0 gap-2"><span className="block size-8">{arrows.previous && <Button variant="outline" aria-label="Previous listings" className="size-8 rounded-full border-rez-smoke bg-white p-0 shadow-sm" onClick={() => move(-1)}><ArrowLeft size={20} /></Button>}</span><span className="block size-8">{arrows.next && <Button variant="outline" aria-label="Next listings" className="size-8 rounded-full border-rez-smoke bg-white p-0 shadow-sm" onClick={() => move(1)}><ArrowRight size={20} /></Button>}</span></div></div>
    {query.isError ? <ErrorState message={query.error.message} onRetry={() => query.refetch()} /> : !data ? <div className="h-64 animate-pulse rounded-xl bg-rez-cloud" /> : !data.items.length ? <EmptyState title={`No ${purpose === "rent" ? "rental" : "sale"} listings available.`} /> : <>
      <ul ref={list} className="flex gap-4 overflow-hidden">{data.items.slice(0, 5).map(property => <li key={property.id} className="w-[calc((100%-16px)/2)] shrink-0"><Link href={propertyHref(property)} className="block min-w-0"><div className="relative h-[clamp(64px,26dvh,150px)] overflow-hidden rounded-t-xl"><CoverImage src={property.images[0]} alt={property.title} sizes="264px" /></div><h4 className="mt-1 truncate text-[clamp(10px,2.2dvh,12px)] font-semibold">{property.title}</h4><p className="line-clamp-2 text-[clamp(10px,2.2dvh,12px)] leading-tight text-rez-graphite">{[property.locality, property.city].filter(Boolean).join(", ")}</p></Link></li>)}</ul>
    </>}
  </section>;
}

function PopupProfile({ lookupId, purpose }: { lookupId: string; purpose: "sale" | "rent" }) {
  const query = useQuery(directoryQueries.person(lookupId));
  const person = query.data;
  if (!person) return <PersonFeedback lookupId={lookupId} popup />;
  return <div className="flex min-h-0 min-w-0 flex-col gap-[clamp(12px,3.6dvh,24px)]">
    <div className="flex items-center gap-4 rounded-[12px] border border-rez-smoke bg-white p-3 shadow-md">
      <DirectoryPhoto src={person.photo} name={person.name} portrait className="size-[clamp(64px,16.5dvh,96px)] min-h-0 shrink-0 overflow-hidden rounded-full bg-white p-0 sm:w-[clamp(64px,16.5dvh,96px)] [&_img]:object-cover" />
      <div className="min-w-0 flex-1">
        <h2 className="text-[clamp(14px,2.8dvh,16px)] font-semibold text-[#609fff]"><Link href={directoryPersonHref({ name: person.firmName }, person)} className="no-underline hover:no-underline">{person.name}</Link></h2>
        <p className="mt-1 text-[clamp(12px,2.5dvh,14px)]">{person.firmName ? <Link href={directoryFirmHref({ name: person.firmName })} className="no-underline hover:no-underline">{person.firmName}</Link> : "Firm not provided"}</p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-rez-smoke pt-2">
          <span className="text-[clamp(12px,2.5dvh,14px)] text-rez-graphite">{person.maskedPhone || "Phone not provided"}</span>
          <LeadDialog mode="contact" title="Contact the realtor" description={`Contact ${person.name}`} target={{ realtorId: person.id }} recipient={person.name}>
            <Button size="icon" aria-label={`Contact ${person.name}`} className="size-[clamp(28px,6.2dvh,36px)] rounded-[10px] shadow-sm"><Phone className="size-4" /></Button>
          </LeadDialog>
        </div>
      </div>
    </div>
    <section><h3 className="mb-[clamp(6px,2dvh,12px)] text-[clamp(14px,2.8dvh,16px)] font-semibold">Working since</h3><p className="text-[clamp(12px,2.5dvh,14px)] text-rez-graphite">{person.since || "Not provided"}</p></section>
    <section><h3 className="mb-[clamp(6px,2dvh,12px)] text-[clamp(14px,2.8dvh,16px)] font-semibold">Spoken Languages</h3><p className="text-[clamp(12px,2.5dvh,14px)] text-rez-graphite">{person.languages.join(", ") || "Not provided"}</p></section>
    <div className="min-h-0 border-t border-rez-smoke [&>section]:mt-[clamp(10px,3dvh,18px)]"><PersonListingCarousel key={`${person.id}:${purpose}`} personId={person.id} firstName={person.firstName} purpose={purpose} /></div>
  </div>;
}

/** Queries mount only after opening; listing mode is passed from the card, not inferred from a URL. */
export function RealtorProfilePopup({ lookupId, purpose, label }: { lookupId: string; purpose: "sale" | "rent"; label: string }) {
  const [open, setOpen] = useState(false);
  if (!BACKEND_ID_PATTERN.test(lookupId)) return <span>{label || "Not provided"}</span>;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button type="button" className="text-left font-semibold underline-offset-2 hover:underline" aria-label={`View realtor profile: ${label}`}>{label}</button></DialogTrigger>
    <DialogContent showCloseButton={false} className="top-0 flex h-dvh max-h-dvh w-full max-w-[400px] flex-col gap-0 overflow-hidden translate-y-0 rounded-none bg-[#f3f0f0] px-6 py-3 sm:max-w-[400px]">
      <DialogHeader className="sr-only"><DialogTitle>Realtor profile</DialogTitle><DialogDescription>Realtor information and {purpose === "rent" ? "rental" : "sale"} listings.</DialogDescription></DialogHeader>
      {open && <PopupProfile lookupId={lookupId} purpose={purpose} />}
    </DialogContent>
  </Dialog>;
}
