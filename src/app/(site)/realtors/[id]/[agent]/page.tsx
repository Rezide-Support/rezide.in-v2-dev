import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { LiveRealtorProfile } from "@/features/realtors/live-profile";
import { decodeDirectorySegment } from "@/features/realtors/directory-model";
import { resolveLegacyProfile } from "@/features/realtors/legacy-profile";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
export async function generateMetadata({params}:PageProps<"/realtors/[id]/[agent]">):Promise<Metadata>{const{id}=await params;return{title:`Realtor at ${decodeDirectorySegment(id)}`}}
async function Profile({params}:{params:PageProps<"/realtors/[id]/[agent]">["params"]}){const{id,agent}=await params;if(BACKEND_ID_PATTERN.test(id)){const url=await resolveLegacyProfile(id,agent);if(!url)notFound();permanentRedirect(url)}return (
  // On tablets and laptops the profile is drawn a little smaller, so it fits the screen like on a big
  // monitor (full size from 1600px; phones unchanged). Popups open outside it and keep their size.
  <div className="md:max-lg:[zoom:0.9] lg:max-[1439.98px]:[zoom:0.85] min-[1440px]:max-[1599.98px]:[zoom:0.92]">
    <LiveRealtorProfile firmName={decodeDirectorySegment(id)} personId={decodeDirectorySegment(agent)}/>
  </div>
)}
export default function Page({params}:PageProps<"/realtors/[id]/[agent]">){return <Suspense fallback={<DetailSkeleton/>}><Profile params={params}/></Suspense>}
