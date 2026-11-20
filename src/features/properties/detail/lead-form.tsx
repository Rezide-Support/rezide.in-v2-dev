"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Icon } from "@/components/brand/icon";
import { Field, FormError } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { PhoneInput } from "@/components/common/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { API_MOCKING, ApiError, errorMessage } from "@/lib/api/client";
import { localIsoDate } from "@/lib/format";
import { indianMobile, personName } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { createEnquiry, sendListingEnquiry, sendProjectEnquiry, type ListingEnquiry } from "@/services/mutations";
import { useSession } from "@/stores/session";
import type { EnquiryChannel } from "@/types/models";

export type LeadMode = "contact" | "offer" | "visit";

/** v1 agent-card intents. The visit intent is sent as a visit request. */
export const PROPERTY_INTENTS = [
  "Request the price for this property",
  "I'm interested",
  "Please contact me",
  "I want to visit the property",
  "I want to make an offer",
] as const;

export const PROJECT_INTENTS = ["Request the price list", "I'm interested", "Please contact me", "I want to visit the site"] as const;

export const VISIT_SLOTS = ["Morning (10 AM – 1 PM)", "Afternoon (1 PM – 4 PM)", "Evening (4 PM – 7 PM)"] as const;

const todayIso = () => localIsoDate();

export const leadSchema = z
  .object({
    mode: z.enum(["contact", "offer", "visit"]),
    firstName: personName("first name"),
    lastName: z.string().trim().max(60, "Keep your last name under 60 characters."),
    phone: indianMobile,
    intent: z.string(),
    offer: z.string().trim(),
    date: z.string(),
    slot: z.string(),
    message: z.string().trim().max(500, "Keep your message under 500 characters."),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "contact" && !v.intent) ctx.addIssue({ code: "custom", path: ["intent"], message: "Choose what you'd like to ask." });
    if (v.mode === "offer" && !/^\d{4,12}$/.test(v.offer.replace(/,/g, "")))
      ctx.addIssue({ code: "custom", path: ["offer"], message: "Enter your offer in rupees, digits only." });
    if (v.mode === "visit") {
      if (!v.date) ctx.addIssue({ code: "custom", path: ["date"], message: "Choose a date for your visit." });
      else if (v.date < todayIso()) ctx.addIssue({ code: "custom", path: ["date"], message: "Choose today or a later date." });
    }
  });

export type LeadValues = z.infer<typeof leadSchema>;

/** Maps form values to the enquiry API shape (channel + human-readable message). */
export function toEnquiry(v: LeadValues): { channel: EnquiryChannel; message?: string; preferredDate?: string; name: string; phone: string } {
  const name = `${v.firstName} ${v.lastName}`.trim();
  const extra = v.message ? ` ${v.message}` : "";
  if (v.mode === "offer") {
    const amount = Number(v.offer.replace(/,/g, "")).toLocaleString("en-IN");
    return { name, phone: v.phone, channel: "callback", message: `Offer: ₹ ${amount}.${extra}` };
  }
  if (v.mode === "visit") {
    return { name, phone: v.phone, channel: "visit", preferredDate: v.date, message: `Visit request${v.slot ? `, ${v.slot}` : ""}.${extra}` };
  }
  const visit = /visit/i.test(v.intent);
  return { name, phone: v.phone, channel: visit ? "visit" : "callback", message: `${v.intent}.${extra}` };
}

/** A real listing: its enquiries go to its broker through the backend, as on rezide.in. */
export type LeadListing = { id: string; firmId: string; brokerId: string; name: string; path: string };

/** A real project: its enquiries go to the Rezide team, as on rezide.in. */
export type LeadProject = { developerName: string; projectName: string; location: string; budgetMin?: number; budgetMax?: number };

/** The exact values rezide.in submits, where they differ from the option's label. */
const INTENT_VALUES: Record<string, string> = {
  "Request the price for this property": "I would like to request the price for this property",
  "I want to visit the property": " I want to visit the property",
};

const dayMonthYear = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Maps form values to rezide.in's enquiry, with the same wording. Its offer button
 * sends no amount, but this form asks for one, so the amount goes in `notes`.
 */
export function toListingEnquiry(v: LeadValues, listing: LeadListing): ListingEnquiry {
  const name = `${v.firstName} ${v.lastName}`.trim();
  const base = { name, phone: v.phone, firmId: listing.firmId, brokerId: listing.brokerId, listingId: listing.id };
  const extra = v.message ? ` ${v.message}` : "";
  if (v.mode === "offer") {
    const amount = Number(v.offer.replace(/,/g, "")).toLocaleString("en-IN");
    return { ...base, enquiryType: "I want to make an offer", notes: `Offer: ₹ ${amount}.${extra}` };
  }
  if (v.mode === "visit") {
    const notes = `${name} wants to visit on ${dayMonthYear(v.date)} at ${v.slot} for ${listing.name}. Please contact them.${extra}`;
    return { ...base, enquiryType: notes, notes };
  }
  return { ...base, enquiryType: INTENT_VALUES[v.intent] ?? v.intent };
}

const fieldInput = "h-12 rounded-lg";

type Props = {
  mode: LeadMode;
  target: { propertyId?: string; projectId?: string; realtorId?: string };
  /** Who would receive it, for the honest success message. */
  recipient: string;
  intents?: readonly string[];
  submitLabel?: string;
  className?: string;
  /** Visible labels (dialogs) or placeholder-style with screen-reader labels (v1 agent card). */
  compact?: boolean;
  /** Set on a real listing: the request goes to its broker. Without it or `project`, it goes to the enquiry service (mocked). */
  listing?: LeadListing;
  /** Set on a real project: the request goes to the Rezide team. */
  project?: LeadProject;
  /** The option chosen at the start, e.g. asking for the price of a listing that withholds it. */
  defaultIntent?: string;
};

export function LeadForm({ mode, target, recipient, intents = PROPERTY_INTENTS, submitLabel, className, compact, listing, project, defaultIntent = "" }: Props) {
  const { session, status } = useSession();
  const form = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { mode, firstName: "", lastName: "", phone: "", intent: defaultIntent, offer: "", date: "", slot: VISIT_SLOTS[0], message: "" },
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
  }, [session, getValues, setValue]);

  const mutation = useMutation({
    mutationFn: async (v: LeadValues): Promise<{ id?: string; message?: string }> => {
      if (project) {
        await sendProjectEnquiry({ ...project, name: `${v.firstName} ${v.lastName}`.trim(), phone: v.phone, email: session?.user.email, intent: v.intent, pageUrl: window.location.href });
        return {};
      }
      if (!listing) return createEnquiry({ ...target, ...toEnquiry(v) });
      if (!listing.firmId || !listing.brokerId) throw new Error("Broker details are unavailable right now. Please try again.");
      return sendListingEnquiry(toListingEnquiry(v, listing));
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [k, msg] of Object.entries(err.fieldErrors)) {
          setError(k === "name" ? "firstName" : (k as keyof LeadValues), { message: msg });
        }
      }
    },
  });

  // Whether this form's request is only stored by the mock API.
  const demo = API_MOCKING && !listing && !project;

  // As on rezide.in, an offer or visit on a listing needs an account.
  if (listing && mode !== "contact" && status === "anonymous") {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <p className="text-sm text-rez-graphite">Sign in to send this request to {recipient}.</p>
        <Button asChild>
          <Link href={`/login?next=${encodeURIComponent(`${listing.path}?enquiry=${mode}`)}`}>Sign in to continue</Link>
        </Button>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className={cn("flex flex-col gap-4", className)} role="status">
        <div className="flex items-start gap-3 rounded-2xl bg-rez-timber px-[18px] py-4 text-rez-full-white">
          <Icon name="check-circle" size={22} className="mt-0.5" />
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-semibold">{demo ? "Request recorded in demo mode." : "Request sent."}</p>
            <p className="text-sm text-rez-full-white/85">
              {mutation.data.id ? `Reference ${mutation.data.id}. ` : null}
              {demo
                ? `This prototype isn't connected to a messaging service, so ${recipient} has not been notified.`
                : (mutation.data.message ?? `${recipient} will contact you shortly.`)}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => mutation.reset()}>
          Send another request
        </Button>
      </div>
    );
  }

  const labelClass = compact ? "sr-only" : undefined;
  const ph = (s: string) => (compact ? s : undefined);

  return (
    <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))} className={cn("flex flex-col gap-3.5", className)}>
      <div className={cn("grid gap-3.5", !compact && "sm:grid-cols-2")}>
        <Field label="First name" required error={errors.firstName?.message} labelClassName={labelClass}>
          <Input autoComplete="given-name" placeholder={ph("First Name")} className={fieldInput} {...register("firstName")} />
        </Field>
        <Field label="Last name" optional={!compact} error={errors.lastName?.message} labelClassName={labelClass}>
          <Input autoComplete="family-name" placeholder={ph("Last Name")} className={fieldInput} {...register("lastName")} />
        </Field>
      </div>
      <Field label="Mobile number" required error={errors.phone?.message} labelClassName={labelClass}>
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} className="h-12 rounded-lg" />
          )}
        />
      </Field>

      {mode === "contact" && (
        <Controller
          control={control}
          name="intent"
          render={({ field }) => (
            <Select name={field.name} value={field.value} onValueChange={field.onChange}>
              <Field label="What would you like?" required error={errors.intent?.message} labelClassName={labelClass}>
                <SelectTrigger
                  ref={field.ref}
                  onBlur={field.onBlur}
                  className="h-12 w-full rounded-lg border-[#e4e4e4] bg-white px-4 text-left text-sm text-rez-graphite focus-visible:border-rez-mocaccino focus-visible:ring-rez-mocaccino/30"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
              </Field>
              <SelectContent
                position="popper"
                align="start"
                sideOffset={4}
                collisionPadding={12}
                className="z-[70] max-h-[min(320px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-0 max-w-[calc(100vw-2rem)] rounded-xl border border-rez-smoke bg-white p-1.5 text-rez-graphite shadow-rez-lg ring-0"
              >
                <SelectGroup>
                  <SelectLabel className="px-2.5 py-2 text-sm font-semibold text-black">Select option</SelectLabel>
                  {intents.map((intent) => (
                    <SelectItem
                      key={intent}
                      value={intent}
                      className="min-h-10 cursor-pointer rounded-lg px-2.5 py-2 text-[15px] whitespace-normal data-highlighted:bg-rez-cloud data-highlighted:text-black data-[state=checked]:bg-rez-cloud data-[state=checked]:font-medium data-[state=checked]:text-black"
                    >
                      {intent}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        />
      )}

      {mode === "offer" && (
        <Field label="Your offer (₹)" required error={errors.offer?.message} hint="Enter the full amount, e.g. 21500000.">
          <Input inputMode="numeric" autoComplete="off" className={fieldInput} {...register("offer")} />
        </Field>
      )}

      {mode === "visit" && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Preferred date" required error={errors.date?.message}>
            <Input type="date" min={todayIso()} className={fieldInput} {...register("date")} />
          </Field>
          <Field label="Time of day">
            <NativeSelect wrapperClassName="w-full" className="h-12 rounded-lg font-medium" {...register("slot")}>
              {VISIT_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      )}

      {mode !== "contact" && (
        <Field label="Message" optional error={errors.message?.message}>
          <Textarea rows={3} maxLength={500} {...register("message")} />
        </Field>
      )}

      {mutation.isError && !(mutation.error instanceof ApiError && mutation.error.fieldErrors) && (
        <FormError>
          {errorMessage(mutation.error)}{" "}
          <button type="button" className="underline" onClick={() => mutation.mutate(getValues())}>
            Retry
          </button>
        </FormError>
      )}

      <Button
        type="submit"
        variant={compact ? "outline" : "default"}
        size={compact ? "default" : "lg"}
        disabled={mutation.isPending}
        className={cn(compact && "mx-auto rounded-lg px-6 text-xs tracking-[0.06em] uppercase")}
      >
        {mutation.isPending ? (
          <>
            <Icon name="loader" size={16} className="animate-spin" /> Sending…
          </>
        ) : (
          (submitLabel ?? "Submit")
        )}
      </Button>
      <p className="text-center text-[11px] leading-snug text-rez-graphite">
        By submitting you agree to be contacted about this request.
        {demo && " Demo mode: nothing is delivered to the realtor or developer."}
      </p>
    </form>
  );
}
