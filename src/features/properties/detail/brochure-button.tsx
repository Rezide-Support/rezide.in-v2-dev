"use client";

import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/stores/session";
import { useOpenSignIn } from "@/features/auth/sign-in-modal";
import { NotYetButton } from "./detail-ui";

/** rezide.in's name for a project's brochure: "Sarthak-Sahayog_Project_Brochure.pdf". */
export const projectBrochureFileName = (name: string) => `${name.trim().replace(/\s+/g, "-") || "Project"}_Project_Brochure.pdf`;

/**
 * The same-origin address of a CDN brochure (/v1/admin/file/upload/{key}, proxied to the backend
 * as rezide.in does), so it can be saved under a proper name; a cross-origin link keeps the CDN's
 * file id as its name. Null when the URL isn't a CDN upload.
 */
export function brochureDownloadPath(url: string): string | null {
  const key = /^https:\/\/cdn\.rezide\.in\/images\/([^/?#]+)$/.exec(url)?.[1];
  return key ? `/v1/admin/file/upload/${key}` : null;
}

/** Saves the file at `path` as `fileName` (rezide.in fetches it, then downloads the blob). */
async function saveAs(path: string, fileName: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(String(response.status));
  const href = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

/**
 * The listing's brochure, as rezide.in offers it: signed-in visitors download
 * the PDF; others are sent to sign in first, then back here. Listings without a
 * brochure say so. With `fileName` (a project's brochure), the PDF is saved under that name.
 */
export function BrochureButton({
  url,
  listingId,
  fileName,
  iconOnly = false,
  icon,
  ...props
}: { url?: string; path: string; listingId?: string; /** The name the PDF is saved as. */ fileName?: string; iconOnly?: boolean; /** Replaces the PDF icon. */ icon?: ReactNode } & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  const { status } = useSession();
  const openSignIn = useOpenSignIn();
  const [loading, setLoading] = useState(false);
  const label = (
    <>
      {icon ?? <Image src="/images/pdf.svg" width={20} height={20} alt="" />} <span className={iconOnly ? "sr-only" : undefined}>Brochure</span>
    </>
  );

  if (status !== "authenticated") {
    return <Button {...props} type="button" onClick={openSignIn} aria-label="Sign in to download the brochure">{label}</Button>;
  }
  if (!url && !listingId) {
    return (
      <NotYetButton {...props} message="There's no brochure for this listing yet.">
        {label}
      </NotYetButton>
    );
  }
  if (!url && listingId) return <Button {...props} aria-label="Download brochure" disabled={loading} onClick={async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(listingId)}/card-resources?resource=brochure`);
      if (!response.ok) throw new Error("The brochure couldn't be loaded.");
      const data = await response.json();
      if (!data.url) { toast("There's no brochure for this listing yet."); return; }
      const link = document.createElement("a"); link.href = data.url; link.download = `${listingId}_brochure.pdf`; link.target = "_blank"; link.rel = "noopener noreferrer"; document.body.appendChild(link); link.click(); link.remove();
    } catch { toast.error("The brochure couldn't be loaded. Please try again."); }
    finally { setLoading(false); }
  }}>{label}</Button>;
  const named = url && fileName ? brochureDownloadPath(url) : null;
  if (named && fileName) {
    return (
      <Button
        {...props}
        aria-label={iconOnly ? "Download brochure" : undefined}
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await saveAs(named, fileName);
          } catch {
            toast.error("Failed to download brochure.");
          } finally {
            setLoading(false);
          }
        }}
      >
        {label}
      </Button>
    );
  }
  return (
    <Button {...props} asChild>
      <a href={url} download target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </Button>
  );
}
