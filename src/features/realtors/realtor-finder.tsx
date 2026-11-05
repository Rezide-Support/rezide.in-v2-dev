"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Icon } from "@/components/brand/icon";
import { RemovableChip } from "@/components/common/chip";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { MultiSelectDialog } from "@/components/common/multi-select-dialog";
import { NativeSelect } from "@/components/common/native-select";
import { Button } from "@/components/ui/button";
import { useUrlCriteria } from "@/features/search/use-url-criteria";
import { LANGUAGES, REALTOR_SPECIALIZATIONS, TOP_CITIES, localitiesFor } from "@/lib/constants";
import { realtorQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { AgentCard, FirmCard } from "./realtor-cards";
import { parseRealtorCriteria, serializeRealtorCriteria } from "./realtor-criteria";

export function RealtorFinder() {
  const { criteria, update, isNavigating } = useUrlCriteria(parseRealtorCriteria, serializeRealtorCriteria);
  const query = useQuery(realtorQueries.search(criteria));
  const [specOpen, setSpecOpen] = useState(false);
  const byName = criteria.by === "name";
  const list = query.data;
  const anyFilter = criteria.specializations.length || criteria.locality || criteria.language || criteria.gender || criteria.q;
  const clearAll = () => update({ q: "", specializations: [], locality: "", language: "", gender: "" });

  return (
    <>
      <section id="realtor-results" className="scroll-mt-4 px-4 pt-10 md:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setSpecOpen(true)}
              className={cn(
                "flex h-12 items-center gap-2.5 rounded-full border bg-white pr-[18px] pl-[22px] text-[15px] font-semibold hover:border-black",
                criteria.specializations.length ? "border-black" : "border-rez-smoke",
              )}
            >
              {criteria.specializations.length ? `Specialization · ${criteria.specializations.length}` : "Specialization"}
              <Icon name="chevron-left" size={14} className="-rotate-90" />
            </button>
            <NativeSelect aria-label="City" value={criteria.city} onChange={(e) => update({ city: e.target.value, locality: "" })}>
              {TOP_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect aria-label="Location" value={criteria.locality} onChange={(e) => update({ locality: e.target.value })}>
              <option value="">Location</option>
              {localitiesFor(criteria.city).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </NativeSelect>
            {byName && (
              <>
                <NativeSelect aria-label="Language" value={criteria.language} onChange={(e) => update({ language: e.target.value })}>
                  <option value="">Language</option>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect aria-label="Gender" value={criteria.gender} onChange={(e) => update({ gender: e.target.value })}>
                  <option value="">Gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </NativeSelect>
              </>
            )}
            {anyFilter ? (
              <Button variant="link" className="text-[13px]" onClick={clearAll}>
                Clear all
              </Button>
            ) : null}
          </div>
          {criteria.specializations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {criteria.specializations.map((s) => (
                <RemovableChip key={s} label={s} onRemove={() => update({ specializations: criteria.specializations.filter((x) => x !== s) })}>
                  {s}
                </RemovableChip>
              ))}
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 border-t border-rez-smoke pt-3">
            <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.01em] md:text-[28px]">
              <span className="font-extrabold">{criteria.city}</span> {byName ? "Realtors" : "Firms"}.
            </h2>
            <span className="text-[15px] text-rez-graphite" aria-live="polite">
              {list ? `${list.length} found` : "Loading…"}
            </span>
          </div>
        </div>
      </section>

      <section className="px-4 pt-6 pb-24 md:px-8">
        <div
          aria-busy={query.isFetching || isNavigating}
          className={cn("mx-auto max-w-[1200px] transition-opacity", (query.isFetching || isNavigating) && list && "opacity-60")}
        >
          {query.isError && !list ? (
            <ErrorState message="The realtor directory didn't respond." onRetry={() => query.refetch()} />
          ) : !list ? (
            <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[220px] animate-pulse rounded-xl bg-rez-cloud" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon="user"
              title={`No ${byName ? "realtors" : "firms"} match these filters.`}
              action={
                anyFilter ? (
                  <Button variant="secondary" onClick={clearAll}>
                    Clear filters
                  </Button>
                ) : null
              }
            >
              Try another city, another locality or fewer filters.
            </EmptyState>
          ) : (
            <ul className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
              {list.map((r, i) => (
                <li key={r.id}>{byName ? <AgentCard realtor={r} /> : <FirmCard realtor={r} index={i} />}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <MultiSelectDialog
        open={specOpen}
        onOpenChange={setSpecOpen}
        title="Select specializations"
        groups={[{ label: "Specializations", options: REALTOR_SPECIALIZATIONS.map((s) => ({ value: s, label: s })) }]}
        selected={criteria.specializations}
        onApply={(specializations) => update({ specializations })}
        applyLabel={(d) => (d.length ? `Apply ${d.length} selected` : "Show all specializations")}
      />
    </>
  );
}
