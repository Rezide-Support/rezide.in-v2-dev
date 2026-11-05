"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/common/feedback";
import { realtorQueries } from "@/lib/queries";
import type { Realtor } from "@/types/models";
import { ContactCard } from "./contact-card";
import { CredentialPills } from "./credentials";
import { firmHref } from "./links";
import { AddressDialog, AgentCarousel, Breadcrumbs, Fact, ListingsSection, listOrNone, SocialLinks } from "./profile-parts";

function PhotoCard({ realtor: r }: { realtor: Realtor }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-rez-smoke bg-white p-4">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[260px] overflow-hidden rounded-lg bg-rez-cloud">
          <Image src={r.photo} alt={`Portrait of ${r.name}`} fill sizes="260px" quality={75} className="object-cover object-top" />
        </div>
      </div>
      <SocialLinks socials={r.socials} name={r.name} />
    </div>
  );
}

/** Agent page, /realtors/<firm>/<agent>. Layout follows rezide.in v1's broker profile. */
export function RealtorProfileView({ firmSlug, agentSlug }: { firmSlug: string; agentSlug: string }) {
  const { data, isError, refetch } = useQuery(realtorQueries.agent(firmSlug, agentSlug));
  if (isError && !data) return <ErrorState className="m-8" message="This profile couldn't be loaded." onRetry={() => refetch()} />;
  if (!data) return null;
  const { realtor: r, listings, firm, others = [] } = data;
  const firmName = firm?.name ?? r.firm;
  const firstName = r.name.split(" ")[0];

  return (
    <div className="px-4 pt-5 pb-20 md:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-14">
        <div className="flex flex-col gap-6">
          <Breadcrumbs
            items={[
              { label: "Find Realtor", href: "/realtors" },
              { label: firmName, href: firmHref({ id: r.firmId }) },
              { label: r.name },
            ]}
          />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
            <div className="flex min-w-0 flex-col gap-7">
              <header className="flex flex-col gap-2 border-b border-rez-smoke pb-5">
                <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] md:text-[34px]">{r.name}</h1>
                <p className="text-[15px] text-rez-graphite">
                  {r.role ? `${r.role}, ` : ""}
                  <Link href={firmHref({ id: r.firmId })} className="font-medium text-rez-mocaccino-ink hover:text-black hover:underline">
                    {firmName}
                  </Link>
                </p>
              </header>

              <div className="mx-auto w-full max-w-[300px] lg:hidden">
                <PhotoCard realtor={r} />
              </div>

              <section aria-labelledby="about-me" className="flex flex-col gap-2.5">
                <h2 id="about-me" className="text-[17px] font-semibold">
                  About me
                </h2>
                <p className="text-[15px] leading-relaxed text-rez-arsenic">{r.bio}</p>
              </section>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
                <Fact label="Working since">{r.since || "Not provided"}</Fact>
                <Fact label="Spoken language">{listOrNone(r.languages)}</Fact>
                <Fact label="Address">
                  <AddressDialog title={r.address ? "Office address" : "Registered address"} address={r.address ?? firm?.address} />
                </Fact>
              </dl>

              <dl className="flex flex-col gap-6">
                <Fact label="Area of specialization">{listOrNone(r.specializations)}</Fact>
                <Fact label="Sub regions">{listOrNone(r.subRegions)}</Fact>
                <Fact label="Localities">{listOrNone(r.localities)}</Fact>
                <Fact label="Projects">{listOrNone(r.buildings)}</Fact>
              </dl>

              <div className="flex flex-col gap-2.5">
                <CredentialPills credentials={r.credentials} />
                <p className="text-xs text-rez-graphite">
                  RERA {r.reraId}
                  {r.gstin ? ` · GSTIN ${r.gstin}` : ""} · as provided by the realtor
                </p>
              </div>
            </div>

            <aside className="flex flex-col gap-6" aria-label={`${r.name}: photo and contact`}>
              <div className="hidden lg:block">
                <PhotoCard realtor={r} />
              </div>
              <ContactCard firmId={r.firmId} recipient={firstName} />
            </aside>
          </div>
        </div>

        <ListingsSection heading={`${r.name} Listings`} listings={listings} emptyWho={r.name} />

        <AgentCarousel id="other-agents" heading="Other agents" agents={others} />
      </div>
    </div>
  );
}
