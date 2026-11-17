import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { LiveRealtorProfile } from "@/features/realtors/live-profile";
import { decodeDirectorySegment } from "@/features/realtors/directory-model";
import { resolveLegacyProfile } from "@/features/realtors/legacy-profile";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
export async function generateMetadata({params}:PageProps<"/realtors/[id]">):Promise<Metadata>{const{id}=await params;return{title:BACKEND_ID_PATTERN.test(id)?"Realtor profile":decodeDirectorySegment(id)}}
async function Profile({params}:{params:PageProps<"/realtors/[id]">["params"]}){const{id}=await params;if(BACKEND_ID_PATTERN.test(id)){const url=await resolveLegacyProfile(id);if(!url)notFound();permanentRedirect(url)}return <LiveRealtorProfile firmName={decodeDirectorySegment(id)}/>}
export default function Page({params}:PageProps<"/realtors/[id]">){return <Suspense fallback={<DetailSkeleton/>}><Profile params={params}/></Suspense>}
