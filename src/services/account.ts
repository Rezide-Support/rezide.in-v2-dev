import { api } from "@/lib/api/client";
import type { AccountOffer, AccountRole, AccountVisit, ActivityItem, ActivityTab, OwnerListing } from "@/types/models";

/*
 * Customer account endpoints (/account/*). The server resolves the user from
 * the session; no user id is sent. Responses are raw records (ISO dates, INR
 * integers, status enums); src/features/account/presenters.ts formats them.
 * Viewed, shared, shortlisted and rejected are live: src/services/activity.ts.
 */

export type { AccountOffer, AccountRole, AccountVisit, ActivityItem, ActivityTab, OwnerListing };

export async function fetchVisits(role: AccountRole) {
  const { data } = await api.get<AccountVisit[]>("/account/visits", { params: { role } });
  return data;
}

export async function fetchOffers(role: AccountRole) {
  const { data } = await api.get<AccountOffer[]>("/account/offers", { params: { role } });
  return data;
}

export async function fetchOwnerListings() {
  const { data } = await api.get<OwnerListing[]>("/account/listings");
  return data;
}

/* Realtor dashboard endpoints are in src/services/dashboard.ts. */
