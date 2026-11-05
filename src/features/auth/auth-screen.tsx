"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/brand/icon";
import { Logo } from "@/components/brand/logo";
import { AuthCard, type Audience, type AuthMode } from "./auth-card";

const BLOCKS: Record<"seeker" | "owner" | "realtor", { eyebrow: string; headline: string; bold?: string; points: [IconName, string][] }> = {
  seeker: {
    eyebrow: "For property seekers",
    headline: "Genuine listings only.",
    bold: "Only available. No fakes. No duplicates.",
    points: [
      ["shield-check", "Verified listings and RERA-registered projects"],
      ["search", "Search properties your way"],
      ["bell-off", "No spam calls. Realtors reach you only when you ask."],
      ["star", "Save properties and track visits in one place"],
    ],
  },
  owner: {
    eyebrow: "For property owners",
    headline: "List it. Manage it. Close it.",
    points: [
      ["file-text", "List in minutes with a live preview"],
      ["bar-chart", "Price analysis from real transactions"],
      ["user", "Realtor assistance, only if you choose"],
    ],
  },
  realtor: {
    eyebrow: "For realtors",
    headline: "Run your real estate business.",
    points: [
      ["settings", "AI agents that actually work as a team"],
      ["file-text", "List a property in under a minute"],
      ["play-circle", "Branded videos, brochures, flyers and posts with a tap"],
      ["share", "Ready to upload for every social platform"],
      ["user", "Leads that manage themselves"],
      ["message", "Co-broking matches with verified realtors"],
      ["pie-chart", "Your whole business at a glance"],
    ],
  },
};

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const params = useSearchParams();
  const [audience, setAudience] = useState<Audience>(params.get("role") === "realtor" ? "realtor" : "customer");
  const keys = audience === "realtor" ? (["realtor"] as const) : (["seeker", "owner"] as const);

  return (
    <div className="flex min-h-dvh flex-col bg-[#eceef5]">
      <div className="mx-auto flex w-full max-w-[1200px] items-start px-8 pt-8">
        <Link href="/" className="flex flex-col gap-2 text-black" aria-label="Rezide home">
          <Logo height={30} />
          <span className="text-sm font-medium">
            {audience === "realtor" ? "Powering India’s Leading Realtors" : "Real Estate Simplified!"}
          </span>
        </Link>
      </div>
      <main
        id="main"
        className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 items-center gap-7 px-4 pt-6 pb-12 min-[861px]:grid-cols-[minmax(0,1.1fr)_minmax(0,460px)] min-[861px]:gap-16 min-[861px]:px-8 min-[861px]:pt-10 min-[861px]:pb-16"
      >
        <div className="flex min-w-0 flex-col gap-7">
          {keys.map((k, i) => {
            const b = BLOCKS[k];
            return (
              <section key={k} className={i < keys.length - 1 ? "flex flex-col gap-3.5 border-b border-rez-steel pb-7" : "flex flex-col gap-3.5"}>
                <span className="eyebrow text-[12px] text-rez-graphite">{b.eyebrow}</span>
                <h2
                  className={`text-[34px] leading-[1.04] font-bold tracking-[-0.02em] text-balance ${audience === "realtor" ? "min-[861px]:text-[clamp(30px,3.4vw,40px)]" : "min-[861px]:text-[clamp(28px,3vw,36px)]"}`}
                >{b.headline}</h2>
                {b.bold && <p className="max-w-[520px] text-[17px] leading-normal font-bold">{b.bold}</p>}
                <ul className="flex flex-col gap-2.5">
                  {b.points.map(([icon, text]) => (
                    <li key={text} className="flex items-center gap-3">
                      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-white">
                        <Icon name={icon} size={16} />
                      </span>
                      <span className="text-sm leading-snug font-medium text-[#3a3f47]">{text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <div>
          <AuthCard mode={mode} audience={audience} onAudienceChange={setAudience} />
        </div>
      </main>
    </div>
  );
}
