import { ApiError } from "@/lib/api/client";
import { parsePropertyCriteria } from "@/features/search/criteria";
import { listingGroups } from "@/services/properties";

/**
 * GET /api/properties/groups?<the /properties page's query string>&groupBy=locality|project
 *
 * Matching listings summarised per locality or per project (the Location and
 * Projects views), computed on the server from the city's live listings.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const groupBy = params.get("groupBy");
  if (groupBy !== "locality" && groupBy !== "project") {
    return Response.json({ message: "groupBy must be locality or project.", code: "bad_request" }, { status: 400 });
  }
  try {
    return Response.json(await listingGroups(parsePropertyCriteria(params), groupBy));
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("GET /api/properties/groups failed", error);
    return Response.json({ message: "Couldn't load these listings. Please try again." }, { status: 502 });
  }
}
