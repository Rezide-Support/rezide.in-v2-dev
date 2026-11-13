import { Suspense } from "react";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { LiveRealtorProfile } from "@/features/realtors/live-profile";
import { decodeDirectorySegment } from "@/features/realtors/directory-model";

async function FirmData({ params }: { params: Promise<{ firmName: string }> }) {
  const { firmName } = await params;
  return <LiveRealtorProfile firmName={decodeDirectorySegment(firmName)} />;
}

export default function BrokerPage({ params }: { params: Promise<{ firmName: string }> }) {
  return <Suspense fallback={<DetailSkeleton />}><FirmData params={params} /></Suspense>;
}
