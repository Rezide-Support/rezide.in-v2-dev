import type { Metadata } from "next";
import { Suspense } from "react";
import { EditContactPage } from "@/features/dashboard/contact-form";
import { FreshOnNavigate, Loading } from "@/features/dashboard/ui";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "Edit Contact" };

async function Edit({ params }: { params: PageProps<"/dashboard/contacts/[id]/edit">["params"] }) {
  const { id } = await params;
  return <EditContactPage id={id} />;
}

export default function Page({ params }: PageProps<"/dashboard/contacts/[id]/edit">) {
  return (
    <FreshOnNavigate>
      <Suspense fallback={<Loading />}>
        <Edit params={params} />
      </Suspense>
    </FreshOnNavigate>
  );
}
