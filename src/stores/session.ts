"use client";

import { clearPrivateQueries } from "@/lib/query-client";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { logout, withBackendUser, type BackendUser } from "@/services/auth";
import type { Session, UserRole } from "@/types/models";

/**
 * CLIENT-SIDE SESSION — NOT SECURE AUTHENTICATION.
 *
 * The session below is the user the Rezide backend verified by OTP (it comes
 * with no token, as on rezide.in) and is kept in localStorage so the user
 * stays signed in across pages. It is readable and
 * editable by anyone with browser access, carries no credentials, and must
 * never be used to authorise anything. Replace with an httpOnly cookie session
 * issued by the real auth service (see docs/API.md → Authentication).
 */

type SessionState = {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
  /** Switches between seeker and owner views for customer accounts. */
  setCustomerRole: (role: Extract<UserRole, "seeker" | "owner">) => void;
  /** Refreshes the signed-in user from their backend record (name, phone, email). */
  syncUser: (raw: BackendUser) => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      session: null,
      signIn: (session) => {
        if (get().session?.user.id !== session.user.id) clearPrivateQueries();
        set({ session });
      },
      signOut: () => {
        const ended = get().session;
        set({ session: null });
        clearPrivateQueries();
        // Tell the backend too, as rezide.in does. Checking `ended` first stops a 401 here from looping.
        if (ended) void logout().catch(() => undefined);
      },
      setCustomerRole: (role) => {
        const s = get().session;
        if (s && s.user.role !== "realtor") set({ session: { ...s, user: { ...s.user, role } } });
      },
      syncUser: (raw) => {
        const s = get().session;
        const rawId = raw.id ?? raw._id;
        // Ignore a record for someone else (a response that lands after switching accounts).
        if (!s || (rawId && String(rawId) !== s.user.id)) return;
        const user = withBackendUser(s.user, raw);
        if (JSON.stringify(user) !== JSON.stringify(s.user)) set({ session: { ...s, user } });
      },
    }),
    {
      name: "rezide-demo-session",
      // Version 1 held demo sessions from the mock API; they are not real accounts, so drop them.
      version: 2,
      migrate: () => ({ session: null }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const isExpired = (s: Session | null, now = Date.now()) => !s || Date.parse(s.expiresAt) <= now;

const subscribeHydration = (cb: () => void) => useSessionStore.persist.onFinishHydration(cb);
const getHydrated = () => useSessionStore.persist.hasHydrated();

export type SessionStatus = "loading" | "authenticated" | "anonymous";

/**
 * Current demo session. Returns "loading" until localStorage has been read so
 * server and first client render agree. Expired sessions read as anonymous and
 * are cleared.
 */
export function useSession(): { session: Session | null; status: SessionStatus } {
  const hydrated = useSyncExternalStore(subscribeHydration, getHydrated, () => false);
  const session = useSessionStore((s) => s.session);
  if (!hydrated) return { session: null, status: "loading" };
  if (session && isExpired(session)) {
    queueMicrotask(() => {
      if (isExpired(useSessionStore.getState().session)) useSessionStore.getState().signOut();
    });
    return { session: null, status: "anonymous" };
  }
  return { session, status: session ? "authenticated" : "anonymous" };
}
