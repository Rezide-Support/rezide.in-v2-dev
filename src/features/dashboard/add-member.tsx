"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { dq, useAddMember, type TeamData } from "./api";
import { ChipsField, FileField, OptionalSection, SelectField, TagsField, TextField, TilesField } from "./form-bits";
import { SPECS } from "./profiles";
import { FormGroup, LivePreview, StepFormLayout, type PreviewSection } from "./step-form";
import { Card, Loading, PageHeader } from "./ui";

const EMPTY = { role: "", salutation: "Mr.", firstName: "", lastName: "", mobile: "", email: "", aadhaar: "", aadhaarFile: "", rera: "", teams: [] as string[], reportsTo: "", specs: [] as string[], cities: [] as string[], regions: [] as string[], subRegions: [] as string[], localities: [] as string[], projects: [] as string[] };
type Values = typeof EMPTY;

const STEPS = ["Role", "Details", "Team", "Operations"];

function Form({ data, initialTeam }: { data: TeamData; initialTeam?: string }) {
  const router = useRouter();
  const firm = useQuery(dq.firm());
  const add = useAddMember();
  const [v, setV] = useState<Values>({ ...EMPTY, teams: initialTeam ? [initialTeam] : [] });
  const [step, setStepRaw] = useState(0);
  const [kycOpen, setKycOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Values>(k: K) => (val: Values[K]) => setV((x) => ({ ...x, [k]: val }));
  const setStep = (i: number) => (setStepRaw(i), window.scrollTo({ top: 0, behavior: "smooth" }));
  const left = Math.max(0, data.seatsTotal - data.members.length);
  const owner = data.members.find((m) => m.role === "admin")?.name ?? "Admin";
  const managers = data.members.filter((m) => m.role === "manager").map((m) => m.name);
  const f = firm.data;
  const teamNames = data.teams.map((t) => t.name);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!v.role) e.role = "Pick a role.";
    if (!v.firstName.trim()) e.firstName = "Add a first name.";
    if (!v.lastName.trim()) e.lastName = "Add a last name.";
    if (!/^[6-9]\d{9}$/.test(v.mobile.replace(/\D/g, ""))) e.mobile = "Enter a valid 10-digit mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Enter a valid email address.";
    if (!v.teams.length) e.teams = "Pick at least one team.";
    if (!v.cities.length) e.cities = "Pick at least one city.";
    setErrors(e);
    if (Object.keys(e).length) {
      const first = e.role ? 0 : e.firstName || e.lastName || e.mobile || e.email ? 1 : e.teams ? 2 : 3;
      setStep(first);
      toast.error("Please complete the required fields.");
      return false;
    }
    return true;
  };

  const finish = () => {
    if (left === 0) return toast.error(`All ${data.seatsTotal} licenses are in use.`);
    if (!validate()) return;
    const d = v.mobile.replace(/\D/g, "");
    const name = `${v.firstName.trim()} ${v.lastName.trim()}`;
    add.mutate(
      {
        name,
        role: v.role === "Manager" ? "manager" : "agent",
        teamIds: data.teams.filter((t) => v.teams.includes(t.name)).map((t) => t.id),
        areas: [...v.localities, ...v.subRegions].slice(0, 2).join(", ") || "Not set",
        email: v.email.trim(),
        phone: `+91 ${d.slice(0, 5)} ${d.slice(5)}`,
        reportsTo: v.reportsTo || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${name} added. ${left - 1} ${left - 1 === 1 ? "license" : "licenses"} left.`, { description: "Added to this demo session only. No invite was sent." });
          router.push("/dashboard/teams");
        },
      },
    );
  };

  const join = (a: string[]) => a.join(", ");
  const sections: PreviewSection[] = [
    { label: "Role", step: 0, rows: [["Role", v.role]] },
    { label: "Details", step: 1, rows: [["Salutation", v.salutation], ["Email", v.email], ["First Name", v.firstName], ["Last Name", v.lastName], ["Contact No.", v.mobile && `+91 ${v.mobile}`], ["Aadhaar No.", v.aadhaar], ["Aadhaar Copy", v.aadhaarFile], ["RERA Agent No.", v.rera]] },
    { label: "Team", step: 2, rows: [["Teams", join(v.teams)], ["Reporting To", v.reportsTo]] },
    { label: "Operations", step: 3, rows: [["Specialization", join(v.specs)], ["City", join(v.cities)], ["Region", join(v.regions)], ["Sub-Region", join(v.subRegions)], ["Locality", join(v.localities)], ["Project / Property", join(v.projects)]] },
  ];
  const nm = [v.firstName, v.lastName].filter(Boolean).join(" ");
  const saveExit = () => {
    toast("Drafts aren’t saved in this prototype.", { description: "Finish the steps and choose Add Member to add them." });
  };

  return (
    <StepFormLayout
      steps={STEPS}
      current={step}
      onStep={setStep}
      busy={add.isPending}
      backLabel={step === 0 ? "Cancel" : "Back"}
      onBack={() => (step === 0 ? router.push("/dashboard/teams") : setStep(step - 1))}
      nextLabel={step === STEPS.length - 1 ? "Add Member" : "Continue"}
      onNext={() => (step === STEPS.length - 1 ? finish() : setStep(step + 1))}
      preview={
        <LivePreview
          title={nm ? `${v.salutation} ${nm}` : "New Member Name"}
          titleMuted={!nm}
          sub={[v.role, join(v.teams)].filter(Boolean).join(" · ") || "Role · Team"}
          line={[v.mobile && `+91 ${v.mobile}`, v.email].filter(Boolean).join(" · ")}
          tags={[
            { label: v.role || "Role", on: !!v.role },
            ...(v.teams.length ? v.teams.map((t) => ({ label: t, on: true })) : [{ label: "Team", on: false }]),
            ...(v.specs.length ? v.specs.map((t) => ({ label: t, on: true })) : [{ label: "Specialization", on: false }]),
            { label: v.localities[0] || v.subRegions[0] || "Location", on: !!(v.localities[0] || v.subRegions[0]) },
          ]}
          sections={sections}
          onEdit={setStep}
        />
      }
    >
      {step === 0 && (
        <FormGroup title="Role" onSaveExit={saveExit}>
          <div className="flex items-center justify-between gap-4 rounded-[12px] bg-[#F4F4F4] px-4 py-3 sm:col-span-2">
            <span className="flex flex-col">
              <b className="text-sm font-semibold">{left === 0 ? "No licenses left" : `${left} ${left === 1 ? "license" : "licenses"} available`}</b>
              <span className="text-xs text-rez-graphite">{left <= 1 ? "Adding this member uses your last license." : `Adding this member uses 1 license. ${left - 1} will remain.`}</span>
            </span>
            <span className="text-sm text-rez-graphite">
              <b className="text-3xl font-semibold text-black">{left}</b> / {data.seatsTotal}
            </span>
          </div>
          <TilesField
            className="sm:col-span-2"
            label="Role"
            required
            wide
            value={v.role}
            onChange={(r) => (set("role")(r as string), setErrors((e) => ({ ...e, role: "" })))}
            options={[
              { label: "Agent", desc: "Works own leads, listings and site visits. Sees only what is assigned." },
              { label: "Manager", desc: "Leads a team. Assigns leads and sees the team pipeline and reports." },
            ]}
          />
          {errors.role && <p className="text-xs font-medium text-destructive sm:col-span-2">{errors.role}</p>}
        </FormGroup>
      )}
      {step === 1 && (
        <>
          <FormGroup title="Who" onSaveExit={saveExit}>
            <SelectField label="Salutation" value={v.salutation} onChange={set("salutation")} options={["Mr.", "Ms.", "Mrs.", "Dr."]} />
            <TextField label="Email" required type="email" value={v.email} onChange={set("email")} placeholder="name@buildstone.in" error={errors.email} />
            <TextField label="First Name" required value={v.firstName} onChange={set("firstName")} placeholder="Enter first name" error={errors.firstName} />
            <TextField label="Last Name" required value={v.lastName} onChange={set("lastName")} placeholder="Enter last name" error={errors.lastName} />
            <TextField label="Contact No." required prefix="+91" inputMode="numeric" value={v.mobile} onChange={set("mobile")} placeholder="Enter contact no." error={errors.mobile} />
          </FormGroup>
          <OptionalSection id="am-kyc" title="KYC & RERA" sub="Aadhaar, documents, RERA no. Optional" open={kycOpen} onToggle={() => setKycOpen((o) => !o)}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Aadhaar No." value={v.aadhaar} onChange={set("aadhaar")} placeholder="Enter Aadhaar No." aside={`${v.aadhaar.replace(/\D/g, "").length}/12`} inputMode="numeric" />
              <FileField label="Aadhaar Copy" value={v.aadhaarFile} onChange={set("aadhaarFile")} hint="Attach file" />
              <TextField className="sm:col-span-2" label="RERA Agent No." value={v.rera} onChange={set("rera")} placeholder="A519000XXXXX" />
            </div>
          </OptionalSection>
        </>
      )}
      {step === 2 && (
        <FormGroup title="Team" onSaveExit={saveExit}>
          <ChipsField className="sm:col-span-2" label="Teams" required multi aside="Pick one or more" options={teamNames} value={v.teams} onChange={(x) => set("teams")(x as string[])} />
          {errors.teams && <p className="text-xs font-medium text-destructive sm:col-span-2">{errors.teams}</p>}
          <SelectField label="Reporting To" value={v.reportsTo} onChange={set("reportsTo")} options={[owner, ...managers]} />
        </FormGroup>
      )}
      {step === 3 && (
        <>
          <FormGroup title="What" onSaveExit={saveExit}>
            <ChipsField className="sm:col-span-2" label="Specialization" multi options={f?.specializations ?? SPECS} value={v.specs} onChange={(x) => set("specs")(x as string[])} />
          </FormGroup>
          <FormGroup title="Where">
            <TagsField label="City" required options={f?.cities ?? []} value={v.cities} onChange={set("cities")} />
            <TagsField label="Region" options={f?.regions ?? []} value={v.regions} onChange={set("regions")} />
            <TagsField label="Sub-Region" options={f?.subRegions ?? []} value={v.subRegions} onChange={set("subRegions")} />
            <TagsField label="Locality" options={f?.localities ?? []} value={v.localities} onChange={set("localities")} />
            <TagsField className="sm:col-span-2" label="Project / Property" options={f?.projects ?? []} value={v.projects} onChange={set("projects")} />
            {errors.cities && <p className="text-xs font-medium text-destructive sm:col-span-2">{errors.cities}</p>}
          </FormGroup>
        </>
      )}
    </StepFormLayout>
  );
}

export function AddMemberPage() {
  const params = useSearchParams();
  const q = useQuery(dq.team());
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (q.isPending) return <Loading />;
  const teamName = q.data.teams.find((t) => t.id === params.get("team"))?.name;
  const full = q.data.members.length >= q.data.seatsTotal;
  return (
    <>
      <PageHeader crumbs={["Admin", "Manage Teams"]} title="Add Member" />
      {full ? (
        <Card className="flex max-w-xl flex-col items-start gap-3 p-6">
          <b className="text-lg">All {q.data.seatsTotal} licenses are in use.</b>
          <p className="text-sm text-rez-graphite">Buy more licenses or remove a member to free a seat.</p>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/dashboard/teams">Back to Teams</Link>
            </Button>
            <Button asChild>
              <Link href="/realtor-corner#pricing">Buy Licenses</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Form data={q.data} initialTeam={teamName} />
      )}
    </>
  );
}
