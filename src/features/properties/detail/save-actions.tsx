"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { accountQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { setShortlisted } from "@/services/activity";
import { COMPARE_LIMIT, compareGroupOf, useIsSaved, useSavedStore, type SavedKind, type SavedList } from "@/stores/saved";
import { useSession } from "@/stores/session";
import type { Intent } from "@/types/models";
import { ShareButton } from "../share-button";

const COPY: Record<SavedList, { add: string; remove: string; label: string }> = {
  shortlist: { add: "Shortlisted", remove: "Removed from shortlist", label: "Shortlist" },
  compare: { add: "Added to compare", remove: "Removed from compare", label: "Compare" },
};

/**
 * A signed-in user's shortlist of real listings lives on their account, as on
 * rezide.in. The button changes straight away and goes back if the backend refuses.
 */
function useAccountShortlist(userId: string, id: string, title: string, intent: Intent | undefined) {
  const queryClient = useQueryClient();
  const ids = accountQueries.shortlistIds(userId);
  const saved = useQuery({ ...ids, enabled: !!userId });
  const on = saved.data?.includes(id) ?? false;
  const change = useMutation({
    mutationFn: (next: boolean) => setShortlisted(userId, id, intent ?? "buy", next),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ids.queryKey });
      const previous = queryClient.getQueryData(ids.queryKey);
      queryClient.setQueryData(ids.queryKey, (list = []) => (next ? [...list, id] : list.filter((x) => x !== id)));
      return { previous };
    },
    onError: (_error, _next, context) => {
      queryClient.setQueryData(ids.queryKey, context?.previous);
      toast.error("Your shortlist couldn't be updated. Please try again.");
    },
    onSuccess: (_data, next) => {
      if (next) toast.success(`${COPY.shortlist.add}: ${title}`);
      else toast(`${COPY.shortlist.remove}: ${title}`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ids.queryKey });
      void queryClient.invalidateQueries({ queryKey: accountQueries.activity("shortlisted", { id: userId }).queryKey });
    },
  });
  return { on, run: () => change.mutate(!on) };
}

/**
 * Toggle an item in a list, with an honest toast. Guests, compare and projects stay
 * on this device; pass `intent` for a real listing to use the account's shortlist.
 */
export function useSaveToggle(list: SavedList, kind: SavedKind, id: string, title: string, intent?: Intent) {
  const { session } = useSession();
  const router = useRouter();
  const accountList = list === "shortlist" && kind === "property" && !!intent && !!session?.user.id;
  const account = useAccountShortlist(accountList ? session.user.id : "", id, title, intent);
  const device = useIsSaved(list, kind, id);
  const toggle = useSavedStore((s) => s.toggle);
  const run = () => {
    if (accountList) return account.run();
    // Compare is for signed-in users, as on rezide.in.
    if (list === "compare" && !session && !device) {
      toast.error("Sign in to compare properties and projects.", {
        action: { label: "Sign in", // Read at click time: reading the path while rendering would need a Suspense boundary here.
        onClick: () => router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`) },
      });
      return;
    }
    const result = toggle(list, { kind, id, title, ...(kind === "property" && intent ? { intent } : {}) });
    if (result === "limit") {
      const group = { sale: "properties for sale", rent: "rental properties", projects: "projects" }[compareGroupOf({ kind, intent })];
      toast.error(`You can compare up to ${COMPARE_LIMIT} ${group} at a time. Remove one first.`);
    } else if (result === "added") {
      toast.success(`${COPY[list].add}: ${title}`, list === "compare" ? undefined : { description: "Saved on this device only. It isn't synced to an account in this prototype." });
    } else {
      toast(`${COPY[list].remove}: ${title}`);
    }
  };
  return { on: accountList ? account.on : device, run };
}

function SaveButton({ list, kind, id, title, intent, compact, className }: { list: SavedList; kind: SavedKind; id: string; title: string; intent?: Intent; compact?: boolean; className?: string }) {
  const { on, run } = useSaveToggle(list, kind, id, title, intent);
  const IconCmp = list === "shortlist" ? Heart : Scale;
  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "default"}
      onClick={run}
      aria-pressed={on}
      aria-label={compact ? `${COPY[list].label} ${title}` : undefined}
      className={cn(!compact && "px-2.5 font-medium whitespace-nowrap", on && "text-rez-mocaccino-ink", className)}
    >
      <IconCmp className="size-[18px]" fill={on && list === "shortlist" ? "currentColor" : "none"} strokeWidth={on ? 2.25 : 2} aria-hidden />
      {/* The label stays the same when toggled (colour, filled icon and aria-pressed show the state),
          so the Share · Compare · Shortlist row never changes width or wraps. */}
      {!compact && COPY[list].label}
    </Button>
  );
}

/** v1 header actions: Share · Compare · Shortlist. */
export function SaveActions({ kind, id, title, path, intent, className }: { kind: SavedKind; id: string; title: string; path: string; intent?: Intent; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-0.5 min-[340px]:flex-nowrap", className)}>
      <ShareButton title={title} path={path} className="h-10 border-transparent px-2.5 font-medium hover:bg-black/[0.06]" />
      <SaveButton list="compare" kind={kind} id={id} title={title} intent={intent} />
      <SaveButton list="shortlist" kind={kind} id={id} title={title} intent={intent} />
    </div>
  );
}

/** Round icon-only variant for cards. */
export function SaveIconButton(props: { list: SavedList; kind: SavedKind; id: string; title: string; intent?: Intent; className?: string }) {
  return <SaveButton {...props} compact />;
}
