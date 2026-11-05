import { ApiError } from "@/lib/api/client";
import { getFirmAgentDetail } from "@/services/realtors";

/** GET /api/firms/{id}/agents/{agent}: an agent's profile. Unknown ids answer 404. */
export async function GET(_request: Request, { params }: RouteContext<"/api/firms/[id]/agents/[agent]">) {
  const { id, agent } = await params;
  try {
    return Response.json(await getFirmAgentDetail(id, agent));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return Response.json({ message: error.message }, { status: 404 });
    if (!(error instanceof ApiError)) console.error(`GET /api/firms/${id}/agents/${agent} failed`, error);
    return Response.json({ message: "Couldn't load this realtor. Please try again." }, { status: 502 });
  }
}
