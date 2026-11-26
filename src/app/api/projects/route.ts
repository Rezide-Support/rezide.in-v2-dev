import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { ApiError } from "@/lib/api/client";
import { parseProjectCriteria } from "@/features/search/criteria";
import { findProjectsByNames, getProjectsByIds, searchProjects } from "@/services/projects";
import { z } from "zod";
import { searchBuildingProjects } from "@/services/building-projects";

const buildingRequest = z.object({
  page: z.number().int().min(1).max(100000).default(1),
  pageSize: z.union([z.literal(9), z.literal(18), z.literal(27), z.literal(36)]).default(9),
  city: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
  project_names_localities_subRegions: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  listingExist: z.literal("exist").default("exist"),
  sortBy: z.literal("listingExist").default("listingExist"),
});

/** Property directory's Projects view: one server-filtered page, with its count. */
export async function POST(request: Request) {
  const parsed = buildingRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Invalid project filters." }, { status: 400 });
  try {
    return Response.json(await searchBuildingProjects(parsed.data));
  } catch {
    return Response.json({ message: "Couldn't load projects. Please try again." }, { status: 502 });
  }
}

/**
 * GET /api/projects?<the /projects/search page's query string>, or ?ids=a&ids=b&city=
 *
 * Project search for the browser, as rezide.in's /api/projects. It reads the backend on
 * the server and returns projects in the UI's shape.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const ids = params.getAll("ids").filter((id) => BACKEND_ID_PATTERN.test(id)).slice(0, 100);
    if (params.has("ids")) return Response.json(await getProjectsByIds(ids, params.get("city") ?? ""));
    // Compare Project's picker: ?names=<locality>&names=<project name> (either may be empty).
    if (params.has("names")) return Response.json(await findProjectsByNames(params.getAll("names").map((n) => n.slice(0, 100))));
    return Response.json(await searchProjects(parseProjectCriteria(params)));
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("GET /api/projects failed", error);
    return Response.json({ message: "Couldn't load projects. Please try again." }, { status: 502 });
  }
}
