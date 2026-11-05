import type { Metadata } from "next";
import { Suspense } from "react";
import { AssociatePropertyPage } from "@/features/dashboard/associate-property";
import { FreshOnNavigate, Loading } from "@/features/dashboard/ui";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "Associate Property" };

async function Associate({ params }: { params: PageProps<"/dashboard/contacts/[id]/associate">["params"] }) {
  const { id } = await params;
  return <AssociatePropertyPage id={id} />;
}

export default function Page({ params }: PageProps<"/dashboard/contacts/[id]/associate">) {
  return (
    <FreshOnNavigate>
      <Suspense fallback={<Loading />}>
        <Associate params={params} />
      </Suspense>
    </FreshOnNavigate>
  );
}
