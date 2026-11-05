import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = { title: { default: "Realtor dashboard", template: "%s · Rezide dashboard" }, robots: { index: false } };

/**
 * The dashboard is gated by a client-side (simulated) session, so its pages
 * only render after hydration and can't produce an instant static shell.
 */
export const instant = false;

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <DashboardShell>{children}</DashboardShell>;
}
