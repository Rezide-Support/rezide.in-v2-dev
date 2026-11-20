"use client";

import Image from "next/image";
import { Copy, MessageSquare, Share2 } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/models";
import { projectHref } from "./project-card";

/*
 * rezide.in's project share: "Share this project" with the project's photo, name, locality and
 * sub-region, then Copy Link · Email · Whatsapp. A popup on desktop, a bottom drawer
 * ("Share Project") on phones.
 */

type ShareProject = Pick<Project, "id" | "name" | "locality" | "city" | "images" | "subRegion">;

/** rezide.in switches to the drawer below 768px. */
const MOBILE_QUERY = "(max-width: 767px)";
const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const useIsMobile = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );

/** The links rezide.in's share buttons open. */
export const shareLinks = (name: string, url: string) => ({
  email: `mailto:?subject=${encodeURIComponent(`Share Project - ${name}`)}&body=${encodeURIComponent(url)}`,
  whatsapp: `https://web.whatsapp.com/send?text=${url}`,
});

function ShareBody({ project: p, mobile }: { project: ShareProject; mobile: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? projectHref(p) : new URL(projectHref(p), window.location.origin).toString();
  const links = shareLinks(p.name, url);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      // rezide.in shows "Copied!" for five seconds.
      setTimeout(() => setCopied(false), 5000);
    } catch {
      setCopied(false);
    }
  };
  const size = mobile ? 150 : 180;
  const text = mobile ? "text-sm" : "text-base";
  return (
    <>
      <div className={cn("flex items-center gap-4", !mobile && "h-[180px]")}>
        <div className="relative shrink-0 overflow-hidden rounded-xl bg-rez-cloud" style={{ width: size, height: size }}>
          {p.images[0] && <Image src={p.images[0]} alt="" fill sizes={`${size}px`} className="object-cover" />}
        </div>
        <div>
          <h4 className={cn(text, "text-gray-500")}>{p.name}</h4>
          <h4 className={cn(text, "text-gray-500")}>{p.locality}</h4>
          <h4 className={cn(text, "text-gray-500")}>{p.subRegion ?? p.city}</h4>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <Button variant="outline" className="flex flex-1 gap-2 bg-white text-xs" onClick={copy}>
          <Copy className="size-4" aria-hidden />
          <span aria-live="polite">{copied ? "Copied!" : "Copy Link"}</span>
        </Button>
        <Button asChild variant="outline" className="flex flex-1 gap-2 bg-white text-xs">
          <a href={links.email}>
            <MessageSquare className="size-4" aria-hidden />
            <span>Email</span>
          </a>
        </Button>
        <Button asChild variant="outline" className="flex flex-1 gap-2 bg-white text-xs">
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
            <Image src="/images/whatsapp.svg" width={16} height={16} alt="" />
            <span>Whatsapp</span>
          </a>
        </Button>
      </div>
    </>
  );
}

/** The share icon button and rezide.in's share popup / drawer. */
export function ShareProjectButton({ project: p, className, children }: { project: ShareProject; className?: string; children?: ReactNode }) {
  const mobile = useIsMobile();
  const trigger = children ?? (
    <Button type="button" variant="ghost" size="icon" aria-label={`Share ${p.name}`} className={className}>
      <Share2 className="size-4" strokeWidth={2} aria-hidden />
    </Button>
  );
  if (mobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl p-4">
          <SheetHeader className="p-0 pb-2">
            <SheetTitle>Share Project</SheetTitle>
            <SheetDescription className="sr-only">Share {p.name}</SheetDescription>
          </SheetHeader>
          <div className="overflow-x-auto bg-white p-2">
            <ShareBody project={p} mobile />
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-xl bg-[#F3F0F0] sm:max-w-[550px]">
        <DialogTitle className="text-base font-semibold text-black lg:text-xl xl:text-2xl">Share this project</DialogTitle>
        <DialogDescription className="sr-only">Copy, email or WhatsApp the link to {p.name}</DialogDescription>
        <ShareBody project={p} mobile={false} />
      </DialogContent>
    </Dialog>
  );
}
