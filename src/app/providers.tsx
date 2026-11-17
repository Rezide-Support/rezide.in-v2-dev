"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { FoldWatcher } from "@/components/layout/fold-watcher";
import { configureAuth } from "@/lib/api/client";
import { getQueryClient } from "@/lib/query-client";
export { getQueryClient } from "@/lib/query-client";
import { signInPathFor } from "@/lib/api/auth-redirect";
import { useSessionStore } from "@/stores/session";
import { useSyncSessionUser } from "@/features/auth/use-sync-session-user";

/**
 * AUTH SEAM. Connects the API client to the session: a 401 from the API ends
 * the session and sends the user to sign in with `?next=` back here. It also
 * refreshes the signed-in user from the backend. If the backend starts issuing
 * an httpOnly session cookie, the browser sends it (see `withCredentials` in
 * src/lib/api/client.ts); add `getAccessToken` here only for bearer tokens.
 */
function AuthBridge() {
  const router = useRouter();
  useSyncSessionUser();
  useEffect(
    () =>
      configureAuth({
        onUnauthorized: () => {
          useSessionStore.getState().signOut();

          const target = signInPathFor(window.location.pathname, window.location.search);
          if (target) router.replace(target);
        },
      }),
    [router],
  );
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <AuthBridge />
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster position="bottom-center" />
        <FoldWatcher />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
