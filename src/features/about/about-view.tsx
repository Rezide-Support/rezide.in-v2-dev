"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Tabs } from "radix-ui";
import { Icon } from "@/components/brand/icon";
import { cn } from "@/lib/utils";
import { HERO_IMAGE, SOLUTIONS, TEAM, type SolutionCard } from "./about-content";
import { SectionDots, useSectionPager } from "./section-pager";
import { Slider } from "./slider";

/*
 * rezide.in/about, section for section: Who We Are, Our Core Principles, the Realtor / Home Seeker /
 * Home Owner solutions, and The Team. rezide.in shows each section as a full screen; here they scroll
 * normally inside the site's header and footer.
 */

const BLUE = "text-[#4561ec]";

type SectionRef = { sectionRef: (el: HTMLElement | null) => void };
const SECTIONS = ["Who We Are", "Our Core Principles", "Solutions", "The Team"];
/** On desktop each section fills the window, as rezide.in's full-screen slides do. */
const FULL = "min-[992px]:min-h-dvh min-[992px]:flex min-[992px]:items-center";

export function AboutView() {
  const { register, active, goTo } = useSectionPager(SECTIONS.length);
  // rezide.in's About page is a slideshow with no scrollbar; hide the page scrollbar while it is open.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("scrollbar-none");
    return () => root.classList.remove("scrollbar-none");
  }, []);
  return (
    <div className="flex flex-col">
      <WhoWeAre sectionRef={register(0)} />
      <CorePrinciples sectionRef={register(1)} />
      <Solutions sectionRef={register(2)} />
      <Team sectionRef={register(3)} />
      <SectionDots labels={SECTIONS} active={active} onSelect={goTo} />
    </div>
  );
}

function WhoWeAre({ sectionRef }: SectionRef) {
  return (
    <section ref={sectionRef} aria-labelledby="who-we-are" className="bg-black">
      {/* Fills the window below the site header (64 px), so the first "slide" is the whole first screen. */}
      <div className="mx-auto flex min-h-[calc(100dvh-80px)] max-w-[1440px] items-center gap-5 py-10 min-[992px]:min-h-[calc(100dvh-65px)] lg:py-0">
        {/* As on rezide.in: the company video slot ("coming soon"), desktop only. */}
        <div className="hidden grow basis-0 md:block">
          <div className="px-0 md:px-10 lg:px-20">
            <div className="group relative">
              <div aria-hidden className="absolute inset-0 z-10 bg-black/40 transition-colors group-hover:bg-transparent" />
              <Image src={HERO_IMAGE} alt="Rezide video, coming soon" width={900} height={718} priority className="h-[300px] w-full object-cover" />
              <div className="mt-2 flex justify-center">
                <Icon name="loader" size={40} className="text-white" aria-hidden />
              </div>
            </div>
          </div>
        </div>
        <div aria-hidden className="hidden w-px self-stretch bg-[#222222] md:block" />
        <div className="grow basis-0 py-10 md:py-0">
          <div className="px-5 md:px-10 lg:px-24">
            <h1 id="who-we-are" className="mb-4 text-4xl font-bold text-white lg:text-6xl">
              Who We Are
            </h1>
            <div className="text-base text-[#999999] [&_strong]:font-semibold [&_strong]:text-[#cccccc]">
              <p className="mb-4">
                Rezide Solutions was founded in Dec 2023, with the vision to make home buying and renting <strong>seamless</strong> and{" "}
                <strong>efficient</strong>.
              </p>
              <p className="mb-4">
                Unlike most technology solutions, looking to <strong>eliminate</strong> or <strong>replace</strong> the real estate realtor, we
                are a realtor-centric platform, <strong>empowering</strong> the realtors.
              </p>
              <p className="mb-4">
                We believe that a <strong>professional</strong> and <strong>empowered</strong> realtor adds great value to a home transaction,
                as technology and human touch combine to create a <strong>seamless</strong> and <strong>efficient</strong> home buying and
                renting experience for customers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PRINCIPLES = [
  {
    title: "FUNDAMENTALLY SUPERIOR",
    short: (
      <>
        A solution not <strong>incrementally better</strong>, but <strong>fundamentally superior</strong>
      </>
    ),
    long: (
      <>
        We have adopted the first principal approach to solve the challenges of the broken home buying and renting journey, which has led us to
        create a solution that is not <strong>incrementally better</strong> but <strong>fundamentally superior</strong>.
      </>
    ),
  },
  {
    title: "DATA ACCURACY",
    short: (
      <>
        <strong>Comprehensive</strong> and <strong>accurate</strong> information, which customers can rely on
      </>
    ),
    long: (
      <>
        We address the critical issue of <strong>inaccurate</strong> and <strong>outdated</strong> data on property portals with{" "}
        <strong>deeply researched</strong> and <strong>dynamically updated</strong> information. We are obsessed about showcasing information,
        which our customers can rely upon.
      </>
    ),
  },
  {
    title: "GENUINE AVAILABILITY",
    short: (
      <>
        <strong>Unique listings</strong>, connected to underlying property with auto <strong>delisting</strong>
      </>
    ),
    long: (
      <>
        Each listing on our platform is connected to an <strong>underlying</strong> property unit, ensuring <strong>uniqueness</strong>. With{" "}
        <strong>process automation</strong> to delist every sold/rented listing, ensures that clients are provided only{" "}
        <strong>genuine available properties</strong>.
      </>
    ),
  },
  {
    title: "SEAMLESS JOURNEY",
    short: (
      <>
        Deliver an <strong>automated, primarily digital</strong> experience to customers
      </>
    ),
    long: (
      <>
        An <strong>efficient online search and discovery</strong> through multiple touchpoints, tools to eliminate and shortlist properties
        digitally, <strong>scheduling property visits</strong>, capturing <strong>visit feedback</strong> to <strong>making an offer</strong> all
        done with a few clicks.
      </>
    ),
  },
];

function CorePrinciples({ sectionRef }: SectionRef) {
  return (
    <section ref={sectionRef} aria-labelledby="core-principles" className={cn("bg-[#F5F5F8]", FULL)}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-center px-5 py-16 md:p-20">
        <h2 id="core-principles" className="mb-10 text-center text-4xl font-bold text-black lg:text-6xl">
          <span className="sm:hidden">Core Principles</span>
          <span className="hidden sm:inline">Our Core Principles</span>
        </h2>
        <div className="grid w-full gap-5 lg:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <article key={p.title} className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
              <h3 className="mb-6 text-base font-semibold text-black">{p.title}</h3>
              <p className="text-base text-black [&_strong]:font-bold">
                <span className="sm:hidden">{p.short}</span>
                <span className="hidden sm:inline">{p.long}</span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Solutions({ sectionRef }: SectionRef) {
  return (
    <section ref={sectionRef} aria-label="Rezide solutions" className={cn("bg-black", FULL)}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-center px-5 py-16 md:p-20">
        <Tabs.Root defaultValue={SOLUTIONS[0].id} className="w-full">
          <Tabs.List aria-label="Solutions for" className="mx-auto flex w-full max-w-[1200px] gap-3 overflow-x-auto [scrollbar-width:none] lg:grid lg:grid-cols-3 lg:gap-0">
            {SOLUTIONS.map((s) => (
              <Tabs.Trigger
                key={s.id}
                value={s.id}
                className="w-auto shrink-0 rounded-xl px-4 py-1.5 lg:w-full text-base font-semibold whitespace-nowrap text-[#808080] transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white data-[state=active]:bg-white data-[state=active]:text-black lg:text-xl"
              >
                {s.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {SOLUTIONS.map((s) => (
            <Tabs.Content key={s.id} value={s.id} className="mx-auto mt-12 max-w-[1200px] outline-none">
              <Slider label={s.label} arrows="outside" dots={false}>
                {s.cards.map((card, i) => (
                  <SolutionSlide key={i} card={card} />
                ))}
              </Slider>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </div>
    </section>
  );
}

function SolutionSlide({ card }: { card: SolutionCard }) {
  const name = card.title.map((t) => t.text).join("").trim();
  return (
    <div className="grid gap-5 px-1 lg:grid-cols-2">
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-[#0d0d0d] pt-6 pb-4">
        <Slider label={`${name} screenshots`} arrows={card.images.length > 1 ? "inside" : "none"} dots={card.images.length > 1}>
          {card.images.map((src, i) => (
            <div key={src + i} className="relative mx-auto aspect-[1200/831] w-full">
              <Image src={src} alt={`${name}, screen ${i + 1}`} fill sizes="(min-width: 1024px) 588px, 100vw" className="object-contain" />
            </div>
          ))}
        </Slider>
      </div>
      <div className="flex flex-col rounded-3xl border border-white/70 bg-black p-6 md:p-10">
        <h3 className="text-2xl font-bold text-white lg:text-[28px]">
          {card.title.map((t, i) => (
            <span key={i} className={cn(t.accent ? BLUE : "text-white")}>
              {t.text}
            </span>
          ))}
        </h3>
        <div className="mt-6 flex flex-col gap-4 text-base text-[#999999]">
          {card.description.map((d) => (
            <p key={d}>{d}</p>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-lg lg:text-xl">
          {card.links.map((l, i) =>
            l.external ? (
              <a key={l.text} href={l.href} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-2 hover:underline", i ? BLUE : "text-white")}>
                {l.text} <Icon name="arrow-right" size={18} aria-hidden />
              </a>
            ) : (
              <Link key={l.text} href={l.href} className={cn("inline-flex items-center gap-2 hover:underline", i ? BLUE : "text-white")}>
                {l.text} <Icon name="arrow-right" size={18} aria-hidden />
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function Team({ sectionRef }: SectionRef) {
  return (
    <section ref={sectionRef} aria-labelledby="the-team" className={cn("bg-black", FULL)}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-center px-5 py-16 md:p-20">
        <h2 id="the-team" className="mb-10 text-center text-4xl font-bold text-white lg:text-6xl">
          The Team
        </h2>
        <Slider label="The Team" slideClassName="basis-full px-2 md:basis-1/2 lg:basis-1/3" arrows="outside" dots className="w-full max-w-[1000px] px-6 lg:px-0">
          {TEAM.map((m) => (
            <figure key={m.name} className="relative mx-auto aspect-[309/299] max-w-[320px] overflow-hidden rounded-3xl border border-white/70 bg-white">
              <Image src={m.image} alt={m.name} fill sizes="(min-width: 1024px) 320px, 80vw" className="object-cover object-top grayscale" />
              {/* As on rezide.in the whole card opens the member's page; the LinkedIn button sits above it. */}
              <Link href={`/team/${m.slug}`} aria-label={`About ${m.name}`} className="absolute inset-0 rounded-3xl focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset" />
              {/* As on rezide.in every card shows the LinkedIn button; it links where a profile is known. */}
              {m.linkedin ? (
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${m.name} on LinkedIn`}
                  className="absolute top-4 right-4 grid size-12 place-items-center rounded-lg bg-[#333333] hover:bg-black"
                >
                  <Image src="/images/social-linkedin.svg" alt="" width={18} height={18} />
                </a>
              ) : (
                <span aria-hidden className="absolute top-4 right-4 grid size-12 place-items-center rounded-lg bg-[#333333]">
                  <Image src="/images/social-linkedin.svg" alt="" width={18} height={18} />
                </span>
              )}
              <figcaption className="pointer-events-none absolute bottom-4 left-4 rounded-md bg-[#333333] px-2 py-1 text-base font-semibold text-white">
                {m.name}
                <span className="sr-only">. {m.role.replace(/\*\*/g, "")}</span>
              </figcaption>
            </figure>
          ))}
        </Slider>
      </div>
    </section>
  );
}
