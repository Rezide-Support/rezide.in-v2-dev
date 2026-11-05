/**
 * Realtor CRM (/dashboard) models: the proposed API contract for
 * `/dashboard/*` (see docs/API.md → Dashboard). Shared by the UI, the service
 * layer (src/services/dashboard.ts) and the mock API.
 *
 * Dates are ISO calendar dates (`YYYY-MM-DD`) unless noted. Mobile numbers are
 * accepted with spaces ("98200 87676"); the last 10 digits are what counts.
 */

import type { ContactType } from "@/lib/constants";

export type { ContactType };

export interface Relative {
  id: string;
  firstName: string;
  lastName: string;
  relation: string;
  mobile: string;
  email: string;
  /** ISO date, or "" when unknown. */
  dob: string;
  status: "Active" | "Not Active";
}

export interface ContactProperty {
  id: string;
  unit: string;
  project: string;
  relation: string;
  locality: string;
  propertyType: string;
  unitType: string;
  source: "Rezide" | "Manual";
}

export interface ContactLead {
  looking: string;
  propertyType: string;
  stage: string;
  flag: "Hot" | "Warm" | "Cold";
  /** Display range as entered, e.g. "₹ 3 – 4 Cr". Free text in the prototype. */
  budget: string;
  assignedTo: string;
  /** ISO date. */
  created: string;
}

/** Keys of the optional detail sections (Occupation, Personal, Statutory, Social, Address, Financial). */
export type ContactDetailKey =
  | "occupation" | "designation" | "organisation"
  | "source" | "dob" | "marital" | "residentStatus"
  | "pan" | "panFile" | "aadhaar" | "aadhaarFile" | "passport" | "passportFile" | "tan" | "gst"
  | "linkedin" | "facebook" | "instagram" | "x"
  | "line1" | "line2" | "country" | "state" | "city" | "pin" | "permanentSame" | "permanentLine" | "permanentCity" | "permanentPin"
  | "bank" | "accountType" | "nameAsPerBank" | "branch" | "accountNo" | "ifsc" | "upi1" | "upi2";

export interface Contact {
  id: string;
  type: ContactType;
  subType: string;
  /** Brokers and vendors can be a company with a contact person; developers always have a company. */
  entity: "Individual" | "Company";
  company?: string;
  salutation: string;
  firstName: string;
  lastName: string;
  mobile: string;
  altMobile?: string;
  email?: string;
  altEmail?: string;
  /** "Upload" for imported rows, otherwise the member who added the contact. Server-assigned. */
  addedBy: string;
  /** ISO date. Server-assigned. */
  addedOn: string;
  firmLevel: boolean;
  /** Up to 4. */
  labels: string[];
  groupIds: string[];
  details: Partial<Record<ContactDetailKey, string>>;
  relatives: Relative[];
  properties: ContactProperty[];
  leads: ContactLead[];
}

/** Body of POST /dashboard/contacts. Server assigns id, addedOn and addedBy. */
export type ContactInput = Partial<Omit<Contact, "id" | "addedOn" | "addedBy">> & Pick<Contact, "firstName" | "mobile">;
/** Body of PATCH /dashboard/contacts/:id (merge patch). */
export type ContactPatch = Partial<Omit<Contact, "id" | "addedOn" | "addedBy">>;

export interface ContactGroup {
  id: string;
  name: string;
  description: string;
  /** ISO date. */
  created: string;
}

export type GroupWithCount = ContactGroup & { count: number };

/** Body of POST /dashboard/groups and PATCH /dashboard/groups/:id. `contactIds` replaces the membership when present. */
export type GroupInput = { name?: string; description?: string; contactIds?: string[] };

export interface UploadFile {
  id: string;
  name: string;
  uploadedBy: string;
  /** ISO date. */
  date: string;
  /** Display time, e.g. "11:42 AM". */
  time: string;
  assignedTo: string;
  records: number;
  errors: number;
}

/** One row of an uploaded file, matched to an existing contact by mobile number. */
export type UploadRecord = { name: string; mobile: string; contactId?: string; contactType?: string };
export type UploadDetail = { file: UploadFile; records: UploadRecord[] };

export type MemberRole = "admin" | "manager" | "agent";

export interface TeamMember {
  id: string;
  name: string;
  role: MemberRole;
  teamIds: string[];
  areas: string;
  email: string;
  phone: string;
  reportsTo?: string;
}

export interface Team {
  id: string;
  name: string;
  managerId: string;
  area: string;
}

export type TeamData = { members: TeamMember[]; teams: Team[]; seatsTotal: number; renewsOn: string };
/** Body of PATCH /dashboard/team: whichever list is present replaces the stored one. */
export type TeamPatch = { members?: TeamMember[]; teams?: Team[] };

export interface CreditEntry {
  id: string;
  /** ISO date. */
  date: string;
  activity: string;
  by: string;
  /** Credits added (positive) or spent (negative). */
  amount: number;
  /** Balance after this entry. */
  balance: number;
}

export type CreditsData = {
  balance: number;
  monthlyGrant: number;
  /** ISO date the licence renews. */
  renewsOn: string;
  /** ISO date the current statement is cut. */
  statementDate: string;
  entries: CreditEntry[];
};

export interface FirmProfile {
  name: string;
  /** e.g. "LLP", "Private Limited", "Proprietorship". */
  type: string;
  /** Year, as text ("2010"). */
  since: string;
  website: string;
  /** File name or URL; uploads are not connected. */
  logo: string;
  cover: string;
  tagline: string;
  /** Hex colour. */
  brandColour: string;
  primaryContact: string;
  primaryDesignation: string;
  primaryMobile: string;
  primaryEmail: string;
  secondaryContact: string;
  secondaryDesignation: string;
  secondaryMobile: string;
  secondaryEmail: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  branchAddress: string;
  branchCity: string;
  branchPincode: string;
  about: string;
  instagram: string;
  linkedin: string;
  facebook: string;
  youtube: string;
  x: string;
  propertyTypes: string[];
  specializations: string[];
  cities: string[];
  regions: string[];
  subRegions: string[];
  localities: string[];
  projects: string[];
  reraState: string;
  reraId: string;
  gstin: string;
}

export interface MyProfile {
  /** File name or URL; uploads are not connected. */
  photo: string;
  salutation: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  since: string;
  languages: string[];
  about: string;
  /** Masked by the server ("XXXX XXXX 4417"); the full number is never returned. */
  aadhaar: string;
  aadhaarFile: string;
  reraId: string;
  specializations: string[];
  cities: string[];
  regions: string[];
  subRegions: string[];
  localities: string[];
  projects: string[];
}

/** CRM property type for "Associate Property" (not the public catalogue category). */
export type CrmPropertyType = "Residential" | "Commercial" | "Land";

/** A Rezide project that a contact's unit can be associated with. */
export interface AssociableProject {
  id: string;
  name: string;
  developer: string;
  /** Display locality, e.g. "JVLR · Jogeshwari East". */
  locality: string;
  propertyType: CrmPropertyType;
  unitTypes: string[];
  /** Towers / wings / phases. */
  towers: string[];
}

/** Query of GET /dashboard/associable-projects. */
export type AssociableProjectQuery = { propertyType: CrmPropertyType; unitType: string; q?: string };
