import { upstream } from "@/lib/api/rezide-upstream";
import { localityCategories, validCoordinates, httpsImage } from "@/lib/listing-locality";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("projectId") ?? "", category = params.get("category") ?? "";
  if (!/^[a-f0-9]{24}$/i.test(id) || !localityCategories.some(([, key]) => key === category)) return Response.json({ error: "Invalid project or category" }, { status: 400 });
  try {
    const result = await upstream(`/repository/locality/landmark/${id}?category=${category}&pageSize=4`) as { data?: Record<string, unknown>[] };
    return Response.json((result.data ?? []).filter(row => typeof row.placeName === "string" && validCoordinates(row.latitude, row.longitude) && row.distance != null && String(row.distance).trim() !== "" && Number.isFinite(Number(row.distance))).map((row, index) => ({ _id: String(row._id ?? index), placeName: String(row.placeName), latitude: Number(row.latitude), longitude: Number(row.longitude), distance: Number(row.distance), icon: httpsImage(row.icon), placeId: typeof row.placeId === "string" ? row.placeId : undefined, projectId: typeof row.projectId === "string" ? row.projectId : undefined, category: typeof row.category === "string" ? row.category : undefined, icon_background_color: typeof row.icon_background_color === "string" ? row.icon_background_color : undefined })));
  } catch { return Response.json({ error: "Unable to load landmarks" }, { status: 502 }); }
}
