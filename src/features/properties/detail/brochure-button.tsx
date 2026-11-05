"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { Icon } from "@/components/brand/icon";
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
  ...props
}: { url?: string; path: string } & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  const { status } = useSession();
  const label = (
    <>
      <Icon name="file-download" size={16} /> Brochure
    </>
  );

  if (!url) {
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
  return (
    <Button {...props} asChild>
      <a href={url} download target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </Button>
  );
}
