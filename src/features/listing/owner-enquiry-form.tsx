"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Field, FormError } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ownerEnquirySchema, type OwnerEnquiryValues } from "./owner-enquiry-schema";
const blank = { first_name: "", last_name: "", mobile: "", email: "", locality: "", project_name: "", flat_no: "" };
const fields = [["first_name", "First Name", "given-name"], ["last_name", "Last Name", "family-name"], ["mobile", "Mobile Number", "tel-national"], ["email", "Email Address", "email"], ["locality", "Locality", "off"], ["project_name", "Project Name", "off"], ["flat_no", "Flat no.", "off"]] as const;
export function OwnerEnquiryForm() {
  const [success, setSuccess] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const form = useForm<OwnerEnquiryValues>({ resolver: zodResolver(ownerEnquirySchema), defaultValues: blank, mode: "onTouched" });
  const submit = useMutation({ mutationFn: async (values: OwnerEnquiryValues) => {
    const response = await fetch("/api/list-property/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }).catch(() => { throw new Error("Unexpected error. Please try again."); });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) throw new Error(result?.message || "Unexpected error. Please try again.");
  }, onSuccess: () => { form.reset(blank); setSuccess(true); timer.current = setTimeout(() => { setSuccess(false); submit.reset(); }, 30000); } });
  return <div className="mx-auto w-full max-w-[896px] rounded-xl bg-white p-6 text-black shadow-rez-lg sm:p-8">
    <h2 className="text-center text-[23px] leading-snug font-semibold">Want to have a hassle-free experience?<br />Connect with our panel of expert realtors.</h2>
    <p className="mt-5 text-center text-sm leading-relaxed text-rez-graphite">We&apos;ll match you with a local realtor or agent who knows your market best.<br />Fill out the form below to get started right away.</p>
    {success ? <div role="status" className="my-10 flex flex-col items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-6 text-center text-green-800"><CheckCircle2 className="size-9" aria-hidden /><p className="font-semibold">Your request has been successfully submitted</p><p className="text-sm">Our team will connect with you shortly.</p></div> : <form noValidate onSubmit={form.handleSubmit(values => { if (submit.isPending) return; submit.reset(); submit.mutate(values); })}>
      <div className="my-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(([name, label, autocomplete]) => <Field key={name} label={label} labelClassName="sr-only" required error={form.formState.errors[name]?.message}><Input {...form.register(name)} placeholder={label} autoComplete={autocomplete} type={name === "email" ? "email" : name === "mobile" ? "tel" : "text"} inputMode={name === "mobile" ? "numeric" : undefined} className="h-10 rounded-[6px] px-3 text-sm" /></Field>)}
        <Field label="Purpose" labelClassName="sr-only" required error={form.formState.errors.looking?.message}><select {...form.register("looking")} defaultValue="" className="h-10 w-full rounded-[6px] border border-rez-smoke bg-white px-3 text-sm"><option value="" disabled>Looking to sell or rent-out?</option><option value="sell">Sell</option><option value="rent">Rent</option></select></Field>
      </div>
      <Button type="submit" disabled={submit.isPending} className="h-10 w-full rounded-[6px] bg-[#18181b] text-sm">{submit.isPending ? "Submitting..." : "Submit"}</Button>
      {submit.isError && <div className="mt-4"><FormError>{submit.error instanceof Error ? submit.error.message : "Unexpected error. Please try again."}</FormError></div>}
    </form>}
    <p className="mt-4 text-center text-xs leading-relaxed text-rez-graphite">By submitting this form you agree that Rezide and subscribed realtor on this platform may contact you, including with calls or texts by automated means. You also agree to our Terms of Service and Privacy Policy.</p>
  </div>;
}
