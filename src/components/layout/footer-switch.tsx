"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Customer workspace routes use the prototype's slim footer instead of the full site footer. */
const SLIM_FOOTER_PATHS = ["/account", "/list-property"];

export function FooterSwitch({ full, slim }: { full: ReactNode; slim: ReactNode }) {
  const pathname = usePathname();
  const isSlim = SLIM_FOOTER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return isSlim ? slim : full;
}
