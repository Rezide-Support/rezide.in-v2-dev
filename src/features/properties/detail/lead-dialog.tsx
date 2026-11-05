"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeadForm, type LeadListing, type LeadMode } from "./lead-form";

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
  children,
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
  /** The trigger button. */
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <LeadForm mode={mode} target={target} recipient={recipient} intents={intents} submitLabel={submitLabel} listing={listing} />
      </DialogContent>
    </Dialog>
  );
}
