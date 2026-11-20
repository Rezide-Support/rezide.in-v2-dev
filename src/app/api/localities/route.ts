import { upstream } from "@/lib/api/rezide-upstream";
import { uploadUrl } from "@/lib/api/origins";
import { httpsImage } from "@/lib/listing-locality";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body?.searchQuery?.[0];
    if (typeof name !== "string" || !name.trim() || name.length > 200) return Response.json({ error: "Invalid locality" }, { status: 400 });
    const result = await upstream("/Repository/Locality/filter?page=1&pageSize=1", { sub_regions: null, regions: null, searchQuery: [name.trim()] }) as { data?: { _id?: string; media?: { images?: { url?: string }[] } }[] };
    const row = result.data?.[0], image = row?.media?.images?.[0]?.url;
    return Response.json(row ? { id: row._id, image: image ? (httpsImage(image) || uploadUrl(image)) : null } : null);
  } catch { return Response.json({ error: "Unable to load locality" }, { status: 502 }); }
}
