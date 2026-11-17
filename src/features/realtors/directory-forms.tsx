"use client";

import { useMutation } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { PhoneInput } from "@/components/common/phone-input";
import { Field, FormError } from "@/components/common/form-field";
import { directoryRequest } from "@/services/realtor-directory";
import { cn } from "@/lib/utils";
import { realtorContactInput, type RealtorContactInput } from "./contact-input";

const formSchema = z.object({ firstName: z.string().trim().min(2, "Enter at least 2 characters."), lastName: z.string().trim(), email: z.email("Enter a valid email."), mobile: z.string().transform(v => v.replace(/\s/g, "")).pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.")), realtorName: z.string().trim() });
const empty = { firstName: "", lastName: "", email: "", mobile: "", realtorName: "" };
type Values = typeof empty;

type DirectoryLeadFormProps = { firmId?: string; recipient?: string; invitation?: boolean; embedded?: boolean; stacked?: boolean; wide?: boolean };

export function DirectoryLeadForm(props: DirectoryLeadFormProps) {
  return props.invitation ? <InvitationForm {...props} /> : <ConnectLeadForm {...props} />;
} 

const lookingToOptions = ["Buy", "Rent-in", "Sell", "Lease out"] as const;
const propertyTypeOptions = ["Home", "Office", "Industrial", "Retail", "Land"] as const;
const emptyConnect = { name: "", mobile: "", email: "", lookingTo: "Buy", propertyType: "Home", remark: "" };
const helpOptions = ["Find a suitable property", "Arrange a property viewing", "Help with pricing and valuation", "Market my property", "Help with paperwork and registration", "General property advice"];

/** Realtor enquiries use the server-side lead proxy. */
function ConnectLeadForm({ firmId, recipient, embedded = false, stacked = false, wide = false }: DirectoryLeadFormProps) {
  const [values, setValues] = useState(emptyConnect);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: (body: RealtorContactInput) => directoryRequest<{ message: string }>("/api/realtors/contact", { ...body, website }),
    onSuccess: () => { setValues({ ...emptyConnect }); setErrors({}); },
  });
  const reset = () => { setValues({ ...emptyConnect }); setErrors({}); mutation.reset(); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    const result = realtorContactInput.safeParse({ firmId, source: "rezide", name: values.name, mobile: values.mobile, email: values.email, looking: values.lookingTo.toLowerCase(), propertyType: values.propertyType.toLowerCase(), remark: values.remark });
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map(issue => [String(issue.path[0]), issue.message])));
      return;
    }
    setErrors({});
    mutation.mutate(result.data);
  };
  return (
    <section id={embedded ? undefined : "enquire"} className={cn("scroll-mt-6 bg-white", !embedded && "rounded-xl border border-rez-smoke p-5", stacked && !embedded && "rounded-[12px] p-4")}>
      {!embedded && <h2 className={cn("mb-4 text-lg font-semibold", stacked && "text-base")}>Connect with {recipient || "this realtor"}</h2>}
      <form className={cn("flex flex-col gap-6", wide && "lg:grid lg:grid-cols-2 lg:items-start")} noValidate onSubmit={submit} onReset={reset}>
        <input aria-hidden="true" tabIndex={-1} autoComplete="off" name="website" value={website} onChange={event => setWebsite(event.target.value)} className="absolute -left-[10000px]" />
        <input type="hidden" name="firmId" value={firmId ?? ""} />
        <div className={cn("grid grid-cols-1 gap-5", !stacked && "sm:grid-cols-2 sm:gap-6", wide && "lg:col-span-2")}>
          <Field label="Name" required error={errors.name}>
            <Input className="h-[54px] rounded-xl border-[#e4e4e4] px-4 text-base sm:text-sm" name="fname" placeholder="Enter lead name" autoComplete="name" value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} />
          </Field>
          <Field label="Contact No." required error={errors.mobile}>
            <PhoneInput name="mobile" className="h-[54px] rounded-xl border-[#e4e4e4] px-4 [&_input]:text-base sm:[&_input]:text-sm [&_input]:font-normal" placeholder="Enter contact no." value={values.mobile} onChange={mobile => setValues({ ...values, mobile })} />
          </Field>
        </div>
        <Field label="Email" required error={errors.email}>
          <Input name="email" type="email" autoComplete="email" placeholder="Enter email address" className="h-[54px] rounded-xl border-[#e4e4e4] px-4 text-base sm:text-sm" value={values.email} onChange={event => setValues({ ...values, email: event.target.value })} />
        </Field>
        <ConnectChoice name="lookingTo" label="Looking To" options={lookingToOptions} value={values.lookingTo} onChange={lookingTo => setValues({ ...values, lookingTo })} />
        <ConnectChoice name="propertyType" label="Property Type" options={propertyTypeOptions} value={values.propertyType} onChange={propertyType => setValues({ ...values, propertyType })} />
        <Select name="remark" value={values.remark} onValueChange={remark => setValues({ ...values, remark })}>
          <Field label={`How can ${recipient || "the realtor"} help you?`} required error={errors.remark}>
            <SelectTrigger className="w-full rounded-xl border-[#e4e4e4] bg-white px-4 text-left text-sm text-rez-graphite data-[size=default]:h-[54px] focus-visible:border-rez-mocaccino focus-visible:ring-rez-mocaccino/30">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
          </Field>
          <SelectContent position="popper" align="start" sideOffset={4} className="z-[60] max-h-[min(320px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] rounded-xl border border-rez-smoke bg-white text-rez-graphite shadow-rez-lg ring-0">
            <SelectGroup>
              {helpOptions.map(option => <SelectItem key={option} value={option} className="cursor-pointer rounded-lg py-3 pl-3 text-sm whitespace-normal data-highlighted:bg-rez-cloud data-highlighted:text-black data-[state=checked]:bg-rez-cloud data-[state=checked]:font-medium data-[state=checked]:text-black">{option}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className={cn("grid grid-cols-2 gap-5", embedded && "max-sm:border-t max-sm:border-rez-cloud max-sm:pt-3", wide && "mx-auto w-full max-w-[440px] lg:col-span-2")}>
          <Button type="reset" disabled={mutation.isPending} variant="outline" className="h-[52px] border-black max-sm:uppercase">Reset</Button>
          <Button type="submit" disabled={mutation.isPending || !firmId} className="h-[52px] max-sm:uppercase">{mutation.isPending ? "Sending…" : "Submit"}</Button>
        </div>
        {(errors.firmId || !firmId) && <FormError>A valid firm is required to send this request.</FormError>}
        {mutation.isError && <FormError>{mutation.error.message}</FormError>}
        <p className={cn("text-xs text-rez-graphite", wide && "text-center lg:col-span-2")}>By submitting, you consent to being contacted about this request.</p>
      </form>
      <Dialog open={mutation.isSuccess} onOpenChange={open => { if (!open) mutation.reset(); }}>
        <DialogContent className="text-center sm:max-w-sm">
          <CircleCheck aria-hidden="true" className="mx-auto mt-3 size-14 text-green-600" />
          <DialogTitle className="pr-0">Enquiry sent successfully</DialogTitle>
          <DialogDescription>Your enquiry has been sent successfully.</DialogDescription>
          <DialogClose asChild><Button className="mt-2">Done</Button></DialogClose>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ConnectChoice({ name, label, options, value, onChange }: { name: string; label: string; options: readonly string[]; value: string; onChange: (value: string) => void }) {
  return <fieldset className="min-w-0">
    <legend className="mb-3 text-[13px] font-semibold">{label} <span aria-hidden>*</span></legend>
    <div className="flex flex-wrap gap-2">
      {options.map(option => <label key={option} className="relative cursor-pointer">
        <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="peer sr-only" required />
        <span className="flex h-10 items-center justify-center rounded-full border border-[#ececec] bg-[#f7f7f7] px-3.5 text-sm font-semibold text-[#808080] peer-checked:border-black peer-checked:bg-black peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-rez-mocaccino peer-focus-visible:ring-offset-2">{option}</span>
      </label>)}
    </div>
  </fieldset>;
}

function InvitationForm({ embedded = false }: Pick<DirectoryLeadFormProps, "embedded">) {
  const [values, setValues] = useState<Values>(empty);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const mutation = useMutation({ mutationFn: (body: unknown) => directoryRequest<{ message: string }>("/api/realtors/invitation", { ...(body as Record<string, unknown>), website }), onSuccess: () => { setValues(empty); setErrors({}); } });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    const result = formSchema.safeParse(values);
    const nextErrors: Partial<Record<keyof Values, string>> = {};
    if (!result.success) for (const issue of result.error.issues) nextErrors[issue.path[0] as keyof Values] = issue.message;
    if (values.lastName.trim().length < 2) nextErrors.lastName = "Enter at least 2 characters.";
    if (values.realtorName.trim().length < 2) nextErrors.realtorName = "Enter at least 2 characters.";
    setErrors(nextErrors);
    if (!result.success || Object.keys(nextErrors).length) return;
    const v = result.data;
    mutation.mutate({ type: "listRealtors", fullName: `${v.firstName} ${v.lastName}`.trim(), email: v.email, mobile: v.mobile, realtorName: v.realtorName, source: "Rezide.in find realtor page" });
  };
  return (
    <section id={embedded ? undefined : "invite-realtor"} className={cn("scroll-mt-6 bg-white", !embedded && "rounded-xl border border-rez-smoke p-5")}>
      {!embedded && <h2 className="mb-4 text-lg font-semibold">Request a realtor invitation</h2>}
      {mutation.isSuccess ? <div role="status" className="flex flex-col gap-3"><p>{mutation.data.message}</p><Button variant="secondary" onClick={() => mutation.reset()}>Send another request</Button></div> : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-5">
          <input aria-hidden="true" tabIndex={-1} autoComplete="off" name="website" value={website} onChange={event => setWebsite(event.target.value)} className="absolute -left-[10000px]" />
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {([["firstName", "First name"], ["lastName", "Last name"], ["mobile", "Mobile number"], ["email", "Email"], ["realtorName", "Realtor or firm name"]] as [keyof Values, string][]).map(([key, label]) => (
            <Field key={key} label={label} required error={errors[key]}>
              <Input className="h-[54px] rounded-xl border-[#e4e4e4] px-4 text-base sm:text-sm" placeholder={key === "mobile" ? "Enter contact no." : `Enter ${label.toLowerCase()}`} aria-label={label} aria-invalid={!!errors[key]} value={values[key]} onChange={e => setValues({ ...values, [key]: e.target.value })} type={key === "email" ? "email" : key === "mobile" ? "tel" : "text"} autoComplete={key === "email" ? "email" : key === "mobile" ? "tel-national" : key === "firstName" ? "given-name" : key === "lastName" ? "family-name" : "off"} />
            </Field>
          ))}
          </div>
          {mutation.isError && <FormError>{mutation.error.message}</FormError>}
          <div className={cn("grid grid-cols-2 gap-3 sm:gap-5", embedded && "max-sm:border-t max-sm:border-rez-cloud max-sm:pt-3")}><Button type="button" variant="outline" className="h-11 border-black uppercase sm:h-[52px] sm:normal-case" disabled={mutation.isPending} onClick={() => { setValues(empty); setErrors({}); mutation.reset(); }}>Reset</Button><Button type="submit" className="h-11 uppercase sm:h-[52px] sm:normal-case" disabled={mutation.isPending}>{mutation.isPending ? "Sending…" : "Request invitation"}</Button></div>
          <p className="text-xs text-rez-graphite">By submitting, you consent to being contacted about this request.</p>
        </form>
      )}
    </section>
  );
}
