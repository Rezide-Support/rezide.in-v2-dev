"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";

/**
 * Binds a criteria object to the URL query string. Every change produces a new
 * history entry, so back/forward and shared links restore the same results.
 * Changing anything other than the page resets to page 1.
 */
export function useUrlCriteria<T extends { page: number }>(
  parse: (params: URLSearchParams) => T,
  serialize: (criteria: T) => URLSearchParams,
) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startTransition] = useTransition();
  const key = params.toString();
  const criteria = useMemo(() => parse(new URLSearchParams(key)), [key, parse]);

  const update = useCallback(
    (patch: Partial<T>, opts: { scroll?: boolean } = {}) => {
      const next = { ...criteria, ...patch } as T;
      if (!("page" in patch)) next.page = 1;
      const qs = serialize(next).toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: opts.scroll ?? false });
      });
    },
    [criteria, serialize, router, pathname],
  );

  return { criteria, update, isNavigating };
}
