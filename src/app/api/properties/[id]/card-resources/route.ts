import { z } from "zod";
import { record, text } from "@/features/realtors/directory-model";
import { ProxyError, upstream } from "@/lib/api/rezide-upstream";
import { brochureUrlFor } from "@/services/property-mapper";

/** Resolve resources on explicit action, without fetching every card's full details. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    z.string().regex(/^[a-f0-9]{24}$/i).parse(id);
    const params = new URL(request.url).searchParams;
    const resource = z.enum(["broker", "brochure"]).parse(params.get("resource"));
    if (resource === "broker") {
      const brokerId = z.string().regex(/^[a-f0-9]{24}$/i).parse(params.get("brokerId"));
      const result = record(await upstream(`/brokers/get-broker/${encodeURIComponent(brokerId)}`, undefined, 60));
      const payload = Object.keys(record(result.data)).length ? record(result.data) : result;
      const broker = Object.keys(record(payload.agent)).length ? record(payload.agent) : payload;
      const rawPhone = text(broker.full_mobile_no) || text(broker.mobile_no) || text(broker.mobile) || text(broker.phone);
      let phone = rawPhone.replace(/\D/g, "");
      if (phone.length === 10) phone = `91${phone}`;
      return Response.json({ phone: /^[1-9]\d{9,14}$/.test(phone) ? phone : null }, { headers: { "Cache-Control": "no-store" } });
    }
    const origin = (process.env.API_ORIGIN || "https://api.rezide.in").replace(/\/$/, "");
    const firmmark = `${origin}/v1/admin/file/upload/${encodeURIComponent(id)}_brochure_firmmark.pdf`;
    const headers: Record<string, string> = {};
    if (process.env.REQUEST_SERVICE_SECRET) headers["x-request-service-secret"] = process.env.REQUEST_SERVICE_SECRET;
    for (const url of [firmmark, brochureUrlFor(id)]) {
      const response = await fetch(url, { method: "HEAD", headers: url === firmmark ? headers : undefined, signal: AbortSignal.timeout(5000) });
      if (response.ok && /pdf|octet-stream/i.test(response.headers.get("content-type") || "")) return Response.json({ url });
    }
    return Response.json({ url: null });
  } catch (error) {
    return Response.json({ message: error instanceof ProxyError ? error.message : "This listing resource is unavailable. Please try again." }, { status: error instanceof z.ZodError ? 422 : error instanceof ProxyError ? error.status : 502 });
  }
}
