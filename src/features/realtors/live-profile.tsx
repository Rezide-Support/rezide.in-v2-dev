"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, EmptyState } from "@/components/common/feedback";
import { DirectoryRequestError, directoryQueries } from "@/services/realtor-directory";
import { DirectoryCard, DirectoryPhoto } from "./directory-cards";
import { FirmListings } from "./firm-listings";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { FirmAddress } from "./directory-model";
import { FirmConnectForm } from "./firm-connect-form";
import { firmAreaQueries, type FirmAreaKind } from "@/services/realtor-directory";
import { Breadcrumbs } from "./profile-parts";
import { MapPin } from "lucide-react";
import { LivePersonProfile } from "./person-profile";

/** rezide.in's outlined pill (specializations, areas). */
const PILL = "flex items-center gap-x-2 rounded-full border border-rez-smoke px-4 py-2 text-xs font-semibold text-black sm:text-sm";
const SOCIAL_ICONS: Record<string, string> = { linkedin: "linkedin", facebook: "facebook", instagram: "instagram", youtube: "youtube" };

/**
 * rezide.in's "Sub Regions" / "Localities" / "Projects" rows: the firm's areas as pills, each with
 * how many of its listings are there (black badge, when there are any). Hidden when the firm has none.
 */
function FirmAreas({ firmId, kind, title, names }: { firmId: string; kind: FirmAreaKind; title: string; names: string[] }) {
  const counts = useQuery(firmAreaQueries.counts(firmId, kind, names));
  if (!names.length) return null;
  return (
    <div className="sm:col-span-3">
      <dt>{title}</dt>
      <dd>
        <ul className="flex flex-wrap gap-2" aria-busy={counts.isPending}>
          {names.map((name) => {
            const n = counts.data?.[name] ?? 0;
            return (
              <li key={name} className={PILL}>
                {name}
                {n > 0 && (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black px-2 text-xs font-semibold text-white">
                    {n}
                    <span className="sr-only"> listings</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </dd>
    </div>
  );
}

/** rezide.in's address popup: one card per office ("Registered Address", lines, "City - Pincode"). */
function FirmAddressDialog({ addresses }: { addresses: FirmAddress[] }) {
  if (!addresses.length) return <span className="italic">Not listed</span>;
  return (
    <Dialog>
      <DialogTrigger className="font-semibold text-[#0066ff] underline-offset-4 hover:underline">
        View<span className="sr-only"> firm addresses</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px]">
        <DialogTitle className="sr-only">Firm addresses</DialogTitle>
        <DialogDescription className="sr-only">As provided by the firm.</DialogDescription>
        <div className="mt-6 flex flex-wrap items-stretch gap-3">
          {addresses.map((a, i) => (
            <div key={i} className="min-w-[220px] flex-1 rounded-xl border border-rez-smoke p-6 shadow-sm">
              {/* As rezide.in: every card is titled "Registered Address" when the address has a type. */}
              <h3 className="mb-4 text-lg font-medium">{a.type || i === 0 ? "Registered Address" : "Office Address"}</h3>
              <address className="text-[15px] leading-relaxed text-rez-graphite">
                {a.line1 && <>{a.line1},<br /></>}
                {a.line2 && <>{a.line2},<br /></>}
                {[a.city, a.pincode].filter(Boolean).join(" - ")}
              </address>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
      <DirectoryPhoto src={firm.logo} name={firm.name} eager className="mt-4 aspect-[7/3] min-h-0 w-full rounded-[10px] border border-rez-smoke bg-white p-0 shadow-sm [&_img]:p-1" />
    </header>
    <div className="mt-6 grid gap-8 max-sm:mt-12 sm:grid-cols-[minmax(0,1fr)_220px] lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-4">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="hidden border-b border-rez-smoke pb-1 sm:block"><h1 className="text-base font-semibold [overflow-wrap:anywhere]">{firm.name}</h1><p className="mt-1 text-sm text-rez-graphite">{firm.entityType}</p></header>
        <section><h2 className="mb-2 text-sm font-semibold sm:text-base">About the firm</h2>{firm.about && <p className="whitespace-pre-line text-xs leading-relaxed text-rez-graphite [overflow-wrap:anywhere] sm:text-sm">{firm.about}</p>}</section>
        <dl className="grid gap-5 text-sm sm:grid-cols-3 sm:gap-x-6 sm:gap-y-8 lg:text-base [&_dt]:font-semibold [&_dd]:mt-2 [&_dd]:text-xs [&_dd]:text-rez-graphite sm:[&_dd]:text-sm">
          <div><dt>Operating since</dt><dd>{firm.since || "Not provided"}</dd></div>
          <div><dt>Team Size</dt><dd>{firm.people.length}</dd></div>
          <div className="hidden sm:block [&_button]:text-[#0066ff]"><dt>Address</dt><dd><FirmAddressDialog addresses={firm.addressCards ?? []} /></dd></div>
          <div className="sm:col-span-3"><dt>Area of Specialization</dt><dd>{firm.specializations.length ? <ul className="flex flex-wrap gap-2">{firm.specializations.map(item=><li key={item} className={PILL}>{item}</li>)}</ul> : "Not provided"}</dd></div>
          <FirmAreas firmId={firm.id} kind="sub-region" title="Sub Regions" names={firm.subRegions} />
          <FirmAreas firmId={firm.id} kind="locality" title="Localities" names={firm.localities} />
          <FirmAreas firmId={firm.id} kind="project" title="Projects" names={firm.projects} />
          <div className="flex flex-col gap-4 sm:hidden">{firm.addresses.length ? firm.addresses.map((address,i)=><div key={i}><dt className="flex items-center gap-1"><MapPin className="size-3 text-rez-graphite" aria-hidden/>Registered Address</dt><dd className="pl-5 leading-relaxed [overflow-wrap:anywhere]">{address}</dd></div>):<dd>Not provided</dd>}</div>
        </dl>
      </div>
      <aside aria-label="Firm logo and contact" className="flex flex-col gap-5 self-start">
        <DirectoryPhoto src={firm.logo} name={firm.name} eager className="hidden aspect-square min-h-0 w-full bg-white p-0 sm:flex sm:w-full [&_img]:p-3"/>
        {!!firm.socials.length && <nav aria-label="Firm social links" className="flex justify-center gap-3">{firm.socials.map(social=>{const icon=SOCIAL_ICONS[social.label.toLowerCase()];return <a key={social.label} href={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.label} className="flex size-[54px] items-center justify-center rounded-[6px] bg-[#18181b] text-white shadow-sm">{icon ? <Image src={`/images/social-${icon}.svg`} width={24} height={24} alt="" /> : social.label}</a>})}</nav>}
        {/* rezide.in's firm form: First Name, Last Name, phone, Email, "Connect with me". */}
        <div className="rounded-xl border border-rez-smoke bg-[#FAFAFA] shadow-sm"><FirmConnectForm firmId={firm.id} /></div>
      </aside>
    </div>
    <FirmListings firmId={firm.id}/>
    <section className="mt-12"><h2 className="mb-4 text-xl font-semibold">Team</h2>{firm.people.length ? <div className="grid gap-4 xl:grid-cols-2">{firm.people.map(person=><DirectoryCard key={person.id} firm={firm} person={person} eagerFirmLogo/>)}</div>:<p>No team profiles provided.</p>}</section>
  </div>;
}