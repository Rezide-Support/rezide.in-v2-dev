"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { accountQueries } from "@/lib/queries";
import { recordView } from "@/services/activity";
import { useSession } from "@/stores/session";
import type { Intent } from "@/types/models";

/** Records that a signed-in user opened this listing, as rezide.in's listing page does. Shows nothing. */
export function RecordView({ listingId, intent }: { listingId: string; intent: Intent }) {
  const { session } = useSession();
  const user = session?.user;
  const userId = user?.id;
  const queryClient = useQueryClient();
  // Effects can run twice for one visit (React's dev mode), so remember what was sent.
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const key = `${userId}:${listingId}`;
    if (sent.current === key) return;
    sent.current = key;
    recordView(userId, listingId, intent)
      .then(() => queryClient.invalidateQueries({ queryKey: accountQueries.activity("viewed", { id: userId }).queryKey }))
      // History is a nicety: a failure shouldn't trouble someone reading a listing.
      .catch(() => undefined);
  }, [userId, listingId, intent, queryClient]);

  return null;
}
