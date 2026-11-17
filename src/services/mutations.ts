import { publicApiOrigin } from "@/lib/api/origins";
import { api } from "@/lib/api/client";
import type { Enquiry, EnquiryInput, ListingDraft } from "@/types/models";
import { toBackendPhone } from "./auth";

/* Write endpoints. In mock mode these only update an in-memory store. Contract: docs/API.md. Auth: ./auth.ts. */

export async function createEnquiry(input: EnquiryInput) {
  const { data } = await api.post<Enquiry>("/enquiries", input);
  return data;
}

/** The Rezide backend's enquiry form, outside /v1/admin. rezide.in posts to it from the browser too. */
const CONTACT_FORM_URL = `${publicApiOrigin()}/v1/contact/form`;

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

/** An enquiry about a project, as rezide.in's project contact card sends it. It goes to the Rezide team. Never mocked. */
export type ProjectEnquiry = {
  name: string;
  /** 10-digit mobile number. */
  phone: string;
  email?: string;
  /** What they asked for: the form's option. */
  intent: string;
  developerName: string;
  projectName: string;
  location: string;
  budgetMin?: number;
  budgetMax?: number;
  pageUrl: string;
};

export async function sendProjectEnquiry({ name, phone, email, intent, developerName, projectName, location, budgetMin, budgetMax, pageUrl }: ProjectEnquiry) {
  await api.post("/lead/developer-contact", {
    name,
    mobile: phone,
    email: email ?? "",
    developerName,
    projectName,
    location,
    budgetMin: budgetMin || "",
    budgetMax: budgetMax || "",
    siteVisitInterest: /visit/i.test(intent),
    homeLoanInterest: false,
    message: intent,
    pageUrl,
    source: "Rezide.in contact widget",
  });
}

/** rezide.in's "Contact Builder" form (About developer), sent as its lead body. Never mocked. */
export type DeveloperContactLead = {
  name: string;
  mobile: string;
  email: string;
  developerName: string;
  projectName: string;
  location: string;
  isPropertyBroker: boolean;
  /** Not asked of brokers. */
  reasonToBuy?: "Investment" | "Self Use";
  needPropertyIn?: "Less than 3 months" | "Less than 6 months" | "More than 6 months";
  homeLoanInterest?: boolean;
  siteVisitInterest?: boolean;
  budgetMin?: number;
  budgetMax?: number;
  pageUrl: string;
};

export async function sendDeveloperContactLead(lead: DeveloperContactLead) {
  const broker = lead.isPropertyBroker;
  await api.post("/lead/developer-contact", {
    name: lead.name.trim(),
    mobile: lead.mobile.trim(),
    email: lead.email.trim(),
    developerName: lead.developerName,
    projectName: lead.projectName,
    needPropertyIn: broker ? "" : (lead.needPropertyIn ?? ""),
    reasonToBuy: broker ? "" : (lead.reasonToBuy ?? ""),
    isPropertyBroker: broker ? "Yes" : "No",
    location: lead.location,
    homeLoanInterest: !broker && Boolean(lead.homeLoanInterest),
    siteVisitInterest: !broker && Boolean(lead.siteVisitInterest),
    pageUrl: lead.pageUrl,
    source: "Rezide.in contact widget",
    // As on rezide.in, a broker's enquiry carries no budget.
    ...(broker ? {} : { budgetMin: lead.budgetMin || "", budgetMax: lead.budgetMax || "" }),
  });
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
