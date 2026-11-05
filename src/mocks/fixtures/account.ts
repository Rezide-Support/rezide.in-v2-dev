import type { AccountOffer, AccountVisit, ActivityTab, OwnerListing } from "@/types/models";
import { PHOTO_IDS, unsplash } from "@/content/media";

/** SAMPLE ACCOUNT ACTIVITY shown to any signed-in demo user. */


/** Property ids from the fixed inventory, with the date the activity happened. */
export const SEEKER_ACTIVITY: Record<ActivityTab, { propertyId: string; date: string; note?: string }[]> = {
  viewed: [
    { propertyId: "mum-andheri-splendor-d2401", date: "2026-10-17" },
    { propertyId: "mum-bandra-east-bkc-1204", date: "2026-10-17" },
    { propertyId: "mum-andheri-springs-c1801", date: "2026-09-28" },
    { propertyId: "mum-mahalaxmi-shop-8", date: "2026-09-28" },
    { propertyId: "mum-goregaon-esquire-a904", date: "2026-08-14" },
    { propertyId: "mum-thane-bhiwandi-warehouse-3", date: "2026-08-14" },
    { propertyId: "mum-chembur-plot-42", date: "2026-08-14" },
    { propertyId: "mum-worli-supremus-702", date: "2026-08-14" },
  ],
  shared: [
    { propertyId: "mum-andheri-splendor-d2401", date: "2026-10-17", note: "Shared by Dipesh H Vora Estate Agent: “Fits your 2–3 BHK brief in the western suburbs.”" },
    { propertyId: "mum-bandra-east-bkc-1204", date: "2026-09-28", note: "Shared by Keystone Commercial: “Grade A floor, ready for fit-out.”" },
    { propertyId: "mum-andheri-springs-c1801", date: "2026-08-14", note: "Shared by Skyline Realty: “Furnished and available from November.”" },
  ],
  shortlisted: [
    { propertyId: "mum-andheri-splendor-d2401", date: "2026-10-17" },
    { propertyId: "mum-goregaon-esquire-a904", date: "2026-10-17" },
    { propertyId: "mum-worli-lodha-park-b1702", date: "2026-09-28" },
    { propertyId: "mum-powai-hiranandani-eden-804", date: "2026-08-14" },
    { propertyId: "mum-worli-supremus-702", date: "2026-08-14" },
  ],
  rejected: [
    { propertyId: "mum-andheri-springs-c1801", date: "2026-10-17", note: "You rejected this: price above budget." },
    { propertyId: "mum-mahalaxmi-shop-8", date: "2026-09-28", note: "You rejected this: location too far." },
  ],
};

export const SEEKER_VISITS: AccountVisit[] = [
  { id: "sv1", propertyId: "mum-andheri-splendor-d2401", intent: "buy", listingTitle: "D Tower, Oberoi Splendor", locality: "Andheri West", kind: "site_visit", date: "2026-10-21", time: "11:00", status: "confirmed", counterpart: "Dipesh H Vora Estate Agent" },
  { id: "sv2", propertyId: "mum-worli-lodha-park-b1702", intent: "buy", listingTitle: "B - 1702, Lodha Park", locality: "Worli", kind: "video_tour", date: "2026-10-23", time: "19:30", status: "requested", counterpart: "AssetPro Investment & Realty" },
  { id: "sv3", propertyId: "mum-goregaon-esquire-a904", intent: "buy", listingTitle: "A - 904, Oberoi Esquire", locality: "Goregaon East", kind: "site_visit", date: "2026-10-09", status: "completed", counterpart: "Networth Realty" },
];

export const SEEKER_OFFERS: AccountOffer[] = [
  { id: "so1", propertyId: "mum-goregaon-esquire-a904", intent: "buy", listingTitle: "A - 904, Oberoi Esquire", date: "2026-10-16", amount: 7_40_00_000, askingPrice: 7_75_00_000, status: "under_review", via: "Networth Realty" },
  { id: "so2", intent: "buy", listingTitle: "1102, Lokhandwala Residency", date: "2026-10-02", amount: 2_60_00_000, askingPrice: 2_85_00_000, status: "declined", via: "Dipesh H Vora Estate Agent" },
];

export const OWNER_VISITS: AccountVisit[] = [
  { id: "ov1", intent: "buy", listingTitle: "B - 1702, Lodha Park", locality: "Worli", kind: "video_tour", date: "2026-10-18", time: "11:30", status: "confirmed", counterpart: "Ananya Desai", via: "Skyline Realty" },
  { id: "ov2", intent: "buy", listingTitle: "B - 1702, Lodha Park", locality: "Worli", kind: "site_visit", date: "2026-10-20", time: "16:00", status: "requested", counterpart: "Rohan Pillai" },
  { id: "ov3", intent: "buy", listingTitle: "B - 1702, Lodha Park", locality: "Worli", kind: "site_visit", date: "2026-10-12", time: "18:00", status: "completed", counterpart: "Karan Malhotra" },
];

export const OWNER_OFFERS: AccountOffer[] = [
  { id: "oo1", intent: "buy", listingTitle: "B - 1702, Lodha Park", date: "2026-10-17", amount: 8_85_00_000, status: "submitted", counterpart: "Ananya Desai", via: "Skyline Realty" },
  { id: "oo2", intent: "buy", listingTitle: "B - 1702, Lodha Park", date: "2026-10-11", amount: 8_40_00_000, status: "countered", counterpart: "Vikram Rao" },
];

export const OWNER_LISTINGS: OwnerListing[] = [
  { id: "own-1", title: "B - 1702, Lodha Park", locality: "Worli", city: "Mumbai", category: "homes", intent: "buy", price: 9_20_00_000, status: "live", stats: { views: 1284, shortlists: 36, visits: 8, offers: 2 }, listedAt: "2026-09-02", assistedBy: "Skyline Realty", image: unsplash(PHOTO_IDS.homes[0], 800) },
  { id: "own-2", title: "A - 904, Oberoi Esquire", locality: "Goregaon East", city: "Mumbai", category: "homes", intent: "rent", price: 2_10_000, status: "under_review", stats: null, submittedAt: "2026-10-16", pendingNote: "Verification pending", image: unsplash(PHOTO_IDS.homes[3], 800) },
  { id: "own-3", title: "Unit 702, Lodha Supremus", locality: "Worli", city: "Mumbai", category: "offices", intent: "rent", price: 6_00_000, status: "live", stats: { views: 642, shortlists: 14, visits: 3, offers: 0 }, listedAt: "2026-08-28", image: unsplash(PHOTO_IDS.offices[0], 800) },
  { id: "own-4", title: "Shop 12, Phoenix Palladium", locality: "Lower Parel", city: "Mumbai", category: "retail", intent: "buy", price: 5_60_00_000, status: "draft", stats: null, pendingNote: "Photos and video pending", image: unsplash(PHOTO_IDS.retail[1], 800) },
];
