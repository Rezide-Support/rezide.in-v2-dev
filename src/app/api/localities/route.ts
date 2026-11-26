import { upstream } from "@/lib/api/rezide-upstream";
import { uploadUrl } from "@/lib/api/origins";
import { httpsImage } from "@/lib/listing-locality";
import { z } from "zod";
import { searchLocalityDirectory } from "@/services/directory-localities";

const selections = z.array(z.string().trim().min(1).max(200)).max(100).nullable().default(null);
const filters = z.object({ regions: selections, sub_regions: selections, searchQuery: selections, city: z.string().trim().min(1).max(100).optional() });
export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? 1);
  const pageSize = Number(params.get("pageSize") ?? 12);
  if (!Number.isInteger(page) || page < 1 || page > 100000 || ![1, 12, 24, 36, 48].includes(pageSize)) return Response.json({ error: "Invalid pagination" }, { status: 400 });
  const parsed = filters.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid locality filters" }, { status: 400 });
  try {
    const body = parsed.data;
    if (pageSize !== 1) return Response.json(await searchLocalityDirectory(body, page, pageSize));
    // Keep the listing-detail Explore preview's existing one-image response.
    const name = body?.searchQuery?.[0];
    if (typeof name !== "string" || !name.trim() || name.length > 200) return Response.json({ error: "Invalid locality" }, { status: 400 });
    const result = await upstream("/Repository/Locality/filter?page=1&pageSize=1", { sub_regions: null, regions: null, searchQuery: [name.trim()] }) as { data?: { _id?: string; media?: { images?: { url?: string }[] } }[] };
    const row = result.data?.[0], image = row?.media?.images?.[0]?.url;
    return Response.json(row ? { id: row._id, image: image ? (httpsImage(image) || uploadUrl(image)) : null } : null);
  } catch { return Response.json({ error: "Unable to load locality" }, { status: 502 }); }
}
