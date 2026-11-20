import { AccountView } from "@/features/account/account-view";
// Account content renders after the browser session has hydrated.
export const instant = false;
export default function Page() { return <AccountView />; }
