"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Scale } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { accountQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { setShortlisted } from "@/services/activity";
import { COMPARE_LIMIT, useIsSaved, useSavedStore, type SavedKind, type SavedList } from "@/stores/saved";
import { useSession } from "@/stores/session";
import { useOpenSignIn } from "@/features/auth/sign-in-modal";
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
function useAccountShortlist(userId: string, id: string, title: string, intent: Intent | "project" | undefined) {
  const queryClient = useQueryClient();
  const ids = accountQueries.shortlistIds(userId);
  const saved = useQuery({ ...ids, enabled: !!userId });
  const on = saved.data?.includes(id) ?? false;
  const project = intent === "project";
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
      // Projects use rezide.in's project-card messages.
      if (project) toast.success(next ? "Shortlisted successfully" : "Removed from shortlist");
      else if (next) toast.success(`${COPY.shortlist.add}: ${title}`);
      else toast(`${COPY.shortlist.remove}: ${title}`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ids.queryKey });
      void queryClient.invalidateQueries({ queryKey: ["account", "activity", "shortlisted", userId] });
    },
  });
  return { on, ready: saved.isSuccess, run: () => change.mutate(!on), add: () => change.mutate(true) };
}

/**
 * What a guest tried to shortlist or compare before signing in ("list:kind:id"); it's done once
 * they're signed in, as rezide.in's pending action after its sign-in popup.
 */
const PENDING_SAVE = "rezide.pendingSave";
const readPending = () => {
  try {
    return sessionStorage.getItem(PENDING_SAVE);
  } catch {
    return null;
  }
};
const writePending = (key: string | null) => {
  try {
    if (key) sessionStorage.setItem(PENDING_SAVE, key);
    else sessionStorage.removeItem(PENDING_SAVE);
  } catch {
    // Storage blocked: the guest just taps the icon again after signing in.
  }
};

/**
 * Toggle an item in a list, with an honest toast. Guests, compare and projects stay
 * on this device; pass `intent` for a real listing to use the account's shortlist.
 */
export function useSaveToggle(list: SavedList, kind: SavedKind, id: string, title: string, intent?: Intent) {
  const { session } = useSession();
  const openSignIn = useOpenSignIn();
  // Projects are shortlisted on the account too, as on rezide.in (type "project").
  const projectShortlist = list === "shortlist" && kind === "project";
  const accountCapable = list === "shortlist" && (projectShortlist || (kind === "property" && !!intent));
  const accountList = accountCapable && !!session?.user.id;
  const account = useAccountShortlist(accountList ? session.user.id : "", id, title, projectShortlist ? "project" : intent);
  const device = useIsSaved(list, kind, id);
  const toggle = useSavedStore((s) => s.toggle);
  const pendingKey = `${list}:${kind}:${id}`;

  const toggleOnDevice = () => {
    const result = toggle(list, { kind, id, title, ...(kind === "property" && intent ? { intent } : {}) });
    // Compare speaks as rezide.in's cards and pages do.
    if (list === "compare") {
      if (result === "limit") toast.error(`You can only compare ${COMPARE_LIMIT} ${kind === "project" ? "projects" : "listings"} at a time`);
      else toast.success(result === "added" ? "Added to compare" : "Removed from compare");
      return;
    }
    if (result === "added") {
      toast.success(`${COPY[list].add}: ${title}`, { description: "Saved on this device only. It isn't synced to an account in this prototype." });
    } else {
      toast(`${COPY[list].remove}: ${title}`);
    }
  };

  // Signed in from rezide.in's popup: finish what the guest tapped (shortlist waits for the account's list).
  const { ready, on: accountOn, add } = account;
  useEffect(() => {
    if (!session || readPending() !== pendingKey) return;
    if (accountList) {
      if (!ready) return;
      writePending(null);
      if (!accountOn) add();
      return;
    }
    writePending(null);
    if (!device) toggleOnDevice();
  });

  const run = () => {
    if (accountList) return account.run();
    // As rezide.in: a guest who taps shortlist (project or listing) or compare gets the sign-in popup;
    // the action is done once they're signed in.
    if (!session) {
      writePending(pendingKey);
      openSignIn();
      return;
    }
    toggleOnDevice();
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
      className={cn(!compact && "px-2.5 font-medium whitespace-nowrap", on && "text-rez-mocaccino-ink", className, compact && on && (list === "shortlist" ? "text-[#ef4444]" : "text-[#22c55e]"))}
    >
      <IconCmp className={cn("size-[18px]", on && !compact && (list === "shortlist" ? "text-[#ef4444]" : "text-[#22c55e]"))} fill={on && (list === "shortlist" || kind === "project") ? "currentColor" : "none"} stroke={on && list === "shortlist" ? "#374151" : "currentColor"} strokeWidth={on ? 2.25 : 2} aria-hidden />
      {!compact && <span className="text-black">{on && kind === "property" ? (list === "compare" ? "Compared" : "Shortlisted") : COPY[list].label}</span>}
    </Button>
  );
}

/** v1 header actions: Share · Compare · Shortlist. */
export function SaveActions({
  kind,
  id,
  title,
  path,
  intent,
  className,
  share,
}: {
  kind: SavedKind;
  id: string;
  title: string;
  path: string;
  intent?: Intent;
  className?: string;
  /** Replaces the default Share button (a project page opens rezide.in's share popup). */
  share?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-0.5 min-[340px]:flex-nowrap", className)}>
      {share ?? <ShareButton title={title} path={path} className="h-10 border-transparent px-2.5 font-medium hover:bg-black/[0.06]" />}
      <SaveButton list="compare" kind={kind} id={id} title={title} intent={intent} />
      <SaveButton list="shortlist" kind={kind} id={id} title={title} intent={intent} />
    </div>
  );
}

/** Round icon-only variant for cards. */
export function SaveIconButton(props: { list: SavedList; kind: SavedKind; id: string; title: string; intent?: Intent; className?: string }) {
  return <SaveButton {...props} compact />;
}
