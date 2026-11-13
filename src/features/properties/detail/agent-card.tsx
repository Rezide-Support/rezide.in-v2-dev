"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { realtorHref } from "@/features/realtors/realtor-cards";
import type { Realtor } from "@/types/models";
import { LeadForm, PROPERTY_INTENTS, type LeadListing } from "./lead-form";

/** Resolve only the selected listing's public broker phone when WhatsApp is clicked. */
export function ListingWhatsAppButton({ listingId, brokerId, title, className }: { listingId: string; brokerId: string; title: string; className?: string }) {
  const [loading, setLoading] = useState(false);
  return <Button variant="outline" className={className} disabled={loading || !brokerId} title={!brokerId ? "Broker contact details are unavailable" : undefined} onClick={async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(listingId)}/card-resources?resource=broker&brokerId=${encodeURIComponent(brokerId)}`);
      if (!response.ok) throw new Error("Broker details unavailable");
      const data = await response.json();
      if (!data.phone) { toast("A WhatsApp number isn't available for this realtor."); return; }
      const url = new URL(`/properties/${encodeURIComponent(listingId)}`, window.location.origin);
      window.location.assign(`https://wa.me/${data.phone}?text=${encodeURIComponent(`Hi, I'm interested in ${title}. ${url}`)}`);
    } catch { toast.error("Couldn't load the realtor's contact details. Please try again."); }
    finally { setLoading(false); }
  }}><Image src="/images/whatsapp.svg" width={16} height={16} alt="" />{loading ? "Loading…" : "WhatsApp"}</Button>;
}

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
