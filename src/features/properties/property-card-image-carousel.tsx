"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_CARD_IMAGES = 5;
const EMPTY_IMAGE = "/images/empty.gif";

export function PropertyCardImageCarousel({
  images,
  label,
  href,
  priority,
  maxImages = MAX_CARD_IMAGES,
  fallbackImage = EMPTY_IMAGE,
}: {
  images: string[];
  label: string;
  href: string;
  priority?: boolean;
  /** Project previews can show the full gallery; listing cards default to five. */
  maxImages?: number;
  fallbackImage?: string;
  reserveBadgeSpace?: boolean;
}) {
  const slides = images.slice(0, maxImages).map((src) => src.trim() || fallbackImage);
  const visibleSlides = slides.length ? slides : [fallbackImage];
  const [viewportRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(visibleSlides.length > 1);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  const updateSelection = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", updateSelection);
    emblaApi.on("reInit", updateSelection);
    return () => {
      emblaApi.off("select", updateSelection);
      emblaApi.off("reInit", updateSelection);
    };
  }, [emblaApi, updateSelection]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`${label} photos`}
      className="group/card-photos relative h-full w-full overflow-hidden bg-rez-cloud"
    >
      <div ref={viewportRef} className="h-full overflow-hidden">
        <div className="flex h-full touch-pan-y">
          {visibleSlides.map((src, index) => {
            const imageSrc = failedImages.has(src) ? fallbackImage : src;
            return (
              <div
                key={`${src}:${index}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${visibleSlides.length}`}
                className="relative h-full min-w-0 flex-[0_0_100%]"
              >
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View ${label}, photo ${index + 1} of ${visibleSlides.length}`}
                  className="relative block h-full w-full"
                >
                  <Image
                    src={imageSrc}
                    onError={() => {
                      if (imageSrc !== fallbackImage) {
                        setFailedImages((current) => new Set(current).add(src));
                      }
                    }}
                    alt={`${label}, photo ${index + 1} of ${visibleSlides.length}`}
                    fill
                    unoptimized={imageSrc === fallbackImage}
                    sizes="(min-width: 1280px) 420px, (min-width: 768px) 50vw, 100vw"
                    quality={70}
                    loading={priority && index === 0 ? "eager" : "lazy"}
                    fetchPriority={priority && index === 0 ? "high" : undefined}
                    className="object-cover"
                  />
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {visibleSlides.length > 1 && (
        <>
          {canScrollPrev && (
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              aria-label={`Previous photo of ${label}`}
              className="pointer-events-none absolute top-1/2 left-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-sm opacity-0 transition-opacity group-hover/card-photos:pointer-events-auto group-hover/card-photos:opacity-100 group-focus-within/card-photos:pointer-events-auto group-focus-within/card-photos:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
            >
              <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
          )}
          {canScrollNext && (
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              aria-label={`Next photo of ${label}`}
              className="pointer-events-none absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-sm opacity-0 transition-opacity group-hover/card-photos:pointer-events-auto group-hover/card-photos:opacity-100 group-focus-within/card-photos:pointer-events-auto group-focus-within/card-photos:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
            >
              <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
          )}
          <div
            className="absolute inset-x-0 bottom-3 flex justify-center"
            aria-label="Choose photo"
          >
            <div className="flex items-center gap-3">
              {visibleSlides.map((src, index) => (
                <button
                  key={`${src}:${index}`}
                  type="button"
                  onClick={() => emblaApi?.scrollTo(index)}
                  aria-label={`Show photo ${index + 1} of ${label}`}
                  aria-current={index === selectedIndex ? "true" : undefined}
                  className="flex size-2 items-center justify-center"
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full transition-colors",
                      index === selectedIndex ? "bg-white" : "bg-white/65",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
