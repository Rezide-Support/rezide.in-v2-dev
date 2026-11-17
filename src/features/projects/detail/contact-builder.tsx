"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetchDeveloperContact, type DeveloperContact } from "@/services/developers";
import { sendDeveloperContactLead, type DeveloperContactLead } from "@/services/mutations";
import { useSession } from "@/stores/session";
import type { Project } from "@/types/models";

/*
 * rezide.in's "Contact Builder" (About developer): the visitor leaves their details, which go
 * to the Rezide team as a lead, and is then shown the developer's contact details.
 */

type Reason = NonNullable<DeveloperContactLead["reasonToBuy"]>;
type Need = NonNullable<DeveloperContactLead["needPropertyIn"]>;

const REASONS: { label: string; value: Reason }[] = [
  { label: "Investment", value: "Investment" },
  { label: "Self Use", value: "Self Use" },
];
const NEEDS: { label: string; value: Need }[] = [
  { label: "< 3 months", value: "Less than 3 months" },
  { label: "< 6 months", value: "Less than 6 months" },
  { label: "6+ months", value: "More than 6 months" },
];

type Values = {
  name: string;
  mobile: string;
  email: string;
  broker?: boolean;
  reason?: Reason;
  need?: Need;
  homeLoan: boolean;
  siteVisits: boolean;
  terms: boolean;
};
type Errors = Partial<Record<"name" | "mobile" | "email" | "broker" | "reason" | "terms", string>>;

/** rezide.in's checks: the three fields filled, broker answered, a reason (unless a broker) and the terms. */
export function validateContact(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Name cannot be empty";
  if (!v.mobile.trim()) e.mobile = "Mobile cannot be empty";
  if (!v.email.trim()) e.email = "Email cannot be empty";
  if (v.broker === undefined) e.broker = "Please specify if you are a broker";
  if (v.broker === false && !v.reason) e.reason = "Reason to buy cannot be empty";
  if (!v.terms) e.terms = "You must accept the terms & conditions";
  return e;
}

function Choice({ selected, invalid, onClick, children }: { selected: boolean; invalid?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-10 w-full rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none lg:text-sm",
        selected ? "border-black bg-black text-white hover:bg-black/90" : "border-gray-200 bg-gray-50 text-black hover:bg-gray-100",
        invalid && !selected && "border-red-400",
      )}
    >
      {children}
    </button>
  );
}

const inputCls = (invalid?: string) =>
  cn("h-12 w-full rounded-2xl border border-gray-300 px-4 text-xs outline-none focus-visible:border-black lg:text-base", invalid && "border-red-400");

function ContactDetails({ contact, fallbackName }: { contact: DeveloperContact; fallbackName: string }) {
  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Developer</p>
        <p className="text-lg font-semibold text-gray-900">{contact.name || fallbackName}</p>
        {contact.legalName && <p className="text-sm text-gray-500">{contact.legalName}</p>}
        {contact.description && <p className="mt-2 line-clamp-6 text-sm whitespace-pre-line text-gray-600">{contact.description}</p>}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          {contact.cin && <span>CIN: {contact.cin}</span>}
          {contact.established && <span>Since {contact.established}</span>}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-base font-semibold text-gray-900">Contact details</p>
        <p className="text-sm text-gray-500">Reach out directly to the sponsor</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {contact.contacts.length > 0 ? (
            contact.contacts.map((c, i) => (
              <div key={`${c.phone ?? c.email}-${i}`} className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">{c.name || "Representative"}</p>
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="text-base font-bold text-black">
                    {c.phone}
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="text-xs break-all text-gray-500 underline underline-offset-2">
                    {c.email}
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 md:col-span-2">Contact details not available for this developer.</p>
          )}
        </div>
      </div>

      {contact.office && (
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-base font-semibold text-gray-900">Primary office</p>
          <div className="mt-2 text-sm text-gray-600">
            {contact.office.type && <p className="text-xs tracking-wide text-gray-500 uppercase">{contact.office.type}</p>}
            {contact.office.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
            {contact.office.place && <p>{contact.office.place}</p>}
          </div>
        </div>
      )}

      <DialogClose asChild>
        <Button type="button" variant="outline" className="w-full rounded-2xl border-gray-300">
          Close
        </Button>
      </DialogClose>
    </div>
  );
}

function ContactForm({ project: p, developerName, developerId, onContact }: { project: Project; developerName: string; developerId?: string; onContact: (c: DeveloperContact) => void }) {
  const { session } = useSession();
  const user = session?.user;
  const [v, setV] = useState<Values>({
    name: user ? `${user.firstName} ${user.lastName}`.trim() : "",
    mobile: user?.phone ?? "",
    email: user?.email ?? "",
    homeLoan: false,
    siteVisits: false,
    terms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const set = <K extends keyof Values>(k: K, value: Values[K]) => {
    setV((prev) => ({ ...prev, [k]: value }));
    setErrors((prev) => ({ ...prev, [k === "reason" ? "reason" : k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateContact(v);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      // As on rezide.in: the lead is sent first, and a failure there doesn't stop the details.
      await sendDeveloperContactLead({
        name: v.name,
        mobile: v.mobile,
        email: v.email,
        developerName,
        projectName: p.name,
        location: `${p.locality}, ${p.city}`,
        isPropertyBroker: v.broker === true,
        reasonToBuy: v.reason,
        needPropertyIn: v.need,
        homeLoanInterest: v.homeLoan,
        siteVisitInterest: v.siteVisits,
        budgetMin: p.priceFrom,
        budgetMax: p.priceTo,
        pageUrl: window.location.href,
      }).catch(() => undefined);
      if (!developerId) {
        setSubmitError("Developer details are not available for this project.");
        return;
      }
      onContact(await fetchDeveloperContact(developerId));
    } catch {
      setSubmitError("Unable to fetch contact details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const errorText = (msg?: string) => (msg ? <span className="text-xs text-red-600">{msg}</span> : null);

  return (
    <form noValidate onSubmit={submit} className="flex w-full flex-col items-center justify-center">
      <div className="grid w-full grid-cols-1 gap-4 p-2 sm:grid-cols-2">
        {/* Left */}
        <div className="flex flex-col gap-4">
          <div className="flex w-full flex-col gap-2 rounded-2xl border border-gray-300 p-4">
            <p className="text-xs font-semibold lg:text-base">Advertised by Developer</p>
            <p className="text-sm font-medium text-gray-400 uppercase lg:text-base">{developerName}</p>
          </div>
          <h3 className="text-xs font-semibold text-gray-800 lg:text-base">Fill the below form to get sponsor contact info.</h3>
          <label className="flex flex-col gap-1">
            <span className="sr-only">Name</span>
            <input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Name" autoComplete="name" aria-invalid={!!errors.name} className={inputCls(errors.name)} />
            {errorText(errors.name)}
          </label>
          <label className="flex flex-col gap-1">
            <span className="sr-only">Mobile number</span>
            <input value={v.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="Mobile No." inputMode="tel" autoComplete="tel" aria-invalid={!!errors.mobile} className={inputCls(errors.mobile)} />
            {errorText(errors.mobile)}
          </label>
          <label className="flex flex-col gap-1">
            <span className="sr-only">Email</span>
            <input value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="Email" type="email" autoComplete="email" aria-invalid={!!errors.email} className={inputCls(errors.email)} />
            {errorText(errors.email)}
          </label>
        </div>

        {/* Right */}
        <div>
          <fieldset className="my-2">
            <legend className={cn("mb-2 text-xs font-semibold text-gray-800 lg:text-base", errors.broker && "text-red-500")}>Are you a property broker*</legend>
            <div className="flex gap-2">
              <Choice selected={v.broker === false} invalid={!!errors.broker} onClick={() => set("broker", false)}>
                No
              </Choice>
              <Choice selected={v.broker === true} invalid={!!errors.broker} onClick={() => set("broker", true)}>
                Yes
              </Choice>
            </div>
            {errors.broker && <p className="mt-2 text-xs text-red-500">{errors.broker}</p>}
          </fieldset>

          {v.broker !== true && (
            <>
              <fieldset className="my-2">
                <legend className={cn("mb-2 text-xs font-semibold text-gray-800 lg:text-base", errors.reason && "text-red-500")}>Reason to buy*</legend>
                <div className="flex gap-2">
                  {REASONS.map((o) => (
                    <Choice key={o.value} selected={v.reason === o.value} invalid={!!errors.reason} onClick={() => set("reason", o.value)}>
                      {o.label}
                    </Choice>
                  ))}
                </div>
                {errors.reason && <p className="mt-2 text-xs text-red-400">{errors.reason}</p>}
              </fieldset>
              <fieldset className="my-2">
                <legend className="text-xs font-semibold text-gray-800 lg:text-base">Need property in</legend>
                <p className="mb-2 text-xs text-gray-400 lg:text-base">Help us get you the best property by entering below details.</p>
                <div className="flex gap-2">
                  {NEEDS.map((o) => (
                    <Choice key={o.value} selected={v.need === o.value} onClick={() => set("need", v.need === o.value ? undefined : o.value)}>
                      {o.label}
                    </Choice>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          <div className="my-6 flex flex-col gap-2">
            {v.broker !== true && (
              <>
                <label className="flex items-center gap-2">
                  <Checkbox checked={v.homeLoan} onCheckedChange={(c) => set("homeLoan", c === true)} />
                  <span className="text-xs text-gray-400">I am interested in home loan</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={v.siteVisits} onCheckedChange={(c) => set("siteVisits", c === true)} />
                  <span className="text-xs text-gray-400">I am interested in site visits</span>
                </label>
              </>
            )}
            <label className="flex items-center gap-2">
              <Checkbox checked={v.terms} onCheckedChange={(c) => set("terms", c === true)} aria-invalid={!!errors.terms} className={cn(errors.terms && "border-red-400")} />
              <span className={cn("text-xs text-gray-400", errors.terms && "text-red-400")}>I agree to the Terms &amp; Conditions and Privacy Policy</span>
            </label>
            {errors.terms && <p className="text-xs text-red-400">{errors.terms}</p>}
          </div>
        </div>
      </div>
      {submitError && (
        <p role="alert" className="mb-4 text-xs text-red-500">
          {submitError}
        </p>
      )}
      <Button type="submit" className="h-auto w-auto rounded-xl px-6 py-4" disabled={submitting}>
        {submitting ? "Processing..." : "Get Contact Details"}
      </Button>
    </form>
  );
}

export function ContactBuilderDialog({
  open,
  onOpenChange,
  project,
  developerName,
  developerId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project: Project;
  developerName: string;
  developerId?: string;
}) {
  const [contact, setContact] = useState<DeveloperContact | null>(null);
  // Each opening starts at the form, as on rezide.in.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setContact(null);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-32px)] w-full overflow-y-auto sm:max-w-[1200px] md:rounded-2xl">
        <DialogTitle className="sr-only">Contact {developerName}</DialogTitle>
        <DialogDescription className="sr-only">
          {contact ? `${developerName}'s contact details.` : "Fill in your details to get the developer's contact details."}
        </DialogDescription>
        {contact ? (
          <ContactDetails contact={contact} fallbackName={developerName} />
        ) : (
          <ContactForm project={project} developerName={developerName} developerId={developerId} onContact={setContact} />
        )}
      </DialogContent>
    </Dialog>
  );
}
