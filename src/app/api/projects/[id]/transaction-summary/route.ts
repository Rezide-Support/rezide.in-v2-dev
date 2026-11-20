import { api } from "@/lib/api/client";
import { BACKEND_ID_PATTERN } from "@/lib/ids";

/** Guests learn whether the section exists, never receive transaction rows. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/projects/[id]/transaction-summary">,
) {
  const { id } = await params;
  const kind = new URL(request.url).searchParams.get("kind");
  if (!BACKEND_ID_PATTERN.test(id) || !["sale", "rent"].includes(kind ?? ""))
    return Response.json(
      { message: "Invalid transaction request." },
      { status: 400 },
    );
  try {
    const { data } = await api.post<{
      result_count?: number;
      data?: unknown[];
    }>(
      "/transaction/filter",
      {
        projectIds: [id],
        transaction_type: kind === "rent" ? "Rental" : "Sale",
      },
      { params: { page: 1, pageSize: 1 } },
    );
    const hasTransactions =
      Number(data.result_count) > 0 ||
      (Array.isArray(data.data) && data.data.length > 0);
    return Response.json(
      { hasTransactions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { message: "Transaction availability couldn't be checked." },
      { status: 502 },
    );
  }
}
