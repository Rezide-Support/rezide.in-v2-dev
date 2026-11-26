import { api } from "@/lib/api/client";
import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { toConfigurationPlans, type BackendProjectDetail } from "@/services/project-mapper";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!BACKEND_ID_PATTERN.test(id)) return Response.json({ message: "Invalid project." }, { status: 400 });
  try {
    const response = await api.get<{ data?: { price_range?: NonNullable<BackendProjectDetail["project"]>["price_range"] } }>("/inventory/project/price-range", { params: { id } });
    return Response.json({ data: { price_range: toConfigurationPlans({ price_range: response.data.data?.price_range ?? [] }) } });
  } catch {
    return Response.json({ message: "Couldn't load price ranges. Please try again." }, { status: 502 });
  }
}
