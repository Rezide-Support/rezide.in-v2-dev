import type { Metadata } from "next";
import { Suspense } from "react";
import { AddMemberPage } from "@/features/dashboard/add-member";
import { FreshOnNavigate, Loading } from "@/features/dashboard/ui";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "Add Member" };

export default function Page() {
  return (
    <FreshOnNavigate>
      <Suspense fallback={<Loading />}>
        <AddMemberPage />
      </Suspense>
    </FreshOnNavigate>
  );
}
