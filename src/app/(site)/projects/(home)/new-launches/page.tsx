import type { Metadata } from "next";
import { ProjectRails } from "@/features/home/rails";

export const metadata: Metadata = {
  title: "New launch projects",
  description: "Newly launched residential projects, by budget and location.",
};

export default function NewLaunchesPage() {
  return <ProjectRails status="nl" />;
}
