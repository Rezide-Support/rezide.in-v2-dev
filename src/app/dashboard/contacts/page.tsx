import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactsPage } from "@/features/dashboard/contacts";
import { Loading } from "@/features/dashboard/ui";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "Contacts" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ContactsPage />
    </Suspense>
  );
}
