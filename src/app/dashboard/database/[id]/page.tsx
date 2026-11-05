import type { Metadata } from "next";
import { Suspense } from "react";
import { UploadFilePage } from "@/features/dashboard/database";
import { Loading } from "@/features/dashboard/ui";

/** Rendered after the client-side (simulated) session check, so it cannot be an instant static shell. */
export const instant = false;

export const metadata: Metadata = { title: "Database file" };

async function File({ params }: { params: PageProps<"/dashboard/database/[id]">["params"] }) {
  const { id } = await params;
  return <UploadFilePage id={id} />;
}

export default function Page({ params }: PageProps<"/dashboard/database/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <File params={params} />
    </Suspense>
  );
}
