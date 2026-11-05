import { api, ApiError } from "@/lib/api/client";
import { OTP_LENGTH } from "@/lib/constants";
import type { Session, User, UserRole } from "@/types/models";

/*
 * Auth against the Rezide backend (/user/user/*), the same flow as the
 * rezide.in web app: the login OTP endpoints sign an existing user in; the SMS
 * OTP endpoints verify a number for sign-up and one-off checks. The backend
 * issues no token or cookie: the verified user is the session, kept in
 * localStorage (src/stores/session.ts). Contract: docs/API.md → Auth.
 */

const USER_URL = "/user/user";

/**
 * Role and group every customer sign-up sends, as rezide.in's sign-up form does
 * (its hidden `user_role` / `user_group` fields). Without them the backend
 * answers "Invalid user role!".
 */
const CUSTOMER_ACCOUNT = { user_role: "customer", user_group: "64b263414a6652391296cb74" } as const;

/** How long a signed-in session lasts before the user is asked to sign in again. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** What an OTP is for: "signin" logs an existing user in, "signup" creates a customer, "verify" only checks the number. */
export type OtpPurpose = "signin" | "signup" | "verify";
export type OtpOptions = { purpose?: OtpPurpose; role?: UserRole };

export type OtpChallenge = { phone: string; length: number; resendInSeconds: number };

export type VerifyOtpInput = {
  phone: string;
  code: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  email?: string;
  firm?: string;
  reraId?: string;
  city?: string;
};

/**
 * Backend login role. rezide.in only signs customers in; "broker" for realtors
 * is unconfirmed and needs checking with the backend team.
 */
const backendRole = (role: UserRole = "seeker") => (role === "realtor" ? "broker" : "customer");

/** The backend keeps numbers with the country code and no "+": 9820012345 → 919820012345. */
export const toBackendPhone = (phone: string) => `91${phone.replace(/\D/g, "").slice(-10)}`;

/** 919820012345 or +91 98200 12345 → 9820012345, the form the UI uses. */
export const fromBackendPhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);

/** User as the backend returns it (the fields rezide.in reads). */
export type BackendUser = {
  id?: string;
  _id?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  email?: string;
};

/** Some endpoints wrap the record in `{ data }`. */
const unwrapUser = (body: unknown): BackendUser => {
  if (!body || typeof body !== "object") return {};
  const inner = (body as { data?: unknown }).data;
  const record = body as BackendUser;
  return !record.id && !record._id && inner && typeof inner === "object" ? (inner as BackendUser) : record;
};

/** Copies what the backend knows about the user onto the UI user; anything it leaves out stays as it was. */
export function withBackendUser(user: User, raw: BackendUser): User {
  return {
    ...user,
    id: String(raw.id ?? raw._id ?? user.id),
    firstName: raw.firstname?.trim() || user.firstName,
    lastName: raw.lastname?.trim() || user.lastName,
    phone: raw.phone ? fromBackendPhone(raw.phone) : user.phone,
    email: raw.email?.trim() || user.email,
  };
}

/** Maps a backend user to the UI session. `input` fills what the backend leaves out. */
export function toSession(body: unknown, input: VerifyOtpInput, now = Date.now()): Session {
  const typed: User = {
    id: "",
    role: input.role,
    firstName: input.firstName?.trim() || "",
    lastName: input.lastName?.trim() || "",
    phone: input.phone,
    email: input.email?.trim() || undefined,
    firm: input.firm,
  };
  return { user: withBackendUser(typed, unwrapUser(body)), expiresAt: new Date(now + SESSION_TTL_MS).toISOString() };
}

/** The user's current record, as rezide.in's header and profile page read it. */
export async function fetchUser(id: string): Promise<BackendUser> {
  const { data } = await api.get(`${USER_URL}/${encodeURIComponent(id)}`);
  return unwrapUser(data);
}

/** Sends an OTP: the login OTP for sign-in, an SMS OTP otherwise. */
export async function requestOtp(phone: string, { purpose = "signin", role }: OtpOptions = {}): Promise<OtpChallenge> {
  if (purpose === "signup" && role === "realtor") {
    throw new ApiError("Realtor sign-up isn’t available yet. Please contact Rezide to register as a realtor.", 400, "realtor_signup_unavailable");
  }
  const number = toBackendPhone(phone);
  if (purpose === "signin") {
    await api.get(`${USER_URL}/login/otp/mobile/${number}`, { params: { role: backendRole(role) } });
  } else {
    await api.get(`${USER_URL}/send/sms/otp/${number}`);
  }
  return { phone, length: OTP_LENGTH, resendInSeconds: 30 };
}

/** Checks the OTP and returns the signed-in session (for sign-up, after creating the customer). */
export async function verifyOtp(input: VerifyOtpInput, { purpose = "signin" }: OtpOptions = {}): Promise<Session> {
  const phone = toBackendPhone(input.phone);
  const code = encodeURIComponent(input.code);

  if (purpose === "signin") {
    const { data } = await api.get(`${USER_URL}/login/user/${code}`, { params: { phone } });
    return toSession(data, input);
  }

  await api.get(`${USER_URL}/verify/sms/${code}`, { params: { phone } });
  // A one-off number check: the caller discards the session.
  if (purpose === "verify") return toSession({}, input);

  const { data } = await api.post(`${USER_URL}/add/customer`, {
    ...CUSTOMER_ACCOUNT,
    phone,
    firstname: input.firstName?.trim(),
    lastname: input.lastName?.trim(),
    email: input.email?.trim() || undefined,
  });
  const session = toSession(data, input);
  // Without an id the account exists but can't be used yet: sign in as rezide.in asks after sign-up.
  if (!session.user.id) {
    throw new ApiError("Your account has been created. Please sign in to continue.", 409, "signin_required");
  }
  return session;
}

export async function logout() {
  await api.post(`${USER_URL}/logout`);
}
