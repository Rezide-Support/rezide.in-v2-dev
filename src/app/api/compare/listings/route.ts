import { ApiError } from "@/lib/api/client";
import { compareUnits, getCompareListings, searchCompareProjects } from "@/services/compare-listings";

/**
 * GET /api/compare/listings — the Sale / Rental compare table, as rezide.in's compare page.
 *   ?ids=a&ids=b                       the compared listings (public fields only)
 *   ?projects=<text>                   "Add Property": projects with listings matching the text
 *   ?project=<id>&name=<name>&purpose= "Add Property": that project's units for sale or rent
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    if (params.has("projects")) return Response.json(await searchCompareProjects((params.get("projects") ?? "").slice(0, 100)));
    if (params.has("project")) {
      const purpose = params.get("purpose") === "rent" ? "rent" : "sale";
      return Response.json(await compareUnits(params.get("project") ?? "", (params.get("name") ?? "").slice(0, 200), purpose));
    }
    return Response.json(await getCompareListings(params.getAll("ids")));
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("GET /api/compare/listings failed", error);
    return Response.json({ message: "Couldn't load the comparison. Please try again." }, { status: 502 });
  }
}
