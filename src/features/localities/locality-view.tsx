"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { propertySearchHref } from "@/features/search/criteria";
import { cn } from "@/lib/utils";
import type { LocalityDetail } from "@/services/localities";

/*
 * rezide.in's locality page (/locality/{id}), opened from a project's "Explore {locality}"
 * photo: a sliding banner with the "Welcome to …" card, KEY DETAILS (four numbered notes,
 * each with "Read More"), links to the locality's properties for rent and sale, and its map.
 */

/** rezide.in shows the first 200 characters of each note, the rest under "Read More". */
const PREVIEW = 200;
/** rezide.in's banner moves on every 2 seconds, pausing while the pointer is over it. */
const AUTOPLAY_MS = 2000;

/** rezide.in's banner: the locality's photos sliding by (a plain grey band when it has none). */
function Banner({ images, name, className }: { images: string[]; name: string; className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = images.length;
  useEffect(() => {
    if (n < 2 || paused) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % n), AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [n, paused]);
  const go = (i: number) => setIndex(((i % n) + n) % n);
  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`Photos of ${name}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn("relative overflow-hidden bg-gray-400", className)}
    >
      <div className="flex h-full transition-transform duration-700 ease-in-out" style={{ transform: `translateX(${-index * 100}%)` }}>
        {images.map((src, i) => (
          <div key={`${src}:${i}`} className="relative h-full w-full shrink-0" aria-hidden={i !== index}>
            <Image src={src} alt={`${name}, photo ${i + 1} of ${n}`} fill sizes="100vw" priority={i === 0} className="object-cover" />
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous photo"
            className="absolute top-1/2 left-6 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-black md:flex"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next photo"
            className="absolute top-1/2 right-6 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-black md:flex"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}

/** rezide.in's "Read More": the whole note in a dialog (a sheet from the bottom on phones). */
function ReadMore({ title, text }: { title: string; text: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-28 rounded-lg text-xs font-normal md:text-sm">
          Read More<span className="sr-only">: {title.toLowerCase()}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[600px] overflow-y-auto sm:max-w-[750px] max-md:top-auto max-md:bottom-0 max-md:max-w-full max-md:translate-y-0 max-md:rounded-b-none">
        <DialogHeader className="border-b border-gray-200 pb-3 sm:text-center md:pb-4">
          <DialogTitle className="sm:text-center">{title}</DialogTitle>
          <DialogDescription className="sr-only">The full note about this locality.</DialogDescription>
        </DialogHeader>
        <p className="mb-3 text-sm font-medium whitespace-pre-line text-gray-500">{text}</p>
      </DialogContent>
    </Dialog>
  );
}

/** "Welcome to Lower Parel." and its description (rezide.in adds the full stops). */
function Welcome({ l, className, titleClass, textClass }: { l: LocalityDetail; className?: string; titleClass?: string; textClass?: string }) {
  return (
    <div className={className}>
      <h1 className={cn("font-semibold text-[#242424]", titleClass)}>{`Welcome to ${l.name}.`}</h1>
      {l.description && <p className={cn("font-normal whitespace-pre-line text-[#6D6D6D]", textClass)}>{`${l.description.replace(/\.$/, "")}.`}</p>}
    </div>
  );
}

export function LocalityView({ locality: l }: { locality: LocalityDetail }) {
  const notes = [
    { title: "WHAT TO EXPECT", text: l.whatToExpect },
    { title: "THE LIFESTYLE", text: l.lifestyle },
    { title: "UNEXPECTED APPEAL", text: l.unexpectedAppeal },
    { title: "THE MARKET", text: l.market },
  ];
  const mapQuery = [l.name, l.city].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col">
      {/* Desktop: the banner with the welcome card on its right. */}
      <div className="hidden md:grid">
        <Banner images={l.images} name={l.name} className="col-start-1 row-start-1 h-[648px] w-full" />
        {/* Above the banner (which is positioned, so it would otherwise paint over this). */}
        <div className="pointer-events-none relative z-10 col-start-1 row-start-1 mr-5 flex items-center justify-end">
          <div className="pointer-events-auto mx-3 bg-white p-10 md:mx-8">
            <Welcome
              l={l}
              className="h-[300px] w-[450px] overflow-y-auto p-4 pr-2"
              titleClass="px-4 py-5 text-4xl"
              textClass="px-4 pb-4 text-sm"
            />
          </div>
        </div>
      </div>
      {/* Phones: the banner, then the welcome card over a beige band. */}
      <div className="md:hidden">
        <Banner images={l.images} name={l.name} className="h-[300px] w-full" />
        <div className="bg-[#FAF6F1] px-3 pb-6">
          <Welcome
            l={l}
            className="relative -mt-16 w-full rounded-lg border border-[#BDBDBD] bg-white p-10"
            titleClass="py-5 text-xl"
            textClass="text-xs"
          />
        </div>
      </div>

      <section aria-labelledby="key-details" className="mx-auto w-full max-w-[1400px] px-4 pt-10 md:px-8">
        <h2 id="key-details" className="mb-5 text-center text-base font-semibold text-black lg:text-xl xl:text-2xl">
          KEY DETAILS
        </h2>
        <hr className="border-gray-200 md:hidden" />
        <ol className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-2 lg:mt-10">
          {notes.map((n, i) => (
            <li key={n.title} className="flex gap-4">
              <span aria-hidden className="text-xl font-bold text-[#242424] md:text-2xl">
                {i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold text-[#242424] md:text-lg">{n.title}</h3>
                <p className="my-3 text-xs font-normal whitespace-pre-line text-[#6D6D6D] md:text-sm">{n.text.substring(0, PREVIEW)}</p>
                {n.text && <ReadMore title={n.title} text={n.text} />}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 grid grid-cols-2 gap-2 px-2 md:gap-4">
          <Button variant="outline" asChild className="h-auto min-h-9 w-full py-2 text-center text-xs whitespace-normal md:text-sm">
            <Link href={propertySearchHref({ ...(l.city ? { city: l.city } : {}), intent: "rent", localities: [l.name] })} target="_blank" rel="noopener">
              {`Properties for rent in ${l.name}`}
            </Link>
          </Button>
          <Button asChild className="h-auto min-h-9 w-full py-2 text-center text-xs whitespace-normal md:text-sm">
            <Link href={propertySearchHref({ ...(l.city ? { city: l.city } : {}), intent: "buy", localities: [l.name] })} target="_blank" rel="noopener">
              {`Properties for sale in ${l.name}`}
            </Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="located-in" className="mx-auto w-full max-w-[1400px] px-4 py-10 md:px-8">
        <h2 id="located-in" className="mb-5 text-center text-base font-semibold text-black uppercase lg:text-xl xl:text-2xl">
          {`Located in ${l.name}`}
        </h2>
        <iframe
          title={`Map of ${l.name}`}
          src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
          className="h-[400px] w-full rounded-xl border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>
    </div>
  );
}
