"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/brand/icon";
import { LinkTabs } from "@/components/common/link-tabs";
import { Button } from "@/components/ui/button";
import { projectSearchHref, propertySearchHref } from "@/features/search/criteria";
import { useSearchSuggestions } from "@/features/search/use-search-suggestions";
import { CATEGORIES, PROJECT_STATUS, categoryById } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SearchSuggestion, SuggestionKind } from "@/services/locations";
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
const PROPERTY_SUGGESTIONS: readonly SuggestionKind[] = ["subRegion", "locality", "project", "other"];
const PROJECT_SUGGESTIONS: readonly SuggestionKind[] = ["project", "developer", "subRegion", "locality", "other"];

function HeroPhoto({ heroKey }: { heroKey: HeroKey }) {
  const hero = HERO_IMAGES[heroKey];
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Keyed so only the active photo is requested; the fade replays when the tab changes. */}
      <div key={heroKey} className="absolute inset-0 animate-in duration-500 fade-in">
        <Image src={hero.src} alt="" fill priority sizes="100vw" quality={70} className="ken-burns object-cover" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,17,12,.12)_0%,rgba(2,17,12,.28)_45%,rgba(2,17,12,.42)_85%,rgba(2,17,12,.05)_100%)]"
      />
      <a
        href={hero.href}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 left-1.5 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 hover:bg-black/85"
      >
        Photo by {hero.credit} on Unsplash
      </a>
    </div>
  );
}

/** Photo, headline and the white search card shared by both discovery heroes. */
function HeroShell({ heroKey, title, children }: { heroKey: HeroKey; title: string; children: ReactNode }) {
  return (
    <section className="relative flex min-h-[420px] items-center justify-center bg-rez-forest px-4 pt-12 pb-14 md:min-h-[560px] md:px-8 md:pt-[88px] md:pb-20">
      <HeroPhoto heroKey={heroKey} />
      <div className="relative flex w-full max-w-[1040px] flex-col items-center gap-5 md:gap-8">
        <h1 className="text-center text-[36px] leading-[1.04] font-semibold tracking-[-0.025em] text-balance text-rez-full-white [text-shadow:0_2px_24px_rgba(2,17,12,.45)] sm:text-[clamp(48px,6vw,88px)]">
          {title}
        </h1>
        <div className="flex w-full flex-col gap-3.5 rounded-[28px] bg-white p-3 shadow-rez-lg sm:p-4">{children}</div>
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
}: {
  label: string;
  placeholder: string;
  leading?: ReactNode;
  city: string;
  kinds: readonly SuggestionKind[];
  onSearch: (query: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputId = useId();
  const listId = useId();
  const { suggestions } = useSearchSuggestions(q, { city, kinds });
  const showList = open && suggestions.length > 0;

  const pick = (s: SearchSuggestion) => {
    setQ(s.name);
    setOpen(false);
    onSearch(s.name);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (showList && active >= 0 && suggestions[active]) return pick(suggestions[active]);
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
      className="flex flex-col gap-2 rounded-[28px] border border-rez-smoke p-1.5 sm:min-h-16 sm:flex-row sm:items-center sm:rounded-full"
    >
      {leading}
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
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-[#767a88]"
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
                <Icon name={s.kind === "realtor" ? "user" : "map-pin"} size={16} className="shrink-0 text-rez-graphite" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{s.name}</span>
                <span className="shrink-0 text-[12px] text-rez-graphite">
                  {KIND_LABEL[s.kind]}
                  {s.city ? ` · ${s.city}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full sm:ml-2 sm:w-auto">
        <Icon name="search" size={20} />
        Search
      </Button>
    </form>
  );
}

export function PropertiesHeroView({ category, intent }: { category: PropertyCategory; intent: Intent }) {
  const router = useRouter();
  const { city } = usePreferredCity();
  const cat = categoryById(category);
  return (
    <HeroShell heroKey={category} title="Genuine Listings Only!">
      <LinkTabs
        label="Property type"
        appearance="bare"
        tone="ink"
        wrap
        items={CATEGORIES.map((c) => ({ href: propertiesHomeHref(c.id, intent), label: c.label, active: c.id === category }))}
      />
      <SearchRow
        label="Search properties"
        placeholder={category === "homes" ? "Search locality, project or landmark" : "Search locality or landmark"}
        city={city}
        kinds={PROPERTY_SUGGESTIONS}
        onSearch={(q) => router.push(propertySearchHref({ city, intent, category, q }))}
        leading={
          <LinkTabs
            label="Buy or rent"
            size="lg"
            className="self-start sm:self-auto"
            itemClassName="min-w-[76px] justify-center"
            items={[
              { href: propertiesHomeHref(category, "buy"), label: "Buy", active: intent === "buy" },
              { href: propertiesHomeHref(category, "rent"), label: cat.lease, active: intent === "rent" },
            ]}
          />
        }
      />
    </HeroShell>
  );
}

/** Reads the tab from the URL. Render inside `<Suspense>`: the path is request data on dynamic routes. */
export function PropertiesHero() {
  const parsed = parsePropertiesHomePath(usePathname()) ?? { category: "homes", intent: "buy" };
  return <PropertiesHeroView category={parsed.category} intent={parsed.intent} />;
}

export function ProjectsHeroView({ status }: { status: ProjectStatus }) {
  const router = useRouter();
  const { city } = usePreferredCity();
  return (
    <HeroShell heroKey={status} title="Homes for every stage.">
      <LinkTabs
        label="Project status"
        appearance="solid"
        tone="ink"
        className="self-start"
        items={PROJECT_STATUS.map((s) => ({ href: projectsHomeHref(s.id), label: s.label, active: s.id === status }))}
      />
      <SearchRow
        label="Search projects"
        placeholder="Search project, developer or locality"
        city={city}
        kinds={PROJECT_SUGGESTIONS}
        onSearch={(q) => router.push(projectSearchHref({ city, q, status: [status] }))}
      />
    </HeroShell>
  );
}

export function ProjectsHero() {
  return <ProjectsHeroView status={parseProjectsHomePath(usePathname()) ?? "uc"} />;
}
