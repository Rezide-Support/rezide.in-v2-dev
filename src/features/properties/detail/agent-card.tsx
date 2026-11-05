"use client";

import Image from "next/image";
import Link from "next/link";
import { realtorHref } from "@/features/realtors/realtor-cards";
import type { Realtor } from "@/types/models";
import { LeadForm, PROPERTY_INTENTS, type LeadListing } from "./lead-form";

/** v1 agent contact card: photo, name, firm, then the short lead form. */
export function AgentCard({ realtor, propertyId, listing, defaultIntent }: { realtor: Realtor | null; propertyId: string; listing?: LeadListing; defaultIntent?: string }) {
  return (
    <section id="enquire" aria-labelledby="agent-name" className="scroll-mt-24 rounded-xl border border-rez-smoke bg-rez-cream-warm p-4 shadow-rez-sm sm:p-[18px]">
      {realtor ? (
        <div className="mb-5 flex items-center gap-4">
          <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-rez-cloud">
            <Image src={realtor.photo} alt="" fill sizes="48px" quality={70} className="object-cover" />
          </span>
          <div className="min-w-0">
            <h2 id="agent-name" className="text-[17px] leading-tight font-semibold">
              <Link href={realtorHref(realtor)} className="hover:underline">
                {realtor.name}
              </Link>
            </h2>
            <p className="truncate text-[13px] text-rez-graphite">{realtor.firm}</p>
          </div>
        </div>
      ) : (
        <h2 id="agent-name" className="mb-5 text-[17px] font-semibold">
          Contact about this property
        </h2>
      )}
      <LeadForm
        compact
        mode="contact"
        intents={PROPERTY_INTENTS}
        target={{ propertyId, realtorId: realtor?.id }}
        recipient={realtor?.name ?? "the realtor"}
        listing={listing}
        defaultIntent={defaultIntent}
      />
    </section>
  );
}
