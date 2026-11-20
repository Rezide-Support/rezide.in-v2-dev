import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { ApiError } from "@/lib/api/client";
import { getActivity } from "@/services/activity";
import type { ActivityTab } from "@/types/models";

const ACTIVITY_TABS: ActivityTab[] = ["viewed", "shared", "shortlisted", "rejected"];

/** GET /api/account/activity?tab=&userId=&phone= — maps activity records before they reach the browser. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tab = params.get("tab");
  const userId = params.get("userId") ?? "";
  const phone = params.get("phone") ?? undefined;
  if (!tab || !ACTIVITY_TABS.includes(tab as ActivityTab)) {
    return Response.json({ message: "Choose a valid account activity list." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (!BACKEND_ID_PATTERN.test(userId) || (phone && !/^[+\d\s()-]{8,24}$/.test(phone))) {
    return Response.json({ message: "The account identity is invalid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if ((tab === "shared" || tab === "rejected") && !phone) {
    return Response.json({ message: "A phone number is required for shared activity." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const items = await getActivity(tab as ActivityTab, { id: userId, phone });
    return Response.json(items, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("GET /api/account/activity failed", error);
    return Response.json({ message: "Couldn't load account activity. Please try again." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}