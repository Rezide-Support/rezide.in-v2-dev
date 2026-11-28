"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { SampleBadge } from "@/components/common/feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { thumbnailSrc } from "@/content/media";
import { ScrollIndicator } from "@/components/common/scroll-indicator";
import { cn } from "@/lib/utils";

/*
 * ASSUMED TYPES: these were not defined or imported in the original file.
 * If you already have GalleryImage, PropertyPhoto and labelledSlides elsewhere,
 * delete this block and import yours instead.
 */
export type GalleryImage = string;
export type PropertyPhoto = { url: string; label?: string };

function labelledSlides(source: PropertyPhoto[] | GalleryImage[]): PropertyPhoto[] {
  return (source as (PropertyPhoto | GalleryImage)[]).map((item) =>
    typeof item === "string" ? { url: item } : item,
  ).filter(item => typeof item?.url === "string" && item.url.trim().length > 0);
}

export type GalleryTab = {
  value: string;
  label: string;
  /** A shorter label for phone tabs, e.g. "Plans" for "Project Plans". */
  phoneLabel?: string;
  icon: LucideIcon;
  images: GalleryImage[];
  slides?: PropertyPhoto[];
  /** Each image's own caption, by index (e.g. rezide.in's "Artist Impression - Project Elevation"), when there are no `slides`. */
  captions?: string[];
  videoUrl?: string;
  tourUrl?: string;
  /** Shown when the tab has no media. */
  empty: string;
  content?: ReactNode;
};

const FALLBACK_SRC = "/images/listing-placeholder.jpg";

function slidesForTab(tab: GalleryTab): PropertyPhoto[] {
  const labelled = labelledSlides(tab.slides ?? []);
  if (labelled.length) return labelled;
  // Plain images take their captions (by index) as their labels.
  return labelledSlides(tab.images.map((url, i) => ({ url, label: tab.captions?.[i]?.trim() || undefined })));
}

const hasMedia = (t: GalleryTab) => !!t.content || slidesForTab(t).length > 0 || !!t.videoUrl?.trim() || !!t.tourUrl?.trim();

/**
 * v1 media gallery: segmented tabs, large photo with counter + arrows, thumbnail strip.
 * On phones it is one bordered card: icon-over-label tabs with an underline, the photo (swipeable)
 * and a separate thumbnail strip, with `overlay` (the heart) sitting on the photo.
 */
export function MediaGallery({
  tabs,
  title,
  className,
  caption,
  overlay,
  showEmptyTabs = false,
  keepEmptyPhotos = false,
}: {
  tabs: GalleryTab[];
  title: string;
  className?: string;
  caption?: string;
  overlay?: ReactNode;
  /** Keep tabs with no media, each showing its `empty` text (the project page shows all its tabs, as rezide.in). */
  showEmptyTabs?: boolean;
  /** Listing pages retain a Photos tab and a blank desktop area when photos are absent. */
  keepEmptyPhotos?: boolean;
}) {
  const availableTabs = showEmptyTabs ? tabs : tabs.filter(tab => hasMedia(tab) || (keepEmptyPhotos && tab.value === "photos"));
  const onlyEmptyPhotos = availableTabs.length === 1 && availableTabs[0].value === "photos" && !hasMedia(availableTabs[0]) && keepEmptyPhotos;
  if (!availableTabs.length) return null;

  const first = availableTabs[0].value;

  return (
    <Tabs
      defaultValue={first}
      className={cn("gap-2 max-lg:gap-0 max-lg:overflow-hidden max-lg:rounded-none max-lg:border max-lg:border-rez-smoke", onlyEmptyPhotos && "max-lg:border-b-0", className)}
    >
      <ScrollIndicator>
      <TabsList
        aria-label="Media"
        className={cn("flex h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-rez-smoke bg-white p-0 scrollbar-none group-data-horizontal/tabs:h-auto lg:gap-0 lg:rounded-[6px] lg:border lg:p-0 max-lg:border-b-0 ", onlyEmptyPhotos && "justify-center border-0 max-lg:shadow-none lg:border-0")}
      >
        {availableTabs.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className={cn("h-14 flex-1 flex-col gap-1 rounded-none border-0 px-3 text-xs font-medium text-rez-graphite after:hidden hover:text-black data-active:font-semibold data-active:text-black max-lg:border-b-[3px]! max-lg:border-b-[#dedede] max-lg:aria-selected:border-b-[#444]! max-lg:shadow-none! max-lg:border-x-0! max-lg:border-t-0! max-lg:focus-visible:ring-0 max-lg:focus-visible:outline-none lg:h-9 lg:min-w-[88px] lg:flex-row lg:gap-1.5 lg:rounded-[6px] lg:text-sm lg:data-active:bg-black lg:data-active:text-rez-full-white lg:data-active:shadow-none lg:data-active:hover:text-rez-full-white", onlyEmptyPhotos && "max-w-[200px] rounded-[6px] border border-rez-smoke max-lg:border-b! max-lg:aria-selected:border-b-rez-smoke! data-active:shadow-none")}
          >
            <t.icon className="size-4" aria-hidden />
            {t.phoneLabel ? (
              <>
                <span className="max-lg:hidden">{t.label}</span>
                {/* aria-hidden: the tab keeps its full name for screen readers. */}
                <span aria-hidden className="lg:hidden">
                  {t.phoneLabel}
                </span>
              </>
            ) : (
              t.label
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      </ScrollIndicator>
      {availableTabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className={cn("min-w-0", !onlyEmptyPhotos && "max-lg:mt-[2px]")}>
          {t.content ? t.content : t.videoUrl ? (
            <video src={t.videoUrl} controls preload="metadata" aria-label={`${title}: video`} className="aspect-video w-full rounded-lg bg-black" />
          ) : t.tourUrl ? (
            <iframe src={t.tourUrl} title={`${title}: VR tour`} allowFullScreen loading="lazy" className="aspect-video w-full rounded-lg border-0" />
          ) : hasMedia(t) ? (
            <Viewer
              images={t.images}
              slides={slidesForTab(t)}
              label={`${title}: ${t.label.toLowerCase()}`}
              caption={caption}
              overlay={overlay}
            />
          ) : keepEmptyPhotos && t.value === "photos" ? (
            <div aria-label="No listing photos" className="hidden aspect-[16/9] lg:block" />
          ) : (
            <div className="flex aspect-[16/9] flex-col items-center justify-center gap-3 rounded-lg bg-rez-cloud px-6 text-center sm:aspect-[21/10]">
              <t.icon className="size-8 text-rez-graphite" aria-hidden />
              <p className="max-w-sm text-[max(12px,calc(15px*var(--property-type-scale,1)))] text-rez-arsenic">{t.empty}</p>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

type CarouselApi = NonNullable<ReturnType<typeof useEmblaCarousel>[1]>;

function GalleryArrows({ api, previous, next, className, onEnd, endLabel }: {
  api?: CarouselApi;
  previous: boolean;
  next: boolean;
  /** Extra classes for both arrows (e.g. to clear a logo above them). */
  className?: string;
  /** When set, the next arrow stays on the last slide and calls this (e.g. opens the card's page). */
  onEnd?: () => void;
  endLabel?: string;
}) {
  const arrow = "pointer-events-none absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-sm opacity-0 transition-opacity group-hover/carousel:pointer-events-auto group-hover/carousel:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 disabled:invisible disabled:pointer-events-none [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100";
  const atEnd = !next && !!onEnd;
  return <>
    <button type="button" aria-label="Previous slide" disabled={!previous} onClick={() => api?.scrollPrev()} className={cn(arrow, "left-6", className)}><ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden /></button>
    <button type="button" aria-label={atEnd ? endLabel ?? "Open" : "Next slide"} disabled={!next && !onEnd} onClick={() => (atEnd ? onEnd?.() : api?.scrollNext())} className={cn(arrow, "right-6", className)}><ArrowRight className="size-4" strokeWidth={1.5} aria-hidden /></button>
  </>;
}

function keyboardScroll(event: KeyboardEvent, api?: CarouselApi) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  event.stopPropagation();
  if (event.key === "ArrowLeft") api?.scrollPrev();
  else api?.scrollNext();
}

export function Viewer({ images, slides: photoSlides, label, cardHref, priority, sample = false, caption, overlay, linear = false, arrowClassName }: {
  images: GalleryImage[];
  slides?: PropertyPhoto[];
  label: string;
  cardHref?: string;
  priority?: boolean;
  sample?: boolean;
  caption?: string;
  overlay?: ReactNode;
  reserveBadgeSpace?: boolean;
  /** Card only: next on the last photo opens `cardHref` (the project card, as the old site's project search). */
  linear?: boolean;
  /** Card only: extra classes for the two arrows (e.g. to clear a logo above them). */
  arrowClassName?: string;
}) {
  const router = useRouter();
  const slides = labelledSlides(photoSlides ?? images);
  const n = slides.length;
  const [mainRef, mainApi] = useEmblaCarousel({ loop: false });
  const [thumbRef, thumbApi] = useEmblaCarousel({ loop: false, align: "start", containScroll: "keepSnaps" });
  const [main, setMain] = useState({ selected: 0, previous: false, next: false });
  const [thumbs, setThumbs] = useState({ previous: false, next: false });
  const [failed, setFailed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!mainApi) return;
    const sync = () => {
      const selected = mainApi.selectedScrollSnap();
      setMain({ selected, previous: mainApi.canScrollPrev(), next: mainApi.canScrollNext() });
      thumbApi?.scrollTo(selected);
    };
    sync();
    mainApi.on("select", sync).on("reInit", sync);
    return () => { mainApi.off("select", sync).off("reInit", sync); };
  }, [mainApi, thumbApi]);

  useEffect(() => {
    if (!thumbApi) return;
    const sync = () => setThumbs({ previous: thumbApi.canScrollPrev(), next: thumbApi.canScrollNext() });
    sync();
    thumbApi.on("select", sync).on("reInit", sync);
    return () => { thumbApi.off("select", sync).off("reInit", sync); };
  }, [thumbApi]);

  const selected = main.selected < n ? main.selected : 0;
  const source = (url: string) => failed.has(url) ? FALLBACK_SRC : url;
  const fail = (url: string) => { if (!failed.has(url)) setFailed(previous => new Set(previous).add(url)); };
  return <div className={cardHref ? "h-full w-full" : "flex min-w-0 flex-col gap-2"}>
    <div role="region" aria-roledescription="carousel" aria-label={label} tabIndex={0} onKeyDown={event => keyboardScroll(event, mainApi)} className={cn("group/carousel relative overflow-hidden bg-rez-cloud outline-none focus-visible:ring-2 focus-visible:ring-rez-mocaccino", cardHref ? "h-full w-full" : "rounded-none max-lg:h-[230px] lg:aspect-[21/10]")}>
      <div ref={mainRef} className="h-full overflow-hidden">
        <div className="flex h-full touch-pan-y">
          {slides.map((slide, i) => <div key={slide.url + ":" + i} role="group" aria-roledescription="slide" aria-label={(i + 1) + " of " + n} aria-hidden={i !== selected} className="relative h-full min-w-0 flex-[0_0_100%]">
            {cardHref ? <Link href={cardHref} tabIndex={i === selected ? 0 : -1} className="relative block h-full w-full" aria-label={"View " + label}><Image src={source(slide.url)} onError={() => fail(slide.url)} alt={label + (slide.label?.trim() ? " – " + slide.label.trim() : "") + ", photo " + (i + 1) + " of " + n} fill sizes="(min-width: 1280px) 420px, 50vw" priority={priority && i === 0} className="object-cover" /></Link> : <Image src={source(slide.url)} onError={() => fail(slide.url)} alt={label + (slide.label?.trim() ? " – " + slide.label.trim() : "") + ", photo " + (i + 1) + " of " + n} fill sizes="(min-width: 1024px) 66vw, 100vw" quality={70} loading={i === 0 ? "eager" : "lazy"} className="object-cover" />}
            {!cardHref && (slide.label?.trim() || caption) && <p className="absolute inset-x-0 bottom-0 bg-[rgba(84,84,84,0.7)] p-2 text-sm text-white">{slide.label?.trim() ? slide.label : caption}</p>}
          </div>)}
        </div>
      </div>
      {!cardHref && <div className="absolute top-3 right-3 z-10 flex items-center gap-3">
        {overlay && <div className="lg:hidden">{overlay}</div>}
        <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white tabular-nums max-lg:bg-black/40 max-lg:px-2 max-lg:text-[11px] max-lg:font-normal" aria-live="polite">{n ? selected + 1 : 0}/{n}</span>
      </div>}
      {sample && <SampleBadge className="absolute top-3 left-3">Sample photo</SampleBadge>}
      {cardHref && overlay && <div className="absolute top-3 right-[3.75rem] z-10 lg:hidden">{overlay}</div>}
      {n > 1 && <GalleryArrows api={mainApi} previous={main.previous} next={main.next} className={arrowClassName} onEnd={linear && cardHref ? () => router.push(cardHref) : undefined} endLabel={"View " + label} />}
    </div>
    {!cardHref && n > 0 && <div role="region" aria-roledescription="carousel" aria-label={label + " thumbnails"} tabIndex={0} onKeyDown={event => keyboardScroll(event, thumbApi)} className="group/carousel relative min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-rez-mocaccino max-lg:hidden">
      <div ref={thumbRef} className="overflow-hidden">
        <div className="flex touch-pan-y gap-4">
          {slides.map((slide, i) => <div key={slide.url + ":" + i} className="min-w-0 flex-[0_0_33.333%] md:flex-[0_0_50%] lg:flex-[0_0_25%]">
            <button type="button" onClick={() => mainApi?.scrollTo(i)} aria-label={"Show photo " + (i + 1) + " of " + n} aria-current={i === selected ? "true" : undefined} className={cn("relative block h-[50px] w-full overflow-hidden bg-rez-cloud transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rez-mocaccino lg:h-[calc(117px*var(--property-space-scale,1))]", i === selected ? "opacity-100" : "opacity-50")}>
              <Image src={failed.has(slide.url) ? FALLBACK_SRC : thumbnailSrc(slide.url)} onError={() => fail(slide.url)} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 33vw" quality={70} className="object-cover" />
            </button>
          </div>)}
        </div>
      </div>
      {n > 1 && <GalleryArrows api={thumbApi} previous={thumbs.previous} next={thumbs.next} />}
    </div>}
  </div>;
}
