import { ApiError } from "@/lib/api/client";
import { getListingDetail } from "@/services/properties";

/**
 * GET /api/properties/{id}
 *
 * One listing for the detail page, fetched from the Rezide backend on the
 * server so a withheld price never reaches the browser (as rezide.in's
 * /api/listings/{id} does). Unknown ids answer 404.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/properties/[id]">) {
  const { id } = await params;
  try {
    return Response.json(await getListingDetail(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return Response.json({ message: "This listing doesn't exist or is no longer live." }, { status: 404 });
    }
    if (!(error instanceof ApiError)) console.error(`GET /api/properties/${id} failed`, error);
    const status = error instanceof ApiError && error.status >= 400 && error.status < 500 ? error.status : 502;
    const message = error instanceof ApiError ? error.message : "Couldn't load this listing. Please try again.";
    return Response.json({ message }, { status });
  }
}
