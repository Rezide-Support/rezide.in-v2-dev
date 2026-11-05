"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Icon, type IconName } from "@/components/brand/icon";
import { DemoNotice, SampleBadge } from "@/components/common/feedback";
import { Field, FormError } from "@/components/common/form-field";
import { OtpInput } from "@/components/common/otp-input";
import { PhoneInput } from "@/components/common/phone-input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOtpFlow } from "@/features/auth/use-otp-flow";
import { API_MOCKING, ApiError, errorMessage } from "@/lib/api/client";
import { applyFieldErrors, hasFieldErrors } from "@/lib/api/form-errors";
import { OTP_LENGTH } from "@/lib/constants";
import { indianMobile, optionalEmail, otpCode, personName } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { HERO_IMAGES, unsplash } from "@/content/media";
import { requestCallback } from "@/services/mutations";
import { useSession, useSessionStore } from "@/stores/session";
import { CheckoutDialog } from "./checkout-dialog";
import { ADDONS, AGENTS, PACKS, PLANS, SKUS, inr, planPrice, type AddonId, type OrderInput, type PlanId } from "./pricing";
import { TrialDialog } from "./trial-dialog";

/* ---------------- Hero + realtor sign in ---------------- */

function RealtorSignIn() {
  const router = useRouter();
  const { session } = useSession();
  const signIn = useSessionStore((s) => s.signIn);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const flow = useOtpFlow((s) => {
    signIn(s);
    router.push("/dashboard");
  }, { role: "realtor" });

  if (session?.user.role === "realtor") {
    return (
      <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-xl bg-white p-[22px] text-black shadow-rez-lg">
        <h2 className="text-2xl font-semibold">Welcome back, {session.user.firstName}.</h2>
        <Button asChild size="xl">
          <Link href="/dashboard">Open dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex w-full max-w-[440px] flex-col gap-4 rounded-xl bg-white p-[22px] text-black shadow-rez-lg"
      onSubmit={(e) => {
        e.preventDefault();
        if (flow.step === "phone") {
          const p = indianMobile.safeParse(phone);
          if (!p.success) return setPhoneError(p.error.issues[0].message);
          setPhoneError(null);
          flow.send.mutate(p.data);
        } else {
          const c = otpCode.safeParse(code);
          if (!c.success) return setCodeError(c.error.issues[0].message);
          setCodeError(null);
          flow.verify.mutate({ phone, code: c.data, role: "realtor" });
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">{flow.step === "otp" ? "Enter the OTP." : "Realtor login."}</h2>
        <p className="text-sm text-rez-graphite">{flow.step === "otp" ? `Sent to +91 ${phone}.` : "Sign in to your Rezide dashboard."}</p>
      </div>
      {flow.step === "phone" ? (
        <Field label="Registered mobile number" required error={phoneError ?? (flow.send.error instanceof ApiError ? flow.send.error.message : undefined)}>
          <PhoneInput id="realtor-login-phone" value={phone} onChange={setPhone} />
        </Field>
      ) : (
        <Field label={`${OTP_LENGTH}-digit code`} required error={codeError ?? (flow.verify.error ? errorMessage(flow.verify.error) : undefined)}>
          <OtpInput value={code} onChange={setCode} autoFocus />
        </Field>
      )}
      <Button type="submit" size="xl" disabled={flow.send.isPending || flow.verify.isPending}>
        {flow.step === "otp" ? (flow.verify.isPending ? "Signing in…" : "Sign in") : flow.send.isPending ? "Sending…" : "Send OTP"}
      </Button>
    </form>
  );
}

/* Static illustration of the co-broking match stack (prototype hero phone). Sample data only. */
const MATCH_CARDS = [
  { photo: "photo-1758448755856-01d3add0177b", match: 92, title: "Buyer for 3 BHK · Worli", by: "Neha Kapoor · Networth Realty" },
  { photo: "photo-1759845565036-cbecbcfcb8e2", match: 88, title: "Buyer for 3 BHK · Prabhadevi", by: "Arjun Mehta · Skyline Realty" },
  { photo: "photo-1786618315979-2dbbfd3b38a7", match: 95, title: "Buyer for 3–4 BHK · Worli", by: "Rukmani Iyer · AssetPro Realty" },
] as const;

function PhoneMockup() {
  const last = MATCH_CARDS.length - 1;
  return (
    <div
      role="img"
      aria-label="Illustration of the Rezide app: co-broking buyer matches for a 3 BHK listing in Worli (sample data)."
      className="relative mx-auto w-[290px] max-w-full flex-none min-[761px]:-order-1"
    >
      <div aria-hidden className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(163,131,95,.35)_0%,rgba(163,131,95,0)_70%)]" />
      <div className="corner-phone-float relative h-[590px] rounded-[44px] bg-[#0b0b0b] p-3 shadow-[0_30px_80px_rgba(0,0,0,.55),inset_0_0_0_2px_#2a2a2a]">
        <div className="relative flex h-full flex-col overflow-hidden rounded-[34px] bg-[#f4f5f8] text-black">
          <span className="absolute top-2 left-1/2 z-[5] h-6 w-[90px] -translate-x-1/2 rounded-full bg-[#0b0b0b]" />
          <div className="flex flex-col gap-2 bg-white px-4 pt-[42px] pb-2.5">
            <span className="flex items-center justify-between">
              <b className="text-[13px] leading-none font-bold tracking-[0.14em]">REZIDE</b>
              <span className="text-[10px] leading-none font-semibold text-rez-mocaccino-ink">CO-BROKING</span>
            </span>
            <span className="rounded-xl bg-[#eef0f5] px-2.5 py-2 text-[11px] leading-snug font-medium">
              <b>Your listing</b> · 3 BHK, Worli · ₹5.4 Cr
            </span>
          </div>
          <div className="relative mx-3.5 mt-3 mb-2 flex-1">
            {MATCH_CARDS.map((c, i) => (
              <div
                key={c.photo}
                className="absolute inset-0 overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(2,17,12,.25)]"
                style={{ transform: `translateY(${(last - i) * 8}px) scale(${1 - (last - i) * 0.04})` }}
              >
                <div className="relative h-[58%] bg-rez-cloud">
                  <Image src={unsplash(c.photo, 600)} alt="" fill sizes="262px" quality={70} className="object-cover" />
                  <span className="absolute top-2.5 left-2.5 rounded-full bg-black px-[9px] py-[5px] text-[10px] leading-none font-bold text-rez-full-white">{c.match}% match</span>
                </div>
                <div className="flex flex-col gap-[5px] px-3.5 py-3">
                  <b className="text-sm leading-tight font-semibold">{c.title}</b>
                  <span className="text-[11px] leading-tight font-medium text-[#6b7280]">{c.by}</span>
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    <span className="rounded-full bg-[#eef0f5] px-2 py-1 text-[10px] leading-none font-semibold">Buyer ready</span>
                    <span className="rounded-full bg-[#eef0f5] px-2 py-1 text-[10px] leading-none font-semibold">50:50 split</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-[22px] pt-4 pb-[18px]">
            <span className="flex size-12 items-center justify-center rounded-full bg-white text-rez-burgundy shadow-[0_4px_12px_rgba(2,17,12,.15)]">
              <Icon name="x" size={20} />
            </span>
            <span className="flex size-14 items-center justify-center rounded-full bg-[#1f7a4d] text-white shadow-[0_6px_16px_rgba(31,122,77,.4)]">
              <Icon name="check" size={24} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero({ onRequestAccess }: { onRequestAccess: () => void }) {
  const hero = HERO_IMAGES.corner;
  return (
    <section className="relative overflow-hidden bg-rez-forest px-4 py-12 text-rez-full-white md:px-8 md:py-20">
      <style>{`@keyframes rez-corner-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@media (prefers-reduced-motion:no-preference){.corner-phone-float{animation:rez-corner-float 6s ease-in-out infinite}}`}</style>
      <Image src={hero.src} alt="" fill priority sizes="100vw" quality={70} className="ken-burns object-cover opacity-45" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,17,12,.92)_0%,rgba(2,17,12,.7)_55%,rgba(2,17,12,.35)_100%)]" />
      <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-12">
        <div className="flex max-w-[620px] min-w-0 flex-[1_1_min(100%,480px)] flex-col gap-6">
          <h1 className="text-[36px] leading-[1.06] font-semibold tracking-[-0.025em] md:text-[clamp(40px,5vw,68px)] md:leading-[1.04]">
            The AI driven platform you need to run your real-estate business.
          </h1>
          <div className="flex flex-wrap gap-3">
            <Button variant="inverse" size="lg" className="h-[52px] px-[26px] text-[15px]" onClick={onRequestAccess}>
              Request Access
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-[52px] border-rez-full-white/50 px-[26px] text-[15px] text-rez-full-white hover:bg-white/[.08]">
              <a href="#callback">Schedule Demo</a>
            </Button>
          </div>
          <RealtorSignIn />
        </div>
        <PhoneMockup />
      </div>
      <a href={hero.href} target="_blank" rel="noopener noreferrer" className="absolute right-3 bottom-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white/90">
        Photo: {hero.credit} / Unsplash
      </a>
    </section>
  );
}

/* ---------------- Ai-R agents ---------------- */

/** The prototype lists only the live agents here; "soon" agents appear in the plans. */
const LIVE_AGENTS = AGENTS.filter((a) => !a.soon);

function Agents() {
  const [sel, setSel] = useState(0);
  const a = LIVE_AGENTS[sel];
  return (
    <section aria-labelledby="air-heading" className="px-4 py-14 md:px-8 md:py-[88px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7">
        <div className="flex flex-col gap-2.5">
          <span className="eyebrow text-rez-graphite">Ai-R</span>
          <h2 id="air-heading" className="text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[clamp(28px,3.4vw,40px)]">
            Artificial Intelligence for Realtors.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <div role="radiogroup" aria-label="Ai-R agents" className="flex flex-col justify-between gap-1.5 rounded-xl bg-rez-cloud p-2.5">
            {LIVE_AGENTS.map((ag, i) => (
              <button
                key={ag.name}
                type="button"
                role="radio"
                aria-checked={sel === i}
                onClick={() => setSel(i)}
                className={cn(
                  "flex items-center gap-3.5 rounded-[14px] border px-3.5 py-3 text-left transition-colors hover:bg-white",
                  sel === i ? "border-black bg-white" : "border-transparent",
                )}
              >
                <span className={cn("flex size-[38px] flex-none items-center justify-center rounded-full", sel === i ? "bg-black text-rez-full-white" : "bg-white text-black")}>
                  <Icon name={ag.icon as IconName} size={18} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <b className="text-[15px] leading-tight font-semibold">{ag.name}</b>
                  <span className="text-[12.5px] leading-tight text-rez-graphite">{ag.role}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-col overflow-hidden rounded-xl bg-black text-rez-full-white" aria-live="polite">
            <div className="relative flex aspect-video items-center justify-center bg-rez-timber">
              <span aria-hidden className="flex size-[76px] items-center justify-center rounded-full bg-rez-mocaccino text-black">
                <Icon name="play-circle" size={30} />
              </span>
              <div className="absolute inset-x-[18px] bottom-3.5 flex items-center gap-3 text-xs font-semibold">
                <span aria-hidden className="h-1 flex-1 rounded bg-white/25" />
                <span>Demo video coming soon</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2.5 px-7 pt-[26px] pb-[30px]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="eyebrow opacity-75">{a.role}</span>
                <span className="rounded-full bg-rez-mocaccino px-2 py-1 text-[9px] leading-none tracking-[0.14em] text-black [font-family:var(--font-eyebrow)]">LIVE</span>
              </div>
              <h3 className="text-[28px] leading-tight font-bold tracking-[-0.01em]">{a.name}</h3>
              <p className="text-base leading-normal opacity-85">{a.desc}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */

const EYEBROW = "text-[11px] leading-none tracking-[0.16em] uppercase [font-family:var(--font-eyebrow)]";

function SoonTag() {
  return <span className="rounded-full bg-rez-burgundy px-2 py-1 text-[9px] leading-none tracking-[0.14em] text-rez-full-white [font-family:var(--font-eyebrow)]">SOON</span>;
}

function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [member, setMember] = useState(false);
  const [compare, setCompare] = useState(false);
  const [pack, setPack] = useState(5);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [order, setOrder] = useState<OrderInput>({ planId: null, seats: 1, annual: false, member: false, addons: [], packMillions: 0 });

  const openCheckout = (patch: Partial<OrderInput>) => {
    setOrder({ planId: null, seats: 1, annual, member, addons: [], packMillions: 0, ...patch });
    setCheckoutOpen(true);
  };

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="scroll-mt-4 bg-[#f4f2ef] px-4 py-14 md:px-8 md:py-[88px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex max-w-[620px] flex-col gap-2.5">
            <span className={cn(EYEBROW, "text-rez-graphite")}>Plans and pricing</span>
            <h2 id="pricing-heading" className="text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[40px]">
              Pay for the AI you use.
            </h2>
            <p className="text-base leading-snug text-rez-graphite">Forms, lists and search stay free. Plans unlock Ai-R agents and monthly credits, priced per user.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="Billing period" className="flex gap-0.5 rounded-full border border-rez-smoke bg-white p-1">
              {(
                [
                  [false, "Monthly"],
                  [true, "Annual"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={annual === v}
                  onClick={() => setAnnual(v)}
                  className={cn("flex h-10 items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors", annual === v ? "bg-black text-rez-full-white" : "text-black")}
                >
                  {label}
                  {v && <span className="rounded-full bg-rez-mocaccino px-2 py-1 text-[11px] leading-none font-bold text-black">Save 20%</span>}
                </button>
              ))}
            </div>
            <label className={cn("flex h-12 cursor-pointer items-center gap-2.5 rounded-full border bg-white pr-[18px] pl-3.5 text-sm font-semibold", member ? "border-black" : "border-rez-smoke")}>
              <Checkbox checked={member} onCheckedChange={(c) => setMember(c === true)} />I am a NAR-India member
            </label>
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PLANS.map((p) => {
            const price = planPrice(p, { annual, member });
            const dark = p.popular;
            return (
              <li key={p.id} className={cn("flex flex-col gap-[22px] rounded-xl border px-5 py-[30px] min-[360px]:px-7", dark ? "border-black bg-black text-rez-full-white" : "border-rez-smoke bg-white")}>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-[22px] leading-none font-bold">{p.name}</h3>
                    {p.popular && <span className={cn(EYEBROW, "rounded-full bg-rez-mocaccino px-2.5 py-1.5 text-[10px] tracking-[0.14em] text-black")}>Popular</span>}
                  </div>
                  <p className="text-sm opacity-75">{p.who}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="text-[44px] leading-none font-bold tracking-[-0.02em]">{inr(price)}</span>
                    {price < p.monthly && <span className="text-base font-medium line-through opacity-60">{inr(p.monthly)}</span>}
                  </div>
                  <span className="text-[13px] font-medium opacity-75">per user / month, {annual ? `billed ${inr(price * 12)} a year` : "billed monthly"}</span>
                  {member && (
                    <span className={cn("self-start rounded-full border border-rez-mocaccino px-2.5 py-1.5 text-xs leading-none font-bold", dark ? "text-rez-mocaccino" : "text-[#6b5236]")}>
                      NAR-India member, {p.memberDiscount}% off
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    [String(p.agents.length), "Ai-R agents"],
                    [`${p.credits}M`, "credits / month"],
                  ].map(([n, l]) => (
                    <span key={l} className={cn("flex flex-col gap-1.5 rounded-[14px] p-3.5", dark ? "bg-white/10" : "bg-[#f4f2ef]")}>
                      <b className="text-[22px] leading-none">{n}</b>
                      <span className="text-xs font-medium opacity-75">{l}</span>
                    </span>
                  ))}
                </div>
                <ul className="flex flex-1 flex-col gap-2.5 text-sm font-medium" aria-label={`Agents in ${p.name}`}>
                  {p.agents.map((i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <span aria-hidden className="flex size-[22px] flex-none items-center justify-center rounded-full bg-rez-mocaccino text-black">
                        <Icon name="check" size={13} />
                      </span>
                      <span className="flex-1">{AGENTS[i].name}</span>
                      {AGENTS[i].soon && <SoonTag />}
                    </li>
                  ))}
                </ul>
                <Button variant={dark ? "warm" : "default"} size="lg" className="h-[52px] text-[15px] font-bold" onClick={() => openCheckout({ planId: p.id as PlanId })}>
                  Choose {p.name}
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-center">
          <Button variant="secondary" size="lg" className="text-sm font-bold" onClick={() => setCompare((c) => !c)} aria-expanded={compare} aria-controls="compare-table">
            {compare ? "Hide comparison" : "Compare all plans"}
          </Button>
        </div>
        {compare && (
          <div id="compare-table" className="overflow-x-auto rounded-xl border border-rez-smoke bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">Plan comparison</caption>
              <thead className="text-left">
                <tr>
                  <th scope="col" className="px-[22px] py-3.5 font-semibold">Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.id} scope="col" className="px-4 py-3.5 text-center font-extrabold">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-rez-smoke">
                  <th scope="row" className="px-[22px] py-3.5 text-left font-medium">Per user / month</th>
                  {PLANS.map((p) => (
                    <td key={p.id} className="px-4 py-3.5 text-center font-bold">{inr(planPrice(p, { annual, member }))}</td>
                  ))}
                </tr>
                <tr className="border-t border-rez-smoke bg-[#f4f2ef]"><th colSpan={4} scope="colgroup" className="px-[22px] py-3 text-left text-xs font-bold tracking-[0.12em] text-[#6b5236]">AI-R AGENTS</th></tr>
                {AGENTS.map((a, i) => (
                  <tr key={a.name} className="border-t border-rez-smoke">
                    <th scope="row" className="px-[22px] py-3.5 text-left font-medium">{a.name}{a.soon ? " (soon)" : ""}</th>
                    {PLANS.map((p) => (
                      <td key={p.id} className="px-4 py-3.5 text-center">
                        {p.agents.includes(i) ? (
                          <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-rez-timber text-rez-full-white">
                            <Icon name="check" size={13} title="Included" />
                          </span>
                        ) : (
                          <span className="text-[#8a8579]" aria-label="Not included">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-rez-smoke bg-[#f4f2ef]"><th colSpan={4} scope="colgroup" className="px-[22px] py-3 text-left text-xs font-bold tracking-[0.12em] text-[#6b5236]">INDICATIVE MONTHLY OUTPUT</th></tr>
                {SKUS.map(([label, v]) => (
                  <tr key={label} className="border-t border-rez-smoke">
                    <th scope="row" className="px-[22px] py-3.5 text-left font-medium">{label}</th>
                    {PLANS.map((p) => (
                      <td key={p.id} className="px-4 py-3.5 text-center">{v[p.id] ?? <span className="text-[#8a8579]" aria-label="Not included">—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-rez-smoke px-[22px] py-3.5 text-[13px] text-rez-graphite">Output counts are indicative, per user each month. Actual use depends on how you spend your credits.</p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4 rounded-xl border border-rez-smoke bg-white p-6 md:p-7">
            <div className="flex flex-col gap-1.5">
              <span className={cn(EYEBROW, "text-rez-graphite")}>Firm add-ons</span>
              <h3 className="text-[22px] leading-tight font-semibold">Bought once for the whole firm.</h3>
            </div>
            <ul className="flex flex-col gap-4">
              {ADDONS.map((a) => (
                <li key={a.id} className="flex items-center gap-4 border-t border-rez-smoke pt-4">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <b className="text-base leading-tight">{a.name}</b>
                    <span className="text-[13px] leading-snug text-rez-graphite">{a.desc}</span>
                    <span className="text-sm font-bold">
                      {a.yearly ? `${inr(a.yearly)} / year` : annual ? `${inr(a.monthly * 0.8)} / month, billed yearly` : `${inr(a.monthly)} / month`}
                    </span>
                  </span>
                  <Button variant="secondary" className="h-10 px-[18px] text-[13px] font-bold" aria-label={`Add ${a.name}`} onClick={() => openCheckout({ addons: [a.id as AddonId] })}>
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 rounded-xl border border-rez-smoke bg-white p-6 md:p-7">
              <div className="flex flex-col gap-1.5">
                <span className={cn(EYEBROW, "text-rez-graphite")}>Top-up credits</span>
                <h3 className="text-[22px] leading-tight font-semibold">Packs that never expire.</h3>
                <p className="text-[13px] text-rez-graphite">An AI listing uses 200K credits, a property search 25K.</p>
              </div>
              <div role="radiogroup" aria-label="Credit pack" className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2.5">
                {PACKS.map((p) => (
                  <button
                    key={p.millions}
                    type="button"
                    role="radio"
                    aria-checked={pack === p.millions}
                    onClick={() => setPack(p.millions)}
                    className={cn("flex flex-col items-start gap-1.5 rounded-[14px] border p-3.5 text-left", pack === p.millions ? "border-black bg-[#f4f2ef]" : "border-rez-smoke bg-white hover:border-black")}
                  >
                    <b className="text-base leading-none">{p.millions}M credits</b>
                    <span className="text-sm leading-none font-semibold text-rez-graphite">{inr(p.price)}</span>
                    {p.millions === 20 && <span className="rounded-full bg-rez-mocaccino px-[7px] py-[3px] text-[10px] leading-none font-bold text-black">Best value</span>}
                  </button>
                ))}
              </div>
              <Button size="lg" className="text-sm font-bold" onClick={() => openCheckout({ packMillions: pack })}>
                Buy {pack}M credits
              </Button>
            </div>
            <div className="flex flex-1 flex-col gap-3 rounded-xl bg-black p-6 text-rez-full-white md:p-7">
              <span className={cn(EYEBROW, "opacity-75")}>Custom plan</span>
              <h3 className="text-[22px] leading-tight font-semibold">10 or more users.</h3>
              <p className="text-sm leading-relaxed opacity-80">All Ai-R agents on every seat, one pooled firm credit grant and uncapped training.</p>
              <div className="mt-auto pt-1">
                <Button asChild variant="inverse">
                  <a href="#callback">Request a Call</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} order={order} onOrderChange={(p) => setOrder((o) => ({ ...o, ...p }))} />
    </section>
  );
}

/* ---------------- Testimonials ---------------- */

const PEOPLE = [
  ["Akhil Bisht", "Manager, ABC Realty", "photo-1642257859842-c95f9fa8121d", "Having all my business in one place makes my job so much easier.", "All my listings, leads and site visits now live in one app. My team stopped juggling spreadsheets and WhatsApp groups.", "2:14"],
  ["Rukmani Iyer", "Founder, AssetPro Realty", "photo-1573497019940-1c28c88b4f3e", "Verified leads changed how we close.", "We spend time only on serious buyers now. Video tours alone cut our wasted site visits by half.", "1:48"],
  ["Arjun Mehta", "Partner, Skyline Realty", "photo-1600878459138-e1123b37cb30", "Price analysis wins me mandates.", "Showing owners real registered transactions makes the pricing conversation easy. They trust the number.", "2:31"],
  ["Sana Qureshi", "Director, Urban Nest Advisors", "photo-1573496359142-b8d87734a5a2", "My rentals move faster than ever.", "Tenants find us through Rezide and the paperwork is guided end to end. Our rental turnaround is down to days.", "1:22"],
  ["Vikram Rao", "Head, Keystone Commercial", "photo-1588178454780-441fa5b99fa5", "The dashboard is my digital office.", "From inventory to follow-ups to closures, I can run my whole commercial desk from my phone.", "2:05"],
  ["Neha Kapoor", "Principal, Networth Realty", "photo-1585240975858-7264fd020798", "A platform built for Indian realtors.", "RERA details, local data and listings in one place. It respects how we actually work.", "1:57"],
] as const;

const T_TABS = [
  ["watch", "Watch Them"],
  ["hear", "Hear Them"],
  ["read", "Read Them"],
] as const;
type TTab = (typeof T_TABS)[number][0];

const face = (id: string, w: number) => `${unsplash(id, w)}&crop=faces`;

function Testimonials() {
  const [tab, setTab] = useState<TTab>("watch");
  const tabsId = useId();
  // ARIA tabs pattern: arrow keys / Home / End move between tabs; only the selected tab is in the tab order.
  const onTabKey = (key: string, i: number) => {
    const n = T_TABS.length;
    const next = key === "ArrowRight" ? (i + 1) % n : key === "ArrowLeft" ? (i - 1 + n) % n : key === "Home" ? 0 : key === "End" ? n - 1 : -1;
    if (next < 0) return false;
    setTab(T_TABS[next][0]);
    document.getElementById(`${tabsId}-${T_TABS[next][0]}`)?.focus();
    return true;
  };
  return (
    <section aria-labelledby="t-heading" className="px-4 py-14 md:px-8 md:py-[88px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-2.5">
            <span className={cn(EYEBROW, "text-rez-graphite")}>Testimonials</span>
            <h2 id="t-heading" className="text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[40px]">
              Realtors on Rezide.
            </h2>
            <SampleBadge className="self-start">Sample testimonials · videos and audio not yet published</SampleBadge>
          </div>
          <div role="tablist" aria-label="Testimonial format" className="flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-rez-cloud p-1">
            {T_TABS.map(([id, label], i) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`${tabsId}-${id}`}
                aria-selected={tab === id}
                aria-controls={`${tabsId}-panel`}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(e) => {
                  if (onTabKey(e.key, i)) e.preventDefault();
                }}
                className={cn("flex h-10 shrink-0 items-center rounded-full px-5 text-sm transition-colors", tab === id ? "bg-white font-bold shadow-rez-sm" : "font-medium")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${tab}`}>
          {tab === "watch" && (
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {PEOPLE.map(([name, role, photo, short, , dur]) => (
                <li key={name}>
                  <article className="flex h-full flex-col overflow-hidden rounded-xl border border-rez-smoke bg-white">
                    <div className="relative aspect-[16/10] bg-rez-forest">
                      <Image src={face(photo, 640)} alt={`${name} (sample photo)`} fill sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw" quality={70} className="object-cover object-top" />
                      <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,17,12,0)_40%,rgba(2,17,12,.7)_100%)]" />
                      <span aria-hidden className="absolute top-1/2 left-1/2 flex size-12 -translate-1/2 items-center justify-center rounded-full bg-white/90 text-black">
                        <Icon name="play-circle" size={30} />
                      </span>
                      <span className="absolute right-3.5 bottom-3.5 rounded-full bg-[rgba(2,17,12,.7)] px-2.5 py-1.5 text-xs leading-none font-semibold text-rez-full-white">
                        <span className="sr-only">Video length </span>
                        {dur}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 px-5 pt-[18px] pb-5">
                      <b className="text-base leading-snug font-semibold">“{short}”</b>
                      <span className="text-[13px] text-rez-graphite">
                        {name} · {role}
                      </span>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
          {tab === "hear" && (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PEOPLE.map(([name, role, photo, , , dur]) => (
                <li key={name} className="flex items-center gap-4 rounded-xl border border-rez-smoke bg-white p-[18px]">
                  <span className="relative size-16 flex-none overflow-hidden rounded-full bg-rez-cloud">
                    <Image src={face(photo, 200)} alt="" fill sizes="64px" quality={70} className="object-cover" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <span className="flex flex-col gap-[3px]">
                      <b className="text-[15px] leading-tight font-semibold">{name}</b>
                      <span className="text-xs text-rez-graphite">{role}</span>
                    </span>
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden className="flex size-9 flex-none items-center justify-center rounded-full bg-rez-cloud text-rez-graphite">
                        <Icon name="volume-high" size={16} />
                      </span>
                      <span aria-hidden className="h-1 flex-1 rounded-full bg-rez-cloud" />
                      <span className="text-xs font-semibold text-rez-graphite">
                        <span className="sr-only">Audio, </span>
                        {dur}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {tab === "read" && (
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {PEOPLE.map(([name, role, photo, , quote]) => (
                <li key={name}>
                  <figure className="flex h-full flex-col justify-between gap-[22px] rounded-xl border border-rez-smoke bg-white p-7">
                    <blockquote className="text-lg leading-normal font-medium text-pretty">“{quote}”</blockquote>
                    <figcaption className="flex items-center gap-3">
                      <span className="relative size-12 flex-none overflow-hidden rounded-full bg-rez-cloud">
                        <Image src={face(photo, 200)} alt="" fill sizes="48px" quality={70} className="object-cover" />
                      </span>
                      <span className="flex flex-col gap-[3px]">
                        <b className="text-[15px] leading-tight font-semibold">{name}</b>
                        <span className="text-xs text-rez-graphite">{role}</span>
                      </span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- App band ---------------- */

function AppBand() {
  return (
    <section aria-labelledby="app-heading" className="px-4 pt-14 md:px-8 md:pt-[72px]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-7 rounded-xl bg-black px-6 py-7 text-rez-full-white md:px-8">
        <div className="flex flex-wrap items-center gap-5">
          <span aria-hidden className="flex size-28 flex-none flex-col items-center justify-center gap-1.5 rounded-[14px] bg-white text-center text-[11px] leading-tight font-semibold text-rez-graphite">
            <Icon name="mobile" size={28} className="text-black" />
            QR code
            <br />
            coming soon
          </span>
          <div className="flex flex-col gap-3">
            <h2 id="app-heading" className="text-[22px] leading-tight font-semibold">
              Download Rezide.
            </h2>
            <Button asChild variant="inverse" className="self-start">
              <Link href="/signup?role=realtor">Register</Link>
            </Button>
          </div>
        </div>
        <div className="flex max-w-[520px] flex-col gap-3.5">
          <p className="text-[15px] leading-normal opacity-85">On iOS and Android. Get an edge in the real-estate industry. The apps aren’t published yet, so Rezide works in any mobile browser for now.</p>
          <div className="flex flex-wrap gap-2.5">
            {[
              ["Download on the", "App Store"],
              ["Get it on", "Google Play"],
            ].map(([pre, store]) => (
              <span
                key={store}
                aria-label={`${store}: coming soon`}
                role="note"
                className="flex h-[52px] flex-col items-start justify-center gap-[3px] rounded-[14px] border border-rez-full-white/40 px-5 opacity-80"
              >
                <span className="text-[10px] leading-none font-medium opacity-75">{pre}</span>
                <b className="text-base leading-none font-bold">{store}</b>
                <span className="sr-only">coming soon</span>
              </span>
            ))}
            <span className="self-center text-xs opacity-70">Coming soon</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ + callback ---------------- */

const FAQS = [
  ["How do I come on Rezide?", "Register with your mobile number and RERA details. Our team verifies your profile within one working day."],
  ["What is a property listing mandate?", "A written authorisation from the owner allowing you to market the property. Rezide stores it with the listing."],
  ["How do I share listings with prospects?", "Share a branded link or brochure on WhatsApp or email straight from the listing page."],
  ["What is property tagging?", "Tag listings by locality, budget or buyer profile so you can match inventory to leads in seconds."],
  ["Is there a free trial?", "Yes. Request a trial and get full access for 14 days, no card needed, subject to verification."],
];

const callbackSchema = z.object({
  firstName: personName("first name"),
  lastName: z.string().trim().max(60),
  mobile: indianMobile,
  email: optionalEmail,
  firm: z.string().trim().max(80),
  message: z.string().trim().max(500, "Keep your message under 500 characters."),
  consent: z.boolean().refine((v) => v, "Please agree so we can call you."),
});
type Callback = z.infer<typeof callbackSchema>;

const CB_INPUT = "h-[50px] rounded-full border-rez-smoke bg-white px-[18px] text-[15px]";

function FaqAndCallback() {
  const form = useForm<Callback>({
    resolver: zodResolver(callbackSchema),
    defaultValues: { firstName: "", lastName: "", mobile: "", email: "", firm: "", message: "", consent: false },
    mode: "onTouched",
  });
  const mutation = useMutation({ mutationFn: requestCallback, onError: (err) => applyFieldErrors(err, form.setError) });
  const e = form.formState.errors;

  return (
    <section className="px-4 pt-14 pb-16 md:px-8 md:pt-[72px] md:pb-24">
      <div className="mx-auto grid grid-cols-1 max-w-[1200px] items-start gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <h2 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[36px]">Frequently asked questions.</h2>
          <Accordion type="single" collapsible defaultValue="faq-0">
            {FAQS.map(([q, a], i) => (
              <AccordionItem key={q} value={`faq-${i}`} className="border-rez-smoke">
                <AccordionTrigger className="py-5 text-left text-base leading-snug font-semibold hover:no-underline">{q}</AccordionTrigger>
                <AccordionContent className="pb-5 text-[15px] leading-normal text-rez-graphite">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <div id="callback" className="flex scroll-mt-4 flex-col gap-4 rounded-xl bg-rez-cloud p-6 md:p-8">
          <h2 className="text-[26px] leading-tight font-semibold">Got questions? Get a callback.</h2>
          {mutation.isSuccess ? (
            <div role="status" className="flex flex-col gap-4">
              <p className="flex items-start gap-3 rounded-2xl bg-white p-4 text-[15px]">
                <Icon name="check-circle" size={22} className="mt-0.5" />
                <span>
                  Reference {mutation.data.id}.{" "}
                  {API_MOCKING ? "Recorded in demo mode only; nobody will call you from this prototype." : "A Rezide expert will call you within one working day."}
                </span>
              </p>
              <Button variant="secondary" onClick={() => { mutation.reset(); form.reset(); }}>
                Send another request
              </Button>
            </div>
          ) : (
            <form noValidate className="flex flex-col gap-3" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="First name" required error={e.firstName?.message}>
                  <Input autoComplete="given-name" placeholder="First name" className={CB_INPUT} {...form.register("firstName")} />
                </Field>
                <Field label="Last name" optional error={e.lastName?.message}>
                  <Input autoComplete="family-name" placeholder="Last name" className={CB_INPUT} {...form.register("lastName")} />
                </Field>
                <Field label="Mobile number" required error={e.mobile?.message}>
                  <Controller control={form.control} name="mobile" render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />} />
                </Field>
                <Field label="Email address" optional error={e.email?.message}>
                  <Input type="email" autoComplete="email" placeholder="Email address" className={CB_INPUT} {...form.register("email")} />
                </Field>
              </div>
              <Field label="Firm name" optional>
                <Input autoComplete="organization" placeholder="Firm name" className={CB_INPUT} {...form.register("firm")} />
              </Field>
              <Field label="Message" optional error={e.message?.message}>
                <Textarea rows={4} maxLength={500} placeholder="Message (optional)" className="rounded-2xl border-rez-smoke bg-white px-[18px] py-3.5 text-[15px]" {...form.register("message")} />
              </Field>
              <Controller
                control={form.control}
                name="consent"
                render={({ field }) => (
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-start gap-3 text-[13px] text-rez-arsenic">
                      <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} aria-invalid={e.consent ? true : undefined} className="mt-0.5 bg-white" />
                      I agree to be contacted by Rezide about this request.
                    </label>
                    {e.consent && <p className="pl-7 text-xs font-medium text-destructive">{e.consent.message}</p>}
                  </div>
                )}
              />
              {mutation.isError && !hasFieldErrors(mutation.error) && <FormError>{errorMessage(mutation.error)}</FormError>}
              <Button type="submit" size="lg" className="h-[52px] text-[15px]" disabled={mutation.isPending}>
                {mutation.isPending ? "Sending…" : "Request Callback"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export function RealtorCorner() {
  const [trialOpen, setTrialOpen] = useState(false);
  const toLogin = () => {
    setTrialOpen(false);
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    // Focus after the dialog has returned focus to its trigger.
    setTimeout(() => document.getElementById("realtor-login-phone")?.focus({ preventScroll: true }), 50);
  };
  const toPricing = () => {
    setTrialOpen(false);
    setTimeout(() => document.getElementById("pricing")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 50);
  };
  return (
    <>
      <Hero onRequestAccess={() => setTrialOpen(true)} />
      <Agents />
      <Pricing />
      <Testimonials />
      <AppBand />
      <FaqAndCallback />
      <div className="px-4 pb-10 md:px-8">
        <DemoNotice className="mx-auto max-w-[1200px]">
          Prices are indicative. Trials, payments and callbacks are simulated in this prototype.
        </DemoNotice>
      </div>
      <TrialDialog open={trialOpen} onOpenChange={setTrialOpen} onSignIn={toLogin} onSeePlans={toPricing} />
    </>
  );
}
