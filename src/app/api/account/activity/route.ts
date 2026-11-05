import { ApiError } from "@/lib/api/client";
import { getActivity } from "@/services/activity";
import type { ActivityTab } from "@/types/models";

const TABS: readonly string[] = ["viewed", "shared", "shortlisted", "rejected"] satisfies ActivityTab[];
const isTab = (tab: string | null): tab is ActivityTab => tab !== null && TABS.includes(tab);

/**
 * GET /api/account/activity?tab=&userId=&phone=
 *
 * One account tab for the browser. The rows hold full listing records, so they are
 * read and mapped here and a withheld price never reaches the browser (as rezide.in's
 * /api/user/* routes do). The backend issues no session yet, so the user is named in
 * the request, as on rezide.in: this does not protect the user's activity.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tab = params.get("tab");
  const userId = params.get("userId") ?? "";
  const phone = params.get("phone") ?? undefined;
  if (!isTab(tab) || !/^[0-9a-f]{24}$/i.test(userId) || (phone !== undefined && !/^\d{10,12}$/.test(phone))) {
    return Response.json({ message: "Invalid activity request." }, { status: 400 });
  }
  try {
    return Response.json(await getActivity(tab, { id: userId, phone }));
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("GET /api/account/activity failed", error);
    const status = error instanceof ApiError && error.status >= 400 && error.status < 500 ? error.status : 502;
    const message = error instanceof ApiError ? error.message : "Couldn't load your activity. Please try again.";
    return Response.json({ message }, { status });
  }
}
