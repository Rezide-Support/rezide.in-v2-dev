"use client";

import { Building2, MapPin, Navigation, Search } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { useSearchSuggestions } from "@/features/search/use-search-suggestions";
import { cn } from "@/lib/utils";
import type { SearchSuggestion, SuggestionKind } from "@/services/locations";

/** What the project search can look for: projects, builders and places. */
const PROJECT_KINDS: readonly SuggestionKind[] = ["project", "developer", "subRegion", "locality", "other"];

const KIND_LABEL: Record<SuggestionKind, string> = {
  locality: "Locality",
  subRegion: "Area",
  project: "Project",
  developer: "Developer",
  realtor: "Realtor",
  other: "Place",
};

/** rezide.in's hints under an empty project search box. */
const HINTS = [
  { icon: MapPin, text: "Area (i.e. Goregaon, Andheri)" },
  { icon: Navigation, text: "Locality (i.e. JVLR, Powai)" },
  { icon: Building2, text: "Building (i.e. Oberoi Splendor)" },
  { icon: Building2, text: "Developer (i.e Oberoi, Kalpataru)" },
];

/**
 * The project search page's text field, as rezide.in's: from 3 letters it suggests projects,
 * builders and places (the backend's "developer" list, with each one's type); before that it
 * shows what can be searched. Picking a suggestion searches for it; typing and pressing Enter
 * (or the Search button) still searches the typed text.
 */
export function ProjectSearchInput({
  id,
  value,
  onChange,
  onPick,
  city,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** A suggestion was picked: search for it. */
  onPick: (name: string) => void;
  city: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const typed = value.trim().length >= 3;
  const { suggestions } = useSearchSuggestions(typed ? value : "", { city, kinds: PROJECT_KINDS, scope: "developer", limit: Infinity });
  const showList = open && typed && suggestions.length > 0;
  const showHints = open && !showList;

  const pick = (s: SearchSuggestion) => {
    onChange(s.name);
    setOpen(false);
    setActive(-1);
    onPick(s.name);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "Enter" && showList && active >= 0 && suggestions[active]) {
      e.preventDefault();
      return pick(suggestions[active]);
    }
    if (!showList || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    const next = active < 0 ? (step === 1 ? 0 : suggestions.length - 1) : (active + step + suggestions.length) % suggestions.length;
    setActive(next);
    document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      <input
        id={id}
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder="Search project, developer or locality"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        className={className}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          className="absolute top-full left-0 z-30 mt-3 max-h-[min(360px,50vh)] w-full overflow-y-auto rounded-[20px] border border-rez-smoke bg-white shadow-rez-lg sm:w-[min(420px,100%)]"
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
              className={cn("flex cursor-pointer items-center gap-3 border-b border-rez-smoke px-[18px] py-3 last:border-b-0 hover:bg-rez-cloud", i === active && "bg-rez-cloud")}
            >
              <Search className="size-4 shrink-0 text-rez-graphite" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
              <span className="shrink-0 text-xs text-rez-graphite">{KIND_LABEL[s.kind]}</span>
            </li>
          ))}
        </ul>
      )}
      {showHints && (
        <div
          // Keep focus in the field while the hints are clicked.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full left-0 z-30 mt-3 w-full rounded-[20px] border border-rez-smoke bg-white p-4 shadow-rez-lg sm:w-[min(340px,100%)]"
        >
          <p className="text-xs text-rez-graphite">You can enter</p>
          <ul className="mt-3 flex flex-col gap-3">
            {HINTS.map(({ icon: HintIcon, text }) => (
              <li key={text} className="flex items-center gap-2.5">
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black">
                  <HintIcon className="size-4 text-white" />
                </span>
                <span className="text-sm text-rez-graphite">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
