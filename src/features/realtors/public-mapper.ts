import { apiOrigin as origin } from "@/lib/api/origins";
import { ProxyError } from "@/lib/api/proxy-error";
import { array, count, labels, record, text, type DirectoryFirm, type FirmAddress } from "./directory-model";
export function image(value: unknown) {
  const file = text(value);
  return file ? `${origin()}/v1/admin/file/upload/${encodeURIComponent(file)}` : "";
}
/** Keep only public membership names, never forward the backend objects. */
export function membershipNames(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(item => text(item) || text(record(item).label) || text(record(item).name)).filter(Boolean))];
}
/** Explicit allowlist: backend rows include Aadhaar/PAN, phone numbers and documents. */
export function publicFirm(value: unknown): DirectoryFirm {
  const firm = record(sanitizePublicFirmRecord(value)), info = record(firm.general_information), docs = record(firm.documents);
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

/** Single raw-record privacy boundary shared by live and compatibility DTOs. */
export function sanitizePublicFirmRecord(value: unknown) {
  const source=record(value), info=record(source.general_information), docs=record(source.documents);
  const list=(value:unknown)=>membershipNames(value).map(label=>({label}));
  const since=(value:unknown)=>({value:text(record(value).value)||String(record(value).value ?? "")});
  const person=(value:unknown)=>{const p=record(value);return {_id:text(p._id),fname:text(p.fname),lname:text(p.lname),logo:text(p.logo),salutation:{label:text(p.salutation)||text(record(p.salutation).label)},certification_no:text(p.certification_no),bio:text(p.bio),isOwner:p.isOwner===true,operating_since:since(p.operating_since),cities:list(p.cities),Sub_regions:list(p.Sub_regions),localities:list(p.localities),projects:list(p.projects),language:list(p.language),specialization:list(p.specialization ?? p.Specialization),member_of:list(p.member_of)}};
  const social=(value:unknown)=>{try{const u=new URL(text(value));return ['http:','https:'].includes(u.protocol)?u.href:""}catch{return ""}};
  return {_id:text(source._id),general_information:{firm_name:text(info.firm_name),firm_type:{name:text(record(info.firm_type).name)},about_us:text(info.about_us),logo:text(info.logo),operating_since:since(info.operating_since),specialization:list(info.specialization),allCities:list(info.allCities),allSubRegions:list(info.allSubRegions),allLocalities:list(info.allLocalities),allProjects:list(info.allProjects),linkedln:social(info.linkedln),facebook:social(info.facebook),instagram:social(info.instagram),youtube:social(info.youtube)},documents:{rera_no:text(docs.rera_no),gst_no:text(docs.gst_no)},total_listing_sale_count:count(source.total_listing_sale_count),total_listing_rental_count:count(source.total_listing_rental_count),managers:array(source.managers).map(person),agents:array(source.agents).map(person),addresses:array(source.addresses).map(value=>{const a=record(value);return {line1:text(a.line1),line2:text(a.line2),city:text(a.city),pincode:text(a.pincode),address_type:text(a.address_type)}})};
}

/** A bare handle ("_maxrealtors_", "@firm") becomes its profile link; full links stay as they are. */
const SOCIAL_HOSTS:Record<string,string>={Instagram:"https://www.instagram.com/",Facebook:"https://www.facebook.com/"};
function socialUrl(label:string,value:string):string{const handle=value.trim().replace(/^@/,"");return SOCIAL_HOSTS[label]&&/^[\w.]{2,60}$/.test(handle)?SOCIAL_HOSTS[label]+handle:value}
export function publicSocials(value: unknown): {label:string;url:string}[] {
  const info=record(value);
  return [["LinkedIn",info.linkedln],["Facebook",info.facebook],["Instagram",info.instagram],["YouTube",info.youtube]].flatMap(([label,value])=>{try{const url=new URL(socialUrl(String(label),text(value)));return ["http:","https:"].includes(url.protocol)?[{label:String(label),url:url.href}]:[]}catch{return []}});
}
/** Each office as rezide.in's address popup shows it (one card per address). */
export function publicAddressCards(value:unknown):FirmAddress[]{return array(value).flatMap(value=>{const a=record(value);const card={type:text(a.address_type),line1:text(a.line1),line2:text(a.line2),city:text(a.city),pincode:text(a.pincode)};return card.line1||card.line2||card.city?[card]:[]})}
export function publicAddresses(value:unknown):string[]{return array(value).map(value=>{const a=record(value);return [a.line1,a.line2,a.city,a.pincode].map(text).filter(Boolean).join(", ")}).filter(Boolean)}