"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Relative } from "@/types/dashboard";
import { RELATIONS } from "./contact-fields";
import { Avatar, DashSelect, WhatsAppLink } from "./ui";

const EMPTY = { firstName: "", lastName: "", relation: "", mobile: "", email: "", dob: "", status: "Active" as Relative["status"] };
const inputClass = "h-10 w-full rounded-[8px] border border-rez-smoke bg-white px-3 text-sm outline-none focus:border-black placeholder:text-rez-space";

/** Family & relatives list with an inline add form. */
export function RelativesEditor({ value, onChange }: { value: Relative[]; onChange: (v: Relative[]) => void }) {
  const [draft, setDraft] = useState<typeof EMPTY | null>(null);
  const [error, setError] = useState("");
  const upd = (p: Partial<typeof EMPTY>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const save = () => {
    if (!draft) return;
    if (!draft.firstName.trim() || !draft.relation) return setError("Add a first name and relationship.");
    const digits = draft.mobile.replace(/\D/g, "");
    if (digits && !/^[6-9]\d{9}$/.test(digits)) return setError("Enter a valid 10-digit mobile number, or leave it blank.");
    const rec: Relative = { ...draft, firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), mobile: digits ? `${digits.slice(0, 5)} ${digits.slice(5)}` : "", id: `r${Date.now()}` };
    onChange([...value, rec]);
    toast.success(`${rec.firstName} added as ${rec.relation}.`);
    setDraft(null);
    setError("");
  };

  return (
    <div className="flex flex-col gap-2.5">
      {value.map((r) => {
        const name = [r.firstName, r.lastName].filter(Boolean).join(" ");
        return (
          <div key={r.id} className="flex items-center gap-3 rounded-[12px] border border-[#E0E0E0] px-3.5 py-3">
            <Avatar name={name} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <b className="font-semibold">{name}</b>
                <span className="rounded-[6px] bg-[#F0EAE2] px-2 py-0.5 text-[11px] font-semibold">{r.relation}</span>
                <span className={cn("text-xs", r.status === "Active" ? "text-rez-timber" : "text-rez-graphite")}>{r.status}</span>
              </span>
              <span className="flex flex-wrap gap-x-3 text-xs text-rez-graphite">
                <span>{r.mobile ? `+91 ${r.mobile}` : "No mobile"}</span>
                {r.email && (
                  <a href={`mailto:${r.email}`} className="text-black hover:underline">
                    {r.email}
                  </a>
                )}
                {r.dob && <span>DOB {r.dob}</span>}
              </span>
            </div>
            {r.mobile && <WhatsAppLink mobile={r.mobile} name={name} />}
            <button type="button" onClick={() => onChange(value.filter((x) => x.id !== r.id))} aria-label={`Remove ${name}`} title="Remove relative" className="flex size-8 items-center justify-center rounded-full hover:bg-[#F4F4F4]">
              <Icon name="x" size={16} />
            </button>
          </div>
        );
      })}
      {value.length === 0 && !draft && <p className="text-sm text-rez-graphite">No family contacts added yet.</p>}
      {draft ? (
        <fieldset className="flex flex-col gap-3 rounded-[12px] border border-black bg-rez-cream-warm p-4">
          <legend className="sr-only">Add relative</legend>
          <b className="text-sm">Add Relative</b>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Relationship *
              <DashSelect value={draft.relation} onChange={(e) => upd({ relation: e.target.value })} className="h-10 font-normal">
                <option value="">Select relationship</option>
                {RELATIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </DashSelect>
            </label>
            <div className="flex flex-col gap-1.5 text-[13px] font-semibold">
              <span id="rel-status">Status</span>
              <div role="radiogroup" aria-labelledby="rel-status" className="flex gap-2">
                {(["Active", "Not Active"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    role="radio"
                    aria-checked={draft.status === st}
                    onClick={() => upd({ status: st })}
                    className={cn("inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium", draft.status === st ? "border-black bg-black text-rez-full-white" : "border-rez-smoke bg-white")}
                  >
                    {draft.status === st && <Icon name="check-circle" size={13} />}
                    {st}
                  </button>
                ))}
              </div>
            </div>
            {(
              [
                ["firstName", "First Name *", "Enter first name"],
                ["lastName", "Last Name", "Enter last name"],
                ["mobile", "Mobile No.", "Mobile number"],
                ["email", "Email ID", "Enter email"],
                ["dob", "Date of Birth", "DD / MM / YYYY"],
              ] as const
            ).map(([k, label, ph]) => (
              <label key={k} className="flex flex-col gap-1.5 text-[13px] font-semibold">
                {label}
                <span className="relative flex">
                  {k === "mobile" && <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-normal text-rez-graphite">+91</span>}
                  <input value={draft[k]} onChange={(e) => upd({ [k]: e.target.value })} placeholder={ph} inputMode={k === "mobile" ? "numeric" : undefined} className={cn(inputClass, "font-normal", k === "mobile" && "pl-11")} />
                </span>
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="h-9 px-5 font-bold tracking-[0.06em] uppercase" onClick={() => (setDraft(null), setError(""))}>
              Cancel
            </Button>
            <Button size="sm" className="h-9 px-5 font-bold tracking-[0.06em] uppercase" onClick={save}>
              Save Relative
            </Button>
          </div>
        </fieldset>
      ) : (
        <Button variant="secondary" size="sm" className="h-9 w-fit px-4 font-bold tracking-[0.06em] uppercase" onClick={() => setDraft({ ...EMPTY })}>
          <Icon name="plus" size={14} /> Add Relative
        </Button>
      )}
    </div>
  );
}
