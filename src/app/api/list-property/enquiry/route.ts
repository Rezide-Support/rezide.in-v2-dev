import { ownerEnquirySchema, ownerEnquiryPayload } from "@/features/listing/owner-enquiry-schema";
import { guardLead } from "@/lib/api/lead-guard";
import { ProxyError, upstream } from "@/lib/api/rezide-upstream";
export async function POST(request: Request) {
  try {
    guardLead(request);
    let body: unknown;
    try { body = await request.json(); } catch { return Response.json({ message: "Invalid form data." }, { status: 400 }); }
    const parsed = ownerEnquirySchema.safeParse(body);
    if (!parsed.success) return Response.json({ message: "Please check the form fields.", errors: parsed.error.flatten().fieldErrors }, { status: 422 });
    const result = await upstream("/lead/developer-contact", ownerEnquiryPayload(parsed.data)) as { success?: boolean; status?: boolean | string | number };
    if (result.success === false || result.status === false || result.status === "error") return Response.json({ message: "Unexpected error. Please try again." }, { status: 502 });
    return Response.json({ success: true });
  } catch (error) { return Response.json({ message: error instanceof ProxyError && error.status < 500 ? error.message : "Unexpected error. Please try again." }, { status: error instanceof ProxyError ? error.status : 502 }); }
}
