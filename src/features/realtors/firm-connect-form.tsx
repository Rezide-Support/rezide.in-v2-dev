"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { CountryIso2 } from "react-international-phone";
import { toast } from "sonner";
import { CountryCodeSelect, dialCodeOf } from "@/components/common/country-code-select";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { sendFirmEnquiry } from "@/services/mutations";
import { useSession } from "@/stores/session";

const FIELD =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Values = { firstName: string; lastName: string; phone: string; email: string };
type Errors = Partial<Record<keyof Values, string>>;

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.firstName.trim()) e.firstName = "First name is required";
  if (v.phone.replace(/\D/g, "").length < 6) e.phone = "Please enter a valid phone number";
  if (!EMAIL.test(v.email.trim())) e.email = "Please enter a valid email address";
  return e;
}

/**
 * rezide.in's firm-page form: First Name, Last Name, phone (country picker) and Email, then
 * "Connect with me". It goes to the Rezide backend (POST /v1/contact/form/realtor) and shows
 * "Request received" for 30 seconds, as rezide.in does.
 */
export function FirmConnectForm({ firmId }: { firmId: string }) {
  const { session } = useSession();
  const user = session?.user;
  const empty: Values = { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", phone: user?.phone ?? "", email: user?.email ?? "" };
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [country, setCountry] = useState<CountryIso2>("in");
  const [done, setDone] = useState<{ title: string; description: string } | null>(null);

  // Signed-in visitors start with their own details, as on rezide.in.
  const userKey = user ? `${user.firstName}|${user.lastName}|${user.phone}|${user.email ?? ""}` : "";
  useEffect(() => {
    if (userKey) setValues((v) => (v.firstName || v.phone || v.email ? v : empty));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey]);
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setDone(null), 30_000);
    return () => window.clearTimeout(t);
  }, [done]);

  const mutation = useMutation({
    mutationFn: (v: Values) =>
      sendFirmEnquiry({ firmId, firstName: v.firstName, lastName: v.lastName, email: v.email, mobile: `+${dialCodeOf(country)}${v.phone.replace(/\D/g, "")}` }),
    onSuccess: (res, v) => {
      const name = [v.firstName, v.lastName].map((s) => s.trim()).filter(Boolean).join(" ");
      setDone({ title: "Request received", description: res?.message || `Thanks${name ? `, ${name}` : ""}! Our realtor partner will reach out shortly.` });
      toast.success(res?.message || "Your request has been submitted.");
      setValues(empty);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const set = (key: keyof Values) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    mutation.mutate(values);
  };

  if (done) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 p-6 text-center">
        <span className="rounded-full bg-emerald-50 p-3">
          <CheckCircle2 className="size-8 text-emerald-600" aria-hidden />
        </span>
        <p className="text-base font-semibold text-emerald-700">{done.title}</p>
        <p className="text-sm text-rez-graphite">{done.description}</p>
      </div>
    );
  }

  const error = (key: keyof Values) =>
    errors[key] ? (
      <p id={`firm-${key}-error`} className="mt-1 ml-1 text-[0.8rem] font-medium text-destructive">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form noValidate onSubmit={submit} aria-label="Connect with this firm">
      <div className="flex flex-col gap-4 p-3 pt-7">
        <div>
          <input aria-label="First Name" placeholder="First Name" value={values.firstName} onChange={(e) => set("firstName")(e.target.value)} aria-invalid={!!errors.firstName} aria-describedby={errors.firstName ? "firm-firstName-error" : undefined} autoComplete="given-name" className={FIELD} />
          {error("firstName")}
        </div>
        <div>
          <input aria-label="Last Name" placeholder="Last Name" value={values.lastName} onChange={(e) => set("lastName")(e.target.value)} autoComplete="family-name" className={FIELD} />
        </div>
        <div>
          <div className={cn("flex h-10 items-center rounded-md border border-input focus-within:ring-1 focus-within:ring-ring", errors.phone && "border-destructive")}>
            <CountryCodeSelect value={country} onChange={setCountry} className="self-stretch [&>span]:hidden" />
            <span className="pl-3 text-sm" aria-hidden>
              +{dialCodeOf(country)}
            </span>
            <input
              aria-label="Phone number"
              type="tel"
              inputMode="numeric"
              value={values.phone}
              onChange={(e) => set("phone")(e.target.value.replace(/\D/g, "").slice(0, 14))}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "firm-phone-error" : undefined}
              autoComplete="tel-national"
              className="h-full min-w-0 flex-1 bg-transparent px-1.5 text-sm outline-none"
            />
          </div>
          {error("phone")}
        </div>
        <div>
          <input aria-label="Email" type="email" placeholder="Email" value={values.email} onChange={(e) => set("email")(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "firm-email-error" : undefined} autoComplete="email" className={FIELD} />
          {error("email")}
        </div>
      </div>
      <div className="mt-1 flex flex-col items-center gap-2 p-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          aria-busy={mutation.isPending}
          className="h-10 w-full rounded-md bg-[#18181b] text-xs font-semibold text-white hover:bg-[#18181b]/90 disabled:opacity-60 sm:text-sm"
        >
          {mutation.isPending ? "Sending..." : "Connect with me"}
        </button>
        <p className="text-center text-[11px] text-rez-graphite">
          By submitting this form you agree to our
          <a href="https://rezide.in/terms-conditions" target="_blank" rel="noopener noreferrer" className="px-1 font-medium text-black">
            Terms &amp; Conditions
          </a>
          and
          <a href="https://rezide.in/privacy-policy" target="_blank" rel="noopener noreferrer" className="px-1 font-medium text-black">
            Privacy Policy
          </a>
          , and consent to being contacted by Rezide and its partner realtors.
        </p>
      </div>
    </form>
  );
}
