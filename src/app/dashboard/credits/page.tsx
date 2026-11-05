import type { Metadata } from "next";
import { CreditsPage } from "@/features/dashboard/credits";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "View Credits" };

export default function Page() {
  return <CreditsPage />;
}
