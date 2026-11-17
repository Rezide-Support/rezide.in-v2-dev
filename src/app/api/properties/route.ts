import { ApiError } from "@/lib/api/client";
import { parsePropertyCriteria } from "@/features/search/criteria";
import { parseMapArea } from "@/features/search/match";
import { MAP_PAGE_SIZE } from "@/lib/constants";
import { warmListingIndex } from "@/services/listing-index";
import { searchListings, searchListingsInArea } from "@/services/properties";

/**
 * GET /api/properties?<the /properties page's query string>
 *
 * Listing search for the browser. Calls the Rezide backend on the server and
 * returns listings in the UI's shape, so withheld prices and the backend's
 * internal fields never reach the browser (as rezide.in's /api/listings does).
 * The query is read with the page's own parser, so it is validated the same way.
 * `bbox=west,south,east,north` keeps the listings in that part of the map (the map view's list).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const area = parseMapArea(searchParams.get("bbox"));
  const parsed = parsePropertyCriteria(searchParams);
  // The map view's list loads MAP_PAGE_SIZE at a time; the page's own sizes (9, 18…) stay as they are.
  const criteria = area && Number(searchParams.get("per")) === MAP_PAGE_SIZE ? { ...parsed, perPage: MAP_PAGE_SIZE } : parsed;
  // The filter counts and the Location / Projects views need every listing in the city, which
  // takes seconds to download: start now so it's ready when the user opens them.
  warmListingIndex(criteria.city, criteria.intent, criteria.category);
  try {
    return Response.json(await (area ? searchListingsInArea(criteria, area) : searchListings(criteria)));
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("GET /api/properties failed", error);
    const status = error instanceof ApiError && [400, 404, 422].includes(error.status) ? error.status : 502;
    const message = "Couldn't load listings. Please try again.";
    return Response.json({ message }, { status });
  }
}
