"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Icon } from "@/components/brand/icon";
import { FormError } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { AccountSidebar } from "@/features/account/account-sidebar";
import { errorMessage } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { submitListing } from "@/services/mutations";
import { useListingDraftStore } from "@/stores/listing-draft";
import { useSession } from "@/stores/session";
import type { ListingDraft } from "@/types/models";
import { CATEGORY_UNITS, STEP_TITLES, amountInWords, stepsFor, validateStep, type StepId } from "./schema";
import {
  AssistStep,
  CommercialsStep,
  FeaturesStep,
  FurnitureStep,
  PhotosStep,
  ProfileStep,
  PropertyStep,
  TypeStep,
  UnitStep,
  VideoStep,
  type StepProps,
} from "./steps";

const STEP_COMPONENTS: Record<StepId, (p: StepProps) => React.ReactNode> = {
  profile: ProfileStep,
  type: TypeStep,
  property: PropertyStep,
  commercials: CommercialsStep,
  assist: AssistStep,
  unit: UnitStep,
  features: FeaturesStep,
  photos: PhotosStep,
  video: VideoStep,
  furniture: FurnitureStep,
};

function Preview({ draft }: { draft: ListingDraft }) {
  const rent = draft.intent === "rent";
  const area = Number(draft.area) || 0;
  const price = Number(draft.price) || 0;
  const title = [draft.configuration, draft.unitType ?? "Property", draft.projectName ? `in ${draft.projectName}` : ""].filter(Boolean).join(" ");
  const specs = [
    [draft.configuration ?? "—", "Config"],
    [area ? formatNumber(area) : "—", "Sq ft"],
    [draft.floor ? `${draft.floor}${draft.totalFloors ? ` / ${draft.totalFloors}` : ""}` : "—", "Floor"],
    [draft.facing ?? "—", "Facing"],
    [draft.furnishing?.split(" ")[0] ?? "—", "Furnishing"],
    [rent ? "Rent" : draft.intent ? "Sale" : "—", "For"],
  ];
  return (
    <aside aria-label="Live preview" className="flex flex-col overflow-hidden rounded-xl bg-white xl:sticky xl:top-6">
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 border border-dashed border-rez-steel bg-rez-cloud px-4 text-center text-[13px] font-semibold text-rez-arsenic">
        <Icon name="file-upload" size={24} />
        {draft.photoNames?.length ? `Cover: ${draft.photoNames[0]}` : "Cover photo appears here"}
      </div>
      <div className="flex flex-col gap-3.5 px-[22px] pt-5 pb-6">
        <span className="eyebrow text-[10px] text-rez-graphite">Live preview</span>
        <div className="flex flex-col gap-1">
          <span className="text-2xl leading-none font-bold">{price ? `₹ ${amountInWords(draft.price)}${rent ? " / mo" : ""}` : "₹ —"}</span>
          <span className="text-[13px] text-rez-graphite">
            {price && area ? `₹ ${formatNumber(Math.round(price / area))} per sq ft${rent ? " / mo" : ""}` : "Rate per sq ft appears here"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-base leading-snug font-semibold">{title}</span>
          <span className="text-[13px] text-rez-graphite">
            {[draft.tower, draft.unitNo ? `Unit ${draft.unitNo}` : "", draft.locality || "Locality", draft.city || ""].filter(Boolean).join(", ")}
          </span>
        </div>
        <dl className="grid grid-cols-3 gap-x-1 gap-y-3 rounded-[14px] bg-rez-cloud px-1.5 py-3 text-center">
          {specs.map(([v, l]) => (
            <div key={l} className="flex flex-col-reverse gap-1">
              <dt className="text-[11px] text-rez-graphite">{l}</dt>
              <dd className="truncate text-sm leading-tight font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}

export function ListingWizard() {
  const { draft, step, completed, update, goTo, complete, reset } = useListingDraftStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [announce, setAnnounce] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const steps = stepsFor(draft);
  const current: StepId = steps.includes(step) ? step : steps[steps.length - 1];
  const index = steps.indexOf(current);
  const isLast = index === steps.length - 1;

  const { session } = useSession();
  const customer = session && session.user.role !== "realtor" ? session : null;
  const submit = useMutation({
    mutationFn: (values: ListingDraft) => {
      // The wizard only opens for a signed-in user; the session can still end while it's open.
      if (!session) throw new Error("Please sign in again to submit your listing.");
      return submitListing(values, session.user);
    },
  });

  const nextLabel = (() => {
    if (submit.isPending) return "Submitting…";
    if (current === "assist") {
      if (!draft.assist) return "Choose an option";
      if (draft.assist === "yes" && !draft.realtorIds?.length) return "Pick a realtor first";
      if (draft.assist === "yes" && !draft.handover) return "Choose an option";
    }
    if (isLast) return "Submit listing";
    return "Continue";
  })();

  const go = (target: StepId) => {
    setErrors({});
    goTo(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Move focus to the new step's heading for keyboard and screen-reader users.
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  };

  const next = () => {
    const errs = validateStep(current, draft);
    if (errs) {
      setErrors(errs);
      const n = Object.keys(errs).length;
      setAnnounce(`${n} ${n === 1 ? "field needs" : "fields need"} attention.`);
      requestAnimationFrame(() => {
        const invalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]");
        // A radio group itself isn't focusable; focus its roving-tabindex radio instead.
        const target = invalid?.matches("[role=radiogroup], [role=group]")
          ? invalid.querySelector<HTMLElement>("[tabindex='0'], button, input")
          : invalid;
        target?.focus();
      });
      return;
    }
    setErrors({});
    complete(current);
    if (isLast) {
      submit.mutate(draft);
    } else {
      go(steps[index + 1]);
    }
  };

  const firstIncomplete = steps.findIndex((s) => !completed.includes(s));
  const reachable = (i: number) => i <= (firstIncomplete === -1 ? steps.length - 1 : firstIncomplete);
  const pct = Math.round((steps.filter((s) => completed.includes(s)).length / steps.length) * 100);
  const Step = STEP_COMPONENTS[current];

  if (submit.isSuccess) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-5 px-4 py-20 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-rez-timber text-rez-full-white">
          <Icon name="check-circle" size={30} />
        </span>
        <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em]">
          {/* It reaches the Rezide team as a lead, so this mustn't claim a hand-over or a live listing. */}
          Request received.
        </h1>
        <p className="text-[15px] leading-relaxed text-rez-graphite">Our team will connect with you shortly.</p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Button asChild size="lg">
            <Link href="/account" onClick={() => reset()}>
              Go to my account
            </Link>
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              reset();
              submit.reset();
            }}
          >
            List another property
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f4f5f8] px-4 py-6 md:px-8 md:py-8">
      <div className={cn("mx-auto grid max-w-[1280px] items-start gap-6", customer && "lg:grid-cols-[240px_minmax(0,1fr)]")}>
      {customer && <AccountSidebar session={customer} active={customer.user.role === "owner" ? "listings" : undefined} className="hidden lg:sticky lg:top-6 lg:flex" />}
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-xl bg-white px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-xl font-semibold">List your property.</h2>
              <button
                type="button"
                className="text-[13px] font-semibold text-rez-graphite underline underline-offset-[3px] hover:text-black"
                onClick={() => {
                  if (window.confirm("Discard this draft and start again?")) {
                    reset();
                    setErrors({});
                  }
                }}
              >
                Discard draft
              </button>
            </div>
            <div className="flex min-w-[200px] items-center gap-2.5">
              <div
                role="progressbar"
                aria-label="Listing progress"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-rez-cloud"
              >
                <div className="h-full bg-rez-mocaccino transition-[width] duration-300 ease-rez" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-bold">{pct}%</span>
            </div>
          </div>
          <nav aria-label="Listing steps">
            <ol className="flex">
              {steps.map((s, i) => {
                const done = completed.includes(s) && s !== current;
                const isCurrent = s === current;
                const can = reachable(i) && !isCurrent;
                return (
                  <li key={s} className="relative flex min-w-0 flex-1 flex-col items-center">
                    {i < steps.length - 1 && (
                      <span
                        aria-hidden
                        className={cn("absolute top-4 left-1/2 h-0.5 w-full md:top-5", completed.includes(s) ? "bg-black" : "bg-rez-smoke")}
                      />
                    )}
                    <button
                      type="button"
                      disabled={!can}
                      onClick={() => go(s)}
                      aria-current={isCurrent ? "step" : undefined}
                      title={STEP_TITLES[s]}
                      className="relative z-10 flex min-w-0 flex-col items-center gap-2 rounded-lg px-0.5 disabled:cursor-default"
                    >
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full border-2 bg-white md:size-10",
                          isCurrent ? "border-black" : done ? "border-rez-smoke" : "border-rez-smoke",
                          can && "hover:border-black",
                        )}
                      >
                        {isCurrent ? (
                          <span className="size-5 rounded-full bg-black md:size-[26px]" />
                        ) : done ? (
                          <span className="flex size-5 items-center justify-center rounded-full bg-black text-rez-full-white md:size-[26px]">
                            <Icon name="check" size={12} />
                          </span>
                        ) : (
                          <span className="sr-only">{i + 1}</span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "max-w-full text-center text-[9px] leading-tight tracking-[0.04em] uppercase md:text-[10px]",
                          isCurrent ? "font-bold text-black" : can || done ? "font-medium text-black" : "font-medium text-rez-graphite",
                          !isCurrent && "sr-only xl:not-sr-only",
                        )}
                      >
                        {STEP_TITLES[s]}
                      </span>
                      {done && <span className="sr-only">(completed)</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="flex min-w-0 flex-col gap-4" aria-labelledby="step-title">
            <div ref={formRef} className="flex flex-col gap-7 rounded-xl bg-white p-6 md:p-8">
              <div className="flex flex-col gap-1.5 border-b border-rez-smoke pb-5">
                <span className="eyebrow text-rez-mocaccino-ink">
                  Step {index + 1} of {steps.length}
                </span>
                <h1 id="step-title" ref={headingRef} tabIndex={-1} className="text-[28px] leading-tight font-semibold tracking-[-0.02em] outline-none">
                  {STEP_TITLES[current]}
                </h1>
                {draft.unitType && current !== "type" && (
                  <p className="text-[13px] text-rez-graphite">
                    {draft.category ? CATEGORY_UNITS[draft.category].label : ""} · {draft.unitType}
                    {draft.city ? ` · ${draft.city}` : ""}
                  </p>
                )}
              </div>
              <p role="status" aria-live="polite" className="sr-only">
                {announce}
              </p>
              {Object.keys(errors).length > 0 && (
                <FormError>Please fix the highlighted {Object.keys(errors).length === 1 ? "field" : "fields"} to continue.</FormError>
              )}
              <Step
                draft={draft}
                errors={errors}
                update={(patch) => {
                  update(patch);
                  if (Object.keys(errors).length) {
                    setErrors((e) => {
                      const copy = { ...e };
                      for (const k of Object.keys(patch)) delete copy[k];
                      return copy;
                    });
                  }
                }}
              />
              {submit.isError && (
                <FormError>
                  {errorMessage(submit.error)}{" "}
                  <button type="button" className="underline" onClick={() => submit.mutate(draft)}>
                    Retry
                  </button>
                </FormError>
              )}
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="secondary" size="xl" onClick={() => go(steps[index - 1])} className={cn(index === 0 && "invisible")}>
                Back
              </Button>
              <Button size="xl" onClick={next} disabled={submit.isPending}>
                {nextLabel}
              </Button>
            </div>
          </section>
          <Preview draft={draft} />
        </div>
      </div>
      </div>
    </div>
  );
}
