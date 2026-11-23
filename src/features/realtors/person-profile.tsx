"use client";
import { BACKEND_ID_PATTERN } from "@/lib/ids";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PropertyPhotoCard } from "@/features/properties/property-card";
import { DirectoryRequestError, directoryQueries } from "@/services/realtor-directory";
import type { DirectoryPersonDetail } from "./directory-model";
import { directoryFirmHref } from "./directory-model";
import { DirectoryPhoto } from "./directory-cards";
import { DirectoryLeadForm } from "./directory-forms";
import { AddressDialog, Breadcrumbs } from "./profile-parts";
import { FirmListings } from "./firm-listings";
import { cn } from "@/lib/utils";

function PersonDetails({ person, popup = false }: { person: DirectoryPersonDetail; popup?: boolean }) {
  const Heading = popup ? "h2" : "h1";
  return <div className={cn("grid min-w-0 gap-6", popup ? "lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8" : "lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-4")}>
    <div className={cn("flex min-w-0 flex-col gap-6", !popup && "max-sm:contents")}>
      <header className="border-b border-rez-smoke pb-1 max-sm:order-1"><Heading className="text-base font-semibold [overflow-wrap:anywhere]">{person.name}</Heading><p className="mt-1 text-sm text-rez-graphite">{person.firmName || "Firm not provided"}</p></header>
      <section className="max-sm:order-3"><h2 className="mb-2 text-base font-semibold">About me</h2><p className="text-sm leading-normal whitespace-pre-line text-rez-graphite [overflow-wrap:anywhere]">{person.about || "Not provided"}</p></section>
      <dl className={cn("grid gap-x-6 gap-y-7 text-sm max-sm:order-4 max-sm:gap-y-5 sm:grid-cols-3 [&_dt]:font-semibold [&_dd]:mt-2 [&_dd]:text-sm [&_dd]:leading-normal [&_dd]:text-rez-graphite", !popup && "lg:text-base")}>
        <div><dt>Working since</dt><dd>{person.since || "Not provided"}</dd></div>
        <div><dt>Spoken Language</dt><dd>{person.languages.join(", ") || "Not provided"}</dd></div>
        <div className={cn("[&_button]:text-[#0066ff]", !popup && "max-sm:hidden")}><dt>Address</dt><dd><AddressDialog title="Realtor addresses" address={person.addresses.length ? { lines: person.addresses, city: "" } : null} /></dd></div>
        {[["Area of Specialization", person.specializations], ["Sub Regions", person.subRegions], ["Localities", person.localities], ["Projects", person.projects]].map(([label, values]) => <div key={String(label)} className="sm:col-span-3"><dt>{String(label)}</dt><dd>{(values as string[]).join(", ") || "Not provided"}</dd></div>)}
        {!popup && <div className="space-y-4 sm:hidden">
          {person.addresses.length ? person.addresses.map((address, index) => <div key={`${address}-${index}`}><dt className="flex items-center gap-1"><MapPin aria-hidden="true" className="size-4 shrink-0 text-rez-graphite" />Registered Address</dt><dd className="pl-5 whitespace-pre-line">{address}</dd></div>) : <div><dt className="flex items-center gap-1"><MapPin aria-hidden="true" className="size-4 text-rez-graphite" />Registered Address</dt><dd className="pl-5">Not provided</dd></div>}
        </div>}
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
  const [page, setPage] = useState(1);
  const list = useRef<HTMLUListElement>(null), headingId = useId();
  const query = useQuery(directoryQueries.personListings(personId, purpose, page));
  const data = query.data;
  return <section className="mt-8 min-w-0" aria-labelledby={headingId} aria-busy={query.isFetching}>
    <div className="mb-4 flex items-center justify-between gap-3"><div><h3 id={headingId} className="text-lg font-semibold">{firstName || "Realtor"} Listings</h3><p className="text-xs text-rez-graphite">{purpose === "rent" ? "Available Rental" : "Available Sale"}{data ? ` (${data.total})` : ""}</p></div>{!!data?.items.length && <div className="flex gap-2"><Button variant="outline" size="icon-sm" aria-label="Previous listings" onClick={() => list.current?.scrollBy({ left: -280, behavior: "smooth" })}><ArrowLeft size={16} /></Button><Button variant="outline" size="icon-sm" aria-label="Next listings" onClick={() => list.current?.scrollBy({ left: 280, behavior: "smooth" })}><ArrowRight size={16} /></Button></div>}</div>
    {query.isError ? <ErrorState message={query.error.message} onRetry={() => query.refetch()} /> : !data ? <div className="h-64 animate-pulse rounded-xl bg-rez-cloud" /> : !data.items.length ? <EmptyState title={`No ${purpose === "rent" ? "rental" : "sale"} listings available.`} /> : <>
      <ul ref={list} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">{data.items.map(property => <li key={property.id} className="w-[min(78vw,280px)] shrink-0 snap-start"><PropertyPhotoCard property={property} /></li>)}</ul>
      <Pagination page={data.page} pageCount={data.pageCount} onChange={next => { setPage(next); list.current?.scrollTo({ left: 0 }); }} />
    </>}
  </section>;
}

function PopupProfile({ lookupId, purpose }: { lookupId: string; purpose: "sale" | "rent" }) {
  const query = useQuery(directoryQueries.person(lookupId));
  return <><PersonFeedback lookupId={lookupId} popup />{query.data && <PersonListingCarousel key={`${query.data.id}:${purpose}`} personId={query.data.id} firstName={query.data.firstName} purpose={purpose} />}</>;
}

/** Queries mount only after opening; listing mode is passed from the card, not inferred from a URL. */
export function RealtorProfilePopup({ lookupId, purpose, label }: { lookupId: string; purpose: "sale" | "rent"; label: string }) {
  const [open, setOpen] = useState(false);
  if (!BACKEND_ID_PATTERN.test(lookupId)) return <span>{label || "Not provided"}</span>;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button type="button" className="text-left font-semibold underline-offset-2 hover:underline" aria-label={`View realtor profile: ${label}`}>{label}</button></DialogTrigger>
    <DialogContent className="sm:max-w-[min(960px,calc(100vw-32px))] max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[90dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-3xl max-sm:rounded-b-none">
      <DialogHeader className="pr-10"><DialogTitle>Realtor profile</DialogTitle><DialogDescription>Realtor information and {purpose === "rent" ? "rental" : "sale"} listings.</DialogDescription></DialogHeader>
      {open && <PopupProfile lookupId={lookupId} purpose={purpose} />}
    </DialogContent>
  </Dialog>;
}
