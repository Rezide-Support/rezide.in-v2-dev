import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "./client";

/**
 * Copies an API 422's `fieldErrors` onto a React Hook Form. `rename` maps API
 * field names to form field names where they differ (e.g. `name` → `firstName`).
 * Returns true when at least one field error was applied, so callers can skip
 * the generic form-level message.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  rename: Partial<Record<string, Path<T>>> = {},
): boolean {
  if (!(error instanceof ApiError) || !error.fieldErrors) return false;
  const entries = Object.entries(error.fieldErrors);
  entries.forEach(([field, message], i) => {
    setError((rename[field] ?? field) as Path<T>, { type: "server", message }, { shouldFocus: i === 0 });
  });
  return entries.length > 0;
}

/** True when the error carries per-field messages (shown next to the fields instead of a banner). */
export const hasFieldErrors = (error: unknown) =>
  error instanceof ApiError && !!error.fieldErrors && Object.keys(error.fieldErrors).length > 0;
