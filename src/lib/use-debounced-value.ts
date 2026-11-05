"use client";

import { useEffect, useState } from "react";

/** `value`, once it has stopped changing for `delayMs` (typeahead requests wait for a pause in typing). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
