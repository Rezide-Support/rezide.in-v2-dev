import { z } from "zod";
import { api } from "@/lib/api/client";
import { apiOrigin } from "@/lib/api/origins";
import { guardLead, checkLeadBot } from "@/lib/api/lead-guard";
import { ProxyError } from "@/lib/api/proxy-error";
import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { indianMobile, personName } from "@/lib/validation";
import type { BackendListing } from "@/services/property-mapper";

const schema = z.object({
  name: personName("name"),
  phone: indianMobile,
  enquiryType: z.string().trim().min(1).max(1000),
  notes: z.string().trim().max(1500).optional(),
  website: z.string().max(0).optional(),
});

/** Guests may enquire. Resolve the firm/recipient from the listing, not from submitted IDs. */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/properties/[id]/enquiry">,
) {
  try {
    guardLead(request);
    const { id } = await params;
    if (!BACKEND_ID_PATTERN.test(id))
      return Response.json({ message: "Property not found." }, { status: 404 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { message: "Send a valid JSON enquiry." },
        { status: 400 },
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return Response.json(
        { message: "Send a valid enquiry." },
        { status: 422 },
      );
    checkLeadBot(body as Record<string, unknown>);
    const input = schema.safeParse(body);
    if (!input.success)
      return Response.json(
        { message: "Check your contact details and enquiry." },
        { status: 422 },
      );
    const { data: listing } = await api.get<BackendListing>(
      `/inventory/Listing/${id}`,
    );
    const brokerId = listing?.broker_and_agent?.broker_id;
    if (!brokerId || !BACKEND_ID_PATTERN.test(brokerId))
      return Response.json(
        { message: "Broker details are currently unavailable." },
        { status: 503 },
      );
    const { data: broker } = await api.get<{
      firm_id?: string;
      agent?: { _id?: string };
      manager?: { _id?: string };
    }>(`/brokers/get-broker/${brokerId}`);
    const personId = broker.agent?._id || broker.manager?._id;
    if (!broker.firm_id || !personId)
      return Response.json(
        { message: "Broker details are currently unavailable." },
        { status: 503 },
      );
    await api.post(`${apiOrigin()}/v1/contact/form`, {
      fname: input.data.name,
      phone: `+91${input.data.phone}`,
      firm_id: broker.firm_id,
      brokerId: personId,
      listing_id: id,
      enquiryType: input.data.enquiryType,
      ...(input.data.notes ? { notes: input.data.notes } : {}),
    });
    return Response.json(
      { message: "Your enquiry has been sent successfully." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof ProxyError
            ? error.message
            : "Couldn't send your enquiry. Please try again.",
      },
      { status: error instanceof ProxyError ? error.status : 502 },
    );
  }
}
