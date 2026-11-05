import type { Metadata } from "next";
import { ProjectRails } from "@/features/home/rails";

export const metadata: Metadata = {
  title: "Ready-to-move projects",
  description: "Completed residential projects you can move into now, by budget and location.",
};

export default function ReadyToMovePage() {
  return <ProjectRails status="rtm" />;
}
