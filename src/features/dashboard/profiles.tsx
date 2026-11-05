"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Icon, type IconName } from "@/components/brand/icon";
import { ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dq, useSaveFirm, useSaveMe, type FirmProfile, type MyProfile } from "./api";
import { ChipsField, FileField, OptionalSection, SelectField, TagsField, TextAreaField, TextField, TilesField, inputCls } from "./form-bits";
import { FormGroup, LivePreview, StepFormLayout, type PreviewSection } from "./step-form";
import { Loading, PageHeader } from "./ui";

export const YEARS = Array.from({ length: 37 }, (_, i) => String(2026 - i));
export const SPECS = ["Residential Resale", "Residential Rental", "New Projects", "Luxury Homes", "Commercial Lease", "Commercial Sale", "Land & Plots", "NRI Services", "Property Management"];
export const LANGS = ["Hindi", "English", "Marathi", "Gujarati", "Tamil", "Kannada", "Bengali", "Punjabi", "Urdu"];
export const COVERAGE = {
  cities: ["Mumbai", "Thane", "Navi Mumbai", "Pune"],
  regions: ["Western Suburbs", "South Mumbai", "Central Suburbs", "Harbour Line", "New Bombay"],
  subRegions: ["Andheri East", "Andheri West", "Bandra East", "Bandra West", "Juhu", "Goregaon East", "Goregaon West", "Jogeshwari East", "Worli", "Lower Parel", "Borivali West", "Kharghar"],
  localities: ["JVLR", "Yashodham", "Aarey Colony", "Lokhandwala", "Seven Bungalows", "Versova", "Pali Hill", "Upper Kharghar"],
  projects: ["Oberoi Splendor", "Oberoi Maxima", "Oberoi Prisma", "Oberoi Sky City", "Oberoi Springs", "Oberoi Enigma", "Raheja Exotica", "Lodha World One"],
};
const RERA_STATES = ["MahaRERA · Maharashtra", "K-RERA · Karnataka", "TNRERA · Tamil Nadu", "HRERA · Haryana", "UP RERA · Uttar Pradesh", "GujRERA · Gujarat"];

const FIRM_TYPES: { label: string; icon: IconName }[] = [
  { label: "Individual", icon: "user" },
  { label: "Proprietorship", icon: "badge-star" },
  { label: "Partnership", icon: "user-alt" },
  { label: "LLP", icon: "shield" },
  { label: "Pvt Ltd", icon: "folder" },
];
const PROPERTY_TYPES: { label: string; icon: IconName }[] = [
  { label: "Home", icon: "map-pin" },
  { label: "Office", icon: "monitor" },
  { label: "Industrial", icon: "settings" },
  { label: "Retail", icon: "bag" },
  { label: "Land", icon: "compass" },
];

const join = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(", ") : v ?? "");
const short = (v: string) => (v.length > 70 ? `${v.slice(0, 70)}…` : v);
const validMobile = (m: string) => /^[6-9]\d{9}$/.test(m.replace(/\D/g, ""));
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

/* ---------- registry number field (format check only) ---------- */

type VerifyState = "sample" | "idle" | "format-ok" | "invalid";
const PATTERNS = { gst: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, rera: /^A\d{11}$/ };
const SAMPLE_ROWS = {
  gst: [["Legal Name", "BUILDSTONE REALTY LLP"], ["State", "Maharashtra (27)"], ["Taxpayer Type", "Regular"], ["Status", "Active since 12 Apr 2014"]],
  rera: [["Registered Name", "Buildstone Realty LLP"], ["Type", "Real Estate Agent · Firm"], ["Valid Till", "14 Aug 2028"]],
  merera: [["Registered Name", "Viraj Bhatia"], ["Type", "Real Estate Agent · Individual"], ["Valid Till", "02 Mar 2029"]],
} as const;

function RegistryField({ label, kind, sample, value, onChange, state, setState, required }: { label: string; kind: "gst" | "rera"; sample: keyof typeof SAMPLE_ROWS; value: string; onChange: (v: string) => void; state: VerifyState; setState: (s: VerifyState) => void; required?: boolean }) {
  const registry = kind === "gst" ? "the GST portal" : "MahaRERA";
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <span className="flex items-baseline justify-between text-[13px] font-semibold">
        <label htmlFor={`reg-${sample}`}>
          {label}
          {required && " *"}
        </label>
        {state === "sample" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E6EDEB] px-2 py-0.5 text-[10px] font-bold tracking-[0.04em] text-rez-timber uppercase">
            <Icon name="shield-check" size={12} /> Verified (sample)
          </span>
        )}
      </span>
      <div className="flex gap-2">
        <input
          id={`reg-${sample}`}
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setState("idle");
          }}
          placeholder={kind === "gst" ? "15-character GSTIN" : "A519000XXXXX"}
          aria-invalid={state === "invalid" ? true : undefined}
          aria-describedby={`reg-${sample}-msg`}
          className={cn(inputCls, "flex-1 font-mono tracking-wide")}
        />
        <Button variant="secondary" className="h-[42px] rounded-[8px] px-4 text-xs font-bold tracking-[0.06em] uppercase" onClick={() => setState(PATTERNS[kind].test(value.trim()) ? "format-ok" : "invalid")}>
          Check format
        </Button>
      </div>
      <p id={`reg-${sample}-msg`} className={cn("text-xs", state === "invalid" ? "font-medium text-destructive" : "text-rez-graphite")} role={state === "invalid" ? "alert" : undefined}>
        {state === "invalid"
          ? kind === "gst"
            ? "This GSTIN isn’t valid. It should be 15 characters, for example 27AAKFB4417M1ZS."
            : "This doesn’t look like a RERA number. Check the format, for example A51900012345."
          : state === "format-ok"
            ? `Format looks right. It hasn’t been verified with ${registry}; that check isn’t connected in this prototype.`
            : state === "sample"
              ? "Sample registry details for the demo firm:"
              : `Check the format here. Verification with ${registry} isn’t connected in this prototype.`}
      </p>
      {state === "sample" && (
        <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-[8px] bg-[#F4F4F4] px-3.5 py-3 text-xs">
          {SAMPLE_ROWS[sample].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-rez-graphite">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function useStepState(count: number) {
  const [step, setStepRaw] = useState(0);
  const setStep = (i: number) => {
    setStepRaw(Math.max(0, Math.min(count - 1, i)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return [step, setStep] as const;
}

/* ---------- Firm profile ---------- */

function FirmForm({ saved }: { saved: FirmProfile }) {
  const team = useQuery(dq.team());
  const save = useSaveFirm();
  const [v, setV] = useState(saved);
  const [step, setStep] = useStepState(5);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [reg, setReg] = useState<{ rera: VerifyState; gst: VerifyState }>({ rera: "sample", gst: "sample" });
  const [cheque, setCheque] = useState("");
  const [extraDocs, setExtraDocs] = useState<string[]>([]);
  const set = <K extends keyof FirmProfile>(k: K) => (val: FirmProfile[K]) => setV((x) => ({ ...x, [k]: val }));
  const people = (team.data?.members ?? []).filter((m) => m.role !== "agent").map((m) => m.name);

  const persist = (then?: () => void) => {
    const problems = [!v.name.trim() && "firm name", !validMobile(v.primaryMobile) && "primary contact number", !validEmail(v.primaryEmail) && "primary email"].filter(Boolean);
    if (problems.length) return toast.error(`Check the ${problems.join(", ")} before saving.`);
    save.mutate(v, { onSuccess: () => (toast.success("Firm profile saved.", { description: "Saved in this demo session only." }), then?.()) });
  };

  const pan = v.gstin.length >= 12 ? v.gstin.slice(2, 12) : "";
  const docs = [
    { name: "RERA Registration Certificate", meta: "MahaRERA_A51900034821.pdf · 412 KB", status: reg.rera === "sample" ? "Verified (sample)" : "Uploaded" },
    { name: "GST Registration Certificate", meta: "GST_REG-06.pdf · 288 KB", status: reg.gst === "sample" ? "Verified (sample)" : "Uploaded" },
    { name: "Firm PAN Card", meta: "PAN_AAKFB4417M.jpg · 190 KB", status: "Uploaded" },
    { name: "LLP Agreement", meta: "Buildstone_LLP_Deed.pdf · 1.8 MB", status: "Uploaded" },
    { name: "Cancelled Cheque", meta: cheque ? `${cheque} · not uploaded in this prototype` : "Required for commission payouts", status: cheque ? "Selected" : "Required" },
    ...extraDocs.map((d) => ({ name: d, meta: "Not uploaded in this prototype", status: "Selected" })),
  ];

  const steps = ["Basics", "Contacts", "About", "Operations", "Compliance"];
  const sections: PreviewSection[] = [
    { label: "Basics", step: 0, rows: [["Firm Name", v.name], ["Firm Type", v.type], ["Operating Since", v.since], ["Website", v.website], ["Firm Logo", v.logo], ["Cover Image", v.cover], ["Tagline", v.tagline], ["Brand Colour", v.brandColour]] },
    {
      label: "Contacts",
      step: 1,
      rows: [
        ["Name", v.primaryContact], ["Designation", v.primaryDesignation], ["Contact No.", v.primaryMobile && `+91 ${v.primaryMobile}`], ["Email", v.primaryEmail],
        ["Name", v.secondaryContact], ["Designation", v.secondaryDesignation], ["Contact No.", v.secondaryMobile && `+91 ${v.secondaryMobile}`], ["Email", v.secondaryEmail],
        ["Address Line", v.address], ["Locality", v.locality], ["City", v.city], ["State", v.state], ["PIN Code", v.pincode],
        ["Address Line", v.branchAddress], ["City", v.branchCity], ["PIN Code", v.branchPincode],
      ],
    },
    { label: "About", step: 2, rows: [["About Us", short(v.about)], ["Instagram", v.instagram], ["LinkedIn", v.linkedin], ["Facebook", v.facebook], ["YouTube", v.youtube], ["X", v.x]] },
    { label: "Operations", step: 3, rows: [["Property Types", join(v.propertyTypes)], ["Specialization", join(v.specializations)], ["City", join(v.cities)], ["Region", join(v.regions)], ["Sub-Region", join(v.subRegions)], ["Locality", join(v.localities)], ["Project / Property", join(v.projects)]] },
    { label: "Compliance", step: 4, rows: [["Registration State", v.reraState], ["Firm / Individual RERA No.", v.reraId + (reg.rera === "sample" ? " · Verified (sample)" : "")], ["GSTIN", v.gstin + (reg.gst === "sample" ? " · Verified (sample)" : "")], ["PAN (From GSTIN)", pan], ...docs.map((d) => [d.name.replace(" Certificate", ""), d.status] as [string, string])] },
  ];
  const opt = (id: string, title: string, sub: string, children: React.ReactNode) => (
    <OptionalSection id={`firm-${id}`} title={title} sub={sub} open={!!open[id]} onToggle={() => setOpen((o) => ({ ...o, [id]: !o[id] }))}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </OptionalSection>
  );

  return (
    <StepFormLayout
      steps={steps}
      current={step}
      onStep={setStep}
      busy={save.isPending}
      backLabel={step === 0 ? "Cancel" : "Back"}
      onBack={() => {
        if (step > 0) return setStep(step - 1);
        setV(saved);
        toast("Unsaved changes discarded.");
      }}
      nextLabel={step === steps.length - 1 ? "Done" : "Continue"}
      onNext={() => (step === steps.length - 1 ? persist(() => setStep(0)) : setStep(step + 1))}
      preview={
        <LivePreview
          title={v.name || "Your Firm Name"}
          titleMuted={!v.name}
          sub={[v.type, v.since && `Since ${v.since}`].filter(Boolean).join(" · ") || "Firm type"}
          line={[v.primaryMobile && `+91 ${v.primaryMobile}`, v.primaryEmail].filter(Boolean).join(" · ")}
          tags={[
            { label: reg.rera === "sample" ? "RERA Verified (sample)" : "RERA", on: reg.rera === "sample" },
            { label: reg.gst === "sample" ? "GST Verified (sample)" : "GST", on: reg.gst === "sample" },
            ...(v.propertyTypes.length ? v.propertyTypes.map((p) => ({ label: p, on: true })) : [{ label: "Property Type", on: false }]),
            { label: v.cities[0] || "Location", on: !!v.cities[0] },
          ]}
          sections={sections}
          onEdit={setStep}
        />
      }
    >
      {step === 0 && (
        <>
          <FormGroup title="Basics" onSaveExit={() => persist()}>
            <TextField className="sm:col-span-2" label="Firm Name" required value={v.name} onChange={set("name")} placeholder="Enter firm name" error={!v.name.trim() ? "Add the firm name." : undefined} />
            <TilesField className="sm:col-span-2" label="Firm Type" required options={FIRM_TYPES} value={v.type} onChange={(t) => set("type")(t as string)} />
            <SelectField label="Operating Since" value={v.since} onChange={set("since")} options={YEARS} placeholder="Select year" />
            <TextField label="Website" value={v.website} onChange={set("website")} placeholder="www.yourfirm.in" />
          </FormGroup>
          <FormGroup title="Branding">
            <FileField label="Firm Logo" value={v.logo} onChange={set("logo")} hint="Upload square logo, 512px min" />
            <FileField label="Cover Image" value={v.cover} onChange={set("cover")} hint="Upload 1600 × 600 cover" />
            <TextField className="sm:col-span-2" label="Tagline" value={v.tagline} onChange={set("tagline")} placeholder="One line, under 60 characters" />
            <TextField label="Brand Colour" value={v.brandColour} onChange={set("brandColour")} placeholder="#000000" aside="Used on brochures and shared listings" />
          </FormGroup>
        </>
      )}
      {step === 1 && (
        <>
          <FormGroup title="Primary Contact" onSaveExit={() => persist()}>
            <SelectField label="Name" required value={v.primaryContact} onChange={set("primaryContact")} options={people} />
            <TextField label="Designation" value={v.primaryDesignation} onChange={set("primaryDesignation")} placeholder="e.g. Founder" />
            <TextField label="Contact No." required prefix="+91" inputMode="numeric" value={v.primaryMobile} onChange={set("primaryMobile")} placeholder="Enter contact no." error={v.primaryMobile && !validMobile(v.primaryMobile) ? "Enter a valid 10-digit mobile number." : undefined} />
            <TextField label="Email" required type="email" value={v.primaryEmail} onChange={set("primaryEmail")} placeholder="Enter email ID" error={v.primaryEmail && !validEmail(v.primaryEmail) ? "Enter a valid email address." : undefined} />
          </FormGroup>
          {opt(
            "secondary",
            "Secondary Contact",
            "Backup person for clients and Rezide. Optional",
            <>
              <SelectField label="Name" value={v.secondaryContact} onChange={set("secondaryContact")} options={people} />
              <TextField label="Designation" value={v.secondaryDesignation} onChange={set("secondaryDesignation")} />
              <TextField label="Contact No." prefix="+91" inputMode="numeric" value={v.secondaryMobile} onChange={set("secondaryMobile")} placeholder="Enter contact no." />
              <TextField label="Email" type="email" value={v.secondaryEmail} onChange={set("secondaryEmail")} placeholder="Enter email ID" />
            </>,
          )}
          <FormGroup title="Registered Office">
            <TextField className="sm:col-span-2" label="Address Line" required value={v.address} onChange={set("address")} />
            <TextField label="Locality" value={v.locality} onChange={set("locality")} />
            <TextField label="City" value={v.city} onChange={set("city")} />
            <TextField label="State" value={v.state} onChange={set("state")} />
            <TextField label="PIN Code" inputMode="numeric" value={v.pincode} onChange={set("pincode")} />
          </FormGroup>
          {opt(
            "branch",
            "Branch Office",
            "Add another office location. Optional",
            <>
              <TextField className="sm:col-span-2" label="Address Line" value={v.branchAddress} onChange={set("branchAddress")} placeholder="Enter address" />
              <TextField label="City" value={v.branchCity} onChange={set("branchCity")} placeholder="Enter city" />
              <TextField label="PIN Code" inputMode="numeric" value={v.branchPincode} onChange={set("branchPincode")} placeholder="400000" />
            </>,
          )}
        </>
      )}
      {step === 2 && (
        <>
          <FormGroup title="About" onSaveExit={() => persist()}>
            <TextAreaField className="sm:col-span-2" label="About Us" value={v.about} onChange={set("about")} placeholder="Describe your firm" aside={`${v.about.length} / 1000`} maxLength={1000} />
          </FormGroup>
          {opt(
            "social",
            "Social Media",
            "Instagram, LinkedIn, Facebook, YouTube. Optional",
            <>
              <TextField label="Instagram" value={v.instagram} onChange={set("instagram")} placeholder="instagram.com/handle" />
              <TextField label="LinkedIn" value={v.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/company/…" />
              <TextField label="Facebook" value={v.facebook} onChange={set("facebook")} placeholder="facebook.com/page" />
              <TextField label="YouTube" value={v.youtube} onChange={set("youtube")} placeholder="youtube.com/@channel" />
              <TextField label="X" value={v.x} onChange={set("x")} placeholder="x.com/handle" />
            </>,
          )}
        </>
      )}
      {step === 3 && (
        <>
          <FormGroup title="What" onSaveExit={() => persist()}>
            <TilesField className="sm:col-span-2" label="Property Types" required multi options={PROPERTY_TYPES} value={v.propertyTypes} onChange={(x) => set("propertyTypes")(x as string[])} />
            <ChipsField className="sm:col-span-2" label="Specialization" multi options={SPECS} value={v.specializations} onChange={(x) => set("specializations")(x as string[])} />
          </FormGroup>
          <FormGroup title="Where">
            <TagsField label="City" required options={COVERAGE.cities} value={v.cities} onChange={set("cities")} />
            <TagsField label="Region" options={COVERAGE.regions} value={v.regions} onChange={set("regions")} />
            <TagsField label="Sub-Region" options={COVERAGE.subRegions} value={v.subRegions} onChange={set("subRegions")} />
            <TagsField label="Locality" options={COVERAGE.localities} value={v.localities} onChange={set("localities")} />
            <TagsField className="sm:col-span-2" label="Project / Property" options={COVERAGE.projects} value={v.projects} onChange={set("projects")} />
          </FormGroup>
        </>
      )}
      {step === 4 && (
        <>
          <FormGroup title="RERA" onSaveExit={() => persist()}>
            <SelectField className="sm:col-span-2" label="Registration State" value={v.reraState} onChange={set("reraState")} options={RERA_STATES} />
            <RegistryField label="Firm / Individual RERA No." required kind="rera" sample="rera" value={v.reraId} onChange={set("reraId")} state={reg.rera} setState={(s) => setReg((r) => ({ ...r, rera: s }))} />
          </FormGroup>
          <FormGroup title="GST">
            <RegistryField label="GSTIN" required kind="gst" sample="gst" value={v.gstin} onChange={set("gstin")} state={reg.gst} setState={(s) => setReg((r) => ({ ...r, gst: s }))} />
            <TextField label="PAN (From GSTIN)" value={pan} onChange={() => {}} disabled />
          </FormGroup>
          <FormGroup title="Documents" className="sm:grid-cols-1">
            <ul className="flex flex-col gap-2">
              {docs.map((d) => (
                <li key={d.name} className="flex items-center gap-3 rounded-[12px] border border-[#E0E0E0] px-3.5 py-3">
                  <Icon name="file-text" size={18} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <b className="text-sm font-semibold">{d.name}</b>
                    <span className="truncate text-xs text-rez-graphite">{d.meta}</span>
                  </span>
                  {d.status === "Required" ? (
                    <label className="cursor-pointer rounded-[8px] border border-black px-3 py-1.5 text-[11px] font-bold tracking-[0.06em] uppercase focus-within:ring-[3px] focus-within:ring-rez-mocaccino/40 hover:bg-black/5">
                      Upload
                      <input type="file" className="sr-only" onChange={(e) => e.target.files?.[0] && setCheque(e.target.files[0].name)} />
                    </label>
                  ) : (
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", d.status.startsWith("Verified") ? "text-rez-timber" : "text-rez-graphite")}>
                      {d.status.startsWith("Verified") && <Icon name="shield-check" size={12} />}
                      {d.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-[13px] font-semibold underline underline-offset-4 focus-within:ring-[3px] focus-within:ring-rez-mocaccino/40">
              <Icon name="plus" size={14} /> Attach Other Document
              <input type="file" className="sr-only" onChange={(e) => e.target.files?.[0] && setExtraDocs((x) => [...x, e.target.files![0].name])} />
            </label>
            <p className="text-xs text-rez-graphite">Documents are not uploaded in this prototype; only the file name is recorded.</p>
          </FormGroup>
        </>
      )}
    </StepFormLayout>
  );
}

export function FirmProfilePage() {
  const q = useQuery(dq.firm());
  return (
    <>
      <PageHeader crumbs={["Admin", "Manage Account"]} title="Firm Profile" />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isPending ? <Loading /> : <FirmForm key={q.dataUpdatedAt} saved={q.data} />}
    </>
  );
}

/* ---------- My profile ---------- */

function MeForm({ saved, firm }: { saved: MyProfile; firm?: FirmProfile }) {
  const save = useSaveMe();
  const [v, setV] = useState(saved);
  const [step, setStep] = useStepState(4);
  const [rera, setRera] = useState<VerifyState>("sample");
  const set = <K extends keyof MyProfile>(k: K) => (val: MyProfile[K]) => setV((x) => ({ ...x, [k]: val }));
  const persist = (then?: () => void) => {
    const problems = [!v.firstName.trim() && "first name", !v.lastName.trim() && "last name", !validMobile(v.mobile) && "contact number", !validEmail(v.email) && "email"].filter(Boolean);
    if (problems.length) return toast.error(`Check the ${problems.join(", ")} before saving.`);
    save.mutate(v, { onSuccess: () => (toast.success("Your profile is saved.", { description: "Saved in this demo session only." }), then?.()) });
  };
  const steps = ["Personal", "About", "KYC", "Operations"];
  const opts = (k: "cities" | "regions" | "subRegions" | "localities" | "projects") => Array.from(new Set([...(firm?.[k] ?? []), ...v[k]]));
  const sections: PreviewSection[] = [
    { label: "Personal", step: 0, rows: [["Profile Photo", v.photo], ["Salutation", v.salutation], ["Operating Since", v.since], ["First Name", v.firstName], ["Last Name", v.lastName], ["Contact No.", v.mobile && `+91 ${v.mobile}`], ["Email ID", v.email]] },
    { label: "About", step: 1, rows: [["Languages Spoken", join(v.languages)], ["About Me", short(v.about)]] },
    { label: "KYC", step: 2, rows: [["Aadhaar No.", v.aadhaar], ["Aadhaar Copy", v.aadhaarFile], ["RERA Agent No.", v.reraId + (rera === "sample" ? " · Verified (sample)" : "")]] },
    { label: "Operations", step: 3, rows: [["Specialization", join(v.specializations)], ["City", join(v.cities)], ["Region", join(v.regions)], ["Sub-Region", join(v.subRegions)], ["Locality", join(v.localities)], ["Project / Property", join(v.projects)]] },
  ];
  return (
    <StepFormLayout
      steps={steps}
      current={step}
      onStep={setStep}
      busy={save.isPending}
      backLabel={step === 0 ? "Cancel" : "Back"}
      onBack={() => {
        if (step > 0) return setStep(step - 1);
        setV(saved);
        toast("Unsaved changes discarded.");
      }}
      nextLabel={step === steps.length - 1 ? "Done" : "Continue"}
      onNext={() => (step === steps.length - 1 ? persist(() => setStep(0)) : setStep(step + 1))}
      preview={
        <LivePreview
          title={[v.salutation, v.firstName, v.lastName].filter(Boolean).join(" ") || "Your Name"}
          sub={`Admin · ${firm?.name ?? "Buildstone Realty LLP"}`}
          line={[v.mobile && `+91 ${v.mobile}`, v.email].filter(Boolean).join(" · ")}
          tags={[{ label: rera === "sample" ? "RERA Verified (sample)" : "RERA", on: rera === "sample" }, ...v.languages.map((l) => ({ label: l, on: true })), { label: v.cities[0] || "Location", on: !!v.cities[0] }]}
          sections={sections}
          onEdit={setStep}
        />
      }
    >
      {step === 0 && (
        <FormGroup title="Personal" onSaveExit={() => persist()}>
          <FileField className="sm:col-span-2" label="Profile Photo" value={v.photo} onChange={set("photo")} hint="Upload a square photo" />
          <SelectField label="Salutation" required value={v.salutation} onChange={set("salutation")} options={["Mr.", "Ms.", "Mrs.", "Dr."]} />
          <SelectField label="Operating Since" value={v.since} onChange={set("since")} options={YEARS} />
          <TextField label="First Name" required value={v.firstName} onChange={set("firstName")} error={!v.firstName.trim() ? "Add your first name." : undefined} />
          <TextField label="Last Name" required value={v.lastName} onChange={set("lastName")} error={!v.lastName.trim() ? "Add your last name." : undefined} />
          <TextField label="Contact No." required prefix="+91" inputMode="numeric" value={v.mobile} onChange={set("mobile")} error={v.mobile && !validMobile(v.mobile) ? "Enter a valid 10-digit mobile number." : undefined} />
          <TextField label="Email ID" required type="email" value={v.email} onChange={set("email")} error={v.email && !validEmail(v.email) ? "Enter a valid email address." : undefined} />
        </FormGroup>
      )}
      {step === 1 && (
        <FormGroup title="About" onSaveExit={() => persist()}>
          <ChipsField className="sm:col-span-2" label="Languages Spoken" multi options={LANGS} value={v.languages} onChange={(x) => set("languages")(x as string[])} />
          <TextAreaField className="sm:col-span-2" label="About Me" value={v.about} onChange={set("about")} placeholder="A short introduction for clients" aside={`${v.about.length} / 1000`} maxLength={1000} />
        </FormGroup>
      )}
      {step === 2 && (
        <FormGroup title="KYC" onSaveExit={() => persist()}>
          <TextField label="Aadhaar No." value={v.aadhaar} onChange={set("aadhaar")} placeholder="Enter Aadhaar No." />
          <FileField label="Aadhaar Copy" value={v.aadhaarFile} onChange={set("aadhaarFile")} hint="Attach file" />
          <RegistryField label="RERA Agent No." kind="rera" sample="merera" value={v.reraId} onChange={set("reraId")} state={rera} setState={setRera} />
        </FormGroup>
      )}
      {step === 3 && (
        <>
          <FormGroup title="What" onSaveExit={() => persist()}>
            <ChipsField className="sm:col-span-2" label="Specialization" multi options={firm?.specializations ?? SPECS} value={v.specializations} onChange={(x) => set("specializations")(x as string[])} />
          </FormGroup>
          <FormGroup title="Where">
            <TagsField label="City" required options={opts("cities")} value={v.cities} onChange={set("cities")} />
            <TagsField label="Region" options={opts("regions")} value={v.regions} onChange={set("regions")} />
            <TagsField label="Sub-Region" options={opts("subRegions")} value={v.subRegions} onChange={set("subRegions")} />
            <TagsField label="Locality" options={opts("localities")} value={v.localities} onChange={set("localities")} />
            <TagsField className="sm:col-span-2" label="Project / Property" options={opts("projects")} value={v.projects} onChange={set("projects")} />
          </FormGroup>
        </>
      )}
    </StepFormLayout>
  );
}

export function MyProfilePage() {
  const q = useQuery(dq.me());
  const firm = useQuery(dq.firm());
  return (
    <>
      <PageHeader crumbs={["Admin", "Manage Account"]} title="My Profile" />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isPending ? <Loading /> : <MeForm key={q.dataUpdatedAt} saved={q.data} firm={firm.data} />}
    </>
  );
}
