"use client";

import Image from "next/image";
import { useState } from "react";
import { Box } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function comparisonPhotoUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

/** Missing content uses the original animated asset, never a loading skeleton. */
export function ComparisonPhoto({ url, label, title }: { url?: string; label: string; title?: string }) {
  const src = comparisonPhotoUrl(url);
  const [failedSource, setFailedSource] = useState<string>();
  const frame = "relative h-[150px] w-full overflow-hidden bg-white lg:h-[200px]";

  if (!src || failedSource === src) {
    return <div className={frame}>
      <Image src="/images/empty.gif" fill alt="Photo unavailable" className="object-contain" unoptimized />
    </div>;
  }

  const alt = `${title ?? "Property"} - ${label}`;
  return <Dialog>
    <div className={frame}>
      <Image src={src} fill alt={alt} className="object-contain" sizes="(min-width: 1024px) 300px, 240px" onError={() => setFailedSource(src)} />
      <DialogTrigger asChild>
        <button type="button" aria-label={`Expand ${alt}`} className="absolute top-1 right-1 flex size-9 items-center justify-center rounded text-white drop-shadow-sm hover:bg-black/15 focus-visible:bg-black/30 focus-visible:outline-2 focus-visible:outline-white print:hidden">
          <Box className="size-4" fill="currentColor" strokeWidth={1.5} aria-hidden />
        </button>
      </DialogTrigger>
    </div>
    <DialogContent className="sm:max-w-5xl" aria-describedby={undefined}>
      <DialogTitle className="pr-10 text-base">{alt}</DialogTitle>
      <div className="relative h-[65dvh] w-full">
        <Image src={src} fill alt={alt} className="object-contain" sizes="90vw" onError={() => setFailedSource(src)} />
      </div>
    </DialogContent>
  </Dialog>;
}
