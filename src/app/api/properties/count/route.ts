import { ApiError } from "@/lib/api/client";
import { parsePropertyCriteria } from "@/features/search/criteria";
import { countPropertyListings } from "@/services/properties";

/** GET /api/properties/count?<the /properties page's query string> */
export async function GET(request: Request) {
  const criteria = parsePropertyCriteria(new URL(request.url).searchParams);
  try {
    return Response.json({ total: await countPropertyListings(criteria) });
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("GET /api/properties/count failed", error);
    return Response.json({ message: "Couldn't load the result count. Please try again." }, { status: 502 });
  }
}
