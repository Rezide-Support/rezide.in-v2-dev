/** Realtor Corner plans, add-ons and credit packs (prices from the prototype, INR, ex-GST). */

export const AGENTS = [
  { name: "List Smart", role: "Listing", icon: "file-text", desc: "Puts a listing live in 60 seconds from the verified catalogue.", soon: false },
  { name: "Content Creator", role: "Branded content", icon: "play-circle", desc: "Makes branded flyers, brochures, videos and social posts.", soon: false },
  { name: "Lead Sense", role: "Lead capture", icon: "headset", desc: "Turns any enquiry into a complete, scored requirement.", soon: false },
  { name: "Price Right", role: "Fair-price analysis", icon: "bar-chart", desc: "Gives a fair-market range backed by real transactions.", soon: false },
  { name: "Property Finder", role: "Property matching", icon: "search", desc: "Finds the right properties for a buyer, across mine, firm and market.", soon: false },
  { name: "Client Finder", role: "Client matching", icon: "message", desc: "Finds the right buyers for a listing, including co-broking.", soon: false },
  { name: "Pitch Perfect", role: "Client proposals", icon: "file", desc: "Builds premium branded proposals in one tap.", soon: false },
  { name: "Visit Pro", role: "Site visits", icon: "map-pin", desc: "Schedules, reminds, routes and reviews every site visit.", soon: false },
  { name: "Qualifire", role: "Lead qualification", icon: "shield-check", desc: "Qualifies every new lead on intent, budget and timeline.", soon: true },
  { name: "Game Plan", role: "Business coach", icon: "compass", desc: "Reads your dashboard and coaches you on the next best move.", soon: true },
] as const;

export type PlanId = "beginner" | "intermediate" | "pro";

export const PLANS: {
  id: PlanId;
  name: string;
  who: string;
  /** Per user per month: list, annual, member monthly, member annual. */
  monthly: number;
  annual: number;
  memberMonthly: number;
  memberAnnual: number;
  memberDiscount: number;
  agents: number[];
  credits: number;
  popular?: boolean;
}[] = [
  { id: "beginner", name: "Beginner", who: "For the solo realtor", monthly: 2500, annual: 2000, memberMonthly: 1250, memberAnnual: 1000, memberDiscount: 50, agents: [0, 1, 3], credits: 5 },
  { id: "intermediate", name: "Intermediate", who: "For the active realtor or small desk", monthly: 5000, annual: 4000, memberMonthly: 3750, memberAnnual: 3000, memberDiscount: 25, agents: [0, 1, 2, 3, 4, 5], credits: 10, popular: true },
  { id: "pro", name: "Pro", who: "For the power user or team lead", monthly: 10000, annual: 8000, memberMonthly: 9000, memberAnnual: 7200, memberDiscount: 10, agents: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], credits: 20 },
];

export const SKUS: [string, Partial<Record<PlanId, number>>][] = [
  ["AI-assisted listings", { beginner: 20, intermediate: 40, pro: 80 }],
  ["Listing videos", { beginner: 20, intermediate: 40, pro: 80 }],
  ["Listing brochures", { beginner: 20, intermediate: 40, pro: 80 }],
  ["Property matches", { beginner: 50, intermediate: 100, pro: 200 }],
  ["Potential client matches", { intermediate: 50, pro: 100 }],
  ["Leads qualified from enquiries", { intermediate: 100, pro: 200 }],
  ["Fair-price reports", { intermediate: 50, pro: 50 }],
  ["AI property proposals", { pro: 100 }],
  ["Site visits managed", { pro: 100 }],
];

export const ADDONS = [
  { id: "lead-router", name: "Lead Router", desc: "One lead inbox for the firm, with routing rules and a manager dashboard", monthly: 10000, yearly: 0 },
  { id: "website", name: "Website", desc: "Firm website from ready templates, linked to Rezide listings", monthly: 0, yearly: 15000 },
  { id: "service-wa", name: "Service WhatsApp", desc: "WhatsApp Business account for client service messages", monthly: 0, yearly: 5000 },
  { id: "marketing-wa", name: "Marketing WhatsApp", desc: "WhatsApp Business account for marketing broadcasts", monthly: 0, yearly: 5000 },
] as const;

export type AddonId = (typeof ADDONS)[number]["id"];

export const PACKS: { millions: number; price: number }[] = [
  { millions: 1, price: 250 },
  { millions: 2, price: 475 },
  { millions: 5, price: 1125 },
  { millions: 10, price: 2125 },
  { millions: 20, price: 3750 },
];

export const GST_RATE = 0.18;

export const planPrice = (plan: (typeof PLANS)[number], opts: { annual: boolean; member: boolean }) =>
  opts.member ? (opts.annual ? plan.memberAnnual : plan.memberMonthly) : opts.annual ? plan.annual : plan.monthly;

export type OrderInput = {
  planId: PlanId | null;
  seats: number;
  annual: boolean;
  member: boolean;
  addons: AddonId[];
  packMillions: number;
};

export type OrderLine = { label: string; amount: number };

/** Itemised order with GST. Monthly add-ons get 20% off when billed annually, as in the prototype. */
export function computeOrder(o: OrderInput): { lines: OrderLine[]; subtotal: number; gst: number; total: number } {
  const lines: OrderLine[] = [];
  const plan = PLANS.find((p) => p.id === o.planId);
  const seats = Math.max(1, Math.min(9, Math.floor(o.seats)));
  if (plan) {
    const months = o.annual ? 12 : 1;
    lines.push({
      label: `${plan.name} × ${seats} ${seats > 1 ? "users" : "user"}, ${o.annual ? "12 months" : "1 month"}`,
      amount: planPrice(plan, o) * seats * months,
    });
  }
  for (const a of ADDONS) {
    if (!o.addons.includes(a.id)) continue;
    if (a.yearly) lines.push({ label: `${a.name}, 1 year`, amount: a.yearly });
    else lines.push({ label: `${a.name}, ${o.annual ? "12 months" : "1 month"}`, amount: o.annual ? a.monthly * 0.8 * 12 : a.monthly });
  }
  const pack = PACKS.find((p) => p.millions === o.packMillions);
  if (pack) lines.push({ label: `${pack.millions}M top-up credits`, amount: pack.price });
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const gst = Math.round(subtotal * GST_RATE);
  return { lines, subtotal, gst, total: subtotal + gst };
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
