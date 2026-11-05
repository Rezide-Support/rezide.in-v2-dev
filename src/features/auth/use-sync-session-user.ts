"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { accountQueries } from "@/lib/queries";
import { useSession, useSessionStore } from "@/stores/session";

/**
 * Keeps the signed-in user's name, phone and email in step with their record on
 * the Rezide backend (GET /user/user/{id}, as rezide.in's header and profile page
 * load it), so changes made elsewhere show up after a reload.
 */
export function useSyncSessionUser() {
  const { session } = useSession();
  const id = session?.user.id ?? "";
  const syncUser = useSessionStore((s) => s.syncUser);
  const { data } = useQuery({ ...accountQueries.user(id), enabled: id !== "" });

  useEffect(() => {
    if (data) syncUser(data);
  }, [data, syncUser]);
}
