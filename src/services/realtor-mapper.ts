import { sanitizePublicFirmRecord } from "@/features/realtors/public-mapper";
import type { Firm, PostalAddress, Realtor, RealtorCredential } from "@/types/models";
import { cityLabel } from "./locations";
import { cdnImage, PLACEHOLDER_IMAGE } from "./property-mapper";

/*
 * Rezide backend firm records → the UI's Firm and Realtor. These records also hold
 * PAN and Aadhaar numbers, bank details, mobile numbers and emails. Only the fields
 * named here are copied, so none of those can reach the browser.
 */

type Label = string | { label?: string } | null;

/** The fields read from a firm's manager or agent. */
export type BackendPerson = {
  _id?: string;
  fname?: string;
  lname?: string;
  salutation?: { label?: string } | null;
  certification_no?: string;
  bio?: string;
  logo?: string;
  isOwner?: boolean;
  operating_since?: { value?: string } | null;
  cities?: Label[];
  Sub_regions?: Label[];
  localities?: Label[];
  projects?: Label[];
  language?: Label[];
  specialization?: Label[];
};

/** The fields read from a firm. */
export type BackendFirm = {
  _id?: string;
  managers?: BackendPerson[];
  agents?: BackendPerson[];
  addresses?: { line1?: string; line2?: string; pincode?: string; city?: string; address_type?: string }[];
  documents?: { rera_no?: string; gst_no?: string };
  total_listing_sale_count?: number;
  total_listing_rental_count?: number;
  general_information?: {
    firm_name?: string;
    firm_type?: { name?: string } | null;
    about_us?: string;
    logo?: string;
    operating_since?: { value?: string } | null;
    specialization?: Label[];
    allCities?: Label[];
    allSubRegions?: Label[];
    allLocalities?: Label[];
    allProjects?: Label[];
    linkedln?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
};

const labels = (list: Label[] | undefined): string[] =>
  [...new Set((list ?? []).map((l) => (typeof l === "string" ? l : (l?.label ?? "")).trim()).filter(Boolean))];

/** The backend's names for what the search filters call otherwise. */
const SPECIALIZATIONS: Record<string, string> = { "Residential Outright": "Residential Sales", "Commercial Outright": "Commercial Sales" };
const specializations = (list: Label[] | undefined) => [...new Set(labels(list).map((s) => SPECIALIZATIONS[s] ?? s))];

const LANGUAGES: Record<string, string> = { Gujrati: "Gujarati" };
const languages = (list: Label[] | undefined) => labels(list).map((l) => LANGUAGES[l] ?? l);

/** Firm brand colours: the backend has none, so each firm keeps one by its id. */
const FIRM_COLORS = ["#1f3a5f", "#7a3e2b", "#2f5d50", "#5b3a7a", "#8a5a14", "#1e5a7a"];
const firmColor = (id: string) => FIRM_COLORS[[...id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % FIRM_COLORS.length];

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const yearOf = (since: { value?: string } | null | undefined) => Number(since?.value) || 0;

const genderOf = (salutation: string | undefined): Realtor["gender"] => {
  if (salutation === "Mr.") return "Male";
  return salutation === "Ms." || salutation === "Mrs." || salutation === "Miss" ? "Female" : undefined;
};

function registeredAddress(raw: BackendFirm): PostalAddress | undefined {
  const a = raw.addresses?.find((x) => x.address_type === "registered") ?? raw.addresses?.[0];
  if (!a?.line1?.trim()) return undefined;
  return { lines: [a.line1, a.line2].map((l) => l?.trim() ?? "").filter(Boolean), city: cityLabel(a.city?.trim() ?? ""), pincode: a.pincode || undefined };
}

/** Where a firm works: what it states, else where it's registered. Many firms state nothing. */
function firmCities(raw: BackendFirm): string[] {
  const stated = labels(raw.general_information?.allCities);
  const registered = raw.addresses?.find((a) => a.address_type === "registered")?.city?.trim();
  return (stated.length ? stated : registered ? [registered] : []).map(cityLabel);
}

export function toFirm(raw: BackendFirm): Firm {
  raw = sanitizePublicFirmRecord(raw) as BackendFirm;
  const g = raw.general_information ?? {};
  const id = String(raw._id ?? "");
  const name = (g.firm_name ?? "").trim();
  return {
    id,
    name,
    entityType: (g.firm_type?.name ?? "").trim(),
    initials: initialsOf(name),
    color: firmColor(id),
    since: yearOf(g.operating_since),
    teamSize: (raw.managers?.length ?? 0) + (raw.agents?.length ?? 0),
    city: firmCities(raw)[0] ?? "",
    address: registeredAddress(raw),
    specializations: specializations(g.specialization),
    about: g.about_us?.trim() || undefined,
    reraId: raw.documents?.rera_no?.trim() || undefined,
    gstin: raw.documents?.gst_no?.trim() || undefined,
    logo: g.logo ? cdnImage(g.logo) : undefined,
  };
}

export function toRealtor(person: BackendPerson, raw: BackendFirm): Realtor {
  raw = sanitizePublicFirmRecord(raw) as BackendFirm;
  person = sanitizePublicFirmRecord({ _id: raw._id, general_information: raw.general_information, managers: [person] }).managers[0] as BackendPerson;
  const firm = toFirm(raw);
  const g = raw.general_information ?? {};
  const id = String(person._id ?? "");
  const stated = labels(person.cities).map(cityLabel);
  const cities = stated.length ? stated : firmCities(raw);
  const reraId = person.certification_no?.trim() || firm.reraId || "";
  const credentials: RealtorCredential[] = [...(reraId ? (["RERA"] as const) : []), ...(firm.gstin ? (["GST"] as const) : [])];
  const own = specializations(person.specialization);
  const subRegions = labels(person.Sub_regions);
  return {
    id,
    name: `${person.fname?.trim() ?? ""} ${person.lname?.trim() ?? ""}`.trim(),
    firm: firm.name,
    firmInitials: firm.initials,
    firmColor: firm.color,
    reraId,
    gstin: firm.gstin,
    since: yearOf(person.operating_since) || firm.since,
    teamSize: firm.teamSize,
    // Filled in per request: counting listings is a call for each person.
    saleListings: raw.total_listing_sale_count ?? 0,
    rentalListings: raw.total_listing_rental_count ?? 0,
    city: cities[0] ?? "",
    cities,
    localities: labels(person.localities).length ? labels(person.localities) : labels(g.allLocalities),
    buildings: labels(person.projects).length ? labels(person.projects) : labels(g.allProjects),
    specializations: own.length ? own : firm.specializations,
    languages: languages(person.language),
    gender: genderOf(person.salutation?.label?.trim()),
    credentials,
    photo: person.logo ? cdnImage(person.logo) : (firm.logo ?? PLACEHOLDER_IMAGE),
    bio: person.bio?.trim() ?? "",
    firmId: firm.id,
    // Ids keep every profile's address unique; the backend has no slugs.
    slug: id,
    subRegions: subRegions.length ? subRegions : labels(g.allSubRegions),
    role: person.isOwner ? "Owner" : (raw.managers ?? []).some((m) => m._id === person._id) ? "Manager" : "Agent",
    address: registeredAddress(raw),
    socials: {
      ...(g.linkedln?.trim() ? { linkedin: g.linkedln.trim() } : {}),
      ...(g.facebook?.trim() ? { facebook: g.facebook.trim() } : {}),
      ...(g.instagram?.trim() ? { instagram: g.instagram.trim() } : {}),
      ...(g.youtube?.trim() ? { youtube: g.youtube.trim() } : {}),
    },
  };
}

/** Everyone in a firm with an id and a name: owner first, then managers, then agents. */
export function realtorsOf(raw: BackendFirm): Realtor[] {
  const people = [...(raw.managers ?? []), ...(raw.agents ?? [])].sort((a, b) => Number(!!b.isOwner) - Number(!!a.isOwner));
  return people.map((p) => toRealtor(p, raw)).filter((r) => r.id && r.name);
}