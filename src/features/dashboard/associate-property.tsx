"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/brand/icon";
import { EmptyState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { CRM_UNIT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CrmPropertyType } from "@/types/dashboard";
import { dq, useUpdateContact } from "./api";
import { displayName } from "./contact-model";
import { inputCls } from "./form-bits";
import { Card, Loading, PageHeader } from "./ui";

const STEPS = ["Property Type", "Project", "Building & Unit", "Association"];
const RELATIONS = [
  ["Current Owner", "Owns the unit today"],
  ["Previous Owner", "Sold or transferred the unit"],
  ["Current Tenant", "Renting the unit now"],
  ["Previous Tenant", "Rented the unit earlier"],
] as const;

type Project = { id: string; name: string; locality: string; towers?: string[]; source: "Rezide" | "Manual" };

function Choice({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn("rounded-full border px-4 py-2 text-[13px] font-medium", on ? "border-black bg-black text-rez-full-white" : "border-rez-smoke bg-white hover:border-black", className)}
    >
      {children}
    </button>
  );
}

export function AssociatePropertyPage({ id }: { id: string }) {
  const router = useRouter();
  const contact = useQuery(dq.contact(id));
  const update = useUpdateContact();
  const [step, setStep] = useState(0);
  const [ptype, setPtype] = useState("");
  const [utype, setUtype] = useState("");
  const [src, setSrc] = useState<"rz" | "manual">("rz");
  const [q, setQ] = useState("");
  const [proj, setProj] = useState<Project | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualLoc, setManualLoc] = useState("");
  const [tower, setTower] = useState("");
  const [unit, setUnit] = useState("");
  const [unitIn, setUnitIn] = useState("");
  const [mTower, setMTower] = useState("");
  const [mUnit, setMUnit] = useState("");
  const [rel, setRel] = useState("");
  const projects = useQuery({
    ...dq.associableProjects({ propertyType: ptype as CrmPropertyType, unitType: utype, q: q.trim() }),
    enabled: step === 1 && src === "rz" && !!ptype && !!utype,
    placeholderData: keepPreviousData,
  });
  const units = useQuery({
    ...dq.associableUnits(proj?.id ?? "", tower),
    enabled: proj?.source === "Rezide" && !!tower,
  });

  if (contact.isError)
    return <EmptyState icon="user" title="Contact not found." className="bg-white" action={<Link href="/dashboard/contacts" className="font-semibold underline">Back to contacts</Link>} />;
  if (contact.isPending) return <Loading />;
  const c = contact.data;
  const back = `/dashboard/contacts/${id}?tab=props`;
  const isRz = proj?.source === "Rezide";
  const unitVal = isRz ? unit : [mTower.trim(), mUnit.trim()].filter(Boolean).join(" - ");
  const ok = [!!(ptype && utype), !!proj, isRz ? !!unit : !!mUnit.trim(), !!rel][step];
  const results = projects.data ?? [];
  const summary = [step > 0 && ptype, step > 0 && utype, step > 1 && proj?.name, step > 2 && unitVal].filter(Boolean) as string[];

  const confirm = () => {
    if (!proj) return;
    const rec = { id: `x${Date.now()}`, unit: unitVal, project: proj.name, relation: rel, locality: proj.locality, propertyType: ptype, unitType: utype, source: proj.source };
    update.mutate(
      { id, properties: [...c.properties, rec] },
      {
        onSuccess: () => {
          toast.success(`${unitVal}, ${proj.name} linked as ${rel}.`, { description: "Saved in this demo session." });
          router.push(back);
        },
      },
    );
  };

  return (
    <>
      <PageHeader crumbs={["Contact", "All Contacts"]} title="Associate Property" />
      <Card className="flex w-full max-w-[880px] flex-col gap-6 p-5 md:p-7">
        <ol className="grid grid-cols-4 gap-2" aria-label="Steps">
          {STEPS.map((l, i) => {
            const done = i < step;
            const cur = i === step;
            return (
              <li key={l} className="flex flex-col items-center gap-2 text-center">
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => setStep(i)}
                  aria-current={cur ? "step" : undefined}
                  aria-label={`${l}${done ? ", completed. Go back to this step" : cur ? ", current step" : ""}`}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2",
                    done ? "border-black bg-black text-rez-full-white" : cur ? "border-white bg-black ring-[3px] ring-black" : "border-rez-smoke bg-white",
                  )}
                >
                  {done && <Icon name="check" size={16} />}
                </button>
                <span className={cn("text-xs", cur ? "font-bold" : "font-semibold", done || cur ? "text-black" : "text-rez-graphite")}>{l}</span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{STEPS[step]}</h2>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-rez-graphite">
            <Icon name="user" size={14} /> For {displayName(c)}
          </span>
        </div>
        {summary.length > 0 && (
          <ul className="-mt-3 flex flex-wrap gap-1.5" aria-label="Chosen so far">
            {summary.map((s) => (
              <li key={s} className="rounded-[6px] bg-[#F0EAE2] px-2.5 py-1 text-xs font-semibold">
                {s}
              </li>
            ))}
          </ul>
        )}

        {step === 0 && (
          <div className="flex flex-col gap-5">
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-[13px] font-semibold">Property Type *</legend>
              <div role="radiogroup" className="flex flex-wrap gap-2">
                {(Object.keys(CRM_UNIT_TYPES) as CrmPropertyType[]).map((t) => (
                  <Choice key={t} on={ptype === t} onClick={() => (setPtype(t), t !== ptype && setUtype(""), setProj(null))}>
                    {t}
                  </Choice>
                ))}
              </div>
            </fieldset>
            {ptype && (
              <fieldset className="flex flex-col gap-2.5">
                <legend className="mb-2.5 text-[13px] font-semibold">Unit Type *</legend>
                <div role="radiogroup" className="flex flex-wrap gap-2">
                  {CRM_UNIT_TYPES[ptype as CrmPropertyType].map((t) => (
                    <Choice key={t} on={utype === t} onClick={() => (setUtype(t), setProj(null))}>
                      {t}
                    </Choice>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <span className="text-[13px] font-semibold">Project / Property *</span>
            <div role="tablist" aria-label="Search source" className="inline-flex w-fit gap-1 rounded-[8px] border border-rez-smoke p-1">
              {(
                [
                  ["rz", "Rezide"],
                  ["manual", "Not on Rezide"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" role="tab" aria-selected={src === v} onClick={() => (setSrc(v), setQ(""))} className={cn("h-8 rounded-[6px] px-3.5 text-[13px] font-medium", src === v ? "bg-black text-rez-full-white" : "hover:bg-[#F4F4F4]")}>
                  {l}
                </button>
              ))}
            </div>
            {src === "rz" ? (
              <>
                <label className="flex h-[42px] items-center gap-2 rounded-[8px] border border-rez-smoke px-3.5 focus-within:border-black">
                  <Icon name="search" size={16} />
                  <span className="sr-only">Search projects</span>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${utype.toLowerCase()} projects on Rezide`} className="flex-1 bg-transparent text-sm outline-none" />
                </label>
                <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Projects">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={proj?.id === p.id}
                        onClick={() => {
                          setProj({ id: p.id, name: p.name, locality: p.locality, towers: p.towers, source: "Rezide" });
                          setTower("");
                          setUnit("");
                          setUnitIn("");
                          setStep(2);
                        }}
                        className={cn("flex w-full items-center gap-3 rounded-[12px] border px-3.5 py-3 text-left hover:border-black", proj?.id === p.id ? "border-black bg-rez-cream-warm" : "border-[#E0E0E0]")}
                      >
                        <span className="flex size-9 items-center justify-center rounded-[8px] bg-black text-rez-full-white">
                          <Icon name="compass" size={16} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <b className="text-sm font-semibold">{p.name}</b>
                          <span className="truncate text-xs text-rez-graphite">
                            {p.developer} · {p.locality}
                          </span>
                        </span>
                        <span className="text-xs text-rez-graphite">
                          {p.towers.length} {p.towers.length === 1 ? "building" : "buildings"}
                        </span>
                      </button>
                    </li>
                  ))}
                  {projects.isPending ? (
                    <li className="py-6 text-center text-sm text-rez-graphite">Loading projects…</li>
                  ) : projects.isError && !projects.data ? (
                    <li className="flex items-center justify-center gap-3 py-6 text-sm text-rez-graphite">
                      Projects couldn’t be loaded.
                      <Button variant="secondary" size="sm" onClick={() => projects.refetch()}>
                        Retry
                      </Button>
                    </li>
                  ) : (
                    results.length === 0 && <li className="py-6 text-center text-sm text-rez-graphite">No projects found.</li>
                  )}
                </ul>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="rounded-[8px] bg-[#F4F4F4] px-3.5 py-2.5 text-[13px] text-rez-arsenic">Address search (Google) isn’t connected in this prototype. Enter the building yourself.</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-[13px] font-semibold">
                    Building / Society name *
                    <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. Sea Breeze CHS" className={cn(inputCls, "font-normal")} />
                  </label>
                  <label className="flex flex-col gap-2 text-[13px] font-semibold">
                    Locality
                    <input value={manualLoc} onChange={(e) => setManualLoc(e.target.value)} placeholder="e.g. Andheri West" className={cn(inputCls, "font-normal")} />
                  </label>
                </div>
                <Button
                  variant="secondary"
                  className="w-fit"
                  disabled={!manualName.trim()}
                  onClick={() => {
                    setProj({ id: `m-${manualName}`, name: manualName.trim(), locality: manualLoc.trim() || "—", source: "Manual" });
                    setMTower("");
                    setMUnit("");
                    setStep(2);
                  }}
                >
                  Use this building
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 2 && proj && (
          <div className="flex flex-col gap-5">
            {isRz ? (
              <>
                <fieldset>
                  <legend className="mb-2.5 text-[13px] font-semibold">Building / Tower *</legend>
                  <div role="radiogroup" className="flex flex-wrap gap-2">
                    {proj.towers!.map((t) => (
                      <Choice key={t} on={tower === t} onClick={() => (setTower(t), setUnit(""), setUnitIn(""))}>
                        {t}
                      </Choice>
                    ))}
                  </div>
                </fieldset>
                {tower && (
                  <fieldset>
                    <legend className="mb-2.5 text-[13px] font-semibold">Unit *</legend>
                    {units.isPending && <p className="mb-2.5 text-[13px] text-rez-graphite">Loading units…</p>}
                    {units.isError && (
                      <p className="mb-2.5 flex items-center gap-3 text-[13px] text-rez-graphite">
                        Units couldn’t be loaded. Enter the unit number below, or
                        <Button variant="secondary" size="sm" onClick={() => units.refetch()}>
                          Retry
                        </Button>
                      </p>
                    )}
                    <div role="radiogroup" className="flex flex-wrap gap-2">
                      {(units.data ?? []).map((u) => {
                        const val = `${tower} - ${u}`;
                        return (
                          <Choice key={u} on={unit === val && !unitIn} onClick={() => (setUnit(val), setUnitIn(""))}>
                            {val}
                          </Choice>
                        );
                      })}
                    </div>
                    <label className="mt-3 flex max-w-sm flex-col gap-2 text-[13px] font-semibold">
                      Unit not listed?
                      <input
                        value={unitIn}
                        onChange={(e) => {
                          setUnitIn(e.target.value);
                          setUnit(e.target.value.trim() ? `${tower} - ${e.target.value.trim()}` : "");
                        }}
                        placeholder="Enter unit no."
                        className={cn(inputCls, "font-normal")}
                      />
                    </label>
                  </fieldset>
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-[13px] font-semibold">
                  Building / Tower / Wing
                  <input value={mTower} onChange={(e) => setMTower(e.target.value)} placeholder="e.g. Tower B" className={cn(inputCls, "font-normal")} />
                </label>
                <label className="flex flex-col gap-2 text-[13px] font-semibold">
                  Unit No. *
                  <input value={mUnit} onChange={(e) => setMUnit(e.target.value)} placeholder="e.g. 1204" className={cn(inputCls, "font-normal")} />
                </label>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <fieldset>
            <legend className="mb-2.5 text-[13px] font-semibold">How is this contact associated? *</legend>
            <div role="radiogroup" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {RELATIONS.map(([l, d]) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={rel === l}
                  onClick={() => setRel(l)}
                  className={cn("flex flex-col items-start gap-1 rounded-[12px] border px-4 py-3 text-left", rel === l ? "border-black bg-black text-rez-full-white" : "border-rez-smoke hover:border-black")}
                >
                  <b className="text-sm font-semibold">{l}</b>
                  <span className={cn("text-xs", rel === l ? "text-rez-full-white/80" : "text-rez-graphite")}>{d}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid grid-cols-2 gap-3 border-t border-[#E8E8E8] pt-5">
          {step === 0 ? (
            <Button asChild variant="secondary" className="h-12 text-[13px] font-bold tracking-[0.08em] uppercase">
              <Link href={back}>Cancel</Link>
            </Button>
          ) : (
            <Button variant="secondary" className="h-12 text-[13px] font-bold tracking-[0.08em] uppercase" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button className="h-12 text-[13px] font-bold tracking-[0.08em] uppercase" disabled={!ok || update.isPending} onClick={() => (step === 3 ? confirm() : setStep(step + 1))}>
            {step === 3 ? "Associate Property" : "Continue"}
          </Button>
        </div>
      </Card>
    </>
  );
}
