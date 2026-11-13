"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, EmptyState } from "@/components/common/feedback";
import { DirectoryRequestError, directoryQueries } from "@/services/realtor-directory";
import { DirectoryCard, DirectoryPhoto } from "./directory-cards";
import { DirectoryLeadForm } from "./directory-forms";
import { FirmListings } from "./firm-listings";

/** Profile fields use the directory contract; no calls to the old mock detail endpoints. */
export function LiveRealtorProfile({ firmName, personId }: { firmName: string; personId?: string }) {
  const query = useQuery(directoryQueries.profile(firmName));
  const firm = query.data;
  const person = personId ? firm?.people.find(p => p.id === personId) : undefined;
  if (query.isError && !(query.error instanceof DirectoryRequestError && query.error.status === 404)) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  if (query.error instanceof DirectoryRequestError && query.error.status === 404) return <EmptyState icon="user" title="Profile not found."><Link className="underline" href="/realtors">Back to the realtor directory</Link></EmptyState>;
  if (!query.data) return <div aria-busy="true" className="mx-auto my-12 h-80 max-w-[1200px] animate-pulse rounded-xl bg-rez-cloud" />;
  if (!firm || (personId && !person)) return <EmptyState icon="user" title="Profile not found."><Link className="underline" href="/realtors">Back to the realtor directory</Link></EmptyState>;
  const name = person?.name || firm.name;
  return <main className="mx-auto max-w-[1200px] px-4 py-12"><Link className="text-sm underline" href="/realtors">Back to the realtor directory</Link><div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
    <div className="flex flex-col gap-6"><div className="flex flex-wrap gap-6"><DirectoryPhoto src={person ? person.photo : firm.logo} name={name} portrait={!!person} /><div><h1 className="text-3xl font-semibold">{name}</h1>{person && <p className="mt-2">{firm.name}</p>}<p className="mt-3">{(person?.specializations || firm.specializations).join(", ") || "Specialization not provided"}</p><p className="mt-2">{[...new Set([...firm.subRegions, ...firm.localities])].join(", ") || "Location not provided"}</p>{person && <p className="mt-2">Languages: {person.languages.join(", ") || "Not provided"}</p>}</div></div>
    {!person && <>
      <p className="text-rez-graphite">{firm.entityType}</p>
      <section><h2 className="mb-2 text-xl font-semibold">About the firm</h2><p className="whitespace-pre-line [overflow-wrap:anywhere]">{firm.about || "Not provided"}</p></section>
      <dl className="grid gap-3 rounded-xl border border-rez-smoke p-5"><div><dt className="font-semibold">Operating since</dt><dd>{firm.since || "Not provided"}</dd></div><div><dt className="font-semibold">RERA number</dt><dd>{firm.rera || "Not provided"}</dd></div><div><dt className="font-semibold">GST number</dt><dd>{firm.gst || "Not provided"}</dd></div><div><dt className="font-semibold">Addresses</dt><dd>{firm.addresses.length ? firm.addresses.map(address => <p key={address} className="[overflow-wrap:anywhere]">{address}</p>) : "Not provided"}</dd></div></dl>
      {!!firm.socials.length && <nav aria-label="Firm social links" className="flex flex-wrap gap-4">{firm.socials.map(social => <a key={social.label} href={social.url} target="_blank" rel="noopener noreferrer" className="underline">{social.label}</a>)}</nav>}
    </>}
    </div><aside><DirectoryLeadForm firmId={firm.id} recipient={name} /></aside>
  </div>{!person && <><FirmListings firmId={firm.id} /><section className="mt-12"><h2 className="mb-4 text-xl font-semibold">Team</h2>{firm.people.length ? <div className="grid gap-4 xl:grid-cols-2">{firm.people.map(p => <DirectoryCard key={p.id} firm={firm} person={p} />)}</div> : <p>No team profiles provided.</p>}</section></>}</main>;
}
