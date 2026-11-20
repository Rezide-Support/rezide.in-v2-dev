import type { Metadata } from "next";
import { DashboardProfile } from "@/features/account/dashboard-profile";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "My Profile" };

export default function Page() {
  return <DashboardProfile />;
}
