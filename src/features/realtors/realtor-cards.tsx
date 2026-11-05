import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/brand/icon";
import type { Realtor } from "@/types/models";
import { CredentialInfoButton, CredentialPills } from "./credentials";
import { realtorFirmHref, realtorHref } from "./links";

export { firmHref, realtorHref } from "./links";

const Label = ({ children }: { children: string }) => (
  <span className="text-[10px] leading-none tracking-[0.14em] text-rez-graphite uppercase [font-family:var(--font-eyebrow)]">{children}</span>
);

/** "By firm" card: brand block + credentials + specialisation, location, since and team. */
export function FirmCard({ realtor: r, index }: { realtor: Realtor; index: number }) {
  const shapes = ["rounded-[14px]", "rounded-full", "rounded-[4px_20px]", "rounded-[20px_4px]"];
  return (
    <article className="relative grid grid-cols-1 overflow-hidden rounded-xl border border-rez-smoke bg-white transition-shadow hover:shadow-rez-md sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="flex flex-col items-center justify-center gap-3 border-b border-rez-smoke bg-[#f6f7fa] px-3.5 py-5 text-center sm:border-r sm:border-b-0">
        <span
          className={`flex size-[72px] items-center justify-center text-2xl font-bold tracking-[0.04em] text-rez-full-white ${shapes[index % 4]}`}
          style={{ background: r.firmColor }}
          aria-hidden
        >
          {r.firmInitials}
        </span>
        <span className="flex flex-col gap-1.5">
          <b className="text-sm leading-none tracking-[0.14em] uppercase" style={{ color: r.firmColor }}>
            {r.firm.split(" ")[0]}
          </b>
          <span className="text-[9px] leading-tight tracking-[0.18em] text-rez-graphite uppercase">
            {r.firm.split(" ").slice(1).join(" ") || "Realty"}
          </span>
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-3.5 px-[22px] py-5">
        <div className="flex flex-col gap-2.5">
          <h3 className="text-xl leading-tight font-semibold tracking-[-0.01em]">
            <Link href={realtorFirmHref(r)} className="after:absolute after:inset-0">
              {r.firm}
            </Link>
          </h3>
          <CredentialPills credentials={r.credentials} />
        </div>
        <dl className="grid grid-cols-2 gap-x-[18px] gap-y-3.5 border-t border-rez-smoke pt-3.5">
          <div className="col-span-2 flex flex-col gap-1.5">
            <dt className="leading-none">
              <Label>Specialization</Label>
            </dt>
            <dd className="text-sm leading-snug font-semibold">{r.specializations.join(", ")}</dd>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <dt className="leading-none">
              <Label>Location</Label>
            </dt>
            <dd className="text-sm font-semibold">{r.localities.join(", ")}</dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="leading-none">
              <Label>Since</Label>
            </dt>
            <dd className="text-base font-semibold">{r.since || "Not provided"}</dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="leading-none">
              <Label>Team</Label>
            </dt>
            <dd className="text-base font-semibold">{r.teamSize}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <Label>Live listings</Label>
          <span className="flex h-[30px] items-center gap-1.5 rounded-full bg-rez-cloud px-3 text-[13px] font-semibold">
            <b className="font-extrabold">{r.rentalListings}</b> Rental
          </span>
          <span className="flex h-[30px] items-center gap-1.5 rounded-full bg-rez-cloud px-3 text-[13px] font-semibold">
            <b className="font-extrabold">{r.saleListings}</b> Sale
          </span>
        </div>
      </div>
    </article>
  );
}

/** "By name" card: portrait + key facts + actions. */
export function AgentCard({ realtor: r }: { realtor: Realtor }) {
  return (
    <article className="relative grid grid-cols-1 overflow-hidden rounded-xl border border-rez-smoke bg-white transition-shadow hover:shadow-rez-md sm:grid-cols-[150px_minmax(0,1fr)]">
      <div className="relative min-h-[220px] bg-rez-cloud sm:min-h-[190px]">
        <Image src={r.photo} alt={`Portrait of ${r.name}`} fill sizes="(min-width: 640px) 150px, 100vw" quality={70} className="object-cover object-top" />
      </div>
      <div className="flex min-w-0 flex-col gap-2 px-[18px] py-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-lg leading-tight font-semibold">
              <Link href={realtorHref(r)} className="after:absolute after:inset-0">
                {r.name}
              </Link>
            </h3>
            <Link href={realtorFirmHref(r)} className="relative z-10 self-start text-[13px] font-medium text-rez-graphite hover:text-black hover:underline">
              {r.firm}
            </Link>
          </div>
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold text-rez-full-white"
            style={{ background: r.firmColor }}
          >
            {r.firmInitials}
          </span>
        </div>
        <dl className="flex flex-col gap-1.5 text-[13px] leading-snug text-rez-graphite">
          <div className="flex min-w-0 items-center gap-2">
            <dt className="shrink-0 font-bold text-black">Member of</dt>
            <dd className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 flex-1">{r.association ?? "—"}</span>
              {r.association && <CredentialInfoButton credential="NAR-India" label={`Member of ${r.association}`} />}
            </dd>
          </div>
          {[
            ["Specializing", r.specializations.join(", ")],
            ["Live Listings", `${r.rentalListings} Rental · ${r.saleListings} Sale`],
            ["Speaks", r.languages.join(", ")],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="shrink-0 font-bold text-black">{k}</dt>
              <dd className="min-w-0">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="relative z-10 mt-auto flex gap-2 pt-1">
          <Link
            href={`${realtorHref(r)}#enquire`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black px-4 text-xs font-semibold text-rez-full-white hover:bg-rez-arsenic"
          >
            <Icon name="phone-outgoing" size={16} /> Contact
          </Link>
          <Link
            href={realtorHref(r)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black px-4 text-xs font-semibold hover:bg-black/[0.06]"
          >
            View profile
          </Link>
        </div>
      </div>
    </article>
  );
}
