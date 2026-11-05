import { CATEGORIES } from "@/lib/constants";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import type { AccountOffer, AccountRole, AccountVisit, OfferStatus, OwnerListing, OwnerListingStatus, VisitStatus } from "@/types/models";

/*
 * Turns raw account API records (ISO dates, INR integers, status enums) into
 * the strings the account screens render. The API never sends display text.
 */

export type Tone = "ok" | "warm" | "muted";

/** One row of the visits / offers lists. */
export type ActivityRow = {
  id: string;
  day: string;
  month: string;
  title: string;
  subtitle: string;
  value: string;
  status: string;
  tone: Tone;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const dayMonth = (iso: string) => {
  const [, m, d] = iso.slice(0, 10).split("-");
  return { day: d ?? "", month: MONTHS[Number(m) - 1] ?? "" };
};

/** "19:30" → "7:30 PM". */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const VISIT_STATUS: Record<VisitStatus, [string, Tone]> = {
  requested: ["Requested", "warm"],
  confirmed: ["Confirmed", "ok"],
  completed: ["Completed", "muted"],
  cancelled: ["Cancelled", "muted"],
};

export function visitRow(v: AccountVisit, role: AccountRole): ActivityRow {
  const kind = v.kind === "video_tour" ? "Video tour" : "Site visit";
  const time = v.time ? formatTime(v.time) : null;
  const parts =
    role === "owner"
      ? [`Buyer: ${v.counterpart}`, v.via && `via ${v.via}`, time]
      : [v.locality, `${v.kind === "video_tour" ? "Video tour with" : "with"} ${v.counterpart}`, time];
  const [status, tone] = VISIT_STATUS[v.status];
  return { id: v.id, ...dayMonth(v.date), title: v.listingTitle, subtitle: parts.filter(Boolean).join(" · "), value: kind, status, tone };
}

const OFFER_STATUS: Record<OfferStatus, [seeker: string, owner: string, Tone]> = {
  submitted: ["Submitted", "New offer", "warm"],
  under_review: ["Under review", "Under review", "warm"],
  countered: ["Countered", "Countered", "muted"],
  accepted: ["Accepted", "Accepted", "ok"],
  declined: ["Declined", "Declined", "muted"],
};

export function offerRow(o: AccountOffer, role: AccountRole): ActivityRow {
  const monthly = o.intent === "rent";
  const parts =
    role === "owner"
      ? [`From ${o.counterpart ?? "a buyer"}`, o.via ? `via ${o.via}` : "direct"]
      : [o.askingPrice !== undefined && `Asking ${formatPrice(o.askingPrice, { monthly })}`, o.via ? `via ${o.via}` : "direct"];
  const [seeker, owner, tone] = OFFER_STATUS[o.status];
  return {
    id: o.id,
    ...dayMonth(o.date),
    title: o.listingTitle,
    subtitle: parts.filter(Boolean).join(" · "),
    value: formatPrice(o.amount, { monthly }),
    status: role === "owner" ? owner : seeker,
    tone,
  };
}

const LISTING_STATUS: Record<OwnerListingStatus, "Live" | "Under review" | "Draft"> = {
  live: "Live",
  under_review: "Under review",
  draft: "Draft",
};

/** Owner listing card text. `cta` names the next step the card offers. */
export type OwnerListingCard = {
  id: string;
  title: string;
  locality: string;
  price: string;
  intentLabel: string;
  status: "Live" | "Under review" | "Draft";
  stats: { views: string; shortlists: string; visits: string; offers: string };
  meta: string;
  cta: "View Offers" | "View Visits" | "View Status" | "Continue Listing" | "View Listing";
  image: string;
};

export function ownerListingCard(l: OwnerListing): OwnerListingCard {
  const cat = CATEGORIES.find((c) => c.id === l.category);
  const word = (cat?.label ?? l.category).replace(/s$/, "");
  const intent = l.intent === "buy" ? "For Sale" : l.category === "homes" ? "For Rent" : "For Lease";
  const n = (v: number | undefined) => (v === undefined ? "—" : formatNumber(v));
  const meta =
    l.status === "live"
      ? [l.listedAt && `Listed ${formatDate(l.listedAt)}`, l.assistedBy && `Assisted by ${l.assistedBy}`]
      : l.status === "under_review"
        ? [l.submittedAt && `Submitted ${formatDate(l.submittedAt)}`, l.pendingNote]
        : [l.pendingNote ?? "Draft"];
  const cta: OwnerListingCard["cta"] =
    l.status === "draft"
      ? "Continue Listing"
      : l.status === "under_review"
        ? "View Status"
        : (l.stats?.offers ?? 0) > 0
          ? "View Offers"
          : (l.stats?.visits ?? 0) > 0
            ? "View Visits"
            : "View Listing";
  return {
    id: l.id,
    title: l.title,
    locality: `${l.locality}, ${l.city}`,
    price: formatPrice(l.price, { monthly: l.intent === "rent" }),
    intentLabel: `${word} · ${intent}`,
    status: LISTING_STATUS[l.status],
    stats: { views: n(l.stats?.views), shortlists: n(l.stats?.shortlists), visits: n(l.stats?.visits), offers: n(l.stats?.offers) },
    meta: meta.filter(Boolean).join(" · "),
    cta,
    image: l.image,
  };
}

/** Totals across the owner's listings for the summary tiles. */
export function ownerTotals(listings: OwnerListing[]) {
  const sum = (k: "views" | "visits" | "offers") => listings.reduce((n, l) => n + (l.stats?.[k] ?? 0), 0);
  return { listings: listings.length, views: sum("views"), visits: sum("visits"), offers: sum("offers") };
}
