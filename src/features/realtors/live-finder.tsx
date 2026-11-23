"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useUrlCriteria } from "@/features/search/use-url-criteria";
import { directoryQueries } from "@/services/realtor-directory";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/common/pagination";
import { RemovableChip } from "@/components/common/chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { directoryFilters, parseDirectoryCriteria, serializeDirectoryCriteria } from "./directory-criteria";
import { EMPTY_DIRECTORY_FILTERS, flattenPeople } from "./directory-model";
import { directoryOptions, matchesDirectoryPerson, type DirectoryGender } from "./directory-filtering";
import { DirectoryCard } from "./directory-cards";
import { DirectoryLeadForm } from "./directory-forms";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Icon } from "@/components/brand/icon";
import { cn } from "@/lib/utils";

export function LiveRealtorFinder() {
  const [invitationOpen, setInvitationOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const { criteria, update } = useUrlCriteria(parseDirectoryCriteria, serializeDirectoryCriteria);
  const filters = directoryFilters(criteria), byName = criteria.by === "name";
  const firms = useQuery({ ...directoryQueries.firms(filters, criteria.page), enabled: !byName });
  // Specialization is person-specific here; the backend's specialization filter selects firms.
  const people = useQuery({ ...directoryQueries.people({ ...filters, specializations: undefined }), enabled: byName });
  const optionsQuery = useQuery(directoryQueries.people({ ...EMPTY_DIRECTORY_FILTERS, city: criteria.city }));
  const allPeople = people.data ? flattenPeople(people.data).filter(({ person }) => matchesDirectoryPerson(person, criteria)) : undefined;
  const total = byName ? allPeople?.length : firms.data?.broker_count;
  const pageCount = Math.max(1, Math.ceil((total || 0) / 6));
  const page = Math.min(criteria.page, pageCount);
  useEffect(() => {
    if (total !== undefined && criteria.page > pageCount) update({ page: pageCount });
  }, [total, criteria.page, pageCount, update]);
  const items = byName ? allPeople?.slice((page - 1) * 6, page * 6) : firms.data?.data.map(firm => ({ firm, person: undefined }));
  const query = byName ? people : firms;
  const anyFilter = Object.entries(filters).some(([key, value]) => key !== "city" && value?.length) || !!criteria.language || !!criteria.gender;
  const clear = () => update({ subRegions: [], locality: [], projects: [], broker: [], specializations: [], language: "", gender: "" });
  const options = directoryOptions(optionsQuery.data || []);
  const locations = [...new Set([...options.locations, ...criteria.subRegions])].sort();
  const specializations = [...new Set([...options.specializations, ...criteria.specializations])].sort();
  const languages = [...new Set([...options.languages, ...(criteria.language ? [criteria.language] : [])])].sort();
  const criteriaKey = JSON.stringify(criteria);
  const mobileExpanded = expandedFor === criteriaKey;
  const filterControls = <>
    <DirectoryFilterSelect label="Specialization" disabled={optionsQuery.isPending} value={criteria.specializations[0] || ""} options={specializations} onChange={value => update({ specializations: value ? [value] : [] })} />
    <DirectoryFilterSelect label="Location" disabled={optionsQuery.isPending} title="Areas supplied by the selected city firm directory" value={criteria.subRegions[0] || ""} options={locations} onChange={value => update({ subRegions: value ? [value] : [] })} />
    {byName && <><DirectoryFilterSelect label="Language" disabled={optionsQuery.isPending} value={criteria.language} options={languages} onChange={language => update({ language })} /><DirectoryFilterSelect label="Gender" disabled={optionsQuery.isPending} title="Temporary approximation from salutation: Mr. → Male; Ms., Mrs., Miss → Female. Other or missing titles are Not specified." value={criteria.gender} options={options.genders} onChange={gender => update({ gender: gender as "" | DirectoryGender })} /></>}
    <Button variant="link" className="text-sm text-rez-mocaccino-ink underline" disabled={!anyFilter} onClick={clear}>Clear all</Button>
  </>;
  return <>
    <section id="realtor-results" className="scroll-mt-4 px-5 pt-10 sm:px-8 md:pt-20 lg:px-12 xl:px-20 lg:max-[1599.98px]:pt-12"><div className="mx-auto flex max-w-[1280px] flex-col gap-6 lg:max-[1599.98px]:gap-5">
      <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:flex lg:flex-wrap">{filterControls}</div>
      {optionsQuery.isError && <p className="text-xs" role="status">Filter options could not load. You can still search. <button className="underline" onClick={() => optionsQuery.refetch()}>Retry options</button></p>}
      <div className={cn("flex items-start gap-[7px] sm:flex-wrap sm:gap-2", !anyFilter && "sm:hidden")}><Button variant="outline" className="h-8 shrink-0 gap-1 rounded-xl px-4 text-[13px] sm:hidden" onClick={() => setFiltersOpen(true)}>Filters<Icon name="chevron-left" size={16} className="-rotate-90" /></Button><div className="flex min-w-0 flex-1 flex-wrap gap-2">{(["subRegions", "locality", "projects", "broker", "specializations"] as const).flatMap(key => criteria[key].map(value => <RemovableChip key={`${key}:${value}`} label={value} className="max-sm:max-w-full max-sm:rounded-xl max-sm:border-transparent max-sm:bg-[#f3f0f0] max-sm:px-3 max-sm:text-xs max-sm:font-semibold max-sm:uppercase max-sm:[&>span]:truncate" onRemove={() => update({ [key]: criteria[key].filter(v => v !== value) })}>{value}</RemovableChip>))}{(["language", "gender"] as const).filter(key => criteria[key]).map(key => <RemovableChip key={key} label={criteria[key]} className="max-sm:rounded-xl max-sm:border-transparent max-sm:bg-[#f3f0f0] max-sm:text-xs" onRemove={() => update({ [key]: "" })}>{criteria[key]}</RemovableChip>)}</div></div>
      <div className="flex items-baseline justify-between gap-3"><h2 className="min-w-0 text-[22px] leading-normal font-medium tracking-normal sm:text-[44px] sm:leading-none sm:tracking-[-0.02em] lg:text-[60px] lg:max-[1599.98px]:text-[46px]"><span className="font-bold text-black sm:font-semibold sm:text-rez-mocaccino">{criteria.city}</span> {byName ? "Realtors" : "Firms"}<span className="hidden sm:inline">.</span></h2><span aria-live="polite" title={`Results for ${criteria.city}`} className="shrink-0 text-sm text-rez-space sm:text-base">{total === undefined ? query.isError ? "Unavailable" : "Loading…" : `${total} found`}</span></div>
    </div></section>
    <section className="px-5 pt-3.5 pb-10 sm:px-8 sm:pt-6 sm:pb-12 lg:px-12 xl:px-20"><div className="mx-auto max-w-[1280px]" aria-busy={query.isFetching}>
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => query.refetch()} /> : !items ? <div className="grid gap-3.5 sm:gap-6 xl:grid-cols-2 xl:gap-8">{[0, 1, 2, 3].map(i => <div key={i} className="h-[246px] animate-pulse rounded-[18px] bg-rez-cloud" />)}</div> : !items.length ? <EmptyState icon="user" title={`No ${byName ? "realtors" : "firms"} match your search.`} action={anyFilter ? <Button onClick={clear}>Clear filters</Button> : undefined}>Try a different name or location.</EmptyState> : <><ul className="grid grid-cols-1 gap-3.5 sm:gap-6 xl:grid-cols-2 xl:gap-8 xl:max-[1599.98px]:gap-6">{items.map(({ firm, person }, index) => <li key={`${firm.id}:${person?.id || "firm"}`} className={cn(index >= 3 && !mobileExpanded && "hidden sm:list-item")}><DirectoryCard firm={firm} person={person} /></li>)}</ul>{items.length > 3 && !mobileExpanded && <div className="flex justify-center pt-6 sm:hidden"><Button variant="outline" className="h-11 w-[141px] border-black text-base" onClick={() => setExpandedFor(criteriaKey)}>View All</Button></div>}<div className={cn(!mobileExpanded && "hidden sm:block")}><Pagination page={page} pageCount={pageCount} onChange={page => update({ page })} /></div></>}
    </div></section>
    <div className="px-4 pb-12 text-center md:pb-20"><Button variant="link" className="max-w-full text-sm whitespace-normal" onClick={() => setInvitationOpen(true)}>Can’t find your realtor? Request an invitation</Button></div>
    <Dialog open={invitationOpen} onOpenChange={setInvitationOpen}><DialogContent className="sm:max-w-[583px]"><DialogHeader><DialogTitle>Request a realtor invitation</DialogTitle><DialogDescription>Tell us who you’d like to see on Rezide.</DialogDescription></DialogHeader><DirectoryLeadForm invitation embedded /></DialogContent></Dialog>
    <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}><SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-[32px] p-5 pb-8"><div aria-hidden className="mx-auto h-1 w-12 rounded-sm bg-rez-smoke" /><SheetHeader className="p-0"><SheetTitle className="text-lg">Filter realtors</SheetTitle><SheetDescription>Choose your filters. Gender is temporarily based on salutation.</SheetDescription></SheetHeader><div className="flex flex-col gap-3">{filterControls}</div><Button onClick={() => setFiltersOpen(false)}>Show results</Button></SheetContent></Sheet>
  </>;
}

function DirectoryFilterSelect({ label, title, value, options, disabled, onChange }: { label: string; title?: string; value: string; options: string[]; disabled: boolean; onChange: (value: string) => void }) {
  const allValue = "__all__";
  return <Select value={value || allValue} onValueChange={next => onChange(next === allValue ? "" : next)} disabled={disabled}>
    <SelectTrigger aria-label={label} title={title} className="h-[48px] lg:max-[1599.98px]:h-10 w-full min-w-0 rounded-full border-rez-smoke px-5 text-sm font-semibold lg:w-[190px] [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate">
      <SelectValue placeholder={label} />
    </SelectTrigger>
    <SelectContent position="popper" align="start" collisionPadding={16} className="z-[60] max-h-[min(320px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-0 max-w-[calc(100vw-32px)] rounded-xl bg-white p-1">
      <SelectItem value={allValue} className="min-h-11 px-3 pr-8 text-sm whitespace-normal [overflow-wrap:anywhere]">{label}</SelectItem>
      {options.map(option => <SelectItem key={option} value={option} className="min-h-11 px-3 pr-8 text-sm whitespace-normal [overflow-wrap:anywhere]">{option}</SelectItem>)}
    </SelectContent>
  </Select>;
}
