import { ApiError } from "@/lib/api/client";
import { getFirmDetail } from "@/services/realtors";

/** GET /api/firms/{id}: one firm with its team and listings. Unknown ids answer 404. */
export async function GET(_request: Request, { params }: RouteContext<"/api/firms/[id]">) {
  const { id } = await params;
  try {
    return Response.json(await getFirmDetail(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return Response.json({ message: error.message }, { status: 404 });
    if (!(error instanceof ApiError)) console.error(`GET /api/firms/${id} failed`, error);
    return Response.json({ message: "Couldn't load this firm. Please try again." }, { status: 502 });
  }
}
