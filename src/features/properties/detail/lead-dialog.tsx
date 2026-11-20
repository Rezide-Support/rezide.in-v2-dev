"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
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
  listing,
  project,
  children,
  mobileSheet = false,
}: {
  mode: LeadMode;
  title: string;
  description: string;
  target: { propertyId?: string; projectId?: string; realtorId?: string };
  recipient: string;
  intents?: readonly string[];
  submitLabel?: string;
  /** Set on a real listing: the request goes to its broker. */
  listing?: LeadListing;
  /** Set on a real project: the request goes to the Rezide team. */
  project?: LeadProject;
  /** The trigger button. */
  children: ReactNode;
  mobileSheet?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const { status } = useSession();
  const pending = params.get("enquiry");
  useEffect(() => {
    if (status !== "authenticated" || pending !== mode) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [status, pending, mode]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={mobileSheet ? "sm:max-w-lg max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[90dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-3xl max-sm:rounded-b-none" : "sm:max-w-lg"}>
        <DialogHeader className="pr-10">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <LeadForm mode={mode} target={target} recipient={recipient} intents={intents} submitLabel={submitLabel} listing={listing} project={project} />
      </DialogContent>
    </Dialog>
  );
}
