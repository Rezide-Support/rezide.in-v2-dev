"use client";

import { useId, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/brand/icon";
import { cn } from "@/lib/utils";
import { DashSelect } from "./ui";

/** Small form primitives in the prototype's style: 8px-radius inputs, 13px semibold labels. */

export const inputCls =
  "h-[42px] w-full min-w-0 rounded-[8px] border border-rez-smoke bg-white px-3.5 text-sm text-black outline-none placeholder:text-rez-space hover:border-black focus:border-black focus:ring-[3px] focus:ring-rez-mocaccino/40 disabled:bg-[#F4F4F4] disabled:text-rez-graphite aria-invalid:border-destructive";

export function FLabel({ label, required, aside, htmlFor, id }: { label: string; required?: boolean; aside?: ReactNode; htmlFor?: string; id?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} id={id} className="text-[13px] font-semibold">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      {aside && <span className="text-xs text-rez-graphite">{aside}</span>}
    </div>
  );
}

export function FError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="text-xs font-medium text-destructive">
      {children}
    </p>
  );
}

export function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
  prefix,
  aside,
  error,
  disabled,
  className,
  inputMode,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  prefix?: string;
  aside?: ReactNode;
  error?: string;
  disabled?: boolean;
  className?: string;
  inputMode?: "numeric" | "email" | "text";
  type?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <FLabel label={label} required={required} aside={aside} htmlFor={id} />
      <span className="relative flex">
        {prefix && <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-rez-graphite">{prefix}</span>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className={cn(inputCls, prefix && "pl-12")}
        />
      </span>
      <FError id={`${id}-err`}>{error}</FError>
    </div>
  );
}

export function TextAreaField({ label, value, onChange, placeholder, aside, className, maxLength }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; aside?: ReactNode; className?: string; maxLength?: number }) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <FLabel label={label} aside={aside} htmlFor={id} />
      <textarea id={id} rows={6} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(inputCls, "h-auto py-3 leading-relaxed")} />
    </div>
  );
}

export function SelectField({ label, value, onChange, options, required, placeholder = "Select", className, error }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean; placeholder?: string; className?: string; error?: string }) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <FLabel label={label} required={required} htmlFor={id} />
      <DashSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-required={required || undefined} aria-invalid={error ? true : undefined} className={cn(!value && "text-rez-space")}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o} className="text-black">
            {o}
          </option>
        ))}
      </DashSelect>
      <FError id={`${id}-err`}>{error}</FError>
    </div>
  );
}

/** Pill chips: single (radio) or multi (checkbox) choice. */
export function ChipsField({ label, options, value, onChange, multi, required, aside, className }: { label: string; options: string[]; value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean; required?: boolean; aside?: ReactNode; className?: string }) {
  const id = useId();
  const isOn = (o: string) => (multi ? (value as string[]).includes(o) : value === o);
  const toggle = (o: string) => (multi ? onChange(isOn(o) ? (value as string[]).filter((x) => x !== o) : [...(value as string[]), o]) : onChange(o));
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <FLabel label={label} required={required} aside={aside} id={id} />
      <div role={multi ? "group" : "radiogroup"} aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={isOn(o)}
            onClick={() => toggle(o)}
            className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium", isOn(o) ? "border-black bg-black text-rez-full-white" : "border-rez-smoke bg-white hover:border-black")}
          >
            {isOn(o) && <Icon name="check-circle" size={13} />}
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Large selectable tiles (Contact Type, Firm Type, Property Types, Role). */
export function TilesField({
  label,
  options,
  value,
  onChange,
  multi,
  required,
  wide,
  className,
}: {
  label: string;
  options: { label: string; icon?: IconName; desc?: string }[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
  required?: boolean;
  wide?: boolean;
  className?: string;
}) {
  const id = useId();
  const isOn = (o: string) => (multi ? (value as string[]).includes(o) : value === o);
  const toggle = (o: string) => (multi ? onChange(isOn(o) ? (value as string[]).filter((x) => x !== o) : [...(value as string[]), o]) : onChange(o));
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <FLabel label={label} required={required} id={id} />
      <div role={multi ? "group" : "radiogroup"} aria-labelledby={id} className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${wide ? 220 : 96}px, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={isOn(o.label)}
            onClick={() => toggle(o.label)}
            className={cn(
              "flex min-h-[60px] flex-col justify-center gap-1.5 rounded-[12px] border px-3 py-3 text-[13px] font-medium",
              wide ? "items-start text-left" : "items-center text-center",
              isOn(o.label) ? "border-black bg-black text-rez-full-white" : "border-rez-smoke bg-white hover:border-black",
            )}
          >
            {o.icon && <Icon name={o.icon} size={18} />}
            <span className={cn(isOn(o.label) && "font-semibold")}>{o.label}</span>
            {o.desc && <span className={cn("text-xs font-normal", isOn(o.label) ? "text-rez-full-white/80" : "text-rez-graphite")}>{o.desc}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Multi-select by dropdown with removable tags (City, Region, Locality…). */
export function TagsField({ label, options, value, onChange, required, className }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; required?: boolean; className?: string }) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <FLabel label={label} required={required} htmlFor={id} />
      <DashSelect id={id} value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])} className="text-rez-space">
        <option value="">Select</option>
        {options
          .filter((o) => !value.includes(o))
          .map((o) => (
            <option key={o} className="text-black">
              {o}
            </option>
          ))}
      </DashSelect>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${label} selected`}>
          {value.map((t) => (
            <li key={t} className="inline-flex h-7 items-center gap-1 rounded-[6px] bg-[#F0EAE2] pr-1 pl-2.5 text-xs font-semibold">
              {t}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="flex size-5 items-center justify-center rounded hover:bg-black/10">
                <Icon name="x" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * File picker that records only the chosen file's name. Nothing is uploaded in
 * this prototype, and the hint says so.
 */
export function FileField({ label, value, onChange, hint, className }: { label: string; value: string; onChange: (v: string) => void; hint: string; className?: string }) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <FLabel label={label} htmlFor={id} />
      {value ? (
        <span className="flex h-[42px] items-center gap-2 rounded-[8px] border border-rez-smoke bg-[#F9F9F9] px-3.5 text-sm">
          <Icon name="file-text" size={16} />
          <span className="flex-1 truncate">{value}</span>
          <button type="button" onClick={() => onChange("")} aria-label={`Remove ${value}`} className="flex size-6 items-center justify-center rounded hover:bg-black/10">
            <Icon name="x" size={14} />
          </button>
        </span>
      ) : (
        <label htmlFor={id} className="flex min-h-[42px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed border-rez-steel px-3 py-3 text-center text-[13px] text-rez-graphite hover:border-black focus-within:border-black">
          <Icon name="file-upload" size={18} />
          {hint}
          <span className="text-[11px]">File name only · not uploaded in this prototype</span>
          <input id={id} type="file" className="sr-only" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0].name)} />
        </label>
      )}
    </div>
  );
}

export function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-black" />
      <span>{children}</span>
    </label>
  );
}

/** Collapsible optional section with a +/− toggle and "n of m filled" summary. */
export function OptionalSection({ id, title, sub, open, onToggle, children }: { id: string; title: string; sub: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[16px] border border-[#E0E0E0] bg-white" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`}>
        <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#FAFAFA]">
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold tracking-[0.06em] uppercase">{title}</span>
            <span className="text-xs text-rez-graphite">{sub}</span>
          </span>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-rez-smoke">
            <Icon name={open ? "minus" : "plus"} size={14} />
          </span>
        </button>
      </h3>
      {open && (
        <div id={`${id}-panel`} className="border-t border-[#E8E8E8] px-5 pt-4 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}
