import { uploadUrl } from "@/lib/api/origins";
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

/* ---------------- The developer page (rezide.in's /developers/{id}) ---------------- */

type Labelled = { label?: string } | undefined;
type BackendAddress = {
  address_type?: Labelled;
  line_1?: string;
  line_2?: string;
  pincode?: string | number;
  city?: Labelled;
  state?: Labelled;
};
export type BackendDeveloper = {
  _id?: string;
  general_information?: { developer_name?: string; description?: string; estd_year?: string | number };
  contact_details?: { address?: BackendAddress[] };
  media?: { images?: { label?: string; url?: string }[] };
};

/** One office, as rezide.in's Address popup shows it. */
export type DeveloperAddress = { type: string; line1: string; line2?: string; city?: string; pincode?: string };

export type DeveloperPage = {
  id: string;
  name: string;
  logo?: string;
  /** "Mumbai, Maharashtra": the first office's city and state. */
  place?: string;
  description: string;
  /** e.g. "1975". */
  established?: string;
  /** Office addresses that name their type ("Corporate Office"); rezide.in lists those in blue. */
  addresses: DeveloperAddress[];
  /** The offices' cities, in order. */
  cities: string[];
};

const label = (l: Labelled) => l?.label?.trim() || undefined;

/** "52+ years" since the year founded, as rezide.in counts it (whole years since 1 January). */
export function developerExperience(established: string | undefined, now = new Date()): string | undefined {
  const year = Number(established);
  if (!/^\d{4}$/.test(established ?? "") || year > now.getFullYear()) return undefined;
  return `${now.getFullYear() - year}+ years`;
}

export function toDeveloperPage(d: BackendDeveloper): DeveloperPage | null {
  const name = d.general_information?.developer_name?.trim();
  if (!d._id || !name) return null;
  const offices = d.contact_details?.address ?? [];
  const first = offices[0];
  const logoKey = d.media?.images?.find((i) => i.label === "Developer Logo")?.url?.trim();
  const established = String(d.general_information?.estd_year ?? "").trim();
  return {
    id: d._id,
    name,
    logo: logoKey ? uploadUrl(logoKey) : undefined,
    place: label(first?.city) && label(first?.state) ? `${label(first?.city)}, ${label(first?.state)}` : undefined,
    description: d.general_information?.description?.trim() ?? "",
    established: established || undefined,
    addresses: offices.flatMap((a): DeveloperAddress[] => {
      const type = label(a.address_type);
      if (!type) return [];
      return [{ type, line1: a.line_1?.trim() ?? "", line2: a.line_2?.trim() || undefined, city: label(a.city), pincode: a.pincode ? String(a.pincode).trim() : undefined }];
    }),
    cities: offices.flatMap((a) => (label(a.city) ? [label(a.city)!] : [])),
  };
}

/** A developer, or null when the backend doesn't have it. */
export async function fetchDeveloper(id: string): Promise<DeveloperPage | null> {
  if (!BACKEND_ID_PATTERN.test(id)) return null;
  const { data } = await api.get<BackendDeveloper | { data?: BackendDeveloper }>(`/repository/developer/${encodeURIComponent(id)}`);
  const record = data && "data" in data && data.data ? data.data : (data as BackendDeveloper);
  return toDeveloperPage(record);
}
