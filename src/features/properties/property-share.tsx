"use client";

import Image from "next/image";
import { Copy, MessageSquare, Share2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { uploadUrl } from "@/lib/api/origins";
import type { Property } from "@/types/models";
import { formatNumber } from "@/lib/format";

const EMPTY_PHOTO = "/images/empty.gif";
const MOBILE = "(max-width: 767px)";
const subscribe = (callback: () => void) => {
  const media = window.matchMedia(MOBILE);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const mobileSnapshot = () => window.matchMedia(MOBILE).matches;
const serverSnapshot = () => false;

export const propertyShareLinks = (name: string, url: string, mobile: boolean) => ({
  email: `mailto:?subject=${encodeURIComponent(`Share Property - ${name}`)}&body=${encodeURIComponent(url)}`,
  whatsapp: `${mobile ? "https://wa.me/?text=" : "https://web.whatsapp.com/send?text="}${encodeURIComponent(url)}`,
});

export function propertySharePhoto(url?: string) {
  const value = url?.trim();
  if (!value) return EMPTY_PHOTO;
  if (/^https?:\/\//i.test(value) || (value.startsWith("/") && !value.startsWith("//"))) return value;
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//")) return EMPTY_PHOTO;
  return uploadUrl(value);
}

function SharePreview({ property: p, mobile }: { property: Property; mobile: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const url = `${window.location.origin}/listing/${encodeURIComponent(p.id)}`;
  const links = propertyShareLinks(p.title, url, mobile);
  const photo = failed || p.photoSource === "placeholder" ? EMPTY_PHOTO : propertySharePhoto(p.galleryPhotos?.[0]?.url ?? p.images[0]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      if (timer.current) clearTimeout(timer.current);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 5000);
    } catch { toast.error("Couldn't copy the link. Please try again."); }
  };
  return <>
    <div className="flex min-w-0 items-center gap-4">
      <div className="relative h-[150px] w-[180px] max-w-[48%] shrink-0 overflow-hidden rounded-xl bg-white sm:h-[180px] sm:w-[150px]">
        <Image src={photo} alt={photo === EMPTY_PHOTO ? "Photo unavailable" : p.title} fill sizes="180px" className="object-cover" unoptimized onError={() => { if (photo !== EMPTY_PHOTO) setFailed(true); }} />
      </div>
      <div className="min-w-0 text-sm leading-6 text-gray-500 sm:text-base">
        <p className="line-clamp-2 break-words" title={p.title}>{p.title}</p>
        <p>{p.bhk !== undefined ? `${p.bhk} BHK` : p.unitType}</p>
        <p className="break-words"><b>{p.intent === "rent" ? "Rent" : "Sale"}</b> {p.priceHidden ? "Price On Request" : `₹ ${formatNumber(p.price)} /-`}</p>
      </div>
    </div>
    <div className="mt-5 grid grid-cols-3 gap-2">
      <Button type="button" variant="outline" onClick={copy} className="min-w-0 gap-1.5 rounded-md bg-white px-1 text-xs shadow-sm sm:gap-2"><Copy className="size-4 shrink-0 text-gray-500" /><span aria-live="polite">{copied ? "Copied!" : "Copy Link"}</span></Button>
      <Button asChild variant="outline" className="min-w-0 gap-1.5 rounded-md bg-white px-1 text-xs shadow-sm sm:gap-2"><a href={links.email}><MessageSquare className="size-4 shrink-0 text-gray-500" />Email</a></Button>
      <Button asChild variant="outline" className="min-w-0 gap-1.5 rounded-md bg-white px-1 text-xs shadow-sm sm:gap-2"><a href={links.whatsapp} target="_blank" rel="noopener noreferrer"><Image src="/images/whatsapp.svg" width={16} height={16} alt="" />WhatsApp</a></Button>
    </div>
  </>;
}

/** The loaded listing supplies the preview. Sharing never requests listing details. */
export function PropertyShareButton({ property: p, className, iconOnly }: { property: Property; className?: string; iconOnly?: boolean }) {
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, serverSnapshot);
  const [open, setOpen] = useState(false);
  const trigger = <Button type="button" variant="secondary" size={iconOnly ? "icon" : "default"} aria-label={`Share ${p.title}`} className={className}><Share2 size={18} strokeWidth={1.75} />{!iconOnly && "Share"}</Button>;
  if (mobile) return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>{trigger}</SheetTrigger>
    <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-[#F3F0F0] px-4 pt-5 pb-[max(24px,env(safe-area-inset-bottom))]">
      <SheetHeader className="p-0 pr-8"><SheetTitle className="text-xl font-semibold">Share this property</SheetTitle><SheetDescription className="sr-only">Copy, email or WhatsApp the link to {p.title}</SheetDescription></SheetHeader>
      {open && <SharePreview key={p.id} property={p} mobile />}
    </SheetContent>
  </Sheet>;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent overlayClassName="bg-black/80 supports-backdrop-filter:backdrop-blur-none" className="rounded-xl bg-[#F3F0F0] sm:max-w-[550px] [&>[data-slot=dialog-close]]:size-6 [&>[data-slot=dialog-close]]:border-0 [&>[data-slot=dialog-close]]:bg-transparent [&>[data-slot=dialog-close]]:shadow-none">
      <DialogTitle className="pr-6 text-2xl font-semibold">Share this property</DialogTitle><DialogDescription className="sr-only">Copy, email or WhatsApp the link to {p.title}</DialogDescription>
      {open && <SharePreview key={p.id} property={p} mobile={false} />}
    </DialogContent>
  </Dialog>;
}
