"use client";

import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";

/** Uses the Web Share sheet where available, otherwise copies the link. */
export function ShareButton({
  title,
  path,
  className,
  iconOnly,
}: {
  title: string;
  path: string;
  className?: string;
  /** Round outline icon button (prototype card "Share"). */
  iconOnly?: boolean;
}) {
  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard.");
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;
      toast.error("Couldn't share this link. Copy it from the address bar instead.");
    }
  };
  if (iconOnly) {
    return (
      <Button
        variant="secondary"
        size="icon"
        onClick={share}
        aria-label={`Share ${title}`}
        className={className ?? "size-9 border-rez-smoke hover:border-black"}
      >
        <Share2 size={18} strokeWidth={1.75} aria-hidden />
      </Button>
    );
  }
  return (
    <Button variant="secondary" size="default" onClick={share} className={className}>
      <Icon name="share" size={18} />
      Share
    </Button>
  );
}
