"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useUrlCriteria } from "@/features/search/use-url-criteria";
import { directoryQueries } from "@/services/realtor-directory";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/common/segmented";
import { parseDirectoryCriteria, serializeDirectoryCriteria } from "./directory-criteria";
import { directoryPersonHref, suggestionFilter, type DirectorySuggestion } from "./directory-model";

export function LiveRealtorSearch() {
  const { criteria, update } = useUrlCriteria(parseDirectoryCriteria, serializeDirectoryCriteria);
  const current = criteria.broker.join(", ");
  const [input, setInput] = useState(current), [last, setLast] = useState(current);
  const [debounced, setDebounced] = useState(""), [open, setOpen] = useState(false);
  const id = useId();
  if (last !== current) { setLast(current); setInput(current); }
  useEffect(() => { const timer = setTimeout(() => setDebounced(input.trim()), 300); return () => clearTimeout(timer); }, [input]);
  const query = useQuery({ ...directoryQueries.suggestions(debounced), enabled: open && !!debounced && debounced === input.trim() });
  const suggestions = debounced === input.trim() ? query.data?.result.filter(s => criteria.by !== "firm" || s.source === "Broker") : undefined;
  const submit = (e: FormEvent) => { e.preventDefault(); setOpen(false); update({ broker: input.trim() ? [input.trim()] : [] }); document.getElementById("realtor-results")?.scrollIntoView({ behavior: "smooth" }); };
  const select = (s: DirectorySuggestion) => {
    const patch = suggestionFilter(s);
    if (!patch) return;
    update(patch);
    setInput(""); setOpen(false);
    document.getElementById("realtor-results")?.scrollIntoView({ behavior: "smooth" });
  };
  return <form role="search" onSubmit={submit} className="pointer-events-auto relative flex w-full flex-col gap-3 rounded-[28px] bg-white p-3 text-black shadow-rez-lg sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:max-w-[640px] lg:max-w-none sm:gap-2 sm:rounded-3xl sm:p-2 lg:flex lg:h-[72px] lg:flex-row lg:items-center lg:gap-0" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <Segmented label="Search by" value={criteria.by} onChange={by => { setOpen(false); update({ by }); }} options={[{ value: "name", label: "By Name" }, { value: "firm", label: "By Firm" }]} appearance="track" className="h-11 w-full justify-center rounded-[22px] p-1 sm:col-span-2 sm:h-auto sm:w-auto sm:rounded-2xl lg:h-14 lg:shrink-0" itemClassName="h-9 flex-1 rounded-[18px] px-5 sm:h-10 sm:flex-none sm:rounded-xl lg:h-12 lg:w-28" />
    <div className="flex h-11 w-full items-center rounded-3xl border border-rez-smoke px-1.5 py-1 sm:contents">
    <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-2.5 sm:gap-3 sm:px-2 lg:gap-4 lg:pr-2 lg:pl-7"><Image src="/images/realtors/search-mobile.svg" width={20} height={20} alt="" className="shrink-0 sm:hidden" /><Image src="/images/realtors/search.svg" width={24} height={24} alt="" className="hidden shrink-0 sm:block" /><label htmlFor={id} className="sr-only">Search realtors, firms or locations</label><input id={id} value={input} onChange={e => { setInput(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={e => { if (e.key === "Escape") setOpen(false); }} aria-controls={`${id}-suggestions`} autoComplete="off" placeholder={criteria.by === "firm" ? "Search Firm" : "Search Realtor"} className="h-8 w-full min-w-0 bg-transparent px-3 text-xs outline-none placeholder:text-rez-space focus-visible:rounded focus-visible:ring-2 focus-visible:ring-rez-mocaccino font-secondary sm:h-12 sm:text-base lg:h-14 lg:text-xl" /></div>
    <Button type="submit" size="lg" className="h-8 rounded-2xl px-3 text-xs sm:h-12 sm:px-5 sm:text-base lg:h-14 lg:w-[141px]">Search</Button>
    </div>
    <div id={`${id}-suggestions`} className="absolute top-[calc(100%+8px)] right-0 left-0 z-30 rounded-2xl bg-white text-black shadow-rez-lg">
      {open && !!input.trim() && <div className="max-h-[280px] overflow-y-auto rounded-xl border border-rez-smoke p-2">
        {query.isError ? <p role="status" className="p-2 text-sm">Suggestions unavailable. You can still submit a name search. <button type="button" className="underline" onClick={() => query.refetch()}>Retry</button></p> : !suggestions ? <p className="p-2 text-sm" role="status">Searching…</p> : !suggestions.length ? <p className="p-2 text-sm">No suggestions. Press Search to search this name.</p> : <ul>{suggestions.map((s, index) => <li key={`${s.source}:${s.id}:${index}`}>{s.source === "Agent" && s.id && s.firmName ? <Link className="block rounded-lg p-3 hover:bg-rez-cloud" href={directoryPersonHref({ name: s.firmName }, { id: s.id })}>{s.name}<span className="ml-2 text-xs text-rez-graphite">Realtor · {s.firmName}</span></Link> : ["Broker", "locality", "Sub Region", "project"].includes(s.source) ? <button type="button" className="w-full rounded-lg p-3 text-left hover:bg-rez-cloud" onClick={() => select(s)}>{s.name}<span className="ml-2 text-xs text-rez-graphite">{s.source}</span></button> : null}</li>)}</ul>}
      </div>}
    </div>
  </form>;
}
