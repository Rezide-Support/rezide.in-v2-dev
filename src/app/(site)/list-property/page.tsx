import type { Metadata } from "next";
import { ListProperty } from "@/features/listing/list-property";

export const metadata: Metadata = {
  title: "List your property free",
  description: "List a home, office, retail, industrial or land property for sale or rent in minutes.",
};

export default function ListPropertyPage() {
  return <ListProperty />;
}
