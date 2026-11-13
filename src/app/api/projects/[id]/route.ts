import { ApiError } from "@/lib/api/client";
import { getProjectDetail } from "@/services/projects";

/**
 * GET /api/projects/{id}
 *
 * One project for the detail page. The backend's record holds the developer's bank and
 * PAN details, so it's read and mapped on the server. Unknown ids answer 404.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/projects/[id]">) {
  const { id } = await params;
  try {
    return Response.json(await getProjectDetail(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return Response.json({ message: "This project doesn't exist or is no longer live." }, { status: 404 });
    if (!(error instanceof ApiError)) console.error(`GET /api/projects/${id} failed`, error);
    return Response.json({ message: "Couldn't load this project. Please try again." }, { status: 502 });
  }
}
