import type MockAdapter from "axios-mock-adapter";
import type { AxiosRequestConfig } from "axios";
import type {
  Enquiry,
  EnquiryInput,
  ListingDraft,
} from "@/types/models";
import {
  OWNER_LISTINGS,
  OWNER_OFFERS,
  OWNER_VISITS,
  SEEKER_OFFERS,
  SEEKER_VISITS,
} from "./fixtures/account";
import { registerDashboardHandlers } from "./fixtures/dashboard-handlers";



type Reply = [number, unknown?];

/** Adapts Axios params (arrays for repeated keys) to the URLSearchParams-like shape the parsers expect. */
function paramsOf(config: AxiosRequestConfig) {
  const raw = (config.params ?? {}) as Record<string, unknown>;
  const fromUrl = new URL(config.url ?? "", "http://mock.local").searchParams;
  const getAll = (key: string): string[] => {
    const v = raw[key];
    const own = Array.isArray(v) ? v.map(String) : v === undefined || v === null || v === "" ? [] : [String(v)];
    return [...own, ...fromUrl.getAll(key)];
  };
  return { get: (key: string) => getAll(key)[0] ?? null, getAll };
}

const body = <T>(config: AxiosRequestConfig): T => {
  if (typeof config.data === "string") {
    try {
      return JSON.parse(config.data) as T;
    } catch {
      return {} as T;
    }
  }
  return (config.data ?? {}) as T;
};


const validPhone = (p: unknown) => typeof p === "string" && /^[6-9]\d{9}$/.test(p.replace(/\D/g, ""));
/** 422 in the shared error format, or null when there is nothing to report. */
const invalidFields = (fieldErrors: Record<string, string>): Reply | null =>
  Object.keys(fieldErrors).length
    ? [422, { message: "Please fix the highlighted fields.", code: "validation", fieldErrors }]
    : null;
let seq = 1000;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

/* In-memory store for writes. Resets on reload; nothing is persisted or sent anywhere. */
const store = {
  enquiries: [] as Enquiry[],
  listings: [] as (ListingDraft & { id: string; submittedAt: string })[],
  callbacks: [] as unknown[],
  trialRequests: [] as unknown[],
};

export function registerHandlers(mock: MockAdapter) {
  /* ---------- Enquiries ---------- */
  mock.onPost(/\/enquiries$/).reply((config): Reply => {
    const input = body<EnquiryInput>(config);
    const fieldErrors: Record<string, string> = {};
    if (!input.name?.trim()) fieldErrors.name = "Enter your name.";
    if (!validPhone(input.phone)) fieldErrors.phone = "Enter a valid 10-digit Indian mobile number.";
    if (!["callback", "whatsapp", "visit"].includes(input.channel)) fieldErrors.channel = "Choose how to be contacted.";
    const invalid = invalidFields(fieldErrors);
    if (invalid) return invalid;
    const enquiry: Enquiry = { ...input, id: nextId("enq"), createdAt: new Date().toISOString(), status: "received" };
    store.enquiries.push(enquiry);
    return [201, enquiry];
  });

  /* ---------- Listings (List Property) ---------- */
  mock.onPost(/\/listings$/).reply((config): Reply => {
    const draft = body<ListingDraft>(config);
    const missing = (["category", "unitType", "intent", "price"] as const).filter((k) => !draft[k]);
    if (missing.length) {
      return [
        422,
        {
          message: "Some required listing details are missing.",
          code: "validation",
          fieldErrors: Object.fromEntries(missing.map((k) => [k, "This is required."])),
        },
      ];
    }
    const listing = { ...draft, id: nextId("lst"), submittedAt: new Date().toISOString() };
    store.listings.push(listing);
    return [201, { id: listing.id, status: draft.handover === "realtor" ? "with_realtor" : "pending_verification" }];
  });

  /* ---------- Account ---------- */
  mock.onGet(/\/account\/visits$/).reply((config): Reply => [
    200,
    paramsOf(config).get("role") === "owner" ? OWNER_VISITS : SEEKER_VISITS,
  ]);
  mock.onGet(/\/account\/offers$/).reply((config): Reply => [
    200,
    paramsOf(config).get("role") === "owner" ? OWNER_OFFERS : SEEKER_OFFERS,
  ]);
  mock.onGet(/\/account\/listings$/).reply((): Reply => [200, OWNER_LISTINGS]);

  /* ---------- Realtor Corner ---------- */
  mock.onPost(/\/callbacks$/).reply((config): Reply => {
    const input = body<{ firstName?: string; mobile?: string }>(config);
    const invalid = invalidFields({
      ...(!input.firstName?.trim() && { firstName: "Enter your first name." }),
      ...(!validPhone(input.mobile) && { mobile: "Enter a valid 10-digit Indian mobile number." }),
    });
    if (invalid) return invalid;
    store.callbacks.push(input);
    return [201, { id: nextId("cb"), status: "received" }];
  });
  mock.onPost(/\/trial-requests$/).reply((config): Reply => {
    const input = body<{ mobile?: string; firstName?: string; firm?: string; reraId?: string; membership?: string }>(config);
    const invalid = invalidFields({
      ...(!validPhone(input.mobile) && { mobile: "Enter a valid 10-digit Indian mobile number." }),
      ...(!input.firstName?.trim() && { firstName: "Enter your first name." }),
      ...(!input.firm?.trim() && { firm: "Enter your firm name." }),
      ...(!input.reraId?.trim() && { reraId: "Enter your RERA registration number." }),
      ...(input.membership !== "nar" && input.membership !== "other" && { membership: "Choose your membership." }),
    });
    if (invalid) return invalid;
    store.trialRequests.push(input);
    return [201, { id: nextId("trial"), status: "pending_review" }];
  });

  /* ---------- Realtor dashboard (src/mocks/fixtures/dashboard-handlers.ts) ---------- */
  registerDashboardHandlers(mock);
}
