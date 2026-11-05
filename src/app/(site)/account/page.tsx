import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountView } from "@/features/account/account-view";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[60vh] w-full max-w-[1280px] p-8" aria-busy="true" />}>
      <AccountView />
    </Suspense>
  );
}
