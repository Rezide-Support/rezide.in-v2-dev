"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/brand/icon";
import { ChoiceChips } from "@/components/common/choice-chips";
import { DemoNotice } from "@/components/common/feedback";
import { Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { PhoneInput } from "@/components/common/phone-input";
import { Segmented } from "@/components/common/segmented";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { projectQueries, realtorQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ListingCategory, ListingDraft, ListingIntent } from "@/types/models";
import { CATEGORY_UNITS, LISTING_CITIES, amountInWords } from "./schema";
import { PriceAnalysisDialog } from "./price-analysis";
import { useLocationOptions } from "./use-location-options";

export type StepProps = {
  draft: ListingDraft;
  update: (patch: Partial<ListingDraft>) => void;
  errors: Record<string, string>;
};

/** A labelled question whose control is a chip group or other composite. */
export function Question({
  label,
  required,
  optional,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  children: (ids: { describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const errorId = error ? `${id}-err` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-3" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="text-sm font-semibold">
        {label}
        {required && <span className="text-destructive" aria-hidden> *</span>}
        {optional && <span className="font-normal text-rez-graphite"> (optional)</span>}
      </span>
      {hint && (
        <span id={hintId} className="-mt-1.5 text-xs text-rez-graphite">
          {hint}
        </span>
      )}
      {children({ describedBy: [hintId, errorId].filter(Boolean).join(" ") || undefined, invalid: !!error })}
      {error && (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="border-t border-rez-smoke pt-6 text-lg font-semibold first:border-t-0 first:pt-0">{children}</h3>
);

/* ---------------- 1. Profile ---------------- */
export function ProfileStep({ draft, update, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <Question label="For this listing I am" required error={errors.role}>
        {(a) => (
          <ChoiceChips
            label="For this listing I am"
            options={["Property Owner", "Contact Person", "POA Holder"].map((v) => ({ value: v, label: v }))}
            value={draft.role}
            onChange={(v) => update({ role: v as ListingDraft["role"] })}
            invalid={a.invalid}
            describedBy={a.describedBy}
          />
        )}
      </Question>
      {draft.role && draft.role !== "Property Owner" && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Owner name" required error={errors.ownerName}>
            <Input value={draft.ownerName ?? ""} onChange={(e) => update({ ownerName: e.target.value })} placeholder="Registered owner" />
          </Field>
          <Field label="Owner mobile" optional error={errors.ownerMobile}>
            <PhoneInput value={draft.ownerMobile ?? ""} onChange={(v) => update({ ownerMobile: v })} />
          </Field>
        </div>
      )}
      {draft.role === "POA Holder" && (
        <DemoNotice>The POA document is requested during verification. Document upload isn’t connected in this prototype.</DemoNotice>
      )}
      <Question label="Property is in city" required error={errors.city}>
        {(a) => (
          <ChoiceChips
            label="Property is in city"
            options={LISTING_CITIES.map((c) => ({ value: c, label: c }))}
            value={draft.city}
            onChange={(v) => update({ city: v as string, locality: undefined })}
            invalid={a.invalid}
            describedBy={a.describedBy}
          />
        )}
      </Question>
    </div>
  );
}

/* ---------------- 2. Property type ---------------- */
const CATEGORY_ICONS: Record<ListingCategory, Parameters<typeof Icon>[0]["name"]> = {
  home: "map-pin",
  office: "file-text",
  industrial: "settings",
  retail: "bag",
  land: "compass",
};

export function TypeStep({ draft, update, errors }: StepProps) {
  const cat = draft.category;
  return (
    <div className="flex flex-col gap-6">
      <Question label="Property type" required error={errors.category}>
        {(a) => (
          <ChoiceChips
            label="Property type"
            size="lg"
            options={(Object.keys(CATEGORY_UNITS) as ListingCategory[]).map((c) => ({
              value: c,
              label: CATEGORY_UNITS[c].label,
              icon: <Icon name={CATEGORY_ICONS[c]} size={20} />,
            }))}
            value={cat}
            onChange={(v) => update({ category: v as ListingCategory, unitType: undefined })}
            invalid={a.invalid}
            describedBy={a.describedBy}
          />
        )}
      </Question>
      {cat && (
        <div className="border-t border-rez-smoke pt-5">
          <Question label={`${CATEGORY_UNITS[cat].label} unit type`} required error={errors.unitType}>
            {(a) => (
              <ChoiceChips
                label={`${CATEGORY_UNITS[cat].label} unit type`}
                options={CATEGORY_UNITS[cat].units.map((u) => ({ value: u, label: u }))}
                value={draft.unitType}
                onChange={(v) => update({ unitType: v as string })}
                invalid={a.invalid}
                describedBy={a.describedBy}
              />
            )}
          </Question>
        </div>
      )}
    </div>
  );
}

/* ---------------- 3. Property ---------------- */
const pick = (label: string, value: string | undefined, onChange: (v: string) => void, opts: string[], extra?: { required?: boolean; optional?: boolean; error?: string }) => (
  <Field label={label} required={extra?.required} optional={extra?.optional} error={extra?.error}>
    <NativeSelect size="lg" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select</option>
      {opts.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </NativeSelect>
  </Field>
);
const nums = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));

export function PropertyStep({ draft, update, errors }: StepProps) {
  const city = draft.city ?? "Mumbai";
  const [q, setQ] = useState("");
  const projects = useQuery(projectQueries.search({ city, q, status: [], localities: [], budget: [], years: [], views: [], page: 1, perPage: 36 }));
  const isLand = draft.category === "land";
  const listId = useId();
  const location = useLocationOptions(city, draft.region, draft.subRegion);

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>Project / property</SectionTitle>
      {draft.projectName ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-black p-5">
          <div className="flex flex-col gap-1">
            <b className="text-lg font-semibold">{draft.projectName}</b>
            <span className="text-[13px] text-rez-graphite">
              {draft.projectSource === "rezide" ? "From Rezide projects" : "Entered manually"} · {draft.locality ?? city}
            </span>
          </div>
          <button type="button" className="text-[13px] font-semibold underline underline-offset-[3px]" onClick={() => update({ projectName: undefined, projectSource: undefined })}>
            Change
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-rez-smoke">
          <label className="flex h-[52px] items-center gap-2.5 border-b border-rez-smoke px-[18px]">
            <Icon name="search" size={18} />
            <span className="sr-only">Search Rezide projects in {city}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Rezide projects"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none"
            />
          </label>
          <ul className="max-h-[264px] overflow-y-auto">
            {projects.data?.items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() =>
                    update({
                      projectName: p.name,
                      projectSource: "rezide",
                      locality: draft.locality || p.locality,
                      address: draft.address || `${p.name}, ${p.locality}, ${p.city}`,
                    })
                  }
                  className="flex w-full items-center gap-3.5 border-b border-rez-smoke px-[18px] py-3.5 text-left hover:bg-rez-cloud"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rez-cloud text-xs font-bold">
                    {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <b className="text-[15px] font-semibold">{p.name}</b>
                    <span className="text-[13px] text-rez-graphite">
                      {p.developer} · {p.locality}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-rez-graphite">Rezide project</span>
                </button>
              </li>
            ))}
            {projects.data && projects.data.items.length === 0 && (
              <li className="px-[18px] py-7 text-center text-sm text-rez-graphite">
                No Rezide projects match. Continue with the address below.
              </li>
            )}
            {projects.isPending && <li className="px-[18px] py-7 text-center text-sm text-rez-graphite">Loading projects…</li>}
            {projects.isError && !projects.data && (
              <li className="px-[18px] py-7 text-center text-sm text-rez-graphite">
                Rezide projects couldn’t be loaded.{" "}
                <button type="button" className="font-semibold underline" onClick={() => projects.refetch()}>
                  Try again
                </button>{" "}
                or continue with the address below.
              </li>
            )}
          </ul>
        </div>
      )}
      <Field label="Property address" required error={errors.address}>
        <Textarea rows={2} maxLength={250} value={draft.address ?? ""} onChange={(e) => update({ address: e.target.value })} placeholder="Building, street, landmark" />
      </Field>

      <SectionTitle>Location</SectionTitle>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="City" hint="From step 1">
          <Input value={city} readOnly disabled />
        </Field>
        {pick("Region", draft.region, (v) => update({ region: v || undefined, subRegion: undefined }), location.regions, { optional: true })}
        {pick("Sub-region", draft.subRegion, (v) => update({ subRegion: v || undefined }), location.subRegions, { optional: true })}
        <Field label="Locality" required error={errors.locality} hint="Pick from the list or type your own.">
          <Input list={listId} value={draft.locality ?? ""} onChange={(e) => update({ locality: e.target.value })} autoComplete="off" placeholder="Select or type locality" />
        </Field>
        <datalist id={listId}>
          {location.localities.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        <Field label="Pincode" optional error={errors.pincode}>
          <Input inputMode="numeric" maxLength={6} value={draft.pincode ?? ""} onChange={(e) => update({ pincode: e.target.value.replace(/\D/g, "") })} placeholder="6-digit pincode" />
        </Field>
      </div>

      {!isLand && (
        <>
          <SectionTitle>Tower and unit</SectionTitle>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Tower / Wing" optional>
              <Input value={draft.tower ?? ""} onChange={(e) => update({ tower: e.target.value })} placeholder="e.g. Tower B" />
            </Field>
            <Field label="Total floors" optional error={errors.totalFloors}>
              <Input inputMode="numeric" value={draft.totalFloors ?? ""} onChange={(e) => update({ totalFloors: e.target.value.replace(/\D/g, "") })} placeholder="e.g. 32" />
            </Field>
            <Field label="Unit no." required error={errors.unitNo}>
              <Input value={draft.unitNo ?? ""} onChange={(e) => update({ unitNo: e.target.value })} placeholder="e.g. 1702" />
            </Field>
            <Field label="Unit on floor" optional error={errors.floor}>
              <Input inputMode="numeric" value={draft.floor ?? ""} onChange={(e) => update({ floor: e.target.value.replace(/\D/g, "") })} placeholder="e.g. 17" />
            </Field>
          </div>
          <SectionTitle>Building details</SectionTitle>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {pick("Project status", draft.projectStatus, (v) => update({ projectStatus: v }), ["Ready to Move", "Under Construction", "New Launch"], { required: true, error: errors.projectStatus })}
            {pick(
              draft.projectStatus === "Under Construction" ? "Possession timeline" : "Age of property",
              draft.propertyAge,
              (v) => update({ propertyAge: v }),
              draft.projectStatus === "Under Construction"
                ? ["< 1 year", "1 – 2 years", "2 – 3 years", "3+ years"]
                : ["< 1 year", "1 – 3 years", "3 – 5 years", "5 – 10 years", "10 – 20 years", "20+ years"],
              { optional: true },
            )}
            {pick("Property type", draft.buildingType, (v) => update({ buildingType: v }), ["Gated Amenities", "Gated No Amenities", "Standalone", "Standalone No Amenities"], { required: true, error: errors.buildingType })}
            {pick("Plot area", draft.plotArea, (v) => update({ plotArea: v }), ["Under 1 acre", "1 – 2 acres", "2 – 5 acres", "5 – 10 acres", "10 – 25 acres", "25+ acres"], { optional: true })}
            {pick("Passenger lifts", draft.passengerLifts, (v) => update({ passengerLifts: v }), nums(0, 12), { optional: true })}
            {pick("Service lifts", draft.serviceLifts, (v) => update({ serviceLifts: v }), nums(0, 6), { optional: true })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Rupee amount box. Field clones its id / aria-* props onto this component, so they
 * land on the real <input> (label association, error announcement, focus on error).
 */
function AmountInput({
  value,
  onChange,
  words,
  id,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
  "aria-required": required,
}: {
  value: string | undefined;
  onChange: (digits: string) => void;
  words: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
}) {
  const wordsId = id ? `${id}-words` : undefined;
  return (
    <span className="flex h-[54px] items-center gap-2.5 rounded-full border border-rez-smoke bg-white pr-2 pl-5 focus-within:border-rez-mocaccino has-[[aria-invalid=true]]:border-destructive">
      <span className="text-base font-semibold" aria-hidden>
        ₹
      </span>
      <input
        id={id}
        inputMode="numeric"
        value={value ? Number(value).toLocaleString("en-IN") : ""}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
        placeholder="Enter amount"
        className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none"
        aria-invalid={invalid}
        aria-required={required}
        aria-describedby={[describedBy, words ? wordsId : undefined].filter(Boolean).join(" ") || undefined}
      />
      {words && (
        <span id={wordsId} className="rounded-full bg-rez-cloud px-3 py-2 text-[13px] font-semibold">
          {words}
        </span>
      )}
    </span>
  );
}

/* ---------------- 4. Commercials ---------------- */
export function CommercialsStep({ draft, update, errors }: StepProps) {
  const [analysis, setAnalysis] = useState<"unit" | "config" | null>(null);
  const rent = draft.intent === "rent";
  const words = amountInWords(draft.price);
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>Pricing and commercials</SectionTitle>
      <Question label="I want to" required error={errors.intent} hint="Pre-filled from when you started. You can change it.">
        {() => (
          <Segmented
            label="I want to"
            appearance="accent"
            size="lg"
            value={draft.intent ?? ("" as ListingIntent)}
            onChange={(v) => update({ intent: v })}
            options={[
              { value: "sell", label: "To Sell" },
              { value: "rent", label: "To Rent Out" },
            ]}
            itemClassName="min-w-[100px]"
            className="self-start"
          />
        )}
      </Question>
      <Field label={rent ? "Monthly rent" : "Sale price"} required error={errors.price}>
        <AmountInput value={draft.price} onChange={(price) => update({ price })} words={words ? `₹ ${words}${rent ? " / mo" : ""}` : ""} />
      </Field>
      {draft.price && draft.category === "home" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col items-start gap-4 rounded-2xl bg-black px-5 py-[18px] text-rez-full-white">
            <div className="flex items-start gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rez-mocaccino text-black">
                <Icon name="bar-chart" size={20} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[15px] font-semibold">See how your price compares before you publish.</span>
                <span className="text-[13px] opacity-80">Illustrative sample analysis; registered transaction data isn’t connected yet.</span>
              </span>
            </div>
            <button type="button" onClick={() => setAnalysis("unit")} className="h-11 rounded-full bg-rez-full-white px-[22px] text-sm font-semibold text-black hover:bg-white">
              View price analysis
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["unit", "Similar units · same area"],
                ["config", "Similar config · same BHK"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAnalysis(id)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-black px-4 text-sm font-semibold hover:bg-rez-cloud"
              >
                {label}
                <Icon name="arrow-right" size={14} />
              </button>
            ))}
          </div>
        </div>
      )}
      <SectionTitle>Visit</SectionTitle>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {(
          [
            ["visitDays", "Visit days", ["Everyday", "Weekdays", "Weekends", "By appointment"]],
            ["visitFrom", "From", ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "16:00"]],
            ["visitTo", "To", ["14:00", "16:00", "18:00", "19:00", "20:00", "21:00"]],
            ["visitNotice", "Notice needed", ["Same day", "2 hours", "1 day", "2 days"]],
            ["keys", "Keys / occupancy", ["Vacant · Keys with owner", "Vacant · Keys with broker", "Owner occupied", "Tenant occupied"]],
          ] as const
        ).map(([k, l, opts]) => (
          <Fragment key={k}>{pick(l, draft[k], (v) => update({ [k]: v }), [...opts], { optional: true })}</Fragment>
        ))}
      </div>
      <PriceAnalysisDialog
        key={analysis ?? "closed"}
        open={analysis !== null}
        initialTab={analysis ?? "unit"}
        onOpenChange={(o) => !o && setAnalysis(null)}
        draft={draft}
        onChangePrice={() => update({ price: "" })}
      />
    </div>
  );
}

/* ---------------- 5. Realtor assist ---------------- */
export function AssistStep({ draft, update, errors }: StepProps) {
  const city = draft.city ?? "Mumbai";
  const realtors = useQuery(realtorQueries.search({ city, by: "name", q: "", specializations: [], locality: "", language: "", gender: "" }));
  const all = useQuery({
    ...realtorQueries.search({ city: "Mumbai", by: "name", q: "", specializations: [], locality: "", language: "", gender: "" }),
    enabled: realtors.isSuccess && realtors.data.length === 0,
  });
  const list = (realtors.data?.length ? realtors.data : all.data) ?? [];
  const selected = draft.realtorIds ?? [];
  const loc = draft.locality ?? "";
  const ranked = [...list].sort((a, b) => Number(b.localities.includes(loc)) - Number(a.localities.includes(loc)));
  const unit = draft.unitType ?? "Apartment";

  return (
    <div className="flex flex-col gap-6">
      <Question label="Do you want a realtor to assist you?" required error={errors.assist}>
        {(a) => (
          <ChoiceChips
            label="Do you want a realtor to assist you?"
            tone="accent"
            size="lg"
            options={[
              { value: "yes", label: "Yes, assist me" },
              { value: "no", label: "No, I will manage" },
            ]}
            value={draft.assist}
            onChange={(v) => update({ assist: v as "yes" | "no", ...(v === "no" ? { realtorIds: [], handover: undefined } : {}) })}
            invalid={a.invalid}
            describedBy={a.describedBy}
          />
        )}
      </Question>
      {draft.assist === "yes" && (
        <>
          <Question
            label={`Realtors matched to your listing${draft.unitType ? ` for ${draft.unitType}` : ""}${loc ? ` in ${loc}` : " near you"}.`}
            required
            error={errors.realtorIds}
            hint={`Connect up to 3 max. ${selected.length} selected.${list.length && realtors.data?.length === 0 ? ` No realtors listed in ${city}; showing Mumbai.` : ""}`}
          >
            {(a) => (
              <ul aria-describedby={a.describedBy} className="flex flex-col gap-3">
                {(realtors.isPending || (all.isFetching && !all.data)) && (
                  <li className="py-6 text-center text-sm text-rez-graphite">Loading realtors…</li>
                )}
                {(realtors.isError || all.isError) && !list.length && (
                  <li className="rounded-[18px] border border-rez-smoke px-4 py-6 text-center text-sm text-rez-graphite">
                    Realtors couldn’t be loaded.{" "}
                    <button type="button" className="font-semibold underline" onClick={() => (realtors.isError ? realtors.refetch() : all.refetch())}>
                      Try again
                    </button>{" "}
                    or choose “No, I will manage”.
                  </li>
                )}
                {ranked.map((r) => {
                  const on = selected.includes(r.id);
                  const disabled = !on && selected.length >= 3;
                  const active = r.localities.includes(loc);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={disabled}
                        onClick={() => update({ realtorIds: on ? selected.filter((x) => x !== r.id) : [...selected, r.id] })}
                        className={cn(
                          "relative flex w-full items-center gap-4 rounded-[18px] border-[1.5px] bg-white p-4 pr-12 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          on ? "border-black shadow-rez-sm" : "border-rez-smoke hover:border-rez-graphite",
                        )}
                      >
                        <span className="relative size-[68px] shrink-0 overflow-hidden rounded-full bg-rez-cloud">
                          <Image src={r.photo} alt="" fill sizes="68px" quality={70} className="object-cover object-top" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <b className="text-base font-semibold">{r.name}</b>
                          <span className="text-[13px] text-rez-graphite">{r.firm}</span>
                          <span className="flex flex-wrap gap-x-2.5 text-xs text-rez-graphite">
                            {r.rating ? (
                              <span>
                                ★ <b className="font-semibold text-black">{r.rating}</b>
                              </span>
                            ) : null}
                            {r.deals ? (
                              <span>
                                <b className="font-semibold text-black">{r.deals}</b> deals
                              </span>
                            ) : null}
                            {r.reraId && <span>RERA registered</span>}
                          </span>
                          <span className="text-xs font-medium text-rez-mocaccino-ink">
                            {active ? `Active in ${loc}` : `Covers ${r.localities.slice(0, 2).join(", ")}`} · {unit} specialist · {draft.intent === "rent" ? "Rentals" : "Resale"}
                          </span>
                        </span>
                        <span
                          aria-hidden
                          className={cn(
                            "absolute top-3 right-3 flex size-[22px] items-center justify-center rounded-full border-[1.5px]",
                            on ? "border-black bg-black text-rez-full-white" : "border-rez-steel bg-white",
                          )}
                        >
                          {on && <Icon name="check" size={13} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Question>
          {selected.length > 0 && (
            <Question label="How would you like to continue?" required error={errors.handover}>
              {(a) => (
                <div
                  role="radiogroup"
                  aria-label="How would you like to continue?"
                  aria-invalid={a.invalid || undefined}
                  aria-describedby={a.describedBy}
                  className="grid grid-cols-1 gap-2.5 md:grid-cols-2"
                >
                  {(
                    [
                      ["self", "Continue listing myself", "Finish the remaining steps now. Your realtor joins once it goes live."],
                      ["realtor", "Hand over to my realtor", "Your selected realtor completes the details, photos and video for you."],
                    ] as const
                  ).map(([id, t, d]) => {
                    const on = draft.handover === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => update({ handover: id })}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border-[1.5px] px-[18px] py-4 text-left",
                          on ? "border-black bg-rez-cloud" : "border-rez-smoke bg-white hover:border-rez-graphite",
                        )}
                      >
                        <span aria-hidden className={cn("mt-px size-5 shrink-0 rounded-full", on ? "border-[6px] border-black" : "border-[1.5px] border-rez-steel")} />
                        <span className="flex flex-col gap-1">
                          <b className="text-[15px] font-semibold">{t}</b>
                          <span className="text-[13px] leading-snug text-rez-graphite">{d}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Question>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- 6. Unit details ---------------- */
const DIRECTIONS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];

export function UnitStep({ draft, update, errors }: StepProps) {
  const isHome = draft.category === "home";
  const isLand = draft.category === "land";
  const sel = (k: keyof ListingDraft, label: string, opts: string[], required = false) => (
    <Fragment key={k}>{pick(label, draft[k] as string | undefined, (v) => update({ [k]: v }), opts, { required, optional: !required, error: errors[k as string] })}</Fragment>
  );
  const area = (
    <Field key="area" label={isLand ? "Plot area" : "Area"} required error={errors.area}>
      <Input inputMode="decimal" value={draft.area ?? ""} onChange={(e) => update({ area: e.target.value.replace(/[^\d.]/g, "") })} placeholder={isLand ? "e.g. 2,400" : "e.g. 1,250"} />
    </Field>
  );
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>Unit details</SectionTitle>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {isLand
          ? [
              sel("plotType", "Plot type", ["Residential", "Commercial", "Industrial", "Agricultural"], true),
              area,
              sel("areaUnit", "Unit", ["sq.ft.", "sq.yd.", "acres"]),
              sel("facing", "Facing", DIRECTIONS),
              sel("roadWidth", "Road width", ["20 ft", "30 ft", "40 ft", "60 ft+"]),
            ]
          : [
              isHome && sel("configuration", "Configuration", ["Studio", "1 RK", "1 BHK", "1.5 BHK", "2 BHK", "2.5 BHK", "3 BHK", "3.5 BHK", "4 BHK", "5 BHK", "5+ BHK"], true),
              area,
              sel("areaType", "Type", ["Carpet", "Usable Carpet", "Built-up", "Super Built-up"], true),
              sel("areaUnit", "Unit", ["sq.ft.", "sq.m.", "sq.yd."]),
              isHome && sel("bathrooms", "Bath", nums(1, 6), true),
              isHome && sel("balconies", "Balcony", nums(0, 5)),
              isHome && sel("furnishing", "Furnishing", ["Fully Furnished", "Semi Furnished", "Unfurnished"], true),
              sel("flooring", "Flooring", ["Vitrified Tile", "Marble", "Italian Marble", "Wooden", "Granite"]),
              sel("heightFt", "Height ft", ["8 Ft", "9 Ft", "10 Ft", "11 Ft", "12 Ft+"]),
              sel("heightIn", "Inch", ["0 Inch", "3 Inch", "6 Inch", "9 Inch"]),
              sel("facing", "Main door exit", DIRECTIONS),
              sel("vastu", "Vastu", ["Excellent", "Good", "Average", "Not compliant"]),
              sel("viewType", "View type", ["Sea", "City Skyline", "Garden", "Clubhouse", "Pool", "Road", "Internal"]),
              sel("unitFacing", "Unit facing", DIRECTIONS),
              sel("ventilation", "Ventilation", ["Excellent", "Good", "Moderate", "Poor"]),
              sel("naturalLight", "Natural light", ["Bright", "Good", "Moderate", "Dim"]),
              sel("parkingType", "Parking type", ["Covered", "Open", "Stilt", "Podium", "Mechanical", "None"]),
              sel("parking", "Parking", nums(0, 4)),
            ]}
      </div>
    </div>
  );
}

/* ---------------- 7. Key features ---------------- */
export function FeaturesStep({ draft, update, errors }: StepProps) {
  const isLand = draft.category === "land";
  return (
    <div className="flex flex-col gap-6">
      <Question label="Key features" optional>
        {(a) => (
          <ChoiceChips
            multiple
            label="Key features"
            describedBy={a.describedBy}
            options={(isLand
              ? ["Corner Plot", "Road Facing", "Gated Layout", "Near Highway", "Clear Title", "Water Connection"]
              : ["Sea View", "Corner Unit", "High Floor", "Vastu Compliant", "Natural Light", "Cross Ventilation", "Modular Kitchen", "Gated Community", "Near Metro", "Pet Friendly"]
            ).map((v) => ({ value: v, label: v }))}
            value={draft.features}
            onChange={(v) => update({ features: v as string[] })}
          />
        )}
      </Question>
      {!isLand && (
        <Question label="Building amenities" optional>
          {(a) => (
            <ChoiceChips
              multiple
              label="Building amenities"
              describedBy={a.describedBy}
              options={["Lift", "Power Backup", "Security", "Clubhouse", "Swimming Pool", "Gym", "Garden", "Kids Play Area"].map((v) => ({ value: v, label: v }))}
              value={draft.amenities}
              onChange={(v) => update({ amenities: v as string[] })}
            />
          )}
        </Question>
      )}
      <Field label="What makes this property special" optional error={errors.highlights} hint="Two or three sentences buyers should know.">
        <Textarea rows={4} maxLength={500} value={draft.highlights ?? ""} onChange={(e) => update({ highlights: e.target.value })} />
      </Field>
    </div>
  );
}

/* ---------------- 8. Photos ---------------- */
export function PhotosStep({ draft, update }: StepProps) {
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);
  const inputId = useId();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-relaxed text-rez-graphite">
        The first photo becomes the cover. Listings with 8 or more photos tend to get more enquiries.
      </p>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-rez-smoke px-6 py-10 text-center hover:border-black focus-within:border-rez-mocaccino"
      >
        <Icon name="file-upload" size={28} />
        <span className="text-[15px] font-semibold">Choose photos</span>
        <span className="text-[13px] text-rez-graphite">JPG or PNG. Living room, kitchen, bedrooms, view, exterior and floor plan.</span>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, 20);
            setPreviews(files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })));
            update({ photoNames: files.map((f) => f.name) });
          }}
        />
      </label>
      {previews.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {previews.map((p, i) => (
            <li key={p.url} className="flex flex-col gap-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-rez-cloud">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimisable */}
                <img src={p.url} alt={`Selected photo ${i + 1}: ${p.name}`} className="size-full object-cover" />
              </div>
              <span className="truncate text-[13px] text-rez-graphite">{i === 0 ? "Cover · " : ""}{p.name}</span>
            </li>
          ))}
        </ul>
      ) : draft.photoNames?.length ? (
        <p className="text-sm text-rez-graphite">Previously selected: {draft.photoNames.join(", ")}. Choose them again to preview.</p>
      ) : null}
      <DemoNotice>Photos are previewed in your browser only. Upload to Rezide storage isn’t connected in this prototype.</DemoNotice>
    </div>
  );
}

/* ---------------- 9. Video ---------------- */
export function VideoStep({ draft, update, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-relaxed text-rez-graphite">A 60 to 90 second walk-through. Buyers can then request a video call with you.</p>
      <Field label="YouTube or Google Drive link" optional error={errors.videoUrl}>
        <Input type="url" inputMode="url" placeholder="https://" value={draft.videoUrl ?? ""} onChange={(e) => update({ videoUrl: e.target.value })} />
      </Field>
    </div>
  );
}

/* ---------------- 10. Furniture & fixtures ---------------- */
export function FurnitureStep({ draft, update }: StepProps) {
  const groups: [keyof ListingDraft, string, string[]][] = [
    ["furniture", "Furniture", ["Sofa", "Bed", "Wardrobe", "Dining Table", "TV Unit", "Study Table", "Shoe Rack", "Curtains"]],
    ["appliances", "Appliances", ["AC", "Refrigerator", "Washing Machine", "Microwave", "Geyser", "Water Purifier", "Chimney", "TV"]],
    ["fixtures", "Fixtures", ["Modular Kitchen", "False Ceiling", "Wooden Flooring", "Light Fittings", "Fans", "Smart Locks"]],
  ];
  return (
    <div className="flex flex-col gap-6">
      {groups.map(([k, label, opts]) => (
        <Question key={k} label={label} optional>
          {(a) => (
            <ChoiceChips
              multiple
              label={label}
              describedBy={a.describedBy}
              options={opts.map((v) => ({ value: v, label: v }))}
              value={draft[k] as string[] | undefined}
              onChange={(v) => update({ [k]: v })}
            />
          )}
        </Question>
      ))}
    </div>
  );
}
