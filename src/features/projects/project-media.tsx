"use client";

import { PlayCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CDN_ORIGIN } from "@/lib/api/origins";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/models";

/** The 11-character id of a YouTube link (watch, youtu.be, embed or shorts), as rezide.in matches it. */
export function youTubeId(url: string): string | undefined {
  return /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(url)?.[1];
}

/** How a project video plays: YouTube's player, or the file on the Rezide CDN (rezide.in's `{key}.mp4`). */
export function videoSource(url: string): { kind: "youtube"; src: string } | { kind: "file"; src: string } {
  const id = youTubeId(url);
  if (id) return { kind: "youtube", src: `https://www.youtube.com/embed/${id}` };
  return { kind: "file", src: /^https:\/\//i.test(url) ? url : `${CDN_ORIGIN}/images/${encodeURIComponent(url)}.mp4` };
}

/** The project's video, filling its box. */
export function VideoPlayer({ url, title, className }: { url: string; title: string; className?: string }) {
  const source = videoSource(url);
  return source.kind === "youtube" ? (
    <iframe
      src={source.src}
      title={`${title} video`}
      className={cn("aspect-video w-full rounded-2xl border-0 bg-black", className)}
      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  ) : (
    <video controls preload="metadata" src={source.src} className={cn("aspect-video w-full rounded-2xl bg-black", className)}>
      Your browser can&apos;t play this video.
    </video>
  );
}

/** The project's 360° tour, filling its box. */
export function VrTourFrame({ url, title, className }: { url: string; title: string; className?: string }) {
  return (
    <iframe
      src={url}
      title={`${title} 360° virtual tour`}
      className={cn("h-[min(580px,70vh)] w-full rounded-2xl border-0 bg-black", className)}
      allow="fullscreen; accelerometer; gyroscope; magnetometer; xr-spatial-tracking"
      allowFullScreen
    />
  );
}

/** rezide.in's 360 icon (Tabler's "view-360-number", the icon rezide.in uses). */
function View360Icon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M14 6a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h2a1 1 0 0 0 1 -1v-2a1 1 0 0 0 -1 -1h-3" />
      <path d="M3 5h2.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1 -1.5 1.5h-1.5h1.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1 -1.5 1.5h-2.5" />
      <path d="M17 7v4a2 2 0 1 0 4 0v-4a2 2 0 1 0 -4 0z" />
      <path d="M3 16c0 1.657 4.03 3 9 3s9 -1.343 9 -3" />
    </svg>
  );
}

/** rezide.in's dark button under the card photo: 48px tall, with a 40px white icon. */
const BAR =
  "flex h-12 w-full items-center justify-center overflow-hidden rounded-md bg-gradient-to-r from-gray-500 via-black to-black text-white [&_svg]:size-10";

/** The player box in the dialog: rezide.in's 580px (shorter on short screens). */
const PLAYER = "h-[min(580px,70vh)] aspect-auto";

/**
 * rezide.in's video and 360 buttons under a project card's photo: one full width, or two side by
 * side, labelled "Watch video" and "VR tour" (no labels on phones). Each opens its player in a
 * dialog titled "Video" or "VR Tour". Nothing shows when the project has neither.
 */
export function ProjectMediaButtons({ project: p, className }: { project: Pick<Project, "name" | "videoUrl" | "vrTourUrl">; className?: string }) {
  const [open, setOpen] = useState<"video" | "vr" | null>(null);
  if (!p.videoUrl && !p.vrTourUrl) return null;
  const both = !!(p.videoUrl && p.vrTourUrl);
  const item = (kind: "video" | "vr", label: string, caption: string, icon: ReactNode) => (
    <button
      type="button"
      onClick={() => setOpen(kind)}
      aria-label={label}
      className="group relative z-10 flex w-full cursor-pointer flex-col gap-2 rounded-md focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/60 focus-visible:outline-none"
    >
      <span className={cn(BAR, "group-hover:opacity-90")}>{icon}</span>
      {both && (
        <span aria-hidden className="self-center text-xs uppercase max-sm:hidden">
          {caption}
        </span>
      )}
    </button>
  );
  return (
    <>
      <div className={cn("grid gap-2", both ? "grid-cols-2" : "grid-cols-1", className)}>
        {p.videoUrl && item("video", `Play ${p.name} video`, "Watch Video", <PlayCircle strokeWidth={2} aria-hidden />)}
        {p.vrTourUrl && item("vr", `Open ${p.name} 360° virtual tour`, "VR Tour", <View360Icon />)}
      </div>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-[min(700px,calc(100%-2rem))] gap-3 p-4 sm:max-w-[700px] sm:p-6 md:rounded-2xl lg:rounded-3xl">
          <DialogTitle>{open === "vr" ? "VR Tour" : "Video"}</DialogTitle>
          {open === "video" && p.videoUrl && <VideoPlayer url={p.videoUrl} title={p.name} className={PLAYER} />}
          {open === "vr" && p.vrTourUrl && <VrTourFrame url={p.vrTourUrl} title={p.name} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
