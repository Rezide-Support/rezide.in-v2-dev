"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Icon } from "@/components/brand/icon";
import { Logo } from "@/components/brand/logo";
import { ChoiceChips } from "@/components/common/choice-chips";
import { Field, FormError } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { OtpInput } from "@/components/common/otp-input";
import { PhoneInput } from "@/components/common/phone-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { REALTOR_CITIES } from "@/features/auth/auth-card";
import { useOtpFlow } from "@/features/auth/use-otp-flow";
import { API_MOCKING, ApiError, errorMessage } from "@/lib/api/client";
import { applyFieldErrors } from "@/lib/api/form-errors";
import { OTP_LENGTH } from "@/lib/constants";
import { formatPhone } from "@/lib/format";
import { indianMobile, otpCode, personName, reraId } from "@/lib/validation";
import { requestTrial } from "@/services/mutations";

const phoneSchema = z.object({ phone: indianMobile });
const detailsSchema = z.object({
  membership: z.enum(["nar", "other"]),
  city: z.string().min(1, "Choose your city."),
  associations: z.array(z.string()),
  firstName: personName("first name"),
  lastName: personName("last name"),
  firm: z.string().trim().min(2, "Enter your firm name."),
  reraId,
});
type Details = z.infer<typeof detailsSchema>;

const associationsFor = (city: string) => [
  "Direct NAR-India Member",
  "Estate Agents Association of India",
  ...({ Mumbai: ["Mumbai Realtors Association"], Pune: ["Pune Realtors Association"], Bengaluru: ["Bangalore Realtors Association"] }[city] ?? [`${city} Realtors Association`]),
];

/** "Request access" flow: verify mobile → firm details → request recorded. */
export function TrialDialog({
  open,
  onOpenChange,
  onSignIn,
  onSeePlans,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** "Already have access? Sign in": close and send the user to the realtor login. */
  onSignIn?: () => void;
  /** "See Plans & Pricing": close and scroll to the pricing section. */
  onSeePlans?: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  // Only the number is checked; the session the OTP service returns is discarded.
  const flow = useOtpFlow(() => setVerified(true), { purpose: "verify", role: "realtor" });
  const phoneForm = useForm<{ phone: string }>({ resolver: zodResolver(phoneSchema), defaultValues: { phone: "" } });
  const details = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { membership: "nar", city: "Mumbai", associations: [], firstName: "", lastName: "", firm: "", reraId: "" },
    mode: "onTouched",
  });
  // A rejected mobile number has no field on this step, so it stays in the banner below.
  const submit = useMutation({ mutationFn: requestTrial, onError: (err) => applyFieldErrors(err, details.setError) });

  const reset = () => {
    setPhone("");
    setVerified(false);
    setCode("");
    setCodeError(null);
    flow.changeNumber();
    phoneForm.reset();
    details.reset();
    submit.reset();
  };

  const step = submit.isSuccess ? "done" : verified ? "form" : flow.step === "otp" ? "otp" : "mobile";
  const title = { mobile: "Authenticate for a 14-day free trial.", otp: "Enter your code.", form: "Authenticated.", done: "Request received." }[step];
  const city = useWatch({ control: details.control, name: "city" });
  const membership = useWatch({ control: details.control, name: "membership" });
  const de = details.formState.errors;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="gap-5 sm:max-w-[560px] sm:p-8">
        <div className="flex flex-col items-center gap-2 pt-6" aria-hidden>
          <Logo height={30} />
          <span className="text-[9px] leading-none tracking-[0.14em] whitespace-nowrap uppercase [font-family:var(--font-eyebrow)] sm:text-[10px] sm:tracking-[0.22em]">Powering India’s leading realtors</span>
        </div>
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="text-[26px] leading-tight font-bold tracking-[-0.02em] sm:text-[28px]">{title}</DialogTitle>
          {step === "form" && <p className="text-lg leading-snug font-bold">Register for 14-day free access.</p>}
          <DialogDescription>
            {step === "form" ? "Access is subject to verification of your RERA registration." : step === "done" ? "" : "We’ll verify your mobile number first."}
          </DialogDescription>
        </DialogHeader>

        {step === "mobile" && (
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={phoneForm.handleSubmit((v) => {
              setPhone(v.phone);
              flow.send.mutate(v.phone);
            })}
          >
            <Field label="Mobile number" required error={phoneForm.formState.errors.phone?.message ?? (flow.send.error instanceof ApiError ? flow.send.error.fieldErrors?.phone : undefined)}>
              <Controller control={phoneForm.control} name="phone" render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />} />
            </Field>
            <p className="text-center text-[13px] text-rez-graphite">By continuing, you agree to our Terms of Use and Privacy Policy, which are not yet published.</p>
            <Button type="submit" size="xl" disabled={flow.send.isPending}>
              {flow.send.isPending ? "Sending…" : "Send OTP"}
            </Button>
            {onSignIn && (
              <p className="text-center text-sm text-rez-graphite">
                Already have access?{" "}
                <button type="button" onClick={onSignIn} className="font-bold text-black underline underline-offset-[3px]">
                  Sign In
                </button>
              </p>
            )}
          </form>
        )}

        {step === "otp" && (
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = otpCode.safeParse(code);
              if (!parsed.success) return setCodeError(parsed.error.issues[0].message);
              setCodeError(null);
              flow.verify.mutate({ phone, code: parsed.data, role: "realtor" });
            }}
          >
            <p className="text-sm text-rez-graphite">
              Enter the {OTP_LENGTH}-digit code sent to {formatPhone(phone)}.{" "}
              <button type="button" className="font-semibold text-black underline" onClick={() => flow.changeNumber()}>
                Change
              </button>
            </p>
            <Field label="Code" labelClassName="sr-only" required error={codeError ?? (flow.verify.error ? errorMessage(flow.verify.error) : undefined)}>
              <OtpInput value={code} onChange={setCode} autoFocus />
            </Field>
            <Button type="submit" size="xl" disabled={flow.verify.isPending}>
              {flow.verify.isPending ? "Verifying…" : "Verify"}
            </Button>
          </form>
        )}

        {step === "form" && (
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={details.handleSubmit((v) => submit.mutate({ ...v, mobile: phone }))}
          >
            <Controller
              control={details.control}
              name="membership"
              render={({ field }) => (
                <div role="radiogroup" aria-label="Membership" className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["nar", "NAR-India member", "Reviewed first"],
                      ["other", "Other", "Subject to review"],
                    ] as const
                  ).map(([id, t, d]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={field.value === id}
                      onClick={() => field.onChange(id)}
                      className={
                        field.value === id
                          ? "flex flex-col items-start gap-1 rounded-2xl border border-black bg-black px-4 py-3 text-left text-rez-full-white"
                          : "flex flex-col items-start gap-1 rounded-2xl border border-rez-smoke px-4 py-3 text-left hover:border-black"
                      }
                    >
                      <b className="text-sm">{t}</b>
                      <span className="text-xs opacity-80">{d}</span>
                    </button>
                  ))}
                </div>
              )}
            />
            <Field label="City" required error={de.city?.message}>
              <NativeSelect size="lg" {...details.register("city")}>
                {REALTOR_CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            {membership === "nar" && (
              <Controller
                control={details.control}
                name="associations"
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] font-semibold">
                      NAR-India associations <span className="font-normal text-rez-graphite">(optional, select all that apply)</span>
                    </span>
                    <ChoiceChips multiple label="NAR-India associations" options={associationsFor(city).map((a) => ({ value: a, label: a }))} value={field.value} onChange={(v) => field.onChange(v)} />
                  </div>
                )}
              />
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="First name" required error={de.firstName?.message}>
                <Input autoComplete="given-name" {...details.register("firstName")} />
              </Field>
              <Field label="Last name" required error={de.lastName?.message}>
                <Input autoComplete="family-name" {...details.register("lastName")} />
              </Field>
            </div>
            <Field label="Firm name" required error={de.firm?.message}>
              <Input autoComplete="organization" {...details.register("firm")} />
            </Field>
            <Field label="Firm RERA ID" required error={de.reraId?.message} hint="Your firm’s RERA registration number, e.g. A51800031614">
              <Input autoCapitalize="characters" {...details.register("reraId")} />
            </Field>
            {submit.isError && <FormError>{errorMessage(submit.error)}</FormError>}
            <Button type="submit" size="xl" disabled={submit.isPending}>
              {submit.isPending ? "Sending request…" : "Request access"}
            </Button>
            {onSeePlans && (
              <button
                type="button"
                onClick={onSeePlans}
                className="flex items-center justify-between gap-4 rounded-xl bg-rez-timber px-[22px] py-[18px] text-left text-rez-full-white hover:bg-rez-timber-tint"
              >
                <span className="flex flex-col gap-1.5">
                  <b className="text-lg leading-tight">See Plans &amp; Pricing</b>
                  <span className="text-sm opacity-85">What each plan includes after your 14-day trial.</span>
                </span>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-black">
                  <Icon name="arrow-right" size={18} />
                </span>
              </button>
            )}
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-col gap-4" role="status">
            <div className="flex items-start gap-3 rounded-2xl bg-rez-cloud p-4">
              <Icon name="check-circle" size={22} className="mt-0.5" />
              <p className="text-[15px] leading-relaxed">
                Reference {submit.data?.id}.{" "}
                {API_MOCKING
                  ? "Your request was recorded in demo mode only. No review has been started and no trial is active."
                  : "The Rezide team will review your details within one working day and confirm by SMS."}
              </p>
            </div>
            <Button size="xl" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
