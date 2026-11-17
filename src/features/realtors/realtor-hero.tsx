"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { CredentialKey } from "./credentials";

const BADGES: { key: CredentialKey; label: string; sub: string }[] = [
  { key: "RERA", label: "RERA registered", sub: "Verified" },
  { key: "GST", label: "GST registered", sub: "Verified" },
  { key: "NAR-India", label: "NAR-India member", sub: "Verified" },
  { key: "Tech", label: "Tech enabled", sub: "On Rezide" },
];

export function RealtorHero({ search }: { search?: ReactNode }) {
  return (
    <section className="relative isolate flex min-h-[min(480px,75svh)] items-center overflow-clip bg-black px-5 py-8 sm:min-h-[520px] sm:px-8 sm:py-16 lg:min-h-[700px] lg:py-24">
      <Image src="/images/realtors/hero.png" alt="" fill priority sizes="100vw" quality={75} className="ken-burns -z-20 hidden object-cover sm:block" />
      <div aria-hidden className="ken-burns absolute inset-0 -z-20 overflow-hidden sm:hidden">
        <Image src="/images/realtors/hero-mobile-base.png" alt="" fill priority sizes="640px" className="object-cover object-bottom" />
        <div className="absolute top-[-440px] left-[calc(50%-482px)] h-[1400px] w-[1114px]"><Image src="/images/realtors/hero-mobile.png" alt="" fill priority sizes="1114px" className="object-cover object-bottom" /></div>
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/24 sm:bg-black/55" />
      <div className="mx-auto flex w-full max-w-[820px] flex-col items-center gap-6 max-sm:max-w-[350px] sm:gap-8 lg:-translate-y-10 lg:gap-10">
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-[clamp(32px,10.25vw,40px)] leading-[1.2] font-bold tracking-[-0.02em] text-white sm:text-[clamp(36px,6.75vw,97px)] sm:leading-none sm:font-semibold">Find your realtor<span className="hidden sm:inline">.</span></h1>
          <p className="hidden text-lg leading-snug tracking-[-0.02em] text-rez-steel font-secondary sm:block md:text-2xl">Search verified realtors by name, or by the firm they work with.</p>
        </div>
        {search}
        <ul className="grid w-full grid-cols-[max-content_minmax(0,1fr)] gap-3 p-1 sm:max-w-[560px] sm:grid-cols-2 sm:gap-x-8 sm:gap-y-5 lg:flex lg:max-w-none lg:justify-center lg:gap-8">
          {BADGES.map(badge => (
            <li key={badge.key}>
              <div className="flex items-center gap-3 text-left">
                <Image src="/images/realtors/shield.svg" width={24} height={24} alt="" />
                <span className="flex min-w-0 flex-col gap-0.5"><span className="text-[clamp(11px,3.58vw,14px)] font-semibold text-white sm:text-xs md:text-[15px]">{badge.label}</span><span className="text-xs text-rez-cloud font-secondary sm:text-rez-space">{badge.sub}</span></span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
