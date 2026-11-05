/**
 * NEXT_PUBLIC_API_MOCKING:
 * - unset / "on" / "true" / "all": every request is answered by the in-process mock API.
 * - "off" / "false" / "none": nothing is mocked; requests go to NEXT_PUBLIC_API_BASE_URL.
 * - a comma-separated domain list, e.g. "dashboard,account": only those domains are
 *   mocked and everything else goes to the real API, so the backend can ship domain
 *   by domain. Unknown names are ignored (and reported by `unknown`).
 */

/**
 * First path segment of each mockable endpoint group (docs/API.md). Auth is not
 * here: it always talks to the Rezide backend (src/services/auth.ts).
 */
export const API_DOMAINS = [
  "properties",
  "projects",
  "realtors",
  "firms",
  "enquiries",
  "listings",
  "account",
  "callbacks",
  "trial-requests",
  "dashboard",
] as const;

export type ApiDomain = (typeof API_DOMAINS)[number];

export type MockingSetting =
  | { mode: "all" }
  | { mode: "off" }
  | { mode: "domains"; domains: ApiDomain[]; unknown: string[] };

export function parseMockingSetting(raw: string | undefined): MockingSetting {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "" || value === "on" || value === "true" || value === "all") return { mode: "all" };
  if (value === "off" || value === "false" || value === "none") return { mode: "off" };
  const names = value.split(",").map((v) => v.trim()).filter(Boolean);
  const domains = names.filter((n): n is ApiDomain => (API_DOMAINS as readonly string[]).includes(n));
  const unknown = names.filter((n) => !(API_DOMAINS as readonly string[]).includes(n));
  return domains.length ? { mode: "domains", domains: [...new Set(domains)], unknown } : { mode: "off" };
}

/** True when requests for this domain are answered by the mock under this setting. */
export const isDomainMocked = (setting: MockingSetting, domain: ApiDomain) =>
  setting.mode === "all" || (setting.mode === "domains" && setting.domains.includes(domain));

/** Domain of a request URL relative to the API base ("/properties/stats?x" → "properties"). */
export function domainOf(url: string | undefined): string {
  const path = (url ?? "").replace(/^[a-z]+:\/\/[^/]+/i, "").split("?")[0];
  return path.split("/").filter(Boolean)[0] ?? "";
}
