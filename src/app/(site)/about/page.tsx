import type { Metadata } from "next";
import { AboutView } from "@/features/about/about-view";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Rezide Solutions was founded in Dec 2023 to make home buying and renting seamless and efficient — a realtor-centric platform with real information, real listings and real availability.",
};

export default function AboutPage() {
  return <AboutView />;
}
