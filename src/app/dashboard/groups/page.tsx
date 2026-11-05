import type { Metadata } from "next";
import { GroupsPage } from "@/features/dashboard/groups";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "Groups" };

export default function Page() {
  return <GroupsPage />;
}
