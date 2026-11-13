import "server-only";
import { ProxyError, upstream } from "./rezide-upstream";
import { z } from "zod";
import { array, count, labels, record, text, type DirectoryFirm } from "@/features/realtors/directory-model";
import { toProperty, type BackendListing } from "@/services/property-mapper";
import { toBackendCity } from "@/services/locations";

const origin = () => (process.env.API_ORIGIN || "https://api.rezide.in").replace(/\/$/, "");
const stringList = z.array(z.string().trim().min(1).max(200)).max(100).optional();
const filtersSchema = z.object({ subRegions: stringList, locality: stringList, projects: stringList, searchParams: stringList, specialization: stringList });
const phone = z.string().transform(v => v.replace(/\s/g, "")).pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."));
const name = z.string().trim().min(2).max(100);
const email = z.email().max(254);

export const contactInput = z.object({ firm_id: z.string().trim().min(1).max(200), fname: name, lname: z.string().trim().max(100).default(""), mobile: phone, email, enquiryType: z.literal("realtor") });
export const invitationInput = z.object({ type: z.literal("listRealtors"), fullName: name, email, mobile: phone, realtorName: name, source: z.literal("Rezide.in find realtor page") });

function image(value: unknown) {
  const file = text(value);
  return file ? `${origin()}/v1/admin/file/upload/${encodeURIComponent(file)}` : "";
}
/** Keep only public membership names, never forward the backend objects. */
function membershipNames(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(item => text(item) || text(record(item).label) || text(record(item).name)).filter(Boolean))];
}
/** Explicit allowlist: backend rows include Aadhaar/PAN, phone numbers and documents. */
function publicFirm(value: unknown): DirectoryFirm {
  const firm = record(value), info = record(firm.general_information), docs = record(firm.documents);
  if (!text(firm._id) || !text(info.firm_name)) throw new ProxyError("The directory returned a firm without an ID or name.", 502);
  const seen = new Set<string>();
  const specializations = labels(info.specialization);
  const people = [...array(firm.managers), ...array(firm.agents)].flatMap(value => {
    const person = record(value), id = text(person._id);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const specialties = labels(person.specialization).length ? labels(person.specialization) : labels(person.Specialization);
    const memberOf = membershipNames(person.member_of);
    return [{ id, name: [text(person.fname), text(person.lname)].filter(Boolean).join(" ") || "Name unavailable", photo: image(person.logo), languages: labels(person.language), specializations: specialties.length ? specialties : specializations, memberOf, salutation: text(person.salutation) || text(record(person.salutation).label) }];
  });
  const since = record(info.operating_since).value;
  return { id: text(firm._id), name: text(info.firm_name), logo: image(info.logo), since: typeof since === "number" ? String(since) : text(since), specializations, subRegions: labels(info.allSubRegions), localities: labels(info.allLocalities), projects: labels(info.allProjects), rera: text(docs.rera_no), gst: text(docs.gst_no), rent: count(firm.total_listing_rental_count), sale: count(firm.total_listing_sale_count), people };
}

function positive(value: string | null, fallback: number, max: number) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}
async function json(request: Request) {
  try { return await request.json(); } catch { throw new ProxyError("Send a valid JSON body.", 400); }
}
export async function directoryRoute(request: Request) {
  return handle(async () => {
    const params = new URL(request.url).searchParams;
    const parsed = filtersSchema.parse(await json(request));
    const filters = Object.fromEntries(Object.entries(parsed).filter(([, values]) => values?.length));
    const page = positive(params.get("page"), 1, 10000), pageSize = positive(params.get("pageSize"), 6, 100);
    const city = z.string().trim().max(200).parse(params.get("city") || "");
    const upstreamParams = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (city) upstreamParams.set("city", toBackendCity(city));
    const raw = record(await upstream(`/brokers/filter/web?${upstreamParams}`, { status: "complete", active_status: "active", sortBy: [1], ...filters }, 60));
    const total = count(raw.broker_count);
    if (!Array.isArray(raw.data) || total === null || !Number.isInteger(total)) throw new ProxyError("The directory response is missing firms or its total.", 502);
    return { data: raw.data.map(publicFirm), broker_count: total, page, pageSize,
      ...Object.fromEntries(["pageCount", "totalPages", "total_pages"].filter(k => count(raw[k]) !== null).map(k => [k, count(raw[k])])) };
  });
}
export async function searchRoute(request: Request) {
  return handle(async () => {
    const p = new URL(request.url).searchParams, q = (p.get("q") || "").trim();
    if (!q) return { result: [] };
    if (q.length > 200 || (p.get("scope") && p.get("scope") !== "broker")) throw new ProxyError("Invalid realtor search.", 400);
    const city = p.get("city");
    const raw = record(await upstream(`/repository/locality/search/list/${encodeURIComponent(q)}/broker${city ? `?city=${encodeURIComponent(city)}` : ""}`, undefined, 300));
    if (!Array.isArray(raw.result)) throw new ProxyError("The search service returned invalid suggestions.", 502);
    return { result: raw.result.map(value => { const s = record(value); return { source: text(s.source), name: text(s.name), id: text(s._id), firmName: text(s.firm_name) }; }).filter(s => s.name) };
  });
}
export async function countsRoute(request: Request) {
  return handle(async () => {
    const id = new URL(request.url).searchParams.get("firm_id")?.trim();
    if (!id || id.length > 200) throw new ProxyError("A firm ID is required.", 400);
    const raw = record(await upstream(`/inventory/Listing/mobile/all?firm_id=${encodeURIComponent(id)}`, {}, 60));
    return { rent: count(raw.result_rent), sale: count(raw.result_sale) };
  });
}
/** Firm-name lookup shared by the current and legacy public profile URLs. */
export async function firmProfileRoute(request: Request) {
  return handle(async () => {
    const firmName = z.string().trim().min(1).max(200).parse(new URL(request.url).searchParams.get("name"));
    const raw = record(await upstream(`/brokers/filter/web?searchParams=${encodeURIComponent(firmName)}&page=1&pageSize=9`, { searchParams: firmName }, 60));
    if (!Array.isArray(raw.data)) throw new ProxyError("The firm service returned an invalid response.", 502);
    if (!raw.data.length) throw new ProxyError("Firm not found.", 404);
    const source = record(raw.data[0]), info = record(source.general_information);
    const socials = [["LinkedIn", info.linkedln], ["Facebook", info.facebook], ["Instagram", info.instagram], ["YouTube", info.youtube]].flatMap(([label, value]) => {
      try { const url = new URL(text(value)); return ["https:", "http:"].includes(url.protocol) ? [{ label: String(label), url: url.href }] : []; } catch { return []; }
    });
    return { ...publicFirm(source), about: text(info.about_us), entityType: text(record(info.firm_type).name),
      addresses: array(source.addresses).map(value => { const address = record(value); return [address.line1, address.line2, address.city, address.pincode].map(text).filter(Boolean).join(", "); }).filter(Boolean), socials };
  });
}

/** Map listings on the server; raw prices and private backend fields never leave here. */
export async function firmListingsRoute(request: Request) {
  return handle(async () => {
    const params = new URL(request.url).searchParams;
    const firmId = z.string().trim().min(1).max(200).parse(params.get("firm_id"));
    const purpose = z.enum(["sale", "rent"]).parse(params.get("purpose") || "sale");
    const page = positive(params.get("page"), 1, 10000), pageSize = 9;
    const raw = record(await upstream(`/inventory/Listing/mobile/all?firm_id=${encodeURIComponent(firmId)}`, { page, pageSize, property_purpose: purpose }, 60));
    if (!Array.isArray(raw.data)) throw new ProxyError("The listing service returned an invalid response.", 502);
    const sale = count(raw.result_sale), rent = count(raw.result_rent);
    if (sale === null || rent === null) throw new ProxyError("The listing service did not return listing totals.", 502);
    const total = purpose === "sale" ? sale : rent;
    return { items: raw.data.map(value => toProperty(record(value) as BackendListing)), sale, rent, total, page, perPage: pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  });
}
export async function contactRoute(request: Request) {
  return handle(async () => {
    const input = contactInput.parse(await json(request));
    const raw = record(await upstream("/contact/form/realtor", input, 0, false));
    return { message: text(raw.message) || "Your request has been sent." };
  });
}
export async function invitationRoute(request: Request) {
  return handle(async () => {
    const input = invitationInput.parse(await json(request));
    const raw = record(await upstream("/lead/developer-contact", input));
    return { message: text(raw.message) || "Your invitation request has been sent." };
  });
}
async function handle(action: () => Promise<unknown>) {
  try { return Response.json(await action(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    if (error instanceof z.ZodError) return Response.json({ message: error.issues[0]?.message || "Invalid request." }, { status: 422 });
    return Response.json({ message: error instanceof ProxyError ? error.message : "The realtor request could not be completed." }, { status: error instanceof ProxyError ? error.status : 500 });
  }
}
