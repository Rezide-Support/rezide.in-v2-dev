"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Icon } from "@/components/brand/icon";
import { LinkTabs } from "@/components/common/link-tabs";
import { Button } from "@/components/ui/button";
import {
  projectSearchHref,
  propertySearchHref,
} from "@/features/search/criteria";
import { useSearchSuggestions } from "@/features/search/use-search-suggestions";
import { CATEGORIES, PROJECT_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SearchSuggestion, SuggestionKind, SuggestionScope } from "@/services/locations";
import {
  parseProjectsHomePath,
  parsePropertiesHomePath,
  projectsHomeHref,
  propertiesHomeHref,
} from "@/lib/home-routes";
import { HERO_IMAGES, type HeroKey } from "@/content/media";
import { usePreferredCity } from "@/stores/preferences";
import type { Intent, ProjectStatus, PropertyCategory } from "@/types/models";

/** Suggestions each hero search can act on (rezide.in's property search leaves realtors out). */
const PROPERTY_SUGGESTIONS: readonly SuggestionKind[] = [
  "subRegion",
  "locality",
  "project",
  "other",
];
const PROJECT_SUGGESTIONS: readonly SuggestionKind[] = [
  "project",
  "developer",
  "subRegion",
  "locality",
  "other",
];

function HeroPhoto({ heroKey }: { heroKey: HeroKey }) {
  const hero = HERO_IMAGES[heroKey];
  return (
    <div className="hero-photo absolute inset-0 overflow-hidden">
      {/* Keyed so only the active photo is requested; the fade replays when the tab changes. */}
      <div
        key={heroKey}
        className="hero-photo-frame absolute inset-0 animate-in duration-500 fade-in"
      >
        <Image
          src={hero.src}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={70}
          className="ken-burns object-cover grayscale"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.42)_0%,rgba(0,0,0,.36)_50%,rgba(0,0,0,.48)_100%)]"
      />
      {/* No photo credit on any tab (properties or projects). */}
      {/* Photo credit, hidden for now:
      <a
        href={hero.href}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 left-1.5 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 hover:bg-black/85"
      >
        Photo by {hero.credit} on Unsplash
      </a>
      */}
    </div>
  );
}

/** Photo, headline and the white search card shared by both discovery heroes; `footer` sits under the card. */
function HeroShell({
  heroKey,
  title,
  children,
  footer,
  fluid = false,
}: {
  heroKey: HeroKey;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Sizes follow the screen width (the projects home): smaller on laptops, full size on big monitors; phones unchanged. */
  fluid?: boolean;
}) {
  return (
    <section
      data-hero-category={heroKey}
      data-property-hero={CATEGORIES.some(category => category.id === heroKey) || undefined}
      className={cn(
        "relative flex min-h-[calc(420px*var(--property-space-scale,1))] items-center justify-center bg-rez-forest px-4 pt-12 pb-14 max-md:-mt-5 max-md:pt-[68px] md:px-8",
        fluid
          ? // The photo fills the screen below the 65px header (64px + 1px border) (taller only if the content needs it).
            "md:min-h-[calc(100svh-65px)] md:pt-[clamp(56px,5.2vw,88px)] md:pb-[clamp(48px,4.7vw,80px)]"
          : "md:min-h-[calc(560px*var(--property-space-scale,1))] md:pt-[calc(88px*var(--property-space-scale,1))] md:pb-20",
      )}
    >
      <HeroPhoto heroKey={heroKey} />
      <div
        className={cn(
          "hero-content relative flex w-full flex-col items-center gap-5",
          fluid ? "max-w-[860px] md:max-w-[clamp(700px,50vw,860px)] md:gap-[clamp(20px,1.6vw,28px)]" : "max-w-[min(100%,calc(860px*var(--property-space-scale,1)))] md:gap-7",
        )}
      >
        <h1
          className={cn(
            "text-center text-[max(12px,calc(36px*var(--property-type-scale,1)))] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-white",
            fluid ? "sm:text-[clamp(36px,3.65vw,64px)]" : "sm:text-[clamp(calc(40px*var(--property-type-scale,1)),calc(4.4vw*var(--property-type-scale,1)),calc(64px*var(--property-type-scale,1)))]",
          )}
        >
          {title}
        </h1>
        <div
          className={cn(
            "flex w-full flex-col gap-3 bg-white shadow-rez-lg max-sm:gap-2.5 max-sm:rounded-[20px]",
            fluid ? "rounded-[clamp(20px,1.4vw,24px)] p-[clamp(10px,0.7vw,12px)]" : "rounded-[24px] p-3",
          )}
        >
          {children}
        </div>
        {footer}
      </div>
    </section>
  );
}

const KIND_LABEL: Record<SuggestionKind, string> = {
  locality: "Locality",
  subRegion: "Area",
  project: "Project",
  developer: "Developer",
  realtor: "Realtor",
  other: "Place",
};

/**
 * Search field + button; `leading` sits before the field (the Buy/Rent switch).
 * Typing shows suggestions from the Rezide backend for `city`, limited to `kinds`;
 * picking one searches for it, as rezide.in's search bars do.
 */
function SearchRow({
  label,
  placeholder,
  leading,
  city,
  kinds,
  onSearch,
  fluid = false,
  scope = "all",
}: {
  label: string;
  placeholder: string;
  leading?: ReactNode;
  city: string;
  kinds: readonly SuggestionKind[];
  onSearch: (query: string) => void;
  /** "developer": the backend's list that also has builders (the project search, as rezide.in). */
  scope?: SuggestionScope;
  /** Field and button sizes follow the screen width (the projects home); phones unchanged. */
  fluid?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputId = useId();
  const listId = useId();
  const { suggestions } = useSearchSuggestions(q, { city, kinds, scope });
  const showList = open && suggestions.length > 0;

  const pick = (s: SearchSuggestion) => {
    setQ(s.name);
    setOpen(false);
    onSearch(s.name);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (showList && active >= 0 && suggestions[active])
      return pick(suggestions[active]);
    setOpen(false);
    onSearch(q.trim());
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setOpen(false);
    if (!showList || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    setActive((i) => (i + step + suggestions.length) % suggestions.length);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label={label}
      className={cn(
        "flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:border sm:border-rez-smoke",
        fluid ? "sm:min-h-[clamp(54px,3.7vw,64px)] sm:p-[clamp(5px,0.35vw,6px)]" : "sm:min-h-16 sm:p-1.5",
      )}
    >
      {leading}
      <div className="flex items-center rounded-full border border-rez-smoke p-1 sm:contents">
        <div className="relative flex min-w-0 flex-1 items-center">
          <span className="flex pl-3 text-rez-graphite" aria-hidden>
            <Icon name="search" size={18} />
          </span>
          <label htmlFor={inputId} className="sr-only">
            {placeholder}
          </label>
          <input
            id={inputId}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={
              showList && active >= 0 ? `${listId}-${active}` : undefined
            }
            className={cn(
              "h-9 min-w-0 flex-1 bg-transparent px-2.5 text-[13px] outline-none placeholder:text-[#767a88] max-sm:placeholder:text-[12px] sm:px-3",
              fluid ? "sm:h-[clamp(42px,2.8vw,48px)] sm:text-[clamp(14px,0.9vw,15px)]" : "sm:h-12 sm:text-[max(12px,calc(15px*var(--property-type-scale,1)))]",
            )}
          />
          {showList && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Suggestions"
              className="absolute top-full right-0 left-0 z-30 mt-3 max-h-[min(360px,50vh)] overflow-y-auto rounded-[20px] border border-rez-smoke bg-white shadow-rez-lg"
            >
              {suggestions.map((s, i) => (
                <li
                  key={`${s.kind}-${s.id || s.name}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // Keep focus in the field so the click lands before the list closes on blur.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 border-b border-rez-smoke px-[18px] py-3 last:border-b-0 hover:bg-rez-cloud",
                    i === active && "bg-rez-cloud",
                  )}
                >
                  <Icon
                    name={s.kind === "realtor" ? "user" : "map-pin"}
                    size={16}
                    className="shrink-0 text-rez-graphite"
                  />
                  <span className="min-w-0 flex-1 truncate text-[max(12px,calc(15px*var(--property-type-scale,1)))] font-medium">
                    {s.name}
                  </span>
                  <span className="shrink-0 text-[12px] text-rez-graphite">
                    {KIND_LABEL[s.kind]}
                    {s.city ? ` · ${s.city}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          className={cn(
            "shrink-0 max-sm:h-8 max-sm:px-3.5 max-sm:text-[12px] sm:ml-2",
            fluid ? "sm:h-[clamp(42px,2.8vw,48px)] sm:min-w-[clamp(120px,8vw,140px)] sm:text-[clamp(15px,0.95vw,16px)]" : "sm:min-w-[140px]",
          )}
        >
          Search
        </Button>
      </div>
    </form>
  );
}

/** On phones the hero's tab sets become one underlined row, as in the design. */
const MOBILE_TABS = "max-sm:border-b max-sm:border-rez-smoke max-sm:[&>ul]:flex max-sm:[&>ul]:w-full max-sm:[&>ul]:flex-nowrap max-sm:[&>ul]:justify-between";
const MOBILE_TAB = "max-sm:h-8 max-sm:rounded-none max-sm:px-0.5 max-sm:text-[12px] max-sm:font-medium max-sm:text-rez-graphite max-sm:aria-[current=page]:bg-transparent max-sm:aria-[current=page]:font-bold max-sm:aria-[current=page]:text-black max-sm:aria-[current=page]:shadow-[inset_0_-2px_0_var(--rez-mocaccino)]";

/** Short labels for phones, where the full ones don't fit on one row. */
const SHORT_STATUS: Partial<Record<ProjectStatus, string>> = { uc: "Under Const." };

/** The four promises under the property search card; homes and the commercial tabs differ. */
const TRUST_BADGES: Record<
  "homes" | "commercial" | "other" | "projects",
  readonly (readonly [string, string])[]
> = {
  homes: [
    // ["Real photos", "No fake listings"],
    // ["RERA-registered", "Realtors"],
    // ["NAR-India", "Members"],
    // ["Tech enabled", "On Rezide"],
  ],
  // Properties home, Offices to Land tabs (hidden for now).
  commercial: [
    // ["Real photos", "No fake listings"],
    // ["Owner-authorised", "Verified properties"],
    // ["RERA-registered", "All realtors"],
    // ["Tech enabled", "On Rezide"],
  ],
  // Projects home, Ready to Move and New Launches tabs (hidden for now).
  other: [
    // ["Real photos", "No fake listings"],
    // ["Owner-authorised", "Verified properties"],
    // ["RERA-registered", "All realtors"],
    // ["Tech enabled", "On Rezide"],
  ],
  projects: [
    // ["Curated Info.", "No fake listings"],
    // ["Recent Transactions", "Verified properties"],
    // ["RERA-registered", "All realtors"],
    // ["Tech enabled", "On Rezide"],
  ],
};

/** Solid white shield with a dark tick, as in the design. */
function TrustShield() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      aria-hidden
      className="mt-px shrink-0"
    >
      <path
        fill="#fff"
        d="M12 2 4 5v6.1c0 5 3.4 9.7 8 10.9 4.6-1.2 8-5.9 8-10.9V5l-8-3Z"
      />
      <path
        fill="none"
        stroke="#111"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.5 12 2.4 2.4 4.6-4.8"
      />
    </svg>
  );
}

function TrustBadges({ set }: { set: keyof typeof TRUST_BADGES }) {
  if (TRUST_BADGES[set].length === 0) return null; // all items commented out: render nothing, no empty gap
  const mobileBadges = set === "homes" ? TRUST_BADGES.other : TRUST_BADGES[set];
  return (
    <ul className="mt-1 grid w-full grid-cols-2 gap-x-3 gap-y-3 sm:mt-3 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-9">
      {TRUST_BADGES[set].map(([title, sub], index) => (
        <li key={title} className="flex items-center gap-2 text-white">
          <TrustShield />
          <span className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold sm:text-[max(12px,calc(15px*var(--property-type-scale,1)))]">
              <span className="sm:hidden">{mobileBadges[index]?.[0]}</span>
              <span className="hidden sm:inline">{title}</span>
            </span>
            <span className="mt-0.5 text-[10px] text-white/70 sm:text-xs">
              <span className="sm:hidden">{mobileBadges[index]?.[1]}</span>
              <span className="hidden sm:inline">{sub}</span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PropertiesHeroView({
  category,
  intent,
}: {
  category: PropertyCategory;
  intent: Intent;
}) {
  const router = useRouter();
  const { city } = usePreferredCity();
  return (
    <HeroShell
      heroKey={category}
      title="Genuine Listings Only!"
      fluid
      footer={<TrustBadges set={category === "homes" ? "homes" : "commercial"} />}
    >
      <LinkTabs
        label="Property type"
        appearance="bare"
        tone="ink"
        wrap
        className={MOBILE_TABS}
        itemClassName={cn(MOBILE_TAB, "sm:h-[clamp(38px,2.3vw,40px)] sm:text-[clamp(14px,0.9vw,15px)]")}
        items={CATEGORIES.map((c) => ({
          href: propertiesHomeHref(c.id, intent),
          label: c.id === "homes" ? "Home" : c.label,
          active: c.id === category,
        }))}
      />
      <SearchRow
        label="Search properties"
        fluid
        placeholder={
          category === "homes"
            ? "Search locality, project or landmark"
            : "Search locality or landmark"
        }
        city={city}
        kinds={PROPERTY_SUGGESTIONS}
        onSearch={(q) =>
          router.push(propertySearchHref({ city, intent, category, q }))
        }
        leading={
          <LinkTabs
            label="Buy or rent"
            size="lg"
            className="w-full sm:w-auto max-sm:[&>ul]:flex max-sm:[&>ul]:w-full max-sm:[&_li]:flex-1"
            itemClassName="min-w-[76px] justify-center max-sm:h-9 max-sm:w-full max-sm:text-[13px] sm:h-[clamp(42px,2.8vw,48px)] sm:text-[clamp(14px,0.9vw,15px)]"
            items={[
              {
                href: propertiesHomeHref(category, "buy"),
                label: "Sale",
                active: intent === "buy",
              },
              {
                href: propertiesHomeHref(category, "rent"),
                label: "Rent",
                active: intent === "rent",
              },
            ]}
          />
        }
      />
    </HeroShell>
  );
}

/** Reads the tab from the URL. Render inside `<Suspense>`: the path is request data on dynamic routes. */
export function PropertiesHero() {
  const parsed = parsePropertiesHomePath(usePathname()) ?? {
    category: "homes",
    intent: "buy",
  };
  return (
    <PropertiesHeroView category={parsed.category} intent={parsed.intent} />
  );
}

export function ProjectsHeroView({ status }: { status: ProjectStatus }) {
  const router = useRouter();
  const { city } = usePreferredCity();
  return (
    <HeroShell
      heroKey={status}
      title="Homes Every Stage"
      fluid
      footer={<TrustBadges set={status === "uc" ? "projects" : "other"} />}
    >
      <LinkTabs
        label="Project status"
        appearance="bare"
        tone="ink"
        wrap
        className={MOBILE_TABS}
        itemClassName={cn(MOBILE_TAB, "sm:h-[clamp(38px,2.3vw,40px)] sm:text-[clamp(14px,0.9vw,15px)]")}
        items={PROJECT_STATUS.map((s) => ({
          href: projectsHomeHref(s.id),
          label: SHORT_STATUS[s.id] ? (
            <>
              <span className="sm:hidden">{SHORT_STATUS[s.id]}</span>
              <span className="max-sm:hidden">{s.label}</span>
            </>
          ) : (
            s.label
          ),
          active: s.id === status,
        }))}
      />
      <SearchRow
        label="Search projects"
        placeholder="Search project, developer or locality"
        city={city}
        kinds={PROJECT_SUGGESTIONS}
        scope="developer"
        fluid
        onSearch={(q) =>
          router.push(projectSearchHref({ city, q, status: [status] }))
        }
      />
    </HeroShell>
  );
}

export function ProjectsHero() {
  return (
    <ProjectsHeroView status={parseProjectsHomePath(usePathname()) ?? "uc"} />
  );
}
