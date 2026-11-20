import { CDN_ORIGIN } from "@/lib/api/origins";
import type { PropertyPhoto } from "@/types/models";

/** Deduplicate drawings without replacing a supplied caption with an unlabelled key. */
export function uniqueGalleryPhotos(photos: PropertyPhoto[]): PropertyPhoto[] {
  const byUrl = new Map<string, PropertyPhoto>();
  for (const photo of photos) {
    const existing = byUrl.get(photo.url);
    if (!existing || (!existing.label.trim() && photo.label.trim())) byUrl.set(photo.url, photo);
  }
  return [...byUrl.values()];
}

/** Resolve a CDN key or a complete web URL without duplicating extensions. */
export function listingMedia(value: unknown, extension: "jpeg" | "mp4" = "jpeg"): string | undefined {
  const key = typeof value === "string" ? value.trim() : "";
  if (!key) return undefined;
  if (/^https?:\/\//i.test(key)) {
    try { return new URL(key).href; } catch { return undefined; }
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(key) || key.startsWith("//") || key.includes("..")) return undefined;
  return `${CDN_ORIGIN}/images/${key}${/\.[a-z\d]{2,5}(?:\?|$)/i.test(key) ? "" : `.${extension}`}`;
}

export function youtubeEmbed(value: string): string | undefined {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    const id = host === "youtu.be" ? url.pathname.slice(1) : ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)
      ? url.searchParams.get("v") || /^\/(?:embed|shorts)\/([^/]+)/.exec(url.pathname)?.[1] : undefined;
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : undefined;
  } catch { return undefined; }
}

/** These providers are also permitted by the site's frame-src policy. */
export function canEmbedTour(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && ["my.matterport.com", "kuula.co"].includes(url.hostname); }
  catch { return false; }
}
