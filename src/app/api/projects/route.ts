import { ApiError } from "@/lib/api/client";
import { parseProjectCriteria } from "@/features/search/criteria";
import { getProjectsByIds, searchProjects } from "@/services/projects";

/**
 * GET /api/projects?<the /projects/search page's query string>, or ?ids=a&ids=b&city=
 *
 * Project search for the browser, as rezide.in's /api/projects. It reads the backend on
 * the server and returns projects in the UI's shape.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const ids = params.getAll("ids").filter((id) => /^[0-9a-f]{24}$/i.test(id)).slice(0, 100);
    if (params.has("ids")) return Response.json(await getProjectsByIds(ids, params.get("city") ?? ""));
    return Response.json(await searchProjects(parseProjectCriteria(params)));
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("GET /api/projects failed", error);
    return Response.json({ message: "Couldn't load projects. Please try again." }, { status: 502 });
  }
}
