"use client";
import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/stores/session";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { isCustomerDashboardPath } from "./account-routes";
export function CustomerDashboardLayout({ children }: { children: ReactNode }) {
 const path = usePathname();
 const router = useRouter();
 const {session,status} = useSession();
 const customer = isCustomerDashboardPath(path) || (path === "/dashboard/profile" && session?.user.role !== "realtor");
 useEffect(() => { if(customer && status !== "loading" && !session) router.replace("/"); }, [customer,status,session,router]);
 if(customer) {
  if(status === "loading" || !session) return <div aria-busy="true" className="min-h-dvh" />;
  return <><SiteHeader/><main id="main" className="dashboard-page flex min-w-0 flex-1 flex-col"><Suspense fallback={<div aria-busy="true" className="min-h-[60vh]"/>}>{children}</Suspense></main><SiteFooter/></>;
 }
 return <DashboardShell>{children}</DashboardShell>;
}
