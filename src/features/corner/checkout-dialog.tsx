"use client";

import { useState } from "react";
import { Icon } from "@/components/brand/icon";
import { DemoNotice } from "@/components/common/feedback";
import { Field } from "@/components/common/form-field";
import { OtpInput } from "@/components/common/otp-input";
import { PhoneInput } from "@/components/common/phone-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useOtpFlow } from "@/features/auth/use-otp-flow";
import { ApiError, errorMessage } from "@/lib/api/client";
import { OTP_LENGTH } from "@/lib/constants";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { indianMobile, otpCode } from "@/lib/validation";
import { useSession, useSessionStore } from "@/stores/session";
import { ADDONS, PACKS, PLANS, computeOrder, inr, planPrice, type OrderInput } from "./pricing";

const EYEBROW = "text-[11px] leading-none tracking-[0.16em] text-rez-graphite uppercase [font-family:var(--font-eyebrow)]";

/** In-drawer realtor sign in (phone → OTP), as in the prototype's "Sign in to buy" step. */
function CheckoutSignIn() {
  const signIn = useSessionStore((s) => s.signIn);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const flow = useOtpFlow((s) => signIn(s), { role: "realtor" });

  return (
    <form
      noValidate
      className="flex flex-col gap-4 p-7"
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
      <p className="flex items-start gap-3 rounded-2xl bg-rez-cloud p-4 text-sm leading-relaxed font-medium">
        <Icon name="lock" size={20} className="mt-px shrink-0" />
        Only signed-in realtors can buy. Sign in with the mobile on your Rezide account.
      </p>
      {flow.step === "phone" ? (
        <Field label="Mobile number" required error={phoneError ?? (flow.send.error instanceof ApiError ? flow.send.error.message : undefined)}>
          <PhoneInput value={phone} onChange={setPhone} />
        </Field>
      ) : (
        <>
          <p className="text-sm text-rez-graphite">
            Enter the {OTP_LENGTH}-digit code sent to {formatPhone(phone)}.{" "}
            <button type="button" className="font-semibold text-black underline" onClick={() => flow.changeNumber()}>
              Change
            </button>
          </p>
          <Field label="Code" labelClassName="sr-only" required error={codeError ?? (flow.verify.error ? errorMessage(flow.verify.error) : undefined)}>
            <OtpInput value={code} onChange={setCode} autoFocus />
          </Field>
        </>
      )}
      <Button type="submit" size="xl" disabled={flow.send.isPending || flow.verify.isPending}>
        {flow.step === "otp" ? (flow.verify.isPending ? "Verifying…" : "Verify") : flow.send.isPending ? "Sending…" : "Send OTP"}
      </Button>
    </form>
  );
}

/**
 * Order summary drawer. Payments are NOT connected: the prototype's simulated
 * "Payment successful" step was removed so no purchase is ever implied.
 * INTEGRATION: hand the computed order to the payment gateway here.
 */
export function CheckoutDialog({
  open,
  onOpenChange,
  order,
  onOrderChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  order: OrderInput;
  onOrderChange: (patch: Partial<OrderInput>) => void;
}) {
  const { session } = useSession();
  const realtor = session?.user.role === "realtor" ? session : null;
  const totals = computeOrder(order);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="gap-0 overflow-y-auto bg-white p-0 data-[side=right]:sm:max-w-[520px]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-rez-smoke bg-white px-7 py-[22px]">
          <div className="flex flex-col gap-1.5">
            <span className={EYEBROW}>{realtor ? "Checkout" : "Sign in to buy"}</span>
            <SheetTitle className="text-[22px] leading-tight font-semibold">{realtor ? "Your order." : "Verify it is you."}</SheetTitle>
            <SheetDescription className="sr-only">
              {realtor ? "Choose a plan, add-ons and credits. Payments are not connected in this prototype." : "Only signed-in realtors can buy plans and add-ons."}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close" className="bg-rez-cloud">
              <Icon name="x" size={16} />
            </Button>
          </SheetClose>
        </div>

        {!realtor ? (
          <CheckoutSignIn />
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-6 px-7 py-6">
              <p className="flex items-center gap-2.5 text-[13px] font-medium text-rez-graphite">
                <span className="flex size-[22px] items-center justify-center rounded-full bg-rez-timber text-rez-full-white">
                  <Icon name="check" size={13} />
                </span>
                Signed in as {formatPhone(realtor.user.phone)} (demo session)
              </p>
              <fieldset className="flex flex-col gap-2.5">
                <legend className={cn(EYEBROW, "mb-2.5")}>Plan</legend>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {[{ id: null, name: "None", sub: "Add-ons only" }, ...PLANS.map((p) => ({ id: p.id, name: p.name, sub: `${inr(planPrice(p, order))}/user` }))].map((p) => (
                    <label
                      key={p.name}
                      className={cn(
                        "flex cursor-pointer flex-col items-start gap-1.5 rounded-[14px] border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rez-mocaccino",
                        order.planId === p.id ? "border-black bg-[#f4f2ef]" : "border-rez-smoke hover:border-black",
                      )}
                    >
                      <input type="radio" name="plan" checked={order.planId === p.id} onChange={() => onOrderChange({ planId: p.id })} className="sr-only" />
                      <b className="text-sm leading-none">{p.name}</b>
                      <span className="text-xs leading-tight text-rez-graphite">{p.sub}</span>
                    </label>
                  ))}
                </div>
                <div role="radiogroup" aria-label="Billing" className="flex gap-0.5 self-start rounded-full bg-rez-cloud p-1">
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
                      aria-checked={order.annual === v}
                      onClick={() => onOrderChange({ annual: v })}
                      className={cn("h-9 rounded-full px-4 text-[13px] font-bold", order.annual === v ? "bg-black text-rez-full-white" : "text-black")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {order.planId && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-rez-smoke px-[18px] py-4">
                  <span className="flex flex-col gap-1">
                    <b className="text-[15px]">Users</b>
                    <span className="text-[12.5px] text-rez-graphite">{order.seats >= 9 ? "For 10 or more users, request a custom plan." : "Each user gets the plan’s agents and credits."}</span>
                  </span>
                  <div className="flex items-center gap-1.5" role="group" aria-label="Number of users">
                    <Button variant="secondary" size="icon" aria-label="Remove a user" disabled={order.seats <= 1} onClick={() => onOrderChange({ seats: order.seats - 1 })}>
                      <Icon name="minus" size={14} />
                    </Button>
                    <output aria-live="polite" className="min-w-9 text-center text-lg font-bold">
                      {order.seats}
                    </output>
                    <Button variant="secondary" size="icon" aria-label="Add a user" disabled={order.seats >= 9} onClick={() => onOrderChange({ seats: order.seats + 1 })}>
                      <Icon name="plus" size={14} />
                    </Button>
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2.5 text-sm font-semibold">
                <Checkbox checked={order.member} onCheckedChange={(c) => onOrderChange({ member: c === true })} />
                I am a NAR-India member (verified before billing)
              </label>
              <fieldset className="flex flex-col gap-2.5">
                <legend className={cn(EYEBROW, "mb-2.5")}>Firm add-ons</legend>
                {ADDONS.map((a) => {
                  const on = order.addons.includes(a.id);
                  return (
                    <label key={a.id} className={cn("flex cursor-pointer items-center gap-3 rounded-[14px] border px-3.5 py-3", on ? "border-black bg-[#f4f2ef]" : "border-rez-smoke hover:border-black")}>
                      <Checkbox checked={on} onCheckedChange={(c) => onOrderChange({ addons: c === true ? [...order.addons, a.id] : order.addons.filter((x) => x !== a.id) })} />
                      <span className="flex-1 text-sm font-semibold">{a.name}</span>
                      <span className="text-right text-[13px] font-semibold text-rez-graphite">{a.yearly ? `${inr(a.yearly)} / year` : `${inr(order.annual ? a.monthly * 0.8 : a.monthly)} / month`}</span>
                    </label>
                  );
                })}
              </fieldset>
              <fieldset className="flex flex-col gap-2.5">
                <legend className={cn(EYEBROW, "mb-2.5")}>Top-up credits</legend>
                <div className="flex flex-wrap gap-1.5">
                  {[{ millions: 0, price: 0 }, ...PACKS].map((p) => (
                    <button
                      key={p.millions}
                      type="button"
                      aria-pressed={order.packMillions === p.millions}
                      onClick={() => onOrderChange({ packMillions: p.millions })}
                      className={cn(
                        "h-[38px] rounded-full border px-3.5 text-[13px] font-semibold",
                        order.packMillions === p.millions ? "border-black bg-black text-rez-full-white" : "border-rez-smoke hover:border-black",
                      )}
                    >
                      {p.millions ? `${p.millions}M · ${inr(p.price)}` : "None"}
                    </button>
                  ))}
                </div>
              </fieldset>
              <dl className="flex flex-col gap-2.5 rounded-2xl bg-[#f4f2ef] p-[18px] text-sm">
                {totals.lines.length === 0 && <p className="text-rez-graphite">Nothing selected yet.</p>}
                {totals.lines.map((l) => (
                  <div key={l.label} className="flex justify-between gap-4">
                    <dt>{l.label}</dt>
                    <dd className="font-semibold whitespace-nowrap">{inr(l.amount)}</dd>
                  </div>
                ))}
                {totals.subtotal > 0 && (
                  <div className="flex justify-between gap-4 text-rez-graphite">
                    <dt>GST 18%</dt>
                    <dd className="whitespace-nowrap">{inr(totals.gst)}</dd>
                  </div>
                )}
                <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-rez-smoke pt-3">
                  <dt className="text-[15px] font-bold">Total today</dt>
                  <dd className="text-[26px] leading-none font-bold tracking-[-0.01em]">{inr(totals.total)}</dd>
                </div>
              </dl>
              <DemoNotice>Payments aren’t connected in this prototype, so no purchase can be made. Prices are indicative and exclude any applicable discounts.</DemoNotice>
            </div>
            <div className="sticky bottom-0 border-t border-rez-smoke bg-white px-7 pt-4 pb-6">
              <Button size="xl" className="w-full" disabled>
                {totals.subtotal ? `Pay ${inr(totals.total)}` : "Select something to buy"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
