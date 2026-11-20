import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { accountHref } from "@/features/account/account-routes";
export const metadata: Metadata = { title: "My account", robots: { index: false } };
type Props = {searchParams: Promise<Record<string,string|string[]|undefined>>};
async function LegacyAccountRedirect({ searchParams }: Props) {
 const query = await searchParams;
 const tab = typeof query.tab === "string" ? query.tab : "viewed";
 redirect(accountHref(tab === "listings" ? "visits" : tab, tab === "listings"));
 return null;
}
export default function AccountPage(props: Props) {return <Suspense fallback={<div aria-busy="true" className="min-h-[60vh]"/>}><LegacyAccountRedirect {...props}/></Suspense>;}
