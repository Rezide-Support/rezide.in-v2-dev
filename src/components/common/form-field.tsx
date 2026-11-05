"use client";

import { cloneElement, createContext, isValidElement, useContext, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ControlProps = { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string; "aria-required"?: boolean };

const FieldContext = createContext<ControlProps | null>(null);

/**
 * Accessibility props for the control inside the nearest Field. Composite
 * inputs (phone, OTP) use this when wrapped in a react-hook-form Controller,
 * where Field cannot clone props onto the real <input>.
 */
export const useFieldControl = () => useContext(FieldContext);

type FieldProps = {
  label: ReactNode;
  /** Error message. When set the control gets aria-invalid and aria-describedby. */
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  labelClassName?: string;
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string; "aria-required"?: boolean }>;
};

/**
 * Label + control + hint + inline error, wired for assistive tech.
 * Required fields show an asterisk; optional fields say "(optional)".
 */
export function Field({ label, error, hint, required, optional, className, labelClassName, children }: FieldProps) {
  const id = useId();
  const controlId = (isValidElement(children) && children.props.id) || `${id}-control`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control: ControlProps = {
    id: controlId,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": required || undefined,
  };

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={controlId} className={cn("text-[13px] leading-none font-semibold", labelClassName)}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        )}
        {optional && <span className="font-normal text-rez-graphite"> (optional)</span>}
      </label>
      <FieldContext.Provider value={control}>{cloneElement(children, control)}</FieldContext.Provider>
      {hint && !error && (
        <p id={hintId} className="text-xs leading-snug text-rez-graphite">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs leading-snug font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Error summary for form-level failures (network, server rejection). */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/[0.06] px-4 py-3 text-sm font-medium text-destructive">
      {children}
    </p>
  );
}
