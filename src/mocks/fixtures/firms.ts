import type { AgentSummary, FirmDetail, RealtorDetail } from "@/services/catalog";
import type { Firm, PostalAddress, Property, Realtor } from "@/types/models";
import { REALTORS } from "./realtors";

/**
 * SAMPLE DATA. Firms derived from the sample realtor directory. Addresses,
 * entity types and registrations are placeholders, not verified records.
 */
type FirmExtra = { entityType: Firm["entityType"]; address: PostalAddress; about: string };

const EXTRA: Record<string, FirmExtra> = {
  assetpro: {
    entityType: "Proprietorship",
    address: { lines: ["Office 305, Sample Chambers", "Annie Besant Road, Worli"], city: "Mumbai", pincode: "400018" },
    about: "An owner-led brokerage advising on South and Central Mumbai homes since 1994, for buyers, sellers and tenants.",
  },
  vora: {
    entityType: "Proprietorship",
    address: { lines: ["Shop 4, Sample Arcade", "S. V. Road, Andheri West"], city: "Mumbai", pincode: "400058" },
    about: "A family estate agency in the western suburbs, focused on resale flats and new-launch bookings.",
  },
  skyline: {
    entityType: "Partnership",
    address: { lines: ["Unit 12, Sample Business Centre", "Bandra Kurla Complex Road, Bandra East"], city: "Mumbai", pincode: "400051" },
    about: "Leasing specialists for homes and boutique offices between Bandra and Andheri.",
  },
  urbannest: {
    entityType: "LLP",
    address: { lines: ["2nd Floor, Sample Plaza", "Central Avenue, Powai"], city: "Mumbai", pincode: "400076" },
    about: "A rental-first advisory for Powai and Chembur, with guided paperwork from token to registration.",
  },
  keystone: {
    entityType: "Private Limited",
    address: { lines: ["Level 9, Sample Tower", "G Block, Bandra Kurla Complex"], city: "Mumbai", pincode: "400051" },
    about: "Commercial leasing and investment sales across BKC, Lower Parel and the eastern logistics corridor.",
  },
  networth: {
    entityType: "LLP",
    address: { lines: ["A-101, Sample Heights", "Western Express Highway, Goregaon East"], city: "Mumbai", pincode: "400063" },
    about: "New launches and resale in Goregaon and Thane, plus weekend homes outside the city.",
  },
  landmark: {
    entityType: "Partnership",
    address: { lines: ["Office 7, Sample Complex", "Ghodbunder Road, Thane West"], city: "Thane", pincode: "400615" },
    about: "Land parcels, warehousing and last-mile dark stores around Thane and Bhiwandi.",
  },
  crest: {
    entityType: "Proprietorship",
    address: { lines: ["Office 3, Sample House", "Sion–Trombay Road, Chembur"], city: "Mumbai", pincode: "400071" },
    about: "Helps buyers evaluate and bid on bank auction properties, from inspection to title checks.",
  },
};

export const FIRMS: Firm[] = REALTORS.map((r) => {
  const extra = EXTRA[r.firmId];
  return {
    id: r.firmId,
    name: r.firm,
    entityType: extra?.entityType ?? "Proprietorship",
    initials: r.firmInitials,
    color: r.firmColor,
    since: r.since,
    teamSize: r.teamSize,
    city: r.city,
    address: extra?.address,
    specializations: r.specializations,
    about: extra?.about ?? r.bio,
    reraId: r.reraId,
    gstin: r.gstin,
  };
});

/* ---------- Detail payloads for the mock firm and agent endpoints ---------- */

const summarize = (r: Realtor, pool: Property[]): AgentSummary => {
  const own = pool.filter((p) => p.realtorId === r.id);
  return {
    realtor: r,
    saleCount: own.filter((p) => p.intent === "buy").length,
    rentCount: own.filter((p) => p.intent === "rent").length,
  };
};

const byNewest = (a: Property, b: Property) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);

export function firmDetail(slug: string, realtors: Realtor[], properties: Property[]): FirmDetail | null {
  const firm = FIRMS.find((f) => f.id === slug.toLowerCase());
  if (!firm) return null;
  const team = realtors.filter((r) => r.firmId === firm.id);
  const ids = new Set(team.map((r) => r.id));
  const listings = properties.filter((p) => ids.has(p.realtorId)).sort(byNewest);
  return { firm, team: team.map((r) => summarize(r, listings)), listings };
}

/** Colleagues first, then other agents in the same city; at most 8. */
export function agentDetail(realtor: Realtor, realtors: Realtor[], properties: Property[]): RealtorDetail {
  const firm = FIRMS.find((f) => f.id === realtor.firmId) ?? null;
  const listings = properties.filter((p) => p.realtorId === realtor.id).sort(byNewest);
  const colleagues = realtors.filter((r) => r.firmId === realtor.firmId && r.id !== realtor.id);
  const elsewhere = realtors.filter((r) => r.firmId !== realtor.firmId && r.city === realtor.city);
  // The sample photo pool is small; skip repeats so one carousel never shows the same face twice.
  const seen = new Set([realtor.photo]);
  const others = [...colleagues, ...elsewhere]
    .filter((r) => !seen.has(r.photo) && seen.add(r.photo))
    .slice(0, 8)
    .map((r) => summarize(r, properties));
  return { realtor, firm, listings, others };
}
