import { redirect } from "next/navigation";

/** Only redirects; there is no UI here to validate for instant navigation. */
export const instant = false;

export default function DashboardIndex() {
  redirect("/dashboard/contacts");
}
