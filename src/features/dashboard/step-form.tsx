"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Grey stepper panel + optional live preview, as used by Firm Profile, My Profile and Add Member. */
export function StepFormLayout({
  steps,
  current,
  onStep,
  children,
  preview,
  backLabel,
  onBack,
  nextLabel,
  onNext,
  busy,
}: {
  steps: string[];
  current: number;
  onStep: (i: number) => void;
  children: ReactNode;
  preview?: ReactNode;
  backLabel: string;
  onBack: () => void;
  nextLabel: string;
  onNext: () => void;
  busy?: boolean;
}) {
  return (
    <div className={cn("grid items-start gap-5", preview && "xl:grid-cols-[minmax(0,1fr)_calc(340px*var(--property-space-scale,1))]")}>
      <div className="flex min-w-0 flex-col gap-4 rounded-[24px] bg-[#F4F4F4] p-3 md:p-5">
        {steps.length > 1 && (
          <ol className="relative mx-auto grid w-full max-w-[640px] px-2 pt-2 pb-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Steps">
            {steps.map((l, i) => (
              <li key={l} className="relative flex flex-col items-center gap-2">
                {i > 0 && <span aria-hidden className={cn("absolute top-[11px] right-1/2 left-[-50%] h-0.5", i <= current ? "bg-black" : "bg-[#E0E0E0]")} />}
                <button
                  type="button"
                  onClick={() => onStep(i)}
                  aria-current={i === current ? "step" : undefined}
                  aria-label={`Step ${i + 1}: ${l}${i < current ? " (done)" : ""}`}
                  className={cn(
                    "relative z-10 flex size-6 items-center justify-center rounded-full border-2 bg-white",
                    i < current ? "border-black bg-black text-rez-full-white" : i === current ? "border-black" : "border-[#E0E0E0]",
                  )}
                >
                  {i < current && <Icon name="check" size={13} />}
                  {i === current && <span className="size-3 rounded-full bg-black" />}
                </button>
                <span className={cn("text-center text-[9px] tracking-[0.06em] uppercase", i === current ? "font-bold" : "font-medium", i <= current ? "text-black" : "text-rez-space")}>{l}</span>
              </li>
            ))}
          </ol>
        )}
        {children}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" className="h-12 bg-white text-[13px] font-bold tracking-[0.08em] uppercase" onClick={onBack}>
            {backLabel}
          </Button>
          <Button className="h-12 text-[13px] font-bold tracking-[0.08em] uppercase" onClick={onNext} disabled={busy}>
            {busy ? "Saving…" : nextLabel}
          </Button>
        </div>
      </div>
      {preview}
    </div>
  );
}

export function FormGroup({ title, onSaveExit, children, className }: { title: string; onSaveExit?: () => void; children: ReactNode; className?: string }) {
  return (
    <section className="flex flex-col gap-4 rounded-[16px] bg-white p-5" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-bold tracking-[0.06em] uppercase">{title}</h2>
        {onSaveExit && (
          <button type="button" onClick={onSaveExit} className="text-[13px] font-bold tracking-[0.04em] uppercase underline underline-offset-4">
            Save &amp; Exit
          </button>
        )}
      </div>
      <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>
    </section>
  );
}

export type PreviewSection = { label: string; rows: [string, string][]; step: number };

export function LivePreview({ title, titleMuted, sub, line, tags, sections, onEdit }: { title: string; titleMuted?: boolean; sub: string; line?: string; tags: { label: string; on: boolean }[]; sections: PreviewSection[]; onEdit: (step: number) => void }) {
  return (
    <aside aria-label="Live preview" className="flex flex-col gap-4 rounded-[24px] bg-[#F4F4F4] p-4 xl:sticky xl:top-6">
      <h2 className="px-1 pt-1 text-lg font-semibold">Live Preview</h2>
      <div className="flex flex-col gap-5 rounded-[16px] bg-white p-3.5">
        <div className="flex flex-col gap-1.5 rounded-[12px] border border-rez-smoke p-3.5">
          <b className={cn("text-[max(12px,calc(15px*var(--property-type-scale,1)))] font-semibold", titleMuted && "text-rez-steel")}>{title}</b>
          <span className="text-xs text-rez-graphite">{sub}</span>
          {line && <span className="text-[13px] break-words">{line}</span>}
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <li key={t.label} className={cn("rounded-[6px] px-2 py-1 text-[10px] font-semibold", t.on ? "bg-[#F0EAE2] text-black" : "bg-[#F4F4F4] text-rez-space")}>
                {t.label}
              </li>
            ))}
          </ul>
        </div>
        {sections.map((s) => {
          const filled = s.rows.some(([, v]) => v);
          return (
            <section key={s.label} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-[0.06em] uppercase">{s.label}</h3>
                {filled && (
                  <button type="button" onClick={() => onEdit(s.step)} className="text-[11px] font-semibold underline underline-offset-2" aria-label={`Edit ${s.label}`}>
                    Edit
                  </button>
                )}
              </div>
              {filled ? (
                <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[11px]">
                  {s.rows.map(([k, v], i) => (
                    <div key={`${k}${i}`} className="contents">
                      <dt className="text-rez-graphite">{k}</dt>
                      <dd className="break-words">{v || "-"}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="flex h-24 items-center justify-center rounded-[12px] bg-[#F4F4F4] text-[11px] text-rez-graphite">Loads when details are filled</p>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
