import type MockAdapter from "axios-mock-adapter";
import type { AxiosRequestConfig } from "axios";
import { parseProjectCriteria, parsePropertyCriteria } from "@/features/search/criteria";
import {
  budgetTierOf,
  groupProperties,
  paginate,
  propertyFacets,
  searchProjects,
  searchProperties,
  searchRealtors,
} from "@/features/search/match";
import {
  AREA_BANDS,
  BATHROOM_OPTIONS,
  BHK_OPTIONS,
  BUDGET_POINTS,
  FACING_OPTIONS,
  FURNISHING_OPTIONS,
  MEDIA_OPTIONS,
  PARKING_OPTIONS,
  UNIT_TYPES,
  localitiesFor,
} from "@/lib/constants";
import type {
  ActivityTab,
  Enquiry,
  EnquiryInput,
  ListingDraft,
  RealtorSearchCriteria,
} from "@/types/models";
import {
  OWNER_LISTINGS,
  OWNER_OFFERS,
  OWNER_VISITS,
  SEEKER_ACTIVITY,
  SEEKER_OFFERS,
  SEEKER_VISITS,
} from "./fixtures/account";
import { registerDashboardHandlers } from "./fixtures/dashboard-handlers";
import { haversineKm } from "./fixtures/detail-extras";
import { PROJECTS } from "./fixtures/projects";
import { PROPERTIES } from "./fixtures/properties";
import { agentDetail, firmDetail } from "./fixtures/firms";
import { ALL_REALTORS, REALTORS } from "./fixtures/realtors";

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

const idFrom = (config: AxiosRequestConfig) =>
  decodeURIComponent((config.url ?? "").split("?")[0].split("/").filter(Boolean).pop() ?? "");

const validPhone = (p: unknown) => typeof p === "string" && /^[6-9]\d{9}$/.test(p.replace(/\D/g, ""));
const notFound = (what: string): Reply => [404, { message: `${what} not found.`, code: "not_found" }];
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
  /* ---------- Properties ---------- */
  mock.onGet(/\/properties\/stats$/).reply((config): Reply => {
    const p = paramsOf(config);
    const city = p.get("city") ?? "";
    const intent = p.get("intent") ?? "buy";
    // `type` is the category, as in GET /properties (`category` accepted for older clients).
    const category = p.get("type") ?? p.get("category") ?? "homes";
    const pool = PROPERTIES.filter((x) => x.city === city && x.intent === intent && x.category === category);
    const tally = (key: (x: (typeof pool)[number]) => string | undefined) =>
      pool.reduce<Record<string, number>>((acc, x) => {
        const k = key(x);
        if (k) acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
    const points = BUDGET_POINTS[intent === "rent" ? "rent" : "buy"];
    const budget: Record<string, number> = {};
    points.forEach((pt, i) => {
      const lo = i === 0 ? 0 : points[i - 1].value;
      budget[`${lo}-${pt.value}`] = pool.filter((x) => x.price >= lo && x.price <= pt.value).length;
    });
    budget[`${points[points.length - 1].value}-`] = pool.filter((x) => x.price > points[points.length - 1].value).length;
    return [
      200,
      {
        total: pool.length,
        byLocality: tally((x) => x.locality),
        byUnitType: tally((x) => x.unitType),
        byBhk: tally((x) => (x.bhk ? (x.bhk >= 5 ? "5+ BHK" : `${x.bhk} BHK`) : undefined)),
        byBudget: budget,
        byArea: Object.fromEntries(
          AREA_BANDS.map((b) => [
            `${b.min ?? 0}-${b.max ?? ""}`,
            pool.filter((x) => x.areaSqft >= (b.min ?? 0) && (b.max === undefined || x.areaSqft < b.max)).length,
          ]),
        ),
      },
    ];
  });

  mock.onGet(/\/properties\/facets$/).reply((config): Reply => {
    const c = parsePropertyCriteria(paramsOf(config));
    return [
      200,
      propertyFacets(PROPERTIES, c, {
        localities: localitiesFor(c.city),
        unitTypes: UNIT_TYPES[c.category],
        bhk: BHK_OPTIONS,
        furnishing: FURNISHING_OPTIONS,
        bathrooms: BATHROOM_OPTIONS,
        parking: PARKING_OPTIONS,
        media: MEDIA_OPTIONS,
        facing: FACING_OPTIONS,
      }),
    ];
  });

  mock.onGet(/\/properties\/groups$/).reply((config): Reply => {
    const p = paramsOf(config);
    const groupBy = p.get("groupBy");
    if (groupBy !== "locality" && groupBy !== "project") {
      return [400, { message: "groupBy must be locality or project.", code: "bad_request" }];
    }
    return [200, { groupBy, groups: groupProperties(PROPERTIES, parsePropertyCriteria(p), groupBy) }];
  });

  mock.onGet(/\/properties\/[^/?]+$/).reply((config): Reply => {
    const id = idFrom(config);
    const property = PROPERTIES.find((p) => p.id === id);
    if (!property) return notFound("Property");
    const realtor = ALL_REALTORS.find((r) => r.id === property.realtorId) ?? null;
    const similar = PROPERTIES.filter(
      (p) =>
        p.id !== property.id &&
        p.city === property.city &&
        p.category === property.category &&
        p.intent === property.intent,
    ).slice(0, 3);
    const project = property.projectId ? (PROJECTS.find((x) => x.id === property.projectId) ?? null) : null;
    const projectStock = project
      ? {
          sale: PROPERTIES.filter((x) => x.projectId === project.id && x.intent === "buy").length,
          rent: PROPERTIES.filter((x) => x.projectId === project.id && x.intent === "rent").length,
        }
      : undefined;
    return [200, { property, realtor, similar, project, projectStock }];
  });

  mock.onGet(/\/properties$/).reply((config): Reply => {
    const criteria = parsePropertyCriteria(paramsOf(config));
    return [200, searchProperties(PROPERTIES, criteria)];
  });

  /* ---------- Projects ---------- */
  mock.onGet(/\/projects\/stats$/).reply((config): Reply => {
    const params = paramsOf(config);
    const city = params.get("city") ?? "";
    const status = params.get("status");
    const pool = PROJECTS.filter((p) => p.city === city && (!status || p.status === status));
    const count = (fn: (p: (typeof pool)[number]) => string) =>
      pool.reduce<Record<string, number>>((acc, p) => ((acc[fn(p)] = (acc[fn(p)] ?? 0) + 1), acc), {});
    return [
      200,
      {
        total: pool.length,
        byStatus: count((p) => p.status),
        byLocality: count((p) => p.locality),
        byBudget: count((p) => budgetTierOf(p.priceFrom)),
        byYear: count((p) => String(p.possessionYear ?? "")),
      },
    ];
  });

  mock.onGet(/\/projects\/[^/?]+$/).reply((config): Reply => {
    const id = idFrom(config);
    const project = PROJECTS.find((p) => p.id === id);
    if (!project) return notFound("Project");
    const listings = PROPERTIES.filter((p) => p.projectId === project.id);
    const sameCity = PROJECTS.filter((p) => p.id !== project.id && p.city === project.city);
    // Similar: same city, overlapping price band. Nearby: same city, closest first.
    const similar = sameCity
      .filter((p) => p.priceFrom <= project.priceTo * 1.25 && p.priceTo >= project.priceFrom * 0.75)
      .slice(0, 6);
    const dist = (p: (typeof PROJECTS)[number]) => haversineKm(p.coords, project.coords);
    const nearby = [...sameCity].sort((a, b) => dist(a) - dist(b)).slice(0, 6);
    const byDev = PROJECTS.filter((p) => p.developer === project.developer);
    const developer = {
      total: byDev.length,
      rtm: byDev.filter((p) => p.status === "rtm").length,
      uc: byDev.filter((p) => p.status === "uc").length,
      nl: byDev.filter((p) => p.status === "nl").length,
      cities: [...new Set(byDev.map((p) => p.city))],
    };
    return [200, { project, listings, similar, nearby, developer }];
  });

  mock.onGet(/\/projects$/).reply((config): Reply => [
    200,
    searchProjects(PROJECTS, parseProjectCriteria(paramsOf(config))),
  ]);

  /* ---------- Realtors ---------- */
  mock.onGet(/\/realtors\/[^/?]+$/).reply((config): Reply => {
    const realtor = ALL_REALTORS.find((r) => r.id === idFrom(config));
    if (!realtor) return notFound("Realtor");
    return [200, agentDetail(realtor, ALL_REALTORS, PROPERTIES)];
  });

  /* ---------- Firms (realtor firm pages) ---------- */
  mock.onGet(/\/firms\/[^/?]+\/agents\/[^/?]+$/).reply((config): Reply => {
    const [, firmSlug = "", agentSlug = ""] = /\/firms\/([^/?]+)\/agents\/([^/?]+)/.exec(config.url ?? "") ?? [];
    const realtor = ALL_REALTORS.find(
      (r) => r.firmId === decodeURIComponent(firmSlug).toLowerCase() && r.slug === decodeURIComponent(agentSlug).toLowerCase(),
    );
    if (!realtor) return notFound("Realtor");
    return [200, agentDetail(realtor, ALL_REALTORS, PROPERTIES)];
  });

  mock.onGet(/\/firms\/[^/?]+$/).reply((config): Reply => {
    const detail = firmDetail(idFrom(config), ALL_REALTORS, PROPERTIES);
    return detail ? [200, detail] : notFound("Firm");
  });

  mock.onGet(/\/realtors$/).reply((config): Reply => {
    const p = paramsOf(config);
    const criteria: RealtorSearchCriteria = {
      city: p.get("city") ?? "",
      by: p.get("by") === "firm" ? "firm" : "name",
      q: p.get("q") ?? "",
      specializations: p.getAll("spec"),
      locality: p.get("loc") ?? "",
      language: p.get("lang") ?? "",
      gender: p.get("gender") ?? "",
    };
    const page = Math.max(1, Number.parseInt(p.get("page") ?? "1", 10) || 1);
    const per = Math.min(100, Math.max(1, Number.parseInt(p.get("per") ?? "50", 10) || 50));
    return [200, paginate(searchRealtors(REALTORS, criteria), page, per)];
  });

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
  mock.onGet(/\/account\/activity$/).reply((config): Reply => {
    const tab = (paramsOf(config).get("tab") ?? "viewed") as ActivityTab;
    const rows = SEEKER_ACTIVITY[tab] ?? [];
    return [
      200,
      rows
        .map((r) => ({ ...r, property: PROPERTIES.find((p) => p.id === r.propertyId) }))
        .filter((r) => r.property),
    ];
  });
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
