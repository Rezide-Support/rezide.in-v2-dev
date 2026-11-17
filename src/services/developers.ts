import { BACKEND_ID_PATTERN } from "@/lib/ids";
import { ApiError, api } from "@/lib/api/client";

/*
 * A developer's contact details, shown after the "Contact Builder" form as rezide.in shows
 * them. The backend's developer record also holds bank account details, so it is read on
 * this app's server (GET /api/developers/{id}/contact) and only the fields below are copied.
 */

export type DeveloperContact = {
  name: string;
  legalName?: string;
  description?: string;
  cin?: string;
  established?: string;
  contacts: { name?: string; phone?: string; email?: string }[];
  office?: { type?: string; lines: string[]; place: string };
};

type Label = { label?: string; value?: string; name?: string } | string | number | null | undefined;
type BackendDeveloperRecord = {
  general_information?: { developer_name?: string; legal_name?: string; description?: string; cin?: string; estd_year?: string | number };
  contact_details?: {
    contact?: { name?: string; contact_number?: string | number; email_id?: string }[];
    address?: { address_type?: Label; line_1?: string; line_2?: string; locality?: Label; city?: Label; state?: Label; country?: Label; pincode?: Label }[];
  };
};

const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");
const labelOf = (v: Label) => (v && typeof v === "object" ? text(v.label) || text(v.value) || text(v.name) : text(v));

/** Server only: the developer's public contact details. */
export async function getDeveloperContact(id: string): Promise<DeveloperContact> {
  if (!BACKEND_ID_PATTERN.test(id)) throw new ApiError("This developer doesn't exist.", 404);
  const { data } = await api.get<BackendDeveloperRecord & { data?: BackendDeveloperRecord }>(`/repository/developer/${encodeURIComponent(id)}`);
  const record = data?.general_information ? data : (data?.data ?? {});
  const info = record.general_information ?? {};
  const office = record.contact_details?.address?.[0];
  return {
    name: text(info.developer_name),
    legalName: text(info.legal_name) || undefined,
    description: text(info.description) || undefined,
    cin: text(info.cin) || undefined,
    established: text(info.estd_year) || undefined,
    contacts: (record.contact_details?.contact ?? [])
      .map((c) => ({ name: text(c.name) || undefined, phone: text(c.contact_number) || undefined, email: text(c.email_id) || undefined }))
      .filter((c) => c.phone || c.email),
    office: office
      ? {
          type: labelOf(office.address_type) || undefined,
          lines: [text(office.line_1), text(office.line_2)].filter(Boolean),
          place: [office.locality, office.city, office.state, office.country, office.pincode].map(labelOf).filter(Boolean).join(", "),
        }
      : undefined,
  };
}

/** The developer's contact details, through this app's server. */
export async function fetchDeveloperContact(id: string): Promise<DeveloperContact> {
  if (typeof window === "undefined") return getDeveloperContact(id);
  const { data } = await api.get<DeveloperContact>(`/api/developers/${encodeURIComponent(id)}/contact`, { baseURL: "" });
  return data;
}
