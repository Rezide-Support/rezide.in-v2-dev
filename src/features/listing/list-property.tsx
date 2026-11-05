"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useSyncExternalStore } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Icon } from "@/components/brand/icon";
import { Field, FormError } from "@/components/common/form-field";
import { OtpInput } from "@/components/common/otp-input";
import { PhoneInput } from "@/components/common/phone-input";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOtpFlow } from "@/features/auth/use-otp-flow";
import { ApiError, errorMessage } from "@/lib/api/client";
import { OTP_LENGTH } from "@/lib/constants";
import { formatPhone } from "@/lib/format";
import { indianMobile, otpCode, personName } from "@/lib/validation";
import { useListingDraftStore } from "@/stores/listing-draft";
import { useSession, useSessionStore } from "@/stores/session";
import type { ListingIntent } from "@/types/models";
import { ListingWizard } from "./listing-wizard";

const guestSchema = z.object({ firstName: personName("first name"), lastName: personName("last name"), phone: indianMobile });
type GuestValues = z.infer<typeof guestSchema>;

function StartCard() {
  const { session } = useSession();
  const signIn = useSessionStore((s) => s.signIn);
  const start = useListingDraftStore((s) => s.start);
  const [intent, setIntent] = useState<ListingIntent>("sell");
  const [guest, setGuest] = useState<GuestValues | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const flow = useOtpFlow((s) => {
    signIn(s);
    start({ intent, category: "home" });
  });
  const form = useForm<GuestValues>({ resolver: zodResolver(guestSchema), defaultValues: { firstName: "", lastName: "", phone: "" }, mode: "onTouched" });
  const e = form.formState.errors;

  const intentControl = (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold">I want to</span>
      <Segmented
        label="I want to"
        value={intent}
        onChange={setIntent}
        appearance="accent"
        size="lg"
        fullWidth
        options={[
          { value: "sell", label: "Sell" },
          { value: "rent", label: "Rent / Lease" },
        ]}
      />
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-5 rounded-xl bg-white p-6 text-black shadow-rez-lg sm:p-8 md:w-[440px]">
      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.01em]">
          {flow.step === "otp" ? "Enter the OTP." : session ? "Add a new listing." : "List your property. Free."}
        </h2>
        <p className="text-sm leading-normal text-rez-graphite">
          {flow.step === "otp"
            ? `Enter the ${OTP_LENGTH}-digit code sent to ${formatPhone(guest?.phone ?? "")}.`
            : session
              ? `Welcome back, ${session.user.firstName}. Choose sell or rent out, then add your listing.`
              : "Takes less than 2 minutes to start."}
        </p>
      </div>

      {session ? (
        <>
          {intentControl}
          <Button size="xl" onClick={() => start({ intent, category: "home" })}>
            Start listing
          </Button>
        </>
      ) : flow.step === "phone" ? (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((v) => {
            setGuest(v);
            flow.send.mutate(v.phone);
          })}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="First name" required error={e.firstName?.message}>
              <Input autoComplete="given-name" {...form.register("firstName")} />
            </Field>
            <Field label="Last name" required error={e.lastName?.message}>
              <Input autoComplete="family-name" {...form.register("lastName")} />
            </Field>
          </div>
          {intentControl}
          <Field label="Mobile number" required error={e.phone?.message ?? (flow.send.error instanceof ApiError ? flow.send.error.fieldErrors?.phone : undefined)}>
            <Controller control={form.control} name="phone" render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />} />
          </Field>
          {flow.send.isError && !(flow.send.error instanceof ApiError && flow.send.error.fieldErrors) && <FormError>{errorMessage(flow.send.error)}</FormError>}
          <Button type="submit" size="xl" disabled={flow.send.isPending}>
            {flow.send.isPending ? "Sending code…" : "Send OTP"}
          </Button>
        </form>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            const parsed = otpCode.safeParse(code);
            if (!parsed.success) return setCodeError(parsed.error.issues[0].message);
            setCodeError(null);
            if (guest) flow.verify.mutate({ phone: guest.phone, code: parsed.data, role: "owner", firstName: guest.firstName, lastName: guest.lastName });
          }}
        >
          <Field
            label={`${OTP_LENGTH}-digit code`}
            labelClassName="sr-only"
            required
            error={codeError ?? (flow.verify.error ? (flow.verify.error instanceof ApiError ? flow.verify.error.fieldErrors?.code ?? flow.verify.error.message : errorMessage(flow.verify.error)) : undefined)}
          >
            <OtpInput value={code} onChange={setCode} autoFocus />
          </Field>
          <div className="flex justify-between text-[13px] font-medium text-rez-graphite">
            <button
              type="button"
              className="text-black underline underline-offset-[3px]"
              onClick={() => {
                flow.changeNumber();
                setCode("");
              }}
            >
              Change number
            </button>
            {flow.secondsLeft > 0 ? (
              <span>Resend in 0:{String(flow.secondsLeft).padStart(2, "0")}</span>
            ) : (
              <button type="button" className="text-black underline underline-offset-[3px]" onClick={() => guest && flow.send.mutate(guest.phone)}>
                Resend OTP
              </button>
            )}
          </div>
          <Button type="submit" size="xl" disabled={flow.verify.isPending}>
            {flow.verify.isPending ? "Verifying…" : "Verify and continue"}
          </Button>
        </form>
      )}
      <p className="border-t border-rez-smoke pt-3.5 text-center text-xs leading-normal text-rez-graphite">
        Your number stays private and is shared only when you accept an enquiry.
      </p>
    </div>
  );
}

const subscribeDraft = (cb: () => void) => useListingDraftStore.persist.onFinishHydration(cb);

export function ListProperty() {
  const draftHydrated = useSyncExternalStore(subscribeDraft, () => useListingDraftStore.persist.hasHydrated(), () => false);
  const started = useListingDraftStore((s) => s.started);
  const { status } = useSession();

  if (draftHydrated && status === "authenticated" && started) return <ListingWizard />;

  return (
    <>
      <section className="bg-rez-forest px-4 py-12 text-rez-full-white md:px-8 md:py-[72px]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-12">
          <div className="flex max-w-[640px] min-w-0 flex-[1_1_min(100%,520px)] flex-col gap-7">
            <span className="eyebrow text-rez-mocaccino">List property</span>
            <h1 className="text-[40px] leading-[1.02] font-semibold tracking-[-0.025em] md:text-[clamp(44px,5.5vw,76px)]">
              Sell or rent faster. <span className="text-rez-mocaccino">100% free.</span>
            </h1>
            <p className="max-w-[560px] text-[17px] leading-normal text-rez-full-white/85 md:text-[19px]">
              List in minutes to connect with verified buyers and tenants.
              <br />
              <span className="text-rez-mocaccino">Want assistance? Top local realtors can assist, if you choose.</span>
            </p>
            <ul className="flex flex-col gap-3.5">
              {["Unlimited free listings, zero hidden fees", "Direct WhatsApp and call with buyers", "Price analysis from registered transactions"].map((p) => (
                <li key={p} className="flex items-center gap-3 text-base font-medium">
                  <Icon name="check-circle" size={22} className="text-rez-mocaccino" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          {status === "loading" || !draftHydrated ? <div className="h-[420px] w-full rounded-xl bg-white/10 md:w-[440px]" aria-busy="true" /> : <StartCard />}
        </div>
      </section>

      <section className="bg-white px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-9">
          <div className="flex flex-col gap-2.5">
            <h2 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[40px]">List free in 5 simple steps.</h2>
            <p className="text-[17px] text-rez-graphite">Get verified buyers and tenants.</p>
          </div>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <ol className="flex flex-col gap-3">
              {[
                ["Profile", "Owner, contact person or POA. Verify with OTP."],
                ["Property type", "Home, office, retail, industrial or land."],
                ["Property", "Project, address, tower, unit and floor."],
                ["Commercials", "Sell or rent out, and your price."],
                ["Realtor assist", "Optional. Pick up to 3 realtors, or list it yourself."],
              ].map(([t, d], i) => (
                <li key={t} className="flex items-center gap-[18px] rounded-xl border border-rez-smoke bg-white px-[22px] py-[18px]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-rez-cloud text-[15px] font-bold">{i + 1}</span>
                  <span className="flex flex-col gap-1">
                    <span className="text-[17px] font-semibold">{t}</span>
                    <span className="text-sm text-rez-graphite">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-5 rounded-xl border border-rez-smoke p-8">
                <h3 className="text-[28px] leading-tight font-semibold tracking-[-0.01em]">What you get. Free.</h3>
                <ul className="flex flex-col gap-3.5">
                  {["100% free listing", "Verified buyer and tenant leads", "Direct WhatsApp and call connect", "Price analysis on your listing", "Add or edit anytime", "Performance analytics"].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-base font-medium">
                      <Icon name="check-circle" size={20} className="text-rez-mocaccino-ink" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button size="xl" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                  List property free
                </Button>
              </div>
              <div className="flex flex-col gap-[18px] rounded-xl bg-rez-mocaccino p-6 text-black sm:p-8">
                <div className="flex flex-col gap-2">
                  <span className="eyebrow opacity-80">Add-on · Valuation report</span>
                  <h3 className="text-[26px] leading-tight font-semibold tracking-[-0.01em]">Know your price before you list.</h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    ["Market valuation", "Fair value for your exact unit"],
                    ["Comparables", "Recent deals in your society and locality"],
                    ["Rental yield", "Expected monthly rent and yield"],
                    ["Govt. benchmark", "Ready reckoner cross-check"],
                  ].map(([t, d]) => (
                    <div key={t} className="flex flex-col gap-1 rounded-[14px] bg-white/35 px-4 py-3.5">
                      <span className="text-sm font-semibold">{t}</span>
                      <span className="text-xs leading-snug">{d}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button size="lg" disabled aria-label="Valuation report, coming soon">
                    Coming soon
                  </Button>
                  <span className="text-xs font-medium">Reports aren’t available in this prototype.</span>
                </div>
              </div>
              <div className="flex items-center gap-3.5 rounded-xl bg-rez-cloud px-[22px] py-[18px]">
                <Icon name="shield-check" size={26} />
                <span className="flex flex-col gap-0.5">
                  <b className="text-[15px] font-semibold">Verified by Rezide.</b>
                  <span className="text-[13px] text-rez-graphite">Your number is shared only when you accept an enquiry.</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
