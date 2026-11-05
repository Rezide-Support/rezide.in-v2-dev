import type { Metadata } from "next";
import { FirmProfilePage } from "@/features/dashboard/profiles";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "Firm Profile" };

export default function Page() {
  return <FirmProfilePage />;
}
