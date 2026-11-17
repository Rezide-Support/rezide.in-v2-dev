import { ApiError } from "@/lib/api/client";
import { getDeveloperContact } from "@/services/developers";

/**
 * GET /api/developers/{id}/contact
 *
 * A developer's public contact details for the project page's "Contact Builder" form. The
 * backend's developer record also holds bank account details, so it's read on the server
 * and only names, phone numbers, emails and the office address are returned.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/developers/[id]/contact">) {
  const { id } = await params;
  try {
    return Response.json(await getDeveloperContact(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return Response.json({ message: "This developer doesn't exist." }, { status: 404 });
    if (!(error instanceof ApiError)) console.error(`GET /api/developers/${id}/contact failed`, error);
    return Response.json({ message: "Unable to fetch contact details. Please try again." }, { status: 502 });
  }
}
