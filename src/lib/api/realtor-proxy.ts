import { guardSearch } from "./search-guard";
import { publicFirm, image, membershipNames, publicSocials, publicAddresses, publicAddressCards } from "@/features/realtors/public-mapper";
import { BACKEND_ID_PATTERN } from "@/lib/ids";
import "server-only";
import { guardLead, checkLeadBot } from "./lead-guard";
import { ProxyError, upstream } from "./rezide-upstream";
import { z } from "zod";
import { count, record, text } from "@/features/realtors/directory-model";
import { toProperty, type BackendListing } from "@/services/property-mapper";
import { realtorContactInput } from "@/features/realtors/contact-input";


const stringList = z.array(z.string().trim().min(1).max(200)).max(100).optional();
const filtersSchema = z.object({ subRegions: stringList, locality: stringList, projects: stringList, searchParams: stringList, specialization: stringList });
const phone = z.string().transform(v => v.replace(/\s/g, "")).pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."));
const name = z.string().trim().min(2).max(100);
const email = z.email().max(254);

export const invitationInput = z.object({ type: z.literal("listRealtors"), fullName: name, email, mobile: phone, realtorName: name, source: z.literal("Rezide.in find realtor page") });

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
    // No city filter, as rezide.in's find-broker search: most firms have no address city on the
    // backend, so filtering by city hid them (Mumbai showed 7 of the 34 active firms, others 0).
    const upstreamParams = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const raw = record(await upstream(`/brokers/filter/web?${upstreamParams}`, { status: "complete", active_status: "active", sortBy: [1], ...filters }, 60));
    const total = count(raw.broker_count);
    if (!Array.isArray(raw.data) || total === null || !Number.isInteger(total)) throw new ProxyError("The directory response is missing firms or its total.", 502);
    return { data: raw.data.map(publicFirm), broker_count: total, page, pageSize,
      ...Object.fromEntries(["pageCount", "totalPages", "total_pages"].filter(k => count(raw[k]) !== null).map(k => [k, count(raw[k])])) };
  });
}
export async function searchRoute(request: Request) {
  return handle(async () => {
    guardSearch(request);
    const p = new URL(request.url).searchParams, q = (p.get("q") || "").trim();
    if (!q) return { result: [] };
    if (q.length > 200 || (p.get("scope") && p.get("scope") !== "broker")) throw new ProxyError("Invalid realtor search.", 400);
    const city = z.string().trim().max(100).parse(p.get("city") || "");
    const raw = record(await upstream(`/repository/locality/search/list/${encodeURIComponent(q)}/broker${city ? `?city=${encodeURIComponent(city)}` : ""}`, undefined, 0));
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
    const socials = publicSocials(info);
    return { ...publicFirm(source), about: text(info.about_us), entityType: text(record(info.firm_type).name),
      addresses: publicAddresses(source.addresses), addressCards: publicAddressCards(source.addresses), socials };
  });
}

/** Map listings on the server; raw prices and private backend fields never leave here. */
export async function firmListingsRoute(request: Request) {
  return handle(async () => {
    const params = new URL(request.url).searchParams;
    const firmId = params.get("firm_id"), brokerId = params.get("broker_id");
    if (!!firmId === !!brokerId) throw new ProxyError("Provide either a firm ID or a realtor ID.", 422);
    const targetId = z.string().trim().min(1).max(200).parse(brokerId || firmId);
    const purpose = z.enum(["sale", "rent"]).parse(params.get("purpose") || "sale");
    const page = positive(params.get("page"), 1, 10000), pageSize = 9;
    const raw = record(await upstream(`/inventory/Listing/mobile/all?${brokerId ? "broker_id" : "firm_id"}=${encodeURIComponent(targetId)}`, { page, pageSize, property_purpose: purpose }, 60));
    if (!Array.isArray(raw.data)) throw new ProxyError("The listing service returned an invalid response.", 502);
    const sale = count(raw.result_sale), rent = count(raw.result_rent);
    if (sale === null || rent === null) throw new ProxyError("The listing service did not return listing totals.", 502);
    const total = purpose === "sale" ? sale : rent;
    return { items: raw.data.filter(value => text(record(record(value).commercial_details).property_purpose) === purpose).map(value => toProperty(record(value) as BackendListing)), sale, rent, total, page, perPage: pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  });
}
export async function personProfileRoute(request: Request) {
  return handle(async () => {
    const lookupId = z.string().regex(BACKEND_ID_PATTERN, "A valid realtor ID is required.").parse(new URL(request.url).searchParams.get("lookupId"));
    const result = record(await upstream(`/brokers/get-broker/${encodeURIComponent(lookupId)}`, undefined, 60));
    const raw = Object.keys(record(result.data)).length ? record(result.data) : result;
    const person = record(raw.manager ?? raw.agent), info = record(raw.general_information);
    const id = text(person._id);
    if (!id) throw new ProxyError("Realtor not found.", 404);
    const firstName = text(person.fname), since = record(info.operating_since).value;
    const phone = (text(person.full_mobile_no) || text(person.mobile_no)).replace(/\D/g, "");
    const socials = publicSocials(info);
    return { lookupId, id, firstName, name: [firstName, text(person.lname)].filter(Boolean).join(" ") || "Name unavailable", photo: image(person.logo),
      firmId: text(raw.firm_id) || text(record(raw.firm_id)._id), firmName: text(info.firm_name), since: typeof since === "number" ? String(since) : text(since),
      about: text(person.bio), languages: membershipNames(person.language), specializations: membershipNames(person.specialization).length ? membershipNames(person.specialization) : membershipNames(person.Specialization), memberOf: membershipNames(person.member_of),
      subRegions: membershipNames(person.Sub_regions ?? person.subRegions), localities: membershipNames(person.localities), projects: membershipNames(person.projects),
      addresses: publicAddresses(raw.addresses), socials,
      maskedPhone: phone.length >= 10 ? `+${phone.slice(0, -10) || "91"}${phone.slice(-10, -5)}XXXXX` : "Not provided" };
  });
}
export async function contactRoute(request: Request) {
  return handle(async () => {
    guardLead(request);
    const body = record(await json(request)); checkLeadBot(body);
    const input = realtorContactInput.parse({ ...body, source: "rezide" });
    const raw = record(await upstream("/lead/receive", input));
    return { message: text(raw.message) || "Your request has been sent." };
  });
}
export async function invitationRoute(request: Request) {
  return handle(async () => {
    guardLead(request);
    const body = record(await json(request)); checkLeadBot(body);
    const input = invitationInput.parse(body);
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
