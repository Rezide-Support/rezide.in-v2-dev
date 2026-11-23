"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/*
 * Building blocks for the project page sections that follow rezide.in's v1 project page
 * exactly (Configuration plans, Project amenities, RERA details, Recent transactions,
 * About developer): its section titles, Sale/Rent-style toggles, number formats and the
 * plan viewer.
 */

/**
 * rezide.in's section title. Its sizes are what that site renders: 20px on phones,
 * 36px from tablet width, 20px on small laptops and 36px from 1280px.
 */
export function V1Title({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cn("text-xl font-semibold text-black uppercase md:text-left md:text-4xl lg:text-xl xl:text-4xl", className)}>
      {children}
    </h2>
  );
}

/** rezide.in's two-option switch (Unit Plan / Floor Plan, Sale / Rent): black pill on a black-outlined track. */
export function V1Toggle<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("grid h-10 shrink-0 grid-cols-2 gap-1 self-start rounded-xl border border-black bg-transparent p-1", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none",
              on ? "bg-black text-white shadow-md" : "text-[#6D6D6D] hover:bg-[#eee] hover:text-black hover:shadow-md",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** rezide.in's short amounts: "5.61 Cr.", "2.00L", "34K". */
export function shortInr(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "";
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)} Cr.`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(2)}L`;
  // Up to two decimals, without trailing zeros: 67,001 → "67K" (not "67.001K"), 12,500 → "12.5K".
  if (n >= 10_000) return `${Number((n / 1000).toFixed(2))}K`;
  return String(n);
}

/** rezide.in's table amounts: "Rs 5,61,00,000" (three significant digits, Indian grouping). */
export const rsInr = (n: number) => `Rs ${new Intl.NumberFormat("en-IN", { maximumSignificantDigits: 3 }).format(n)}`;

/** "12.5" stays, "24.893" → "24.89", "25.00" → "25". */
export function trimDecimals(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

/**
 * The backend's file endpoint sends no CORS header, so the browser can show its images but
 * not read them. Downloads go through this site's own /v1/admin rewrite (next.config.ts) instead.
 */
export function downloadUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/v1/admin/file/upload/") ? `${u.pathname}${u.search}` : url;
  } catch {
    return url;
  }
}

/** Saves an image (or any file) under `filename`. */
export async function downloadFile(url: string, filename: string) {
  const res = await fetch(downloadUrl(url));
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** Download with rezide.in's messages, and a busy flag for the button. */
export function useDownload() {
  const [busy, setBusy] = useState(false);
  const run = async (url: string | undefined, filename: string) => {
    if (!url) {
      toast.info("No image available");
      return;
    }
    setBusy(true);
    try {
      const ext = /\.(png|jpe?g|webp|pdf)$/i.test(filename) ? "" : ".jpg";
      await downloadFile(url, `${filename}${ext}`);
    } catch {
      toast.error("Failed to download the plan.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

/** rezide.in's plan viewer: the drawing large, with a Download button. */
export function PlanViewer({
  open,
  onOpenChange,
  title,
  src,
  onDownload,
  downloading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  src: string;
  onDownload: () => void;
  downloading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] md:rounded-2xl lg:rounded-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">The plan drawing, full size.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="relative h-[60dvh] max-h-[500px] w-full">
            <Image src={src} alt={title} fill sizes="700px" className="w-full object-contain" />
          </div>
          <Button className="w-[100px] rounded-md" onClick={onDownload} disabled={downloading}>
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
