import type { Metadata } from "next";
// import { RealtorCorner } from "@/features/corner/realtor-corner"; // the old in-app page, kept for reference
import { OpenRealtorCorner } from "@/features/corner/open-realtor-corner";

export const metadata: Metadata = {
  title: "Realtor Corner",
  description: "Ai-R agents, plans and pricing for realtors on Rezide.",
};

export default function RealtorCornerPage() {
  // return <RealtorCorner />;
  return <OpenRealtorCorner />;
}