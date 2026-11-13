"use client";

import Link from "next/link";
import Image from "next/image";
import type { ComponentProps } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/stores/session";
import { NotYetButton } from "./detail-ui";

/**
 * The listing's brochure, as rezide.in offers it: signed-in visitors download
 * the PDF; others are sent to sign in first, then back here. Listings without a
 * brochure say so.
 */
export function BrochureButton({
  url,
  path,
  listingId,
  iconOnly = false,
  ...props
}: { url?: string; path: string; listingId?: string; iconOnly?: boolean } & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  const { status } = useSession();
  const [loading, setLoading] = useState(false);
  const label = (
    <>
      <Image src="/images/pdf.svg" width={20} height={20} alt="" /> <span className={iconOnly ? "sr-only" : undefined}>Brochure</span>
    </>
  );

  if (!url && !listingId) {
    return (
      <NotYetButton {...props} message="There's no brochure for this listing yet.">
        {label}
      </NotYetButton>
    );
  }
  if (status !== "authenticated") {
    return (
      <Button {...props} asChild>
        <Link href={`/login?next=${encodeURIComponent(path)}`} aria-label="Sign in to download the brochure">
          {label}
        </Link>
      </Button>
    );
  }
  if (!url && listingId) return <Button {...props} aria-label="Download brochure" disabled={loading} onClick={async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(listingId)}/card-resources?resource=brochure`);
      if (!response.ok) throw new Error("The brochure couldn't be loaded.");
      const data = await response.json();
      if (!data.url) { toast("There's no brochure for this listing yet."); return; }
      const link = document.createElement("a"); link.href = data.url; link.download = `${listingId}_brochure.pdf`; document.body.appendChild(link); link.click(); link.remove();
    } catch { toast.error("The brochure couldn't be loaded. Please try again."); }
    finally { setLoading(false); }
  }}>{label}</Button>;
  return (
    <Button {...props} asChild>
      <a href={url} download target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </Button>
  );
}
