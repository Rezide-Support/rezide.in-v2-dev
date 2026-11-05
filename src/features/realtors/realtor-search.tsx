"use client";

import { useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/brand/icon";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { useUrlCriteria } from "@/features/search/use-url-criteria";
import { parseRealtorCriteria, serializeRealtorCriteria } from "./realtor-criteria";

const CARD = "pointer-events-auto flex w-full max-w-[640px] flex-col gap-3 rounded-[28px] bg-white p-4 text-black shadow-rez-lg";

/** "By Name / By Firm" search card that sits in the Find Realtor hero, under the headline. */
export function RealtorSearchCard() {
  const { criteria, update } = useUrlCriteria(parseRealtorCriteria, serializeRealtorCriteria);
  const [q, setQ] = useState(criteria.q);
  const [lastQ, setLastQ] = useState(criteria.q);
  if (lastQ !== criteria.q) {
    setLastQ(criteria.q);
    setQ(criteria.q);
  }
  const inputId = useId();
  const byName = criteria.by === "name";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: q.trim() });
    document.getElementById("realtor-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <form role="search" onSubmit={submit} className={CARD}>
      <Segmented
        label="Search by"
        value={criteria.by}
        onChange={(by) => update({ by })}
        options={[
          { value: "name", label: "By Name" },
          { value: "firm", label: "By Firm" },
        ]}
        appearance="solid"
        className="self-start"
      />
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          {byName ? "Search realtor by name" : "Search by firm name"}
        </label>
        <input
          id={inputId}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={byName ? "Search realtor by name" : "Search by firm name"}
          className="h-[54px] min-w-0 flex-1 rounded-full border border-rez-smoke px-[22px] text-base font-medium outline-none focus:border-rez-mocaccino"
        />
        <Button type="submit" size="lg" aria-label="Search">
          <Icon name="search" size={20} />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </div>
    </form>
  );
}

/** Same footprint as the card while the URL criteria resolve (keeps the hero from jumping). */
export function RealtorSearchCardFallback() {
  return (
    <div className={CARD} aria-hidden>
      <div className="h-[46px] w-[210px] rounded-full bg-rez-cloud" />
      <div className="h-[54px] rounded-full border border-rez-smoke" />
    </div>
  );
}
