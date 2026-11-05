import type { Metadata } from "next";
import { Suspense } from "react";
import { NewContactPage } from "@/features/dashboard/contact-form";
import { FreshOnNavigate, Loading } from "@/features/dashboard/ui";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "Add Contact" };

export default function Page() {
  return (
    <FreshOnNavigate>
      <Suspense fallback={<Loading />}>
        <NewContactPage />
      </Suspense>
    </FreshOnNavigate>
  );
}
