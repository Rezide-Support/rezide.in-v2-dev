"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Icon } from "@/components/brand/icon";
import { DemoNotice } from "@/components/common/feedback";
import { Field, FormError } from "@/components/common/form-field";
import { PhoneInput } from "@/components/common/phone-input";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { API_MOCKING, ApiError, errorMessage } from "@/lib/api/client";
import { localIsoDate } from "@/lib/format";
import { indianMobile, optionalEmail, personName } from "@/lib/validation";
import { createEnquiry } from "@/services/mutations";
import { useSession } from "@/stores/session";
import type { EnquiryChannel } from "@/types/models";

const todayIso = () => localIsoDate();

export const enquirySchema = z
  .object({
    name: personName("name"),
    phone: indianMobile,
    email: optionalEmail,
    channel: z.enum(["callback", "whatsapp", "visit"]),
    preferredDate: z.string(),
    message: z.string().trim().max(500, "Keep your message under 500 characters."),
    consent: z.boolean().refine((v) => v, "Please agree so the realtor can contact you."),
  })
  .superRefine((v, ctx) => {
    if (v.channel === "visit") {
      if (!v.preferredDate) {
        ctx.addIssue({ code: "custom", path: ["preferredDate"], message: "Choose a date for your visit." });
      } else if (v.preferredDate < todayIso()) {
        ctx.addIssue({ code: "custom", path: ["preferredDate"], message: "Choose today or a later date." });
      }
    }
  });

export type EnquiryValues = z.infer<typeof enquirySchema>;

type Props = {
  target: { propertyId?: string; projectId?: string; realtorId?: string };
  realtorName?: string;
  heading?: string;
};

export function EnquiryForm({ target, realtorName, heading = "Contact the realtor" }: Props) {
  const { session } = useSession();
  const form = useForm<EnquiryValues>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { name: "", phone: "", email: "", channel: "callback", preferredDate: "", message: "", consent: false },
    mode: "onTouched",
  });
  const { register, handleSubmit, control, formState, setError, getValues, setValue } = form;
  const channel = useWatch({ control, name: "channel" });

  // Prefill from the demo session without overwriting anything typed.
  useEffect(() => {
    if (!session) return;
    const v = getValues();
    if (!v.name) setValue("name", `${session.user.firstName} ${session.user.lastName}`.trim());
    if (!v.phone) setValue("phone", session.user.phone);
    if (!v.email && session.user.email) setValue("email", session.user.email);
  }, [session, getValues, setValue]);

  const mutation = useMutation({
    mutationFn: (v: EnquiryValues) =>
      createEnquiry({
        ...target,
        name: v.name,
        phone: v.phone,
        email: v.email || undefined,
        message: v.message || undefined,
        channel: v.channel as EnquiryChannel,
        preferredDate: v.channel === "visit" ? v.preferredDate : undefined,
      }),
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [k, msg] of Object.entries(err.fieldErrors)) {
          setError(k as keyof EnquiryValues, { message: msg });
        }
      }
    },
  });

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <div className="flex items-start gap-3 rounded-2xl bg-rez-timber px-[18px] py-4 text-rez-full-white">
          <Icon name="check-circle" size={22} className="mt-0.5" />
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-semibold">
              {API_MOCKING ? "Enquiry recorded in demo mode." : "Enquiry sent."}
            </p>
            <p className="text-sm text-rez-full-white/85">
              Reference {mutation.data.id}.{" "}
              {API_MOCKING
                ? `This prototype isn't connected to a messaging service, so ${realtorName ?? "the realtor"} has not been notified.`
                : `${realtorName ?? "The realtor"} will contact you shortly.`}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => mutation.reset()}>
          Send another enquiry
        </Button>
      </div>
    );
  }

  const errors = formState.errors;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      className="flex flex-col gap-4"
      aria-labelledby="enquiry-heading"
    >
      <h2 id="enquiry-heading" className="text-[22px] leading-tight font-semibold">
        {heading}
      </h2>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold" id="enquiry-channel-label">
          How should they reach you?
        </span>
        <Controller
          control={control}
          name="channel"
          render={({ field }) => (
            <Segmented
              label="Preferred contact"
              value={field.value}
              onChange={field.onChange}
              fullWidth
              options={[
                { value: "callback", label: "Call back" },
                { value: "whatsapp", label: "WhatsApp" },
                { value: "visit", label: "Site visit" },
              ]}
            />
          )}
        />
      </div>
      <Field label="Full name" required error={errors.name?.message}>
        <Input autoComplete="name" {...register("name")} />
      </Field>
      <Field label="Mobile number" required error={errors.phone?.message}>
        <Controller
          control={control}
          name="phone"
          render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />}
        />
      </Field>
      <Field label="Email" optional error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register("email")} />
      </Field>
      {channel === "visit" && (
        <Field label="Preferred visit date" required error={errors.preferredDate?.message}>
          <Input type="date" min={todayIso()} {...register("preferredDate")} />
        </Field>
      )}
      <Field label="Message" optional error={errors.message?.message} hint="Share your budget, move-in timeline or questions.">
        <Textarea rows={3} maxLength={500} {...register("message")} />
      </Field>
      <Controller
        control={control}
        name="consent"
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-3 text-[13px] leading-snug text-rez-arsenic">
              <Checkbox
                checked={field.value}
                onCheckedChange={(c) => field.onChange(c === true)}
                aria-invalid={errors.consent ? true : undefined}
                className="mt-0.5 size-5 rounded-[4px]"
              />
              <span>I agree to be contacted about this enquiry. My number is shared only with this realtor.</span>
            </label>
            {errors.consent && <p className="pl-8 text-xs font-medium text-destructive">{errors.consent.message}</p>}
          </div>
        )}
      />
      {mutation.isError && !(mutation.error instanceof ApiError && mutation.error.fieldErrors) && (
        <FormError>
          {errorMessage(mutation.error)}{" "}
          <button type="button" className="underline" onClick={() => mutation.mutate(getValues())}>
            Retry
          </button>
        </FormError>
      )}
      <Button type="submit" size="xl" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <>
            <Icon name="loader" size={18} className="animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Icon name="phone-outgoing" size={18} /> Send enquiry
          </>
        )}
      </Button>
      {API_MOCKING && (
        <DemoNotice>Demo mode: enquiries are stored only for this browser session and are not delivered to realtors.</DemoNotice>
      )}
    </form>
  );
}
