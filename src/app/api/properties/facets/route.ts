import { ApiError } from "@/lib/api/client";
import { parsePropertyCriteria } from "@/features/search/criteria";
import { listingFacets } from "@/services/properties";

/**
 * GET /api/properties/facets?<the /properties page's query string>
 *
 * The server uses the city's live listings to rank locality choices and asks
 * the backend's /filter/count endpoint for authoritative sale-option counts.
 */
export async function GET(request: Request) {
  const criteria = parsePropertyCriteria(new URL(request.url).searchParams);
  try {
    return Response.json(await listingFacets(criteria));
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("GET /api/properties/facets failed", error);
    return Response.json({ message: "Couldn't load filter counts. Please try again." }, { status: 502 });
  }
}
