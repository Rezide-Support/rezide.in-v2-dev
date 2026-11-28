"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/stores/session";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeadForm, type LeadListing, type LeadMode, type LeadProject } from "./lead-form";

/** Make an offer / Request visit / Contact builder: the lead form in a dialog (Escape closes). */
export function LeadDialog({
  mode,
  title,
  description,
  target,
  recipient,
  intents,
  submitLabel,
  defaultIntent,
  listing,
  project,
  children,
  mobileSheet = false,
  requireSignIn = false,
  pendingFor,
}: {
  mode: LeadMode;
  title: string;
  description: string;
  target: { propertyId?: string; projectId?: string; realtorId?: string };
  recipient: string;
  intents?: readonly string[];
  submitLabel?: string;
  defaultIntent?: string;
  /** Set on a real listing: the request goes to its broker. */
  listing?: LeadListing;
  /** Set on a real project: the request goes to the Rezide team. */
  project?: LeadProject;
  /** The trigger button. */
  children: ReactNode;
  mobileSheet?: boolean;
  /**
   * A signed-out visitor is sent to the sign-in page instead of seeing the form. After signing in
   * they come back to this page and the form opens (see `pendingFor`).
   */
  requireSignIn?: boolean;
  /**
   * Which item this dialog belongs to (e.g. a listing id), for pages with many of them (the
   * search results): after sign-in only the dialog the visitor clicked reopens, not every card's.
   */
  pendingFor?: string;
}) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const pending = params.get("enquiry");
  const pendingTarget = params.get("enquiryFor");
  const isPendingHere = pending === mode && (!pendingFor || pendingTarget === pendingFor);
  useEffect(() => {
    if (status !== "authenticated" || !isPendingHere) return;
    const frame = requestAnimationFrame(() => {
      setOpen(true);
      // Back from sign-in: drop the markers so a refresh doesn't open the form again.
      if (pendingFor) {
        const url = new URL(window.location.href);
        url.searchParams.delete("enquiry");
        url.searchParams.delete("enquiryFor");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [status, isPendingHere, pendingFor]);

  /** Sign-in first: back to this exact page afterwards, marked to reopen this dialog. */
  const signInFirst = () => {
    const back = new URL(window.location.href);
    back.searchParams.set("enquiry", mode);
    if (pendingFor) back.searchParams.set("enquiryFor", pendingFor);
    router.push(`/login?next=${encodeURIComponent(`${back.pathname}${back.search}`)}`);
  };

  const onOpenChange = (next: boolean) => {
    if (next && requireSignIn && status !== "authenticated") {
      // While the session is still loading, wait rather than guess.
      if (status === "anonymous") signInFirst();
      return;
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={mobileSheet ? "sm:max-w-lg max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[90dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-3xl max-sm:rounded-b-none" : "sm:max-w-lg"}>
        <DialogHeader className="pr-10">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <LeadForm mode={mode} target={target} recipient={recipient} intents={intents} submitLabel={submitLabel} defaultIntent={defaultIntent} listing={listing} project={project} />
      </DialogContent>
    </Dialog>
  );
}
