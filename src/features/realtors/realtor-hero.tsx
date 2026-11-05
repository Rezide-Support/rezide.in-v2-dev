"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/brand/icon";
import { HERO_IMAGES } from "@/content/media";
import { CredentialDialog, type CredentialKey } from "./credentials";

const BADGES: { key: CredentialKey; label: string; sub: string; pos: string }[] = [
  { key: "RERA", label: "RERA Registered", sub: "Verified", pos: "top-[14%] right-[6%]" },
  { key: "GST", label: "GST Registered", sub: "Verified", pos: "top-[35%] right-[14%]" },
  { key: "NAR-India", label: "NAR-India Member", sub: "Verified", pos: "top-[56%] right-[4%]" },
  { key: "Tech", label: "Tech Enabled", sub: "On Rezide", pos: "top-[77%] right-[12%]" },
];

/** Find Realtor hero. `search` (the By Name / By Firm card) sits directly under the headline, as in the prototype. */
export function RealtorHero({ search }: { search?: ReactNode }) {
  const [open, setOpen] = useState<CredentialKey | null>(null);
  const hero = HERO_IMAGES.realtor;
  return (
    <section className="relative flex items-center overflow-hidden bg-rez-forest px-4 py-12 md:min-h-[560px] md:px-8 md:py-[88px]">
      <Image src={hero.src} alt="" fill priority sizes="100vw" quality={70} className="ken-burns object-cover" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,17,12,.78)_0%,rgba(2,17,12,.5)_48%,rgba(2,17,12,.12)_100%)]" />
      <a
        href={hero.href}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-3 bottom-3 z-10 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white/90 hover:bg-black/65"
      >
        Photo: {hero.credit} / Unsplash
      </a>
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-7">
        <h1 className="text-[36px] leading-[1.06] md:leading-[1.02] font-semibold tracking-[-0.025em] text-rez-full-white [text-shadow:0_2px_24px_rgba(2,17,12,.45)] md:text-[clamp(48px,6vw,84px)]">
          Find your realtor.
        </h1>
        <ul className="flex flex-wrap gap-2 lg:hidden">
          {BADGES.map((b) => (
            <li key={b.key}>
              <button
                type="button"
                onClick={() => setOpen(b.key)}
                className="flex h-9 items-center gap-2 rounded-full bg-white/85 pr-3.5 pl-2 text-[13px] font-bold backdrop-blur-[18px]"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-black text-rez-mocaccino">
                  <Icon name="shield-check" size={14} />
                </span>
                {b.label}
              </button>
            </li>
          ))}
        </ul>
        {search}
      </div>
      <ul className="pointer-events-none absolute inset-0 mx-auto hidden max-w-[1280px] lg:block">
        {BADGES.map((b) => (
          <li key={b.key} className={`absolute ${b.pos}`}>
            <div className="flex items-center gap-3 rounded-full bg-white/[.82] py-3 pr-[18px] pl-3 text-black shadow-rez-md backdrop-blur-[18px]">
              <span aria-hidden className="flex size-[38px] items-center justify-center rounded-full bg-black text-rez-mocaccino">
                <Icon name="shield-check" size={20} />
              </span>
              <span className="flex flex-col gap-[3px]">
                <b className="text-sm leading-none font-bold">{b.label}</b>
                <span className="flex items-center gap-1.5 text-[11px] leading-none font-medium text-rez-graphite">
                  {b.sub}
                  <button
                    type="button"
                    onClick={() => setOpen(b.key)}
                    aria-haspopup="dialog"
                    aria-label={`${b.label}: why it matters`}
                    title="Why it matters"
                    className="pointer-events-auto relative flex size-[22px] items-center justify-center rounded-full bg-rez-mocaccino text-black after:absolute after:-inset-1 hover:bg-rez-mocaccino-ink hover:text-rez-full-white"
                  >
                    <Icon name="shield-check" size={13} />
                  </button>
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <CredentialDialog credential={open} onClose={() => setOpen(null)} />
    </section>
  );
}
