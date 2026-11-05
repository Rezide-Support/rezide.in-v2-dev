import type { Metadata } from "next";
import { TeamsPage } from "@/features/dashboard/teams";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "Manage Teams" };

export default function Page() {
  return <TeamsPage />;
}
