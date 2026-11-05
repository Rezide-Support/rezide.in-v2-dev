import { ApiError } from "@/lib/api/client";
import { parseRealtorCriteria } from "@/features/realtors/realtor-criteria";
import { searchRealtors } from "@/services/realtors";

/**
 * GET /api/realtors?city=&by=&q=&spec=&loc=&lang=&gender=&page=&per=
 *
 * The realtor directory for the browser. Firm records hold PAN, Aadhaar, bank and
 * contact details, so they are read and mapped on the server and only the public
 * fields reach the browser (rezide.in's /api/brokers calls the same endpoint).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const per = Math.min(100, Math.max(1, Number.parseInt(params.get("per") ?? "50", 10) || 50));
  try {
    return Response.json(await searchRealtors(parseRealtorCriteria(params), page, per));
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("GET /api/realtors failed", error);
    return Response.json({ message: "Couldn't load realtors. Please try again." }, { status: 502 });
  }
}
