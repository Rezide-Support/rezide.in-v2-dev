"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { locationQueries } from "@/lib/queries";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { SearchSuggestion, SuggestionKind, SuggestionScope } from "@/services/locations";

/** Most suggestions shown under a search box. */
const MAX_SUGGESTIONS = 8;

/**
 * Typeahead suggestions for a search box, as rezide.in's search bars show them:
 * waits for a pause in typing, skips an empty box, and keeps only the kinds the
 * box can search (e.g. no realtors in a property search). `scope: "developer"` is
 * the backend's list that also has builders, as rezide.in's project search uses.
 */
export function useSearchSuggestions(
  input: string,
  { city, kinds, scope = "all", limit = MAX_SUGGESTIONS }: { city: string; kinds: readonly SuggestionKind[]; scope?: SuggestionScope; /** How many to show (rezide.in's project search shows them all, in a scrolling list). */ limit?: number },
) {
  const query = useDebouncedValue(input.trim(), 300);
  const { data, isFetching, isError, refetch } = useQuery({
    ...locationQueries.suggestions(query, city, scope),
    enabled: query !== "",
    // Keep the last list on screen while the next one loads, so it doesn't flicker per keystroke.
    placeholderData: keepPreviousData,
  });
  const suggestions: SearchSuggestion[] =
    query === "" ? [] : (data ?? []).filter((s) => kinds.includes(s.kind)).slice(0, limit);
  return { suggestions, isFetching, isError, refetch };
}
