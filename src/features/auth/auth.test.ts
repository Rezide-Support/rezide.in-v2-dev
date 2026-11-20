import { accountHref, accountTabForPath, isOwnerAccountPath } from "@/features/account/account-routes";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { isExpired, useSession, useSessionStore } from "@/stores/session";
import type { Session } from "@/types/models";
import { landingFor, safeNext } from "./auth-card";

/* The OTP endpoints themselves are tested in src/services/auth.test.ts. */

const session = (role: Session["user"]["role"], expiresInMs = 60_000): Session => ({
  user: { id: "u1", role, firstName: "Asha", lastName: "Rao", phone: "9820012345" },
  expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
});

describe("session state", () => {
  beforeEach(() => useSessionStore.setState({ session: null }));

  it("signs in and out only through explicit actions", () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe("anonymous");
    act(() => useSessionStore.getState().signIn(session("seeker")));
    expect(result.current).toMatchObject({ status: "authenticated", session: { user: { role: "seeker" } } });
    act(() => useSessionStore.getState().signOut());
    expect(result.current.status).toBe("anonymous");
  });

  it("keeps the session across reads (e.g. navigating home)", () => {
    useSessionStore.getState().signIn(session("seeker"));
    const first = renderHook(() => useSession());
    first.unmount();
    const second = renderHook(() => useSession());
    expect(second.result.current.status).toBe("authenticated");
  });

  it("treats an expired session as signed out and clears it", async () => {
    useSessionStore.getState().signIn(session("seeker", -1000));
    expect(isExpired(useSessionStore.getState().session)).toBe(true);
    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe("anonymous");
    await waitFor(() => expect(useSessionStore.getState().session).toBeNull());
  });

  it("refreshes the user from their backend record, but not from someone else's", () => {
    useSessionStore.getState().signIn(session("owner"));
    useSessionStore.getState().syncUser({ _id: "u1", firstname: "Asha M", email: "asha@b.in" });
    expect(useSessionStore.getState().session?.user).toMatchObject({ id: "u1", role: "owner", firstName: "Asha M", email: "asha@b.in" });
    useSessionStore.getState().syncUser({ _id: "u2", firstname: "Ravi" });
    expect(useSessionStore.getState().session?.user.firstName).toBe("Asha M");
  });

  it("switches between seeker and owner views but never promotes to realtor", () => {
    useSessionStore.getState().signIn(session("seeker"));
    useSessionStore.getState().setCustomerRole("owner");
    expect(useSessionStore.getState().session?.user.role).toBe("owner");
    useSessionStore.getState().signIn(session("realtor"));
    useSessionStore.getState().setCustomerRole("seeker");
    expect(useSessionStore.getState().session?.user.role).toBe("realtor");
  });
});

describe("post-login redirects", () => {
  it("only accepts same-origin relative paths", () => {
    expect(safeNext("/account?tab=offers")).toBe("/account?tab=offers");
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("https://evil.example")).toBeNull();
    expect(safeNext("/\\evil.example")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });

  it("lands each role in its own area", () => {
    expect(landingFor("realtor")).toBe("/dashboard");
    expect(landingFor("owner")).toBe("/dashboard/my-listings/my-visits");
    expect(landingFor("seeker")).toBe("/dashboard/my-searches/viewed");
  });
});

describe("customer dashboard routes", () => {
 it("preserves Shared as recommended and maps the owner and common routes", () => {
  expect(accountHref("shared")).toBe("/dashboard/my-searches/recommended");
  expect(accountHref("visits",true)).toBe("/dashboard/my-listings/my-visits");
  expect(accountHref("offers",true)).toBe("/dashboard/my-listings/my-offers");
  expect(accountHref("profile",true)).toBe("/dashboard/profile");
  expect(accountTabForPath("/dashboard/profile/form")).toBe("profile");
  expect(accountTabForPath("/dashboard/my-searches/recommended")).toBe("shared");
  expect(isOwnerAccountPath("/dashboard/my-listings/my-visits")).toBe(true);
  expect(isOwnerAccountPath("/dashboard/my-listings/my-offers")).toBe(true);
  expect(isOwnerAccountPath("/dashboard/profile")).toBe(false);
 });
});
