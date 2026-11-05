import { api } from "@/lib/api/client";
import type { Enquiry, EnquiryInput, ListingDraft } from "@/types/models";
import { toBackendPhone } from "./auth";

/* Write endpoints. In mock mode these only update an in-memory store. Contract: docs/API.md. Auth: ./auth.ts. */

export async function createEnquiry(input: EnquiryInput) {
  const { data } = await api.post<Enquiry>("/enquiries", input);
  return data;
}

/** The Rezide backend's enquiry form, outside /v1/admin. rezide.in posts to it from the browser too. */
const CONTACT_FORM_URL = "https://api.rezide.in/v1/contact/form";

/** A listing enquiry as rezide.in sends it. It goes to the listing's broker, so it is never mocked. */
export type ListingEnquiry = {
  name: string;
  /** 10-digit mobile number. */
  phone: string;
  firmId: string;
  brokerId: string;
  listingId: string;
  enquiryType: string;
  notes?: string;
};

export async function sendListingEnquiry({ name, phone, firmId, brokerId, listingId, enquiryType, notes }: ListingEnquiry) {
  const { data } = await api.post<{ message?: string }>(CONTACT_FORM_URL, {
    name,
    firm_id: firmId,
    // In the shape rezide.in's phone field gives it.
    phone: `+${toBackendPhone(phone)}`,
    brokerId,
    listing_id: listingId,
    enquiryType,
    ...(notes ? { notes } : {}),
  });
  return data;
}

/** An enquiry to a realtor firm, as rezide.in's realtor pages send it. It goes to the firm, so it is never mocked. */
export type RealtorEnquiry = { firmId: string; firstName: string; lastName: string; phone: string; email?: string };

export async function sendRealtorEnquiry({ firmId, firstName, lastName, phone, email }: RealtorEnquiry) {
  const { data } = await api.post<{ message?: string }>("https://api.rezide.in/v1/contact/form/realtor", {
    firm_id: firmId,
    fname: firstName.trim(),
    lname: lastName.trim(),
    mobile: `+${toBackendPhone(phone)}`,
    email: email?.trim() ?? "",
    enquiryType: "realtor",
  });
  return data;
}

/** Who submits a listing. The wizard needs a signed-in user. */
export type ListingLister = { firstName: string; lastName: string; phone: string; email?: string };

/**
 * rezide.in's List Property lead, then the wizard's other main answers. rezide.in's
 * form asks only for the first group, so the backend may not keep the second.
 */
export function toListingLead(draft: ListingDraft, lister: ListingLister) {
  return {
    type: "listProperty",
    fullName: `${lister.firstName} ${lister.lastName}`.trim(),
    mobile: lister.phone,
    email: lister.email ?? "",
    locality: draft.locality ?? "",
    projectName: draft.projectName ?? "",
    flatNo: draft.unitNo ?? "",
    lookingFor: draft.intent === "rent" ? "List property for rent" : "List property for sale",
    source: "Rezide.in property listing form",

    role: draft.role,
    ownerName: draft.ownerName,
    ownerMobile: draft.ownerMobile,
    city: draft.city,
    region: draft.region,
    subRegion: draft.subRegion,
    address: draft.address,
    pincode: draft.pincode,
    category: draft.category,
    unitType: draft.unitType,
    tower: draft.tower,
    floor: draft.floor,
    price: draft.price,
  };
}

/** Sends a listing to the Rezide team as a lead, as rezide.in does. It isn't published or saved as a listing. */
export async function submitListing(draft: ListingDraft, lister: ListingLister) {
  await api.post("/lead/developer-contact", toListingLead(draft, lister));
}

/** Realtor Corner "Get a callback" form. */
export type CallbackInput = {
  firstName: string;
  lastName?: string;
  mobile: string;
  email?: string;
  firm?: string;
  message?: string;
};

export async function requestCallback(input: CallbackInput) {
  const { data } = await api.post<{ id: string; status: "received" }>("/callbacks", input);
  return data;
}

/** Realtor Corner 14-day trial request (sent after the mobile number is OTP-verified). */
export type TrialRequestInput = {
  mobile: string;
  firstName: string;
  lastName: string;
  firm: string;
  reraId: string;
  city: string;
  membership: "nar" | "other";
  associations: string[];
};

export async function requestTrial(input: TrialRequestInput) {
  const { data } = await api.post<{ id: string; status: "pending_review" }>("/trial-requests", input);
  return data;
}
