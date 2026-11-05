"use client";

import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/common/feedback";
import { firmQueries } from "@/lib/queries";
import type { Firm } from "@/types/models";
import { ContactCard } from "./contact-card";
import { AddressDialog, AgentCarousel, Breadcrumbs, Fact, ListingsSection, listOrNone } from "./profile-parts";

/** Large brand block standing in for the firm's logo (v1 shows an uploaded logo here). */
function FirmLogo({ firm }: { firm: Firm }) {
  const [first, ...rest] = firm.name.split(" ");
  return (
    <div
      role="img"
      aria-label={`${firm.name} logo placeholder`}
      className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 rounded-xl bg-[#f6f7fa] p-6 text-center"
    >
      <span
        className="flex size-[104px] rotate-45 items-center justify-center rounded-[18px] lg:size-[120px]"
        style={{ background: firm.color }}
      >
        <span className="-rotate-45 text-[28px] font-bold tracking-[0.04em] text-rez-full-white lg:text-[32px]">{firm.initials}</span>
      </span>
      <span className="mt-3 flex flex-col gap-1">
        <b className="text-lg leading-none tracking-[0.14em] uppercase" style={{ color: firm.color }}>
          {first}
        </b>
        <span className="text-[10px] leading-tight tracking-[0.18em] text-rez-graphite uppercase">{rest.join(" ") || "Realty"}</span>
      </span>
    </div>
  );
}

export function FirmProfileView({ slug }: { slug: string }) {
  const { data, isError, refetch } = useQuery(firmQueries.detail(slug));
  if (isError && !data) return <ErrorState className="m-8" message="This firm couldn't be loaded." onRetry={() => refetch()} />;
  if (!data) return null;
  const { firm, team, listings } = data;

  return (
    <div className="px-4 pt-5 pb-20 md:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-14">
        <div className="flex flex-col gap-6">
          <Breadcrumbs items={[{ label: "Find Realtor", href: "/realtors?by=firm" }, { label: firm.name }]} />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
            <div className="flex min-w-0 flex-col gap-7">
              <header className="flex flex-col gap-2 border-b border-rez-smoke pb-5">
                <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] md:text-[34px]">{firm.name}</h1>
                <p className="text-[15px] text-rez-graphite">{firm.entityType}</p>
              </header>

              <div className="mx-auto w-full max-w-[340px] lg:hidden">
                <FirmLogo firm={firm} />
              </div>

              <section aria-labelledby="about-firm" className="flex flex-col gap-2.5">
                <h2 id="about-firm" className="text-[17px] font-semibold">
                  About the firm
                </h2>
                <p className="text-[15px] leading-relaxed text-rez-arsenic">{firm.about ?? <span className="italic">Not provided</span>}</p>
              </section>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
                <Fact label="Operating since">{firm.since || "Not provided"}</Fact>
                <Fact label="Team size">{firm.teamSize}</Fact>
                <Fact label="Address">
                  <AddressDialog title="Registered address" address={firm.address} />
                </Fact>
                <Fact label="Area of specialization" className="col-span-2 sm:col-span-3">
                  {listOrNone(firm.specializations)}
                </Fact>
              </dl>

              {(firm.reraId || firm.gstin) && (
                <p className="text-xs text-rez-graphite">
                  {firm.reraId && `RERA ${firm.reraId}`}
                  {firm.gstin ? ` · GSTIN ${firm.gstin}` : ""} · as provided by the firm
                </p>
              )}
            </div>

            <aside className="flex flex-col gap-6" aria-label="Firm logo and contact">
              <div className="hidden lg:block">
                <FirmLogo firm={firm} />
              </div>
              <ContactCard firmId={firm.id} recipient={firm.name} />
            </aside>
          </div>
        </div>

        <ListingsSection heading="Firm Listings" listings={listings} emptyWho={firm.name} />

        <AgentCarousel
          id="team-members"
          heading="Team members"
          agents={team}
        />
      </div>
    </div>
  );
}
