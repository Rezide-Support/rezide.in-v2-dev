"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { EmptyState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { CONTACT_SUBTYPES, type ContactType } from "@/lib/constants";
import type { Contact, ContactDetailKey, ContactInput } from "@/types/dashboard";
import { dq, useCreateContact, useUpdateContact } from "./api";
import { DashDialog, LabelEditor, useAllLabels } from "./contact-dialogs";
import { DETAIL_SECTIONS } from "./contact-fields";
import { MAX_LABELS } from "./contact-model";
import { CheckRow, ChipsField, FileField, OptionalSection, SelectField, TextField, TilesField } from "./form-bits";
import { RelativesEditor } from "./relatives";
import { Card, Loading, PageHeader } from "./ui";

type Values = Omit<Contact, "id" | "addedOn" | "addedBy">;

const BLANK: Values = {
  type: "Customer",
  subType: "",
  entity: "Individual",
  company: "",
  salutation: "Mr.",
  firstName: "",
  lastName: "",
  mobile: "",
  altMobile: "",
  email: "",
  altEmail: "",
  firmLevel: false,
  labels: [],
  groupIds: [],
  details: { permanentSame: "yes" },
  relatives: [],
  properties: [],
  leads: [],
};

const mobileRule = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number.");
const optionalMobile = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => !v || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number, or leave it blank.");
const optionalEmail = z.string().trim().refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email address.");

const schema = z
  .object({
    type: z.string(),
    entity: z.string(),
    company: z.string().trim(),
    firstName: z.string().trim().min(1, "Add a first name."),
    mobile: mobileRule,
    altMobile: optionalMobile,
    email: optionalEmail,
    altEmail: optionalEmail,
  })
  .superRefine((v, ctx) => {
    if ((v.type === "Developer" || v.entity === "Company") && !v.company) ctx.addIssue({ code: "custom", path: ["company"], message: "Add the company name." });
  });

const fmtMobile = (d: string) => (d ? `${d.slice(0, 5)} ${d.slice(5)}` : "");

const TYPE_TILES = [
  { label: "Customer", icon: "user" as const },
  { label: "Broker", icon: "badge-star" as const },
  { label: "Developer", icon: "folder" as const },
  { label: "Vendor", icon: "bag" as const },
];

function Form({ initial, editing }: { initial: Values & { id?: string }; editing: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const create = useCreateContact();
  const update = useUpdateContact();
  const allLabels = useAllLabels();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const openParam = params.get("open");
  const returnTo = params.get("from");
  const [open, setOpen] = useState<Record<string, boolean>>(openParam ? { [openParam]: true } : {});
  const [confirmLeave, setConfirmLeave] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((x) => ({ ...x, [k]: val }));
  const setD = (k: ContactDetailKey, val: string) => setV((x) => ({ ...x, details: { ...x.details, [k]: val } }));
  const dev = v.type === "Developer";
  const co = v.entity === "Company" && !dev;
  const sectionIds = ["family", ...DETAIL_SECTIONS.map((s) => s.id)];
  const allOpen = sectionIds.every((id) => open[id]);
  const backHref = returnTo ? `/dashboard/database/${returnTo}` : editing && initial.id ? `/dashboard/contacts/${initial.id}` : "/dashboard/contacts";
  const busy = create.isPending || update.isPending;

  const save = () => {
    const parsed = schema.safeParse({ ...v, company: v.company ?? "", altMobile: v.altMobile ?? "", email: v.email ?? "", altEmail: v.altEmail ?? "" });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      toast.error("Please fix the highlighted fields.");
      // Take keyboard and screen-reader users to the first field that needs attention.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    setErrors({});
    const p = parsed.data;
    const payload: ContactInput = {
      ...v,
      entity: dev ? "Individual" : v.entity,
      company: dev || co ? p.company : v.company,
      firstName: p.firstName,
      lastName: v.lastName.trim(),
      mobile: fmtMobile(p.mobile),
      altMobile: fmtMobile(p.altMobile) || undefined,
      email: p.email || undefined,
      altEmail: p.altEmail || undefined,
    };
    const name = co ? p.company : [p.firstName, v.lastName.trim()].filter(Boolean).join(" ");
    const done = (id: string) => {
      toast.success(editing ? `${name} updated.` : `${name} added${v.firmLevel ? " at firm level" : ""}.`, { description: "Saved in this demo session only." });
      router.push(returnTo ? `/dashboard/database/${returnTo}` : `/dashboard/contacts/${id}`);
    };
    if (editing && initial.id) update.mutate({ ...payload, id: initial.id }, { onSuccess: (c) => done(c.id) });
    else create.mutate(payload, { onSuccess: (c) => done(c.id) });
  };

  const filled = (keys: ContactDetailKey[]) => keys.filter((k) => v.details[k] && k !== "permanentSame").length;

  return (
    <>
      <PageHeader crumbs={["Contact", "All Contacts"]} title={editing ? "Edit Contact" : "Add Contact"} />
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex w-full max-w-[880px] flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-[#F4F4F4] px-4 py-3 text-[13px] text-rez-arsenic">
          Only the Contact card is required. Open any section to add more details now, or later.
          <button type="button" onClick={() => setOpen(Object.fromEntries(sectionIds.map((id) => [id, !allOpen])))} className="font-semibold text-black underline underline-offset-4">
            {allOpen ? "Collapse All" : "Expand All"}
          </button>
        </div>

        <Card className="flex flex-col gap-5 p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-bold tracking-[0.06em] uppercase">Contact</h2>
            <button type="submit" disabled={busy} className="text-[13px] font-bold tracking-[0.04em] uppercase underline underline-offset-4">
              Save &amp; Exit
            </button>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
            <TilesField
              className="md:col-span-12"
              label="Contact Type"
              required
              options={TYPE_TILES}
              value={v.type}
              onChange={(t) => setV((x) => ({ ...x, type: t as ContactType, subType: "" }))}
            />
            <SelectField className="md:col-span-6" label={`${v.type} Sub-type`} value={v.subType} onChange={(s) => set("subType", s)} options={CONTACT_SUBTYPES[v.type]} />
            {dev ? (
              <TextField className="md:col-span-6" label="Developer Company" required value={v.company ?? ""} onChange={(s) => set("company", s)} placeholder="Company this person belongs to" error={errors.company} />
            ) : (
              <ChipsField className="md:col-span-6" label="Contact Is" options={["Individual", "Company"]} value={v.entity} onChange={(s) => set("entity", s as Values["entity"])} />
            )}
            {co && <TextField className="md:col-span-12" label="Company Name" required value={v.company ?? ""} onChange={(s) => set("company", s)} placeholder="Enter company name" error={errors.company} />}
            <SelectField className="md:col-span-2" label="Salutation" value={v.salutation} onChange={(s) => set("salutation", s)} options={["Mr.", "Ms.", "Mrs.", "Dr."]} placeholder="—" />
            <TextField className="md:col-span-5" label={co ? "Contact First Name" : "First Name"} required value={v.firstName} onChange={(s) => set("firstName", s)} placeholder="Enter first name" error={errors.firstName} />
            <TextField className="md:col-span-5" label={co ? "Contact Last Name" : "Last Name"} value={v.lastName} onChange={(s) => set("lastName", s)} placeholder="Enter last name" />
            <TextField className="md:col-span-6" label="Mobile No." required prefix="+91" inputMode="numeric" value={v.mobile} onChange={(s) => set("mobile", s)} placeholder="Enter mobile number" error={errors.mobile} />
            <TextField className="md:col-span-6" label="Alternate Mobile No." prefix="+91" inputMode="numeric" value={v.altMobile ?? ""} onChange={(s) => set("altMobile", s)} placeholder="Enter mobile number" error={errors.altMobile} />
            <TextField className="md:col-span-6" label="Email ID" type="email" value={v.email ?? ""} onChange={(s) => set("email", s)} placeholder="Enter email" error={errors.email} />
            <TextField className="md:col-span-6" label="Alternate Email ID" type="email" value={v.altEmail ?? ""} onChange={(s) => set("altEmail", s)} placeholder="Enter email" error={errors.altEmail} />
            <div className="flex flex-col gap-2 md:col-span-12">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold">Labels</span>
                <span className="text-xs text-rez-graphite">
                  {v.labels.length} / {MAX_LABELS}
                </span>
              </div>
              <LabelEditor value={v.labels} onChange={(l) => set("labels", l)} allLabels={allLabels} />
            </div>
            <div className="md:col-span-12">
              <CheckRow checked={v.firmLevel} onChange={(b) => set("firmLevel", b)}>
                Save contact at firm level · make this contact available to everyone in the firm
              </CheckRow>
            </div>
          </div>
        </Card>

        {DETAIL_SECTIONS.flatMap((sec) => {
          const keys = sec.fields.map((f) => f.key);
          const n = filled(keys);
          const node = (
            <OptionalSection
              key={sec.id}
              id={`cf-${sec.id}`}
              title={sec.title}
              sub={n ? `${n} of ${sec.fields.length} filled · ${sec.sub}` : sec.sub}
              open={!!open[sec.id]}
              onToggle={() => setOpen((o) => ({ ...o, [sec.id]: !o[sec.id] }))}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {sec.fields.map((f) =>
                  f.kind === "select" ? (
                    <SelectField key={f.key} label={f.label} value={v.details[f.key] ?? ""} onChange={(s) => setD(f.key, s)} options={f.options ?? []} />
                  ) : f.kind === "upload" ? (
                    <FileField key={f.key} label={f.label} value={v.details[f.key] ?? ""} onChange={(s) => setD(f.key, s)} hint="Attach file" />
                  ) : (
                    <TextField key={f.key} className={f.full ? "sm:col-span-2" : undefined} label={f.label} value={v.details[f.key] ?? ""} onChange={(s) => setD(f.key, s)} placeholder={f.placeholder} />
                  ),
                )}
                {sec.id === "address" && (
                  <>
                    <div className="sm:col-span-2">
                      <CheckRow checked={v.details.permanentSame !== "no"} onChange={(b) => setD("permanentSame", b ? "yes" : "no")}>
                        Permanent address same as above
                      </CheckRow>
                    </div>
                    {v.details.permanentSame === "no" && (
                      <>
                        <TextField className="sm:col-span-2" label="Permanent Address" value={v.details.permanentLine ?? ""} onChange={(s) => setD("permanentLine", s)} placeholder="Enter address" />
                        <TextField label="Permanent City" value={v.details.permanentCity ?? ""} onChange={(s) => setD("permanentCity", s)} placeholder="Enter city" />
                        <TextField label="Permanent Pincode" value={v.details.permanentPin ?? ""} onChange={(s) => setD("permanentPin", s)} placeholder="Enter pincode" />
                      </>
                    )}
                  </>
                )}
              </div>
            </OptionalSection>
          );
          if (sec.id !== "personal") return [node];
          return [
            node,
            <OptionalSection
              key="family"
              id="cf-family"
              title="Family & Relatives"
              sub={v.relatives.length ? `${v.relatives.length} added · Spouse, children, parents and household contacts` : "Spouse, children, parents and household contacts"}
              open={!!open.family}
              onToggle={() => setOpen((o) => ({ ...o, family: !o.family }))}
            >
              <RelativesEditor value={v.relatives} onChange={(r) => set("relatives", r)} />
            </OptionalSection>,
          ];
        })}

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" className="h-12 text-[13px] font-bold tracking-[0.08em] uppercase" onClick={() => setConfirmLeave(true)}>
            Cancel
          </Button>
          <Button type="submit" className="h-12 text-[13px] font-bold tracking-[0.08em] uppercase" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save Changes" : "Save Contact"}
          </Button>
        </div>
      </form>
      <DashDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Discard changes?"
        description="Anything you entered on this form will be lost."
        footer={
          <>
            <Button variant="secondary" className="h-11 flex-1 text-[13px] font-bold uppercase" onClick={() => setConfirmLeave(false)}>
              Keep Editing
            </Button>
            <Button asChild className="h-11 flex-1 text-[13px] font-bold uppercase">
              <Link href={backHref}>Discard</Link>
            </Button>
          </>
        }
      />
    </>
  );
}

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** /dashboard/contacts/new — optionally prefilled from a database record (?first=&last=&mobile=&type=&from=). */
export function NewContactPage() {
  const params = useSearchParams();
  const t = params.get("type");
  const initial: Values = {
    ...BLANK,
    type: t && t in CONTACT_SUBTYPES ? (t as ContactType) : "Customer",
    firstName: title(params.get("first") ?? ""),
    lastName: (params.get("last") ?? "").split(" ").filter(Boolean).map(title).join(" "),
    mobile: params.get("mobile") ?? "",
  };
  return <Form initial={initial} editing={false} />;
}

export function EditContactPage({ id }: { id: string }) {
  const q = useQuery(dq.contact(id));
  if (q.isError)
    return (
      <EmptyState icon="user" title="Contact not found." className="bg-white" action={<Link href="/dashboard/contacts" className="font-semibold underline">Back to contacts</Link>}>
        It may have been deleted in this session.
      </EmptyState>
    );
  if (q.isPending) return <Loading />;
  const c = q.data;
  return <Form key={c.id} initial={{ ...BLANK, ...c, details: { permanentSame: "yes", ...c.details } }} editing />;
}


