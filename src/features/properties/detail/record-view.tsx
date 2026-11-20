"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { accountQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { recordView } from "@/services/activity";
import { useSession } from "@/stores/session";
import type { Intent } from "@/types/models";

/** Records that a signed-in user opened this listing, as rezide.in's listing page does. Shows nothing. */
export function RecordView({ listingId, intent }: { listingId: string; intent: Intent | "project" }) {
  const { session } = useSession();
  const user = session?.user;
  const userId = user?.id;
  const queryClient = useQueryClient();
  // Effects can run twice for one visit (React's dev mode), so remember what was sent.
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const key = `${userId}:${intent}:${listingId}`;
    if (sent.current === key) return;
    sent.current = key;
    recordView(userId, listingId, intent)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: accountQueries.viewedIds(userId).queryKey });
        return queryClient.invalidateQueries({ queryKey: ["account", "activity", "viewed", userId] });
      })
      // History is a nicety: a failure shouldn't trouble someone reading a listing.
      .catch(() => undefined);
  }, [userId, listingId, intent, queryClient]);

  return null;
}

/** True once a signed-in user has opened this listing. */
export function useIsViewed(listingId: string) {
  const userId = useSession().session?.user.id ?? "";
  const { data } = useQuery({ ...accountQueries.viewedIds(userId), enabled: !!userId });
  return !!data?.includes(listingId);
}

/** Eye icon for listings the user already opened, with an "Already Viewed" tooltip. Size and colour come from `className`. */
export function ViewedEye({ listingId, className }: { listingId: string; className?: string }) {
  const viewed = useIsViewed(listingId);
  if (!viewed) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span role="img" aria-label="Already viewed" className={cn("pointer-events-auto inline-flex shrink-0 cursor-default align-middle", className)}>
          <Eye className="size-full" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[13px]">Already Viewed</TooltipContent>
    </Tooltip>
  );
}