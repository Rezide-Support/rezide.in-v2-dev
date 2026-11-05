import type { Metadata } from "next";
import { DatabasePage } from "@/features/dashboard/database";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "Database" };

export default function Page() {
  return <DatabasePage />;
}
