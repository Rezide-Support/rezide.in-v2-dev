import { ApiError } from "@/lib/api/client";
import { parsePropertyCriteria } from "@/features/search/criteria";
import { searchListings } from "@/services/properties";

/**
 * GET /api/properties?<the /properties page's query string>
 *
 * Listing search for the browser. Calls the Rezide backend on the server and
 * returns listings in the UI's shape, so withheld prices and the backend's
 * internal fields never reach the browser (as rezide.in's /api/listings does).
 * The query is read with the page's own parser, so it is validated the same way.
 */
export async function GET(request: Request) {
  const criteria = parsePropertyCriteria(new URL(request.url).searchParams);
  try {
    return Response.json(await searchListings(criteria));
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("GET /api/properties failed", error);
    const status = error instanceof ApiError && error.status >= 400 && error.status < 500 ? error.status : 502;
    const message = error instanceof ApiError ? error.message : "Couldn't load listings. Please try again.";
    return Response.json({ message }, { status });
  }
}
