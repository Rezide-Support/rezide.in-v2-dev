"use client";

import { useEffect } from "react";

/**
 * Shows the page's canonical path in the address bar when it was reached by an outdated or
 * mistyped SEO URL, without reloading; query and hash are kept. Renders nothing. Search engines
 * follow the page's <link rel="canonical"> instead.
 */
export function CanonicalPath({ path }: { path: string }) {
  useEffect(() => {
    if (window.location.pathname === path) return;
    window.history.replaceState(null, "", `${path}${window.location.search}${window.location.hash}`);
  }, [path]);
  return null;
}
