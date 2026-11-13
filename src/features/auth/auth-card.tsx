"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Icon } from "@/components/brand/icon";
import { Field, FormError } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { OtpInput } from "@/components/common/otp-input";
import { PhoneInput } from "@/components/common/phone-input";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, errorMessage } from "@/lib/api/client";
import { OTP_LENGTH } from "@/lib/constants";
import { formatPhone } from "@/lib/format";
import { indianMobile, optionalEmail, otpCode, personName, reraId, requiredEmail } from "@/lib/validation";
import { useSessionStore } from "@/stores/session";
import type { Session, UserRole } from "@/types/models";
import { useOtpFlow } from "./use-otp-flow";

export type AuthMode = "signin" | "signup";
export type Audience = "customer" | "realtor";

export const REALTOR_CITIES = ["Mumbai", "Pune", "Bengaluru", "Delhi NCR", "Hyderabad", "Chennai", "Ahmedabad", "Kolkata"];
const ASSOCIATIONS = ["NAR-India Independent", "NAR-India, AREA", "NAR-India, SMART", "NAR-India, TREK", "Other association"];

const signinSchema = z.object({ phone: indianMobile });
// The backend hashes a password for every new customer (rezide.in's sign-up asks for one); without it
// `add/customer` fails with 500 "Illegal arguments: undefined, string". Sign-in itself stays OTP-only.
const customerSignupSchema = z
  .object({
    firstName: personName("first name"),
    lastName: personName("last name"),
    email: optionalEmail,
    phone: indianMobile,
    password: z.string().min(6, "Password must be at least 6 characters.").max(128, "Password is too long."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords don’t match.", path: ["confirmPassword"] });
const realtorSignupSchema = z.object({
  firstName: personName("first name"),
  lastName: personName("last name"),
  firm: z.string().trim().min(2, "Enter your firm name."),
  reraId,
  city: z.string().min(1, "Choose your city."),
  association: z.string(),
  email: requiredEmail,
  phone: indianMobile,
});

type DetailsValues = {
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  firm?: string;
  reraId?: string;
  city?: string;
  association?: string;
  password?: string;
  confirmPassword?: string;
};

/** Only same-origin relative paths are accepted as post-login destinations. */
export function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

export function landingFor(role: UserRole) {
  return role === "realtor" ? "/dashboard" : role === "owner" ? "/account?tab=listings" : "/account";
}

function DetailsStep({
  mode,
  audience,
  onSubmit,
  pending,
  error,
}: {
  mode: AuthMode;
  audience: Audience;
  onSubmit: (v: DetailsValues) => void;
  pending: boolean;
  error: unknown;
}) {
  const schema = mode === "signin" ? signinSchema : audience === "realtor" ? realtorSignupSchema : customerSignupSchema;
  const { register, handleSubmit, control, formState, setError } = useForm<DetailsValues>({
    resolver: zodResolver(schema as z.ZodType<DetailsValues, DetailsValues>),
    defaultValues: { phone: "", firstName: "", lastName: "", email: "", firm: "", reraId: "", city: "", association: "", password: "", confirmPassword: "" },
    mode: "onTouched",
  });
  const e = formState.errors;
  const [lastError, setLastError] = useState<unknown>(null);
  if (error !== lastError) {
    setLastError(error);
    if (error instanceof ApiError && error.fieldErrors?.phone) setError("phone", { message: error.fieldErrors.phone });
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
      {mode === "signup" && (
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="First name" required error={e.firstName?.message}>
            <Input autoComplete="given-name" {...register("firstName")} />
          </Field>
          <Field label="Last name" required error={e.lastName?.message}>
            <Input autoComplete="family-name" {...register("lastName")} />
          </Field>
        </div>
      )}
      {mode === "signup" && audience === "realtor" && (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Firm name" required error={e.firm?.message}>
              <Input autoComplete="organization" {...register("firm")} />
            </Field>
            <Field label="Firm RERA ID" required error={e.reraId?.message} hint="e.g. A51800031614">
              <Input autoCapitalize="characters" {...register("reraId")} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="City" required error={e.city?.message}>
              <NativeSelect size="lg" {...register("city")}>
                <option value="">Choose city</option>
                {REALTOR_CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Member of" optional>
              <NativeSelect size="lg" {...register("association")}>
                <option value="">None</option>
                {ASSOCIATIONS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </>
      )}
      {mode === "signup" && (
        <Field label={audience === "realtor" ? "Work email" : "Email"} required={audience === "realtor"} optional={audience !== "realtor"} error={e.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
      )}
      <Field label="Mobile number" required error={e.phone?.message}>
        <Controller
          control={control}
          name="phone"
          render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} name={field.name} />}
        />
      </Field>
      {mode === "signup" && audience === "customer" && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Field label="Password" required error={e.password?.message} hint="At least 6 characters">
            <Input type="password" autoComplete="new-password" {...register("password")} />
          </Field>
          <Field label="Confirm password" required error={e.confirmPassword?.message}>
            <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
          </Field>
        </div>
      )}
      {error && !(error instanceof ApiError && error.fieldErrors?.phone) ? <FormError>{errorMessage(error)}</FormError> : null}
      <Button type="submit" size="xl" disabled={pending} className="mt-1 tracking-[0.1em] uppercase">
        {pending ? "Sending code…" : "Send OTP"}
      </Button>
    </form>
  );
}

export function AuthCard({
  mode,
  audience,
  onAudienceChange,
}: {
  mode: AuthMode;
  audience: Audience;
  onAudienceChange: (a: Audience) => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const signIn = useSessionStore((s) => s.signIn);
  const setAudience = onAudienceChange;
  // As in the prototype the card has no seeker/owner picker: customers land in the seeker area unless the link
  // asks for the owner area (?as=owner), and the account page switches between the two.
  const customerRole: "seeker" | "owner" = params.get("as") === "owner" ? "owner" : "seeker";
  const [details, setDetails] = useState<DetailsValues | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [done, setDone] = useState<Session | null>(null);

  const role: UserRole = audience === "realtor" ? "realtor" : customerRole;
  const flow = useOtpFlow((session) => {
    signIn(session);
    setDone(session);
    router.replace(safeNext(params.get("next")) ?? landingFor(session.user.role));
  }, { purpose: mode === "signup" ? "signup" : "signin", role });

  const resetFlow = () => {
    flow.changeNumber();
    setCode("");
    setCodeError(null);
  };

  const verify = () => {
    const parsed = otpCode.safeParse(code);
    if (!parsed.success) {
      setCodeError(parsed.error.issues[0].message);
      return;
    }
    setCodeError(null);
    if (!details) return;
    flow.verify.mutate({ ...details, code: parsed.data, role, phone: details.phone });
  };

  const verifyError =
    flow.verify.error instanceof ApiError ? (flow.verify.error.fieldErrors?.code ?? flow.verify.error.message) : flow.verify.error ? errorMessage(flow.verify.error) : null;

  const title = done
    ? mode === "signup"
      ? "You’re in."
      : "Welcome back."
    : flow.step === "otp"
      ? "Enter the OTP."
      : mode === "signup"
        ? "Sign up"
        : "Sign in";
  const subtitle =
    flow.step === "otp"
      ? `We’ve sent a ${OTP_LENGTH}-digit code to your mobile.`
      : mode === "signup"
        ? "Create your Rezide account."
        : audience === "realtor"
          ? "Log in to your realtor dashboard."
          : "Log in with your mobile number.";

  return (
    <div className="flex w-full flex-col gap-4 rounded-xl bg-white p-6 shadow-rez-md sm:p-7">
      <div className="flex flex-col items-start gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.01em]">{title}</h1>
          <p className="text-[13px] text-rez-graphite" aria-live="polite">
            {subtitle}
          </p>
        </div>
        {!done && (
          <Segmented
            label="Account type"
            value={audience}
            onChange={(a) => {
              setAudience(a);
              resetFlow();
            }}
            options={[
              { value: "customer", label: "Customer" },
              { value: "realtor", label: "Realtor" },
            ]}
            itemClassName="min-w-[88px]"
          />
        )}
      </div>

      {done ? (
        <div role="status" className="flex items-center gap-3 rounded-2xl bg-rez-cloud p-4 text-[15px] font-semibold">
          <Icon name="check-circle" size={24} />
          Signed in. Taking you to {done.user.role === "realtor" ? "your dashboard" : "your account"}…
        </div>
      ) : flow.step === "phone" ? (
        <>
          {mode === "signup" && audience === "realtor" && (
            <p className="flex items-center gap-2.5 rounded-[14px] bg-[#f0e8de] px-4 py-3 text-sm leading-snug font-medium">
              <Icon name="clock" size={18} />
              Request a 14-day free trial, subject to verification.
            </p>
          )}
          <DetailsStep
            key={`${mode}-${audience}`}
            mode={mode}
            audience={audience}
            pending={flow.send.isPending}
            error={flow.send.error}
            onSubmit={(v) => {
              setDetails(v);
              flow.send.mutate(v.phone);
            }}
          />
        </>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
        >
          <div className="flex items-center justify-between gap-2 text-sm text-rez-graphite">
            <span>Sent to {formatPhone(details?.phone ?? "")}</span>
            <button type="button" onClick={resetFlow} className="font-semibold text-black underline underline-offset-[3px]">
              Change
            </button>
          </div>
          <Field label={`${OTP_LENGTH}-digit code`} required error={codeError ?? verifyError ?? undefined} labelClassName="sr-only">
            <OtpInput value={code} onChange={setCode} autoFocus />
          </Field>
          <p className="text-center text-[13px] text-rez-graphite">
            Didn’t get it?{" "}
            {flow.secondsLeft > 0 ? (
              <span>Resend in 0:{String(flow.secondsLeft).padStart(2, "0")}</span>
            ) : (
              <button
                type="button"
                className="font-semibold text-black underline underline-offset-[3px] disabled:opacity-50"
                disabled={flow.send.isPending}
                onClick={() => details && flow.send.mutate(details.phone)}
              >
                Resend OTP
              </button>
            )}
          </p>
          <Button type="submit" size="xl" disabled={flow.verify.isPending} className="tracking-[0.1em] uppercase">
            {flow.verify.isPending
              ? "Verifying…"
              : mode === "signup"
                ? audience === "realtor"
                  ? "Verify & start 14-day trial"
                  : "Verify & sign up"
                : "Verify & sign in"}
          </Button>
        </form>
      )}

      {mode === "signup" && !done && (
        <p className="text-center text-xs leading-normal text-rez-graphite">
          By signing up you agree to the Terms of Use and acknowledge the Privacy Policy. These documents are not yet
          published.
        </p>
      )}
      <p className="border-t border-rez-smoke pt-3.5 text-center text-sm text-rez-graphite">
        {mode === "signup" ? "Already have an account?" : "Don’t have an account?"}{" "}
        <Link
          href={`${mode === "signup" ? "/login" : "/signup"}${audience === "realtor" ? "?role=realtor" : ""}`}
          className="font-bold text-black underline underline-offset-[3px]"
        >
          {mode === "signup" ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
