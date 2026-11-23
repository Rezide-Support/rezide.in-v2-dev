"use client";

import { useEffect } from "react";
import { getRealtorCornerUrl } from "@/lib/realtor-corner";

/** Sends the visitor to the Realtor Corner site for this environment (see lib/realtor-corner.ts). */
export function OpenRealtorCorner() {
  useEffect(() => {
    // replace(), not assign(): the Back button then returns to the page the visitor came from.
    window.location.replace(getRealtorCornerUrl(window.location.hostname));
  }, []);
  return <p className="px-4 py-24 text-center text-rez-graphite">Opening Realtor Corner…</p>;
}