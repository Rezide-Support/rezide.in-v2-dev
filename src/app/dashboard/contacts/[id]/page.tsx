import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactView } from "@/features/dashboard/contact-view";
import { Loading } from "@/features/dashboard/ui";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "Contact" };

async function View({ params }: { params: PageProps<"/dashboard/contacts/[id]">["params"] }) {
  const { id } = await params;
  return <ContactView key={id} id={id} />;
}

export default function Page({ params }: PageProps<"/dashboard/contacts/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <View params={params} />
    </Suspense>
  );
}
