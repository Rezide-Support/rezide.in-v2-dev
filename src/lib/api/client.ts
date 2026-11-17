import { API_BASE_URL, API_SERVER_BASE_URL } from "./origins";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_DOMAINS, isDomainMocked, parseMockingSetting, type ApiDomain, type MockingSetting } from "./mocking";

/**
 * Shared Axios instance for every service call (src/services/*). The API
 * contract it talks to is documented in docs/API.md.
 *
 * It talks to the Rezide backend. Auth is always live (src/services/auth.ts);
 * the other domains are answered by an in-process mock adapter from fixed
 * fixtures (src/mocks) until NEXT_PUBLIC_API_MOCKING turns them off (see ./mocking.ts).
 */

/** The Rezide backend. */
export const REZIDE_API_URL = API_SERVER_BASE_URL;

/** Browser base URL. The browser calls the backend directly, which allows any origin (CORS). */
export { API_BASE_URL, API_SERVER_BASE_URL } from "./origins";

/**
 * Base URL for requests made on the server (detail-page prefetch, metadata).
 * Node has no page origin, so a relative base can't be resolved there: it falls
 * back to the backend's absolute URL. Server-only: never inlined into the browser bundle.
 */


export const MOCKING: MockingSetting = process.env.NODE_ENV === "production" ? { mode: "off" } : parseMockingSetting(process.env.NEXT_PUBLIC_API_MOCKING);
/** True when any part of the API is mocked; UI uses it to show "demo mode" notices. */
export const API_MOCKING = MOCKING.mode !== "off";

/** True when requests for this domain (first path segment, e.g. "account") are answered by the mock. */
export const isMocked = (domain: ApiDomain) => isDomainMocked(MOCKING, domain);

const isServer = typeof window === "undefined";

export const api = axios.create({
  baseURL: isServer ? API_SERVER_BASE_URL : API_BASE_URL,
  timeout: 15_000,
  headers: { Accept: "application/json" },
  // Repeated keys for arrays (bhk=2+BHK&bhk=3+BHK), matching the page URLs.
  paramsSerializer: { indexes: null },
  // AUTH SEAM: the real API is expected to use an httpOnly session cookie set by
  // POST /auth/verify. Browsers only send it cross-origin with credentials, so
  // flip this on (and allow credentials in the API's CORS config) when the API
  // lives on another origin. Same-origin "/api" (e.g. via a Next rewrite) sends it anyway.
  withCredentials: process.env.NEXT_PUBLIC_API_WITH_CREDENTIALS === "true",
});

// A compile-time production guard keeps the adapter and fixtures out of production.
const mockReady = process.env.NODE_ENV !== "production" && API_MOCKING
  ? import("@/mocks/install").then(({ installMockApi }) => {
      installMockApi(api, { domains: MOCKING.mode === "domains" ? MOCKING.domains : API_DOMAINS });
    })
  : Promise.resolve();
/* ---------------- Auth seam ---------------- */

/**
 * Hooks for auth. The Rezide backend issues no token or cookie today, so the
 * session is plain JSON in localStorage (src/stores/session.ts) and nothing here
 * makes it secure.
 */
export type AuthHooks = {
  /**
   * Bearer token to attach, if the backend chooses tokens over cookies.
   * Prefer the httpOnly cookie (nothing for JavaScript to read or leak).
   */
  getAccessToken?: () => string | null | undefined;
  /**
   * Request headers to forward on the server, e.g. the incoming `cookie`
   * header so server-side prefetches act as the signed-in user. Must read
   * request-scoped state (`(await headers()).get("cookie")` from next/headers),
   * never a module variable: this hook is shared by concurrent requests.
   * Responses fetched with forwarded cookies must not go into a shared
   * `use cache` entry (see docs/API.md → Server-side fetching).
   */
  getServerHeaders?: () => Record<string, string> | undefined | Promise<Record<string, string> | undefined>;
  /** Called on a 401 from any endpoint except the OTP ones: clear the session and send the user to sign in. */
  onUnauthorized?: (error: ApiError) => void;
};

let authHooks: AuthHooks = {};

/** Installs the auth hooks (see src/app/providers.tsx). Returns a function that removes them. */
export function configureAuth(hooks: AuthHooks) {
  authHooks = hooks;
  return () => {
    if (authHooks === hooks) authHooks = {};
  };
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await mockReady;
  const token = authHooks.getAccessToken?.();
  if (token && !config.headers.has("Authorization")) config.headers.set("Authorization", `Bearer ${token}`);
  if (isServer && authHooks.getServerHeaders) {
    for (const [key, value] of Object.entries((await authHooks.getServerHeaders()) ?? {})) {
      if (!config.headers.has(key)) config.headers.set(key, value);
    }
  }
  return config;
});

/**
 * The OTP and sign-up endpoints (src/services/auth.ts) may answer 401 for a wrong
 * code; that is a form error, not an expired session.
 */
const isAuthEndpoint = (url: string | undefined, method?: string) =>
  /(^|\/)user\/user\/(login|send|verify|add\/customer|logout)\b/.test(url ?? "") ||
  // The profile save (PUT /user/user/{id}): as on rezide.in, a 401 there is shown on the form, not a sign-out.
  (method?.toLowerCase() === "put" && /(^|\/)user\/user\/[a-f\d]{24}$/i.test(url ?? ""));

/* ---------------- Errors ---------------- */

/**
 * Error body every endpoint returns on 4xx/5xx (docs/API.md → Errors). The Rezide backend sends
 * its message as `message` or, on some endpoints, `error`.
 */
export type ApiErrorBody = { message: string; error?: string; code?: string; fieldErrors?: Record<string, string> };

/** Normalised error for UI display. `status` 0 means the request never got a response. */
export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string>;
  constructor(message: string, status: number, code?: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

const GENERIC = "Something went wrong. Please try again.";
const OFFLINE = "We couldn't reach Rezide. Check your connection and try again.";

/** Maps any Axios failure to an ApiError. Exported for tests. */
export function toApiError(error: AxiosError<Partial<ApiErrorBody> | string | undefined>): ApiError {
  if (!error.response) {
    return new ApiError(OFFLINE, 0, error.code === "ECONNABORTED" ? "timeout" : "network");
  }
  const { status, data } = error.response;
  const body = data && typeof data === "object" ? data : undefined;
  const fieldErrors =
    body?.fieldErrors && typeof body.fieldErrors === "object" && Object.keys(body.fieldErrors).length
      ? body.fieldErrors
      : undefined;
  const message = [body?.message, body?.error].find((m): m is string => typeof m === "string" && m !== "");
  return new ApiError(message ?? GENERIC, status, body?.code, fieldErrors);
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const apiError = toApiError(error);
    if (apiError.status === 401 && !isAuthEndpoint(error.config?.url, error.config?.method)) authHooks.onUnauthorized?.(apiError);
    return Promise.reject(apiError);
  },
);

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : GENERIC);
