"use client";

import { useState } from "react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type CredentialKey = "RERA" | "GST" | "NAR-India" | "Tech";

/** "Why it matters" copy from the prototype. */
export const CREDENTIAL_INFO: Record<CredentialKey, { title: string; sub: string; points: string[] }> = {
  RERA: {
    title: "RERA Registered",
    sub: "Registered with the state Real Estate Regulatory Authority.",
    points: [
      "Verified identity and office address on public record",
      "Bound by RERA code of conduct and fair-practice rules",
      "Complaints can be raised with the RERA authority",
      "Must disclose accurate project and listing details",
    ],
  },
  GST: {
    title: "GST Registered",
    sub: "A tax-compliant business with a valid GSTIN.",
    points: [
      "Proper invoices for brokerage and service fees",
      "A registered, accountable business entity",
      "Transparent fees with tax shown separately",
      "Input tax credit for business clients",
    ],
  },
  "NAR-India": {
    title: "NAR-India Member",
    sub: "Member of the National Association of Realtors, India.",
    points: [
      "Follows the NAR-India code of ethics",
      "Trained in professional standards and practice",
      "Access to a national network of verified realtors",
      "Disputes handled through a professional grievance process",
    ],
  },
  Tech: {
    title: "Tech Enabled",
    sub: "Active on the Rezide platform.",
    points: [
      "Listings, visits and deals tracked in one place",
      "Verified profile with ratings from real clients",
      "Instant replies, video tours and digital paperwork",
      "Every interaction logged for full transparency",
    ],
  },
};

export function CredentialDialog({ credential, onClose }: { credential: CredentialKey | null; onClose: () => void }) {
  const info = credential ? CREDENTIAL_INFO[credential] : null;
  return (
    <Dialog open={!!info} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        {info && (
          <>
            <DialogHeader className="flex-row items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-rez-mocaccino">
                <Icon name="shield-check" size={22} />
              </span>
              <div className="flex flex-col gap-1 text-left">
                <DialogTitle>{info.title}</DialogTitle>
                <DialogDescription>{info.sub}</DialogDescription>
              </div>
            </DialogHeader>
            <p className="text-[13px] font-semibold">What it means for you</p>
            <ul className="flex flex-col gap-2.5">
              {info.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm leading-snug">
                  <Icon name="check-circle" size={18} className="mt-px text-rez-mocaccino-ink" />
                  {p}
                </li>
              ))}
            </ul>
            <p className="rounded-xl bg-rez-cloud px-3.5 py-2.5 text-xs text-rez-arsenic">
              Badges show what the realtor provided. Registration numbers aren&apos;t checked here.
            </p>
            <Button size="lg" onClick={onClose}>
              Got it
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Credential pills that open the "why it matters" dialog. */
export function CredentialPills({ credentials, size = "sm" }: { credentials: CredentialKey[]; size?: "sm" | "md" }) {
  const [open, setOpen] = useState<CredentialKey | null>(null);
  return (
    <>
      <ul className="flex flex-wrap gap-1.5">
        {credentials.map((c) => (
          <li key={c}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(c);
              }}
              aria-haspopup="dialog"
              aria-label={`${c}: why it matters`}
              className={cn(
                "relative z-10 inline-flex items-center gap-1.5 rounded-full border border-rez-smoke bg-white pr-3 pl-1 font-semibold whitespace-nowrap hover:border-black",
                size === "sm" ? "h-7 text-xs" : "h-9 text-[13px]",
              )}
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-[#1f7a4d] text-white">
                <Icon name="check" size={12} />
              </span>
              {c}
            </button>
          </li>
        ))}
      </ul>
      <CredentialDialog credential={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** Small mocaccino shield button ("why it matters") used inline next to a credential. */
export function CredentialInfoButton({ credential, label, className }: { credential: CredentialKey; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-label={`${label ?? CREDENTIAL_INFO[credential].title}: why it matters`}
        title="Why it matters"
        className={cn(
          "relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-rez-mocaccino text-black before:absolute before:-inset-1 hover:bg-rez-mocaccino-ink hover:text-rez-full-white",
          className,
        )}
      >
        <Icon name="shield-check" size={12} />
      </button>
      <CredentialDialog credential={open ? credential : null} onClose={() => setOpen(false)} />
    </>
  );
}
