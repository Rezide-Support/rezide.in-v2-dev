import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/brand/icon";
import type { Realtor } from "@/types/models";
import { realtorFirmHref, realtorHref } from "./links";

/** Compact realtor block used on property and project pages. */
export function RealtorSummary({ realtor }: { realtor: Realtor }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-rez-smoke p-5">
      <div className="flex items-center gap-4">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-full bg-rez-cloud">
          <Image src={realtor.photo} alt="" fill sizes="64px" quality={70} className="object-cover" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="eyebrow text-rez-graphite">Listing realtor</span>
          <Link href={realtorHref(realtor)} className="text-[17px] leading-tight font-semibold hover:text-rez-mocaccino-ink">
            {realtor.name}
          </Link>
          <Link href={realtorFirmHref(realtor)} className="truncate text-[13px] text-rez-graphite hover:text-black hover:underline">
            {realtor.firm}
          </Link>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Registrations">
        {realtor.credentials.map((c) => (
          <li
            key={c}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-rez-smoke pr-3 pl-1 text-xs font-semibold"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-rez-timber text-white">
              <Icon name="check" size={12} />
            </span>
            {c}
          </li>
        ))}
      </ul>
      <p className="text-xs text-rez-graphite">
        RERA {realtor.reraId} · as provided by the realtor.
      </p>
    </div>
  );
}
