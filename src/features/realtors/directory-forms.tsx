"use client";

import { useMutation } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/common/phone-input";
import { Field, FormError } from "@/components/common/form-field";
import { directoryRequest } from "@/services/realtor-directory";
import { cn } from "@/lib/utils";

const formSchema = z.object({ firstName: z.string().trim().min(2, "Enter at least 2 characters."), lastName: z.string().trim(), email: z.email("Enter a valid email."), mobile: z.string().transform(v => v.replace(/\s/g, "")).pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.")), realtorName: z.string().trim() });
const empty = { firstName: "", lastName: "", email: "", mobile: "", realtorName: "" };
type Values = typeof empty;

type DirectoryLeadFormProps = { firmId?: string; recipient?: string; invitation?: boolean; embedded?: boolean };

export function DirectoryLeadForm(props: DirectoryLeadFormProps) {
  return props.invitation ? <LegacyDirectoryLeadForm {...props} /> : <ConnectLeadForm {...props} />;
} 

const lookingToOptions = ["Buy", "Rent-in", "Sell", "Lease out"] as const;
const propertyTypeOptions = ["Home", "Office", "Industrial", "Retail", "Land"] as const;
const emptyConnect = { name: "", mobile: "", lookingTo: "Buy", propertyType: "Home" };

/** Presentation only until the revised contact endpoint contract is available. */
function ConnectLeadForm({ recipient, embedded = false }: DirectoryLeadFormProps) {
  const [values, setValues] = useState(emptyConnect);
  const availabilityId = useId();
  return (
    <section id={embedded ? undefined : "enquire"} className={cn("scroll-mt-6 bg-white", !embedded && "rounded-xl border border-rez-smoke p-5")}>
      {!embedded && <h2 className="mb-4 text-lg font-semibold">Connect with {recipient || "this realtor"}</h2>}
      <form className="flex flex-col gap-6" onSubmit={event => event.preventDefault()} onReset={() => setValues({ ...emptyConnect })}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
          <Field label="Name" required>
            <Input className="h-[54px] rounded-xl border-[#e4e4e4] px-4 text-sm" placeholder="Enter lead name" autoComplete="name" value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} />
          </Field>
          <Field label="Contact No." required>
            <PhoneInput className="h-[54px] rounded-xl border-[#e4e4e4] px-4 [&_input]:text-sm [&_input]:font-normal" placeholder="Enter contact no." value={values.mobile} onChange={mobile => setValues({ ...values, mobile })} />
          </Field>
        </div>
        <ConnectChoice label="Looking To" options={lookingToOptions} value={values.lookingTo} onChange={lookingTo => setValues({ ...values, lookingTo })} />
        <ConnectChoice label="Property Type" options={propertyTypeOptions} value={values.propertyType} onChange={propertyType => setValues({ ...values, propertyType })} />
        <Field label={`How can ${recipient || "the realtor"} help you?`} required hint="Options will be available soon.">
          <select disabled defaultValue="" className="h-[54px] w-full rounded-xl border border-[#e4e4e4] bg-white px-4 text-sm text-rez-graphite disabled:cursor-not-allowed">
            <option value="">Select</option>
          </select>
        </Field>
        <div className={cn("grid grid-cols-2 gap-5", embedded && "max-sm:border-t max-sm:border-rez-cloud max-sm:pt-3")}>
          <Button type="reset" variant="outline" className="h-[52px] border-black max-sm:uppercase">Reset</Button>
          <Button type="submit" disabled aria-describedby={availabilityId} className="h-[52px] max-sm:uppercase">Submit</Button>
        </div>
        <p id={availabilityId} role="status" className="text-xs text-rez-graphite">Online enquiries will be available soon. This form cannot send a request yet.</p>
      </form>
    </section>
  );
}

function ConnectChoice({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (value: string) => void }) {
  const groupName = useId();
  return <fieldset className="min-w-0">
    <legend className="mb-3 text-[13px] font-semibold">{label} <span aria-hidden>*</span></legend>
    <div className="flex flex-wrap gap-2">
      {options.map(option => <label key={option} className="relative cursor-pointer">
        <input type="radio" name={groupName} value={option} checked={value === option} onChange={() => onChange(option)} className="peer sr-only" required />
        <span className="flex h-10 items-center justify-center rounded-full border border-[#ececec] bg-[#f7f7f7] px-3.5 text-sm font-semibold text-[#808080] peer-checked:border-black peer-checked:bg-black peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-rez-mocaccino peer-focus-visible:ring-offset-2">{option}</span>
      </label>)}
    </div>
  </fieldset>;
}

function LegacyDirectoryLeadForm({ firmId, recipient, invitation = false, embedded = false }: DirectoryLeadFormProps) {
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const mutation = useMutation({ mutationFn: (body: unknown) => directoryRequest<{ message: string }>(`/api/realtors/${invitation ? "invitation" : "contact"}`, body), onSuccess: () => { setValues(empty); setErrors({}); } });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    const result = formSchema.safeParse(values);
    const nextErrors: Partial<Record<keyof Values, string>> = {};
    if (!result.success) for (const issue of result.error.issues) nextErrors[issue.path[0] as keyof Values] = issue.message;
    if (invitation && values.lastName.trim().length < 2) nextErrors.lastName = "Enter at least 2 characters.";
    if (invitation && values.realtorName.trim().length < 2) nextErrors.realtorName = "Enter at least 2 characters.";
    setErrors(nextErrors);
    if (!result.success || Object.keys(nextErrors).length || (!invitation && !firmId)) return;
    const v = result.data;
    mutation.mutate(invitation ? { type: "listRealtors", fullName: `${v.firstName} ${v.lastName}`.trim(), email: v.email, mobile: v.mobile, realtorName: v.realtorName, source: "Rezide.in find realtor page" } : { firm_id: firmId, fname: v.firstName, lname: v.lastName, mobile: v.mobile, email: v.email, enquiryType: "realtor" });
  };
  return (
    <section id={embedded ? undefined : invitation ? "invite-realtor" : "enquire"} className={cn("scroll-mt-6 bg-white", !embedded && "rounded-xl border border-rez-smoke p-5")}>
      {!embedded && <h2 className="mb-4 text-lg font-semibold">{invitation ? "Request a realtor invitation" : `Connect with ${recipient || "this realtor"}`}</h2>}
      {mutation.isSuccess ? <div role="status" className="flex flex-col gap-3"><p>{mutation.data.message}</p><Button variant="secondary" onClick={() => mutation.reset()}>Send another request</Button></div> : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {([["firstName", "First name"], ["lastName", "Last name"], ["mobile", "Mobile number"], ["email", "Email"], ...(invitation ? [["realtorName", "Realtor or firm name"]] : [])] as [keyof Values, string][]).map(([key, label]) => (
            <Field key={key} label={label} required={key !== "lastName" || invitation} error={errors[key]}>
              <Input className="h-[54px] rounded-xl border-[#e4e4e4] px-4 text-sm" placeholder={key === "mobile" ? "Enter contact no." : `Enter ${label.toLowerCase()}`} aria-label={label} aria-invalid={!!errors[key]} value={values[key]} onChange={e => setValues({ ...values, [key]: e.target.value })} type={key === "email" ? "email" : key === "mobile" ? "tel" : "text"} autoComplete={key === "email" ? "email" : key === "mobile" ? "tel-national" : key === "firstName" ? "given-name" : key === "lastName" ? "family-name" : "off"} />
            </Field>
          ))}
          </div>
          {mutation.isError && <FormError>{mutation.error.message}</FormError>}
          {!invitation && !firmId && <FormError>A firm is required to send this request.</FormError>}
          <div className={cn("grid grid-cols-2 gap-3 sm:gap-5", embedded && "max-sm:border-t max-sm:border-rez-cloud max-sm:pt-3")}><Button type="button" variant="outline" className="h-11 border-black uppercase sm:h-[52px] sm:normal-case" disabled={mutation.isPending} onClick={() => { setValues(empty); setErrors({}); mutation.reset(); }}>Reset</Button><Button type="submit" className="h-11 uppercase sm:h-[52px] sm:normal-case" disabled={mutation.isPending || (!invitation && !firmId)}>{mutation.isPending ? "Sending…" : invitation ? "Request invitation" : "Submit"}</Button></div>
          <p className="text-xs text-rez-graphite">By submitting, you consent to being contacted about this request.</p>
        </form>
      )}
    </section>
  );
}
