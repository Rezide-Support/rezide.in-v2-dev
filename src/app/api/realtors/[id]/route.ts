import { ApiError } from "@/lib/api/client";
import { getRealtorDetail } from "@/services/realtors";

/** GET /api/realtors/{id}: one realtor, by the backend's id. Unknown ids answer 404. */
export async function GET(_request: Request, { params }: RouteContext<"/api/realtors/[id]">) {
  const { id } = await params;
  try {
    return Response.json(await getRealtorDetail(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return Response.json({ message: error.message }, { status: 404 });
    if (!(error instanceof ApiError)) console.error(`GET /api/realtors/${id} failed`, error);
    return Response.json({ message: "Couldn't load this realtor. Please try again." }, { status: 502 });
  }
}
