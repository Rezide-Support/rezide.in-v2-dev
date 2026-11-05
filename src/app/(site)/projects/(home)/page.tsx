import type { Metadata } from "next";
import { ProjectRails } from "@/features/home/rails";

export const metadata: Metadata = {
  title: "Under-construction projects",
  description: "New residential projects under construction, by possession year, budget and location.",
};

export default function UnderConstructionPage() {
  return <ProjectRails status="uc" />;
}
