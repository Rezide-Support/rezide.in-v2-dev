"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Icon } from "@/components/brand/icon";
import { Field, FormError } from "@/components/common/form-field";
import { PhoneInput } from "@/components/common/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, errorMessage } from "@/lib/api/client";
import { indianMobile, optionalEmail, personName } from "@/lib/validation";
import { sendRealtorEnquiry } from "@/services/mutations";
import { useSession } from "@/stores/session";

export const contactSchema = z.object({
  firstName: personName("first name"),
  lastName: personName("last name"),
  phone: indianMobile,
  email: optionalEmail,
});

export type ContactValues = z.infer<typeof contactSchema>;

/**
 * v1's "Connect with me" card: first/last name, +91 mobile, email. Sends the
 * enquiry to the realtor's firm, as rezide.in's realtor pages do.
 */
export function ContactCard({ firmId, recipient }: { firmId: string; recipient: string }) {
  const headingId = useId();
  const { session } = useSession();
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", email: "" },
    mode: "onTouched",
  });
  const { register, handleSubmit, control, formState, setError, getValues, setValue } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!session) return;
    const v = getValues();
    if (!v.firstName) setValue("firstName", session.user.firstName);
    if (!v.lastName) setValue("lastName", session.user.lastName);
    if (!v.phone) setValue("phone", session.user.phone);
    if (!v.email && session.user.email) setValue("email", session.user.email);
  }, [session, getValues, setValue]);

  const mutation = useMutation({
    mutationFn: (v: ContactValues) => sendRealtorEnquiry({ firmId, firstName: v.firstName, lastName: v.lastName, phone: v.phone, email: v.email }),
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [k, msg] of Object.entries(err.fieldErrors)) {
          setError(k === "name" ? "firstName" : (k as keyof ContactValues), { message: msg });
        }
      }
    },
  });

  return (
    <div id="enquire" className="scroll-mt-6 rounded-xl border border-rez-smoke bg-white p-5 shadow-rez-sm">
      <h2 id={headingId} className="mb-4 text-lg leading-tight font-semibold">
        Connect with {recipient}
      </h2>
      {mutation.isSuccess ? (
        <div className="flex flex-col gap-4" role="status">
          <div className="flex items-start gap-3 rounded-2xl bg-rez-timber px-4 py-3.5 text-rez-full-white">
            <Icon name="check-circle" size={22} className="mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold">Request sent.</p>
              <p className="text-sm text-rez-full-white/85">{mutation.data.message ?? `${recipient} will contact you shortly.`}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => mutation.reset()}>
            Send another request
          </Button>
        </div>
      ) : (
        <form noValidate aria-labelledby={headingId} onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-3.5">
          <Field label="First name" required error={errors.firstName?.message}>
            <Input autoComplete="given-name" {...register("firstName")} />
          </Field>
          <Field label="Last name" required error={errors.lastName?.message}>
            <Input autoComplete="family-name" {...register("lastName")} />
          </Field>
          <Field label="Mobile number" required error={errors.phone?.message}>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
              )}
            />
          </Field>
          <Field label="Email" optional error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register("email")} />
          </Field>
          {mutation.isError && !(mutation.error instanceof ApiError && mutation.error.fieldErrors) && (
            <FormError>
              {errorMessage(mutation.error)}{" "}
              <button type="button" className="underline" onClick={() => mutation.mutate(getValues())}>
                Retry
              </button>
            </FormError>
          )}
          <Button type="submit" size="lg" className="mt-1 w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Icon name="loader" size={18} className="animate-spin" /> Sending…
              </>
            ) : (
              "Connect with me"
            )}
          </Button>
          <p className="text-center text-[11px] leading-snug text-rez-graphite">
            By submitting this form you consent to being contacted by Rezide and its partner realtors about this request. Our Terms &amp;
            Conditions and Privacy Policy are coming soon.
          </p>
        </form>
      )}
    </div>
  );
}
