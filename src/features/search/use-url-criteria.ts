"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * Binds a criteria object to the URL query string. Every change produces a new
 * history entry, so back/forward and shared links restore the same results.
 * Changing anything other than the page resets to page 1.
 *
 * The URL changes with the native History API, which Next.js syncs with
 * useSearchParams: the results update at once, with no server round trip
 * (these pages fetch their results in the browser).
 */
export function useUrlCriteria<T extends { page: number }>(
  parse: (params: URLSearchParams) => T,
  serialize: (criteria: T) => URLSearchParams,
) {
  const params = useSearchParams();
  const pathname = usePathname();
  const key = params.toString();
  const criteria = useMemo(() => parse(new URLSearchParams(key)), [key, parse]);

  const update = useCallback(
    (patch: Partial<T>, opts: { scroll?: boolean } = {}) => {
      const next = { ...criteria, ...patch } as T;
      if (!("page" in patch)) next.page = 1;
      const qs = serialize(next).toString();
      window.history.pushState(null, "", qs ? `${pathname}?${qs}` : pathname);
      if (opts.scroll) window.scrollTo({ top: 0 });
    },
    [criteria, serialize, pathname],
  );

  return { criteria, update };
}
