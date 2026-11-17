"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, EmptyState } from "@/components/common/feedback";
import { DirectoryRequestError, directoryQueries } from "@/services/realtor-directory";
import { DirectoryCard, DirectoryPhoto } from "./directory-cards";
import { FirmListings } from "./firm-listings";
import { AddressDialog, Breadcrumbs } from "./profile-parts";
import { MapPin } from "lucide-react";
import { LivePersonProfile } from "./person-profile";

/** Profile fields use the directory contract; no calls to the old mock detail endpoints. */
export function LiveRealtorProfile({ firmName, personId }: { firmName: string; personId?: string }) {
  return personId ? <LivePersonProfile lookupId={personId} /> : <DirectoryFirmProfile firmName={firmName} />;
}

function DirectoryFirmProfile({ firmName }: { firmName: string }) {
  const query = useQuery(directoryQueries.profile(firmName));
  const firm = query.data;
  if (query.error instanceof DirectoryRequestError && query.error.status === 404) return <EmptyState icon="user" title="Profile not found."><Link className="underline" href="/realtors">Back to the realtor directory</Link></EmptyState>;
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  if (!firm) return <div aria-busy="true" className="mx-auto my-12 h-80 max-w-[1400px] animate-pulse rounded-xl bg-rez-cloud" />;
  return <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 max-sm:px-2 max-sm:py-3">
    <div className="[&_a]:text-[#0066ff] [&_nav]:text-sm"><Breadcrumbs items={[{label:"Find-realtor",href:"/realtors?by=firm"},{label:firm.name}]} /></div>
    <header className="mt-6 border-b border-rez-smoke pb-4 sm:hidden">
      <div className="border-b border-rez-smoke pb-1"><h1 className="text-sm font-semibold [overflow-wrap:anywhere]">{firm.name}</h1><p className="mt-1 text-xs text-rez-graphite">{firm.entityType}</p></div>
      <DirectoryPhoto src={firm.logo} name={firm.name} className="mt-4 aspect-[7/3] min-h-0 w-full rounded-[10px] border border-rez-smoke bg-white p-0 shadow-sm [&_img]:p-1" />
    </header>
    <div className="mt-6 grid gap-8 max-sm:mt-12 sm:grid-cols-[minmax(0,1fr)_220px] lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-4">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="hidden border-b border-rez-smoke pb-1 sm:block"><h1 className="text-base font-semibold [overflow-wrap:anywhere]">{firm.name}</h1><p className="mt-1 text-sm text-rez-graphite">{firm.entityType}</p></header>
        <section><h2 className="mb-2 text-sm font-semibold sm:text-base">About the firm</h2>{firm.about && <p className="whitespace-pre-line text-xs leading-relaxed text-rez-graphite [overflow-wrap:anywhere] sm:text-sm">{firm.about}</p>}</section>
        <dl className="grid gap-5 text-sm sm:grid-cols-3 sm:gap-x-6 sm:gap-y-8 lg:text-base [&_dt]:font-semibold [&_dd]:mt-2 [&_dd]:text-xs [&_dd]:text-rez-graphite sm:[&_dd]:text-sm">
          <div><dt>Operating since</dt><dd>{firm.since || "Not provided"}</dd></div>
          <div><dt>Team Size</dt><dd>{firm.people.length}</dd></div>
          <div className="hidden sm:block [&_button]:text-[#0066ff]"><dt>Address</dt><dd><AddressDialog title="Firm addresses" address={firm.addresses.length ? {lines:firm.addresses,city:""}:null}/></dd></div>
          <div className="sm:col-span-3"><dt>Area of Specialization</dt><dd>{firm.specializations.join(", ")}</dd></div>
          <div className="flex flex-col gap-4 sm:hidden">{firm.addresses.length ? firm.addresses.map(address=><div key={address}><dt className="flex items-center gap-1"><MapPin className="size-3 text-rez-graphite" aria-hidden/>Registered Address</dt><dd className="pl-5 leading-relaxed [overflow-wrap:anywhere]">{address}</dd></div>):<dd>Not provided</dd>}</div>
        </dl>
        {!!firm.socials.length && <nav aria-label="Firm social links" className="flex flex-wrap gap-4">{firm.socials.map(social=><a key={social.label} href={social.url} target="_blank" rel="noopener noreferrer" className="underline">{social.label}</a>)}</nav>}
      </div>
      <aside aria-label="Firm logo" className="hidden self-start sm:block"><DirectoryPhoto src={firm.logo} name={firm.name} className="aspect-square min-h-0 w-full bg-white p-0 sm:w-full [&_img]:p-3"/></aside>
    </div>
    <FirmListings firmId={firm.id}/>
    <section className="mt-12"><h2 className="mb-4 text-xl font-semibold">Team</h2>{firm.people.length ? <div className="grid gap-4 xl:grid-cols-2">{firm.people.map(person=><DirectoryCard key={person.id} firm={firm} person={person}/>)}</div>:<p>No team profiles provided.</p>}</section>
  </div>;
}