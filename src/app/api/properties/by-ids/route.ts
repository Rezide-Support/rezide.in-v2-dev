import { z } from "zod";
import { api } from "@/lib/api/client";
import { BACKEND_ID_PATTERN } from "@/lib/ids";
import {
  toProperty,
  type BackendListingPage,
} from "@/services/property-mapper";

const schema = z.object({
  listingIds: z.array(z.string().regex(BACKEND_ID_PATTERN)).min(1).max(3),
});

/** Public, allowlisted comparison data. No raw listing records leave this route. */
export async function POST(request: Request) {
  try {
    const input = schema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        { message: "Choose up to three valid properties." },
        { status: 400 },
      );
    const ids = [...new Set(input.data.listingIds)];
    const { data } = await api.post<BackendListingPage>(
      "/Inventory/listing/ids",
      { listingIds: ids },
    );
    const items = (Array.isArray(data?.data) ? data.data : [])
      .filter((row) => row && ids.includes(row._id ?? ""))
      .map(toProperty);
    return Response.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { message: "Couldn't load comparison properties. Please try again." },
      { status: 502 },
    );
  }
}
