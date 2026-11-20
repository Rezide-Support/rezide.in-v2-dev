"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ChevronDown, ChevronsUpDown, ChevronUp, X } from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CoverImage } from "@/components/common/cover-image";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { amenityIcon } from "@/features/projects/detail/project-sections";
import { shortInr } from "@/features/projects/detail/v1-ui";
import { projectHref } from "@/features/projects/project-card";
import { SaveIconButton } from "@/features/properties/detail/save-actions";
import { locationQueries, projectQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { COMPARE_LIMIT, useCompareItems, useSavedStore, type SavedItem } from "@/stores/saved";
import type { Project } from "@/types/models";
import { useCompareEntries, type CompareEntry } from "./compare-data";
import { usePageCompare } from "./page-compare";

/*
 * rezide.in's "Compare Project" section on a project page (signed-in visitors), styled and
 * behaving as there: the compared projects in three columns, "Add Project" (locality, then
 * project, then "Add to Compare") in each empty column, and "Compare in PDF".
 */

/** rezide.in shows five amenities per project until "View More". */
const AMENITIES_SHOWN = 5;
const PDF_URL = "/v1/admin/Inventory/project/download-comparison-report-pdf";

/** "Dec 31, 2032", as rezide.in's compare table. */
export const compareDate = (iso: string) =>
  // The backend also sends "2026-12-15 00:00:00.000", which not every browser parses with the space.
  new Date(iso.replace(" ", "T")).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

/** rezide.in's "Age of Project": the gap to the completion date, in years and months ("6 years 1 month"). */
export function projectAge(iso: string, now = new Date()): string {
  const day = 1000 * 60 * 60 * 24;
  const diff = Math.abs(now.getTime() - new Date(iso).getTime());
  const years = Math.floor(diff / (day * 365));
  const months = Math.floor((diff - years * day * 365) / (day * 30));
  return `${years} year${years > 1 ? "s" : ""} ${months} month${months > 1 ? "s" : ""}`;
}

/** "₹ 5.04 Cr. - 10.43 Cr.", or "N/A" (rezide.in's configuration prices). */
const money = (min?: number, max?: number) => (min && max ? `₹ ${shortInr(min)} - ${shortInr(max)}` : "N/A");

/** The configurations across the compared projects, in the order they first appear. */
export function configurationNames(projects: (Project | undefined)[]): string[] {
  const names: string[] = [];
  for (const p of projects) for (const c of p?.configurationPlans ?? []) if (c.bhk && !names.includes(c.bhk)) names.push(c.bhk);
  return names;
}

/** rezide.in's table (shadcn): hairline cell borders, rows that tint on hover. */
export const cellBorder = "border border-gray-200";
export const td = `${cellBorder} p-2 align-middle`;
export const tr = "border-b border-gray-200 transition-colors hover:bg-gray-50";

/** A grey uppercase section row ("LOCATION"). */
export function GroupRow({ title }: { title: string }) {
  return (
    <tr className={cn(tr, "bg-[#eee] hover:bg-[#eee]")}>
      <th scope="colgroup" colSpan={COMPARE_LIMIT + 1} className={cn(td, "text-left font-semibold text-black uppercase")}>
        {title}
      </th>
    </tr>
  );
}

/** rezide.in's round "View More / View Less" button, across the table. */
export function ToggleRow({ open, onToggle, openLabel = "View Less" }: { open: boolean; onToggle: () => void; openLabel?: string }) {
  return (
    <tr className={tr}>
      <td colSpan={COMPARE_LIMIT + 1} className={cn(td, "text-center")}>
        <div className="flex justify-center">
          <Button variant="outline" className="rounded-full" aria-expanded={open} onClick={onToggle}>
            <span>{open ? openLabel : "View More"}</span>
            {open ? <ChevronUp className="ml-1 size-4" aria-hidden /> : <ChevronDown className="ml-1 size-4" aria-hidden />}
          </Button>
        </div>
      </td>
    </tr>
  );
}

/** Amenity names with the backend's icons (rezide.in's amenity cells). */
export function AmenityList({ names }: { names: string[] }) {
  return (
    <div className="grid items-start gap-2">
      {names.map((a) => (
        <div key={a} className="flex items-center gap-2">
          {/* SVGs from the backend; the image optimiser doesn't take SVG. */}
          <Image src={amenityIcon(a)} alt="" width={20} height={20} unoptimized className="size-5" />
          <p className="text-sm font-normal text-[#242424]">{a}</p>
        </div>
      ))}
    </div>
  );
}

type ProjectRef = { id: string; title: string };
const asItem = (p: ProjectRef): SavedItem => ({ kind: "project", id: p.id, title: p.title, savedAt: "" });

/**
 * The compared projects and how a column is added or taken out. On /compare that's the compare
 * list (the cards' picks). On a project's page (`pinned`) it's that page's own comparison: the
 * project first (it can't be taken out), then only what's added in this section, which also
 * joins the compare list. The cards' picks don't show there.
 */
type ListedProjects = { ids: string[]; onChange: (ids: string[]) => void };

function useCompareColumns(pinned?: ProjectRef, listed?: ListedProjects) {
  const saved = useCompareItems().filter((i) => i.kind === "project");
  const { toggle, remove } = useSavedStore.getState();
  const [added, setAdded] = useState<ProjectRef[]>([]);
  // The header shows this page's comparison while it's open (see page-compare.ts).
  const setPage = usePageCompare((s) => s.set);
  const pinnedId = pinned?.id;
  const pinnedTitle = pinned?.title ?? "";
  useEffect(() => {
    if (!pinnedId) return;
    setPage([{ id: pinnedId, title: pinnedTitle }, ...added.filter((p) => p.id !== pinnedId)].map(asItem));
    return () => setPage(null);
  }, [pinnedId, pinnedTitle, added, setPage]);
  // The ones this section put in the compare list, taken out with their column.
  const joined = useRef(new Set<string>());
  if (listed) {
    // /compare opened from a project page's navbar menu: just those projects (the link's ?ids=).
    const items = listed.ids.map((id) => asItem({ id, title: "" }));
    return {
      items,
      add: (p: ProjectRef) => {
        if (listed.ids.includes(p.id)) return;
        if (listed.ids.length >= COMPARE_LIMIT) {
          toast.error(`You can only compare ${COMPARE_LIMIT} projects at a time`);
          return;
        }
        listed.onChange([...listed.ids, p.id]);
        toast.success("Added to compare");
      },
      remove: (p: ProjectRef) => {
        listed.onChange(listed.ids.filter((id) => id !== p.id));
        toast.success("Removed from compare");
      },
    };
  }
  if (!pinned) {
    return {
      items: saved,
      add: (p: ProjectRef) => {
        const result = toggle("compare", asItem(p));
        if (result === "limit") toast.error(`You can only compare ${COMPARE_LIMIT} projects at a time`);
        else toast.success("Added to compare");
      },
      remove: (p: ProjectRef) => {
        remove("compare", asItem(p));
        toast.success("Removed from compare");
      },
    };
  }
  const items = [pinned, ...added.filter((p) => p.id !== pinned.id)].map(asItem);
  return {
    items,
    add: (p: ProjectRef) => {
      if (items.some((i) => i.id === p.id)) return;
      if (items.length >= COMPARE_LIMIT) {
        toast.error(`You can only compare ${COMPARE_LIMIT} projects at a time`);
        return;
      }
      setAdded((a) => [...a, p]);
      if (!saved.some((i) => i.id === p.id) && toggle("compare", asItem(p)) === "added") joined.current.add(p.id);
      toast.success("Added to compare");
    },
    remove: (p: ProjectRef) => {
      setAdded((a) => a.filter((x) => x.id !== p.id));
      if (joined.current.delete(p.id)) remove("compare", asItem(p));
      toast.success("Removed from compare");
    },
  };
}

/** `pinned`: the project whose page this is (see useCompareColumns). */
/** `listed`: /compare showing just the projects its link carries (see pageCompareHref). */
export function ProjectCompare({ pinned, listed }: { pinned?: ProjectRef; listed?: ListedProjects } = {}) {
  const { items, add, remove } = useCompareColumns(pinned, listed);
  const entries = useCompareEntries(items);
  const [allAmenities, setAllAmenities] = useState(false);
  const slots: (CompareEntry | undefined)[] = Array.from({ length: COMPARE_LIMIT }, (_, i) => entries[i]);
  const projects = slots.map((e) => e?.project);
  const configs = configurationNames(projects);
  const amenities = projects.map((p) => {
    const sorted = [...(p?.amenities ?? [])].sort((a, b) => a.localeCompare(b));
    return allAmenities ? sorted : sorted.slice(0, AMENITIES_SHOWN);
  });

  const value = (e: CompareEntry | undefined, read: (p: Project) => ReactNode) => {
    if (e?.loading) return <Skeleton className="h-4 w-24" />;
    const v = e?.project ? read(e.project) : undefined;
    return v === undefined || v === "" || v === null ? "-" : v;
  };
  const row = (label: string, read: (p: Project) => ReactNode) => (
    <tr className={tr}>
      <td className={td}>{label}</td>
      {slots.map((e, i) => (
        <td key={e?.item.id ?? i} className={td}>
          {value(e, read)}
        </td>
      ))}
    </tr>
  );
  // As rezide.in: plot area, towers and apartments only show for a project with a completion date.
  const withCompletion = (read: (p: Project) => ReactNode) => (p: Project) => (p.completionDate ? read(p) : undefined);
  const group = (title: string) => <GroupRow title={title} />;

  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className={tr}>
            <th scope="col" className={cn(cellBorder, "w-1/4 p-4 text-center align-middle font-medium")}>
              <ComparePdfButton url={PDF_URL} body={{ projectIds: items.map((i) => i.id) }} />
            </th>
            {slots.map((e, i) => (
              <th key={e?.item.id ?? `empty-${i}`} scope="col" className={cn(cellBorder, "w-1/4 p-4 text-left align-middle font-medium")}>
                {e ? (
                  <CompareHeader entry={e} onRemove={e.item.id === pinned?.id ? undefined : () => remove(e.item)} />
                ) : (
                  <AddProject taken={items.map((x) => x.id)} onAdd={add} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {row("Developer", (p) => p.developerProfile?.name || p.developer)}
          {group("Location")}
          {row("Region", (p) => p.region)}
          {row("Sub-Region", (p) => p.subRegion)}
          {row("Locality", (p) => p.locality)}
          {group("Property summary")}
          {row("Property type", (p) => p.projectType)}
          {row("Completion Date", (p) => (p.completionDate ? compareDate(p.completionDate) : undefined))}
          {row("Age of Project", (p) => (p.completionDate ? projectAge(p.completionDate) : undefined))}
          {row("Plot Area", withCompletion((p) => (p.acres ? `${p.acres} Acre` : undefined)))}
          {row("No. of Towers", withCompletion((p) => p.towers || undefined))}
          {row("Total no. of Apartments", withCompletion((p) => p.units || undefined))}
          {group("Configuration available")}
          {configs.map((name) => (
            <tr key={name} className={tr}>
              <td className={cn(td, "align-baseline")}>{name}</td>
              {slots.map((e, i) => {
                const c = e?.project?.configurationPlans?.find((x) => x.bhk === name);
                return c ? (
                  <td key={e?.item.id ?? i} className={cn(td, "align-baseline")}>
                    <div className="flex justify-between">
                      <p className="text-gray-400">Area (sqft.)</p>
                      <p>
                        {c.areaMin || ""} - {c.areaMax || ""}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-gray-400">Rental price</p>
                      <p>{money(c.rentMin, c.rentMax)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-gray-400">Sale price</p>
                      <p>{money(c.saleMin, c.saleMax)}</p>
                    </div>
                  </td>
                ) : (
                  <td key={e?.item.id ?? i} className={cn(td, "text-center align-baseline")}>
                    Not available
                  </td>
                );
              })}
            </tr>
          ))}
          {group("Project amenities")}
          <tr className={tr}>
            <td className={td} />
            {slots.map((e, i) => (
              <td key={e?.item.id ?? i} className={cn(td, "text-center align-baseline")}>
                <AmenityList names={amenities[i]} />
              </td>
            ))}
          </tr>
          {projects.some(Boolean) && <ToggleRow open={allAmenities} onToggle={() => setAllAmenities((v) => !v)} openLabel="Less More" />}
          <tr className={tr}>
            <td className={cn(td, "text-center")} />
            {slots.map((e, i) => (
              <td key={e?.item.id ?? i} className={cn(td, "text-center")}>
                {e ? (
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href={projectHref({ id: e.item.id })} target="_blank">
                      <span>View Details</span>
                      <ArrowRight className="ml-2 size-4" aria-hidden />
                      <span className="sr-only">: {e.item.title || e.project?.name}</span>
                    </Link>
                  </Button>
                ) : (
                  "-"
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** A compared project's column head. No `onRemove`: it can't be taken out (the page's own project). */
function CompareHeader({ entry: e, onRemove }: { entry: CompareEntry; onRemove?: () => void }) {
  const image = e.project?.images[0];
  // A project from a /compare link has no saved title: its name comes with its details.
  const name = e.item.title || e.project?.name || "";
  return (
    <div className="relative rounded-md bg-[#eee] p-2">
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name} from compare`}
          className="absolute -top-2 -right-1 z-10 flex size-6 items-center justify-center rounded-full border border-[#ddd] bg-[#FAFAF9] p-1 text-xs font-medium text-[#FF6161] hover:bg-gray-100"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
      <div className="relative m-auto h-[150px] w-full max-w-[324px] overflow-hidden lg:h-[242px]">
        {image && <CoverImage src={image} alt={name} sizes="324px" />}
        <SaveIconButton
          list="shortlist"
          kind="project"
          id={e.item.id}
          title={name}
          className="absolute top-2 right-2 z-[1] size-9 rounded-md bg-transparent p-0 text-black shadow-none hover:bg-white/30 [&_svg]:size-4"
        />
      </div>
      <div className="m-auto my-2 flex items-center justify-center gap-2">
        <h4 className="text-sm font-semibold text-[#242424]">{name.substring(0, 30)}</h4>
      </div>
    </div>
  );
}

/** rezide.in's "Compare in PDF": the backend builds the report for the compared items. */
export function ComparePdfButton({ url, body }: { url: string; body: { projectIds: string[] } | { listingIds: string[]; showImages: boolean } }) {
  const [downloading, setDownloading] = useState(false);
  const ids = "projectIds" in body ? body.projectIds : body.listingIds;
  const download = async () => {
    if (ids.length === 0) return;
    setDownloading(true);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(String(res.status));
      const href = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = href;
      link.download = "Rezide Comparison Report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch {
      toast.error("The comparison report couldn't be downloaded. Please try again.");
    } finally {
      setDownloading(false);
    }
  };
  return (
    <Button onClick={download} disabled={downloading} className="rounded-md">
      {downloading ? "Downloading..." : "Compare in PDF"}
    </Button>
  );
}

export type Option = { value: string; label: string; hint?: string; disabled?: boolean };

/** cmdk-style matching, as rezide.in's pickers filter their lists by what's typed. */
export const matches = (label: string, typed: string) => label.toLowerCase().includes(typed.trim().toLowerCase());

/** rezide.in's picker: an outline button (300px) that opens a search box over a short list. */
export function Picker({
  placeholder,
  searchPlaceholder,
  selected,
  onSelect,
  search,
  onSearch,
  options,
  empty,
}: {
  placeholder: string;
  searchPlaceholder: string;
  selected?: Option;
  onSelect: (o: Option | undefined) => void;
  search: string;
  onSearch: (s: string) => void;
  options: Option[] | null;
  empty: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative w-[300px] max-w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between rounded-md font-normal">
            <span className="truncate">{selected?.label ?? placeholder}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[300px] max-w-[calc(100vw-2rem)] rounded-md p-0">
          <input
            autoFocus
            value={search}
            onChange={(ev) => onSearch(ev.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-11 w-full border-b border-gray-200 bg-transparent px-3 text-sm outline-none placeholder:text-gray-400"
          />
          {!options || options.length === 0 ? (
            <p className="py-6 text-center text-sm">{empty}</p>
          ) : (
            <ul role="listbox" aria-label={placeholder} className="h-36 overflow-y-auto p-1">
              {options.map((o) => (
                <li key={o.value} role="option" aria-selected={selected?.value === o.value} aria-disabled={o.disabled}>
                  <button
                    type="button"
                    disabled={o.disabled}
                    onClick={() => {
                      onSelect(o);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-x-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <span className="flex items-center">
                      <Check className={cn("mr-2 size-4", selected?.value === o.value ? "opacity-100" : "opacity-0")} aria-hidden />
                      <span className="text-sm">{o.label}</span>
                    </span>
                    {o.hint && <span className="text-xs font-medium text-gray-500">{o.hint}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
      {selected && (
        <button
          type="button"
          onClick={() => onSelect(undefined)}
          aria-label={`Clear ${placeholder.replace("...", "").toLowerCase()}`}
          className="absolute top-1/2 right-8 -translate-y-1/2 rounded p-1 opacity-50 hover:opacity-100"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

/**
 * An empty column, as on rezide.in: pick a locality (listed once three letters are typed),
 * then a project from the backend's 10 matching the locality and the name typed (the name
 * counts from four letters; with neither, the latest 10), then "Add to Compare".
 */
function AddProject({ taken, onAdd }: { taken: string[]; onAdd: (p: ProjectRef) => void }) {
  const [localitySearch, setLocalitySearch] = useState("");
  const [locality, setLocality] = useState<Option>();
  const [projectSearch, setProjectSearch] = useState("");
  const [project, setProject] = useState<Option>();
  const localityText = useDeferredValue(localitySearch.trim());
  const projectText = useDeferredValue(projectSearch.trim());

  const places = useQuery({ ...locationQueries.suggestions(localityText, ""), enabled: localityText.length > 2 });
  const localityOptions =
    localityText.length > 2
      ? (places.data ?? [])
          .filter((s) => (s.kind === "locality" || s.kind === "subRegion") && matches(s.name, localityText))
          .map((s) => ({ value: `${s.kind}:${s.name}`, label: s.name, hint: s.kind === "locality" ? "locality" : "Sub-region" }))
          .filter((o, i, all) => all.findIndex((x) => x.value === o.value) === i)
          .sort((a, b) => a.label.localeCompare(b.label))
      : null;

  const names = [locality?.label ?? "", projectText.length > 3 ? projectText : ""].filter(Boolean);
  const found = useQuery(projectQueries.byNames(names));
  const projectOptions = (found.data ?? [])
    .filter((p) => matches(p.name, projectSearch))
    .map((p) => ({ value: p.id, label: p.name, disabled: taken.includes(p.id) }));

  const add = () => {
    if (!project) {
      toast.error("Please select a project to compare");
      return;
    }
    onAdd({ id: project.value, title: project.label });
  };

  return (
    <div className="grid items-center justify-center gap-2">
      <h4 className="text-sm font-semibold text-[#242424]">Add Project</h4>
      <Picker
        placeholder="Select locality..."
        searchPlaceholder="Search locality..."
        selected={locality}
        onSelect={(o) => {
          setLocality(o);
          setProject(undefined);
        }}
        search={localitySearch}
        onSearch={setLocalitySearch}
        options={localityOptions}
        empty={localityOptions ? "No locality found." : "Please search locality."}
      />
      <Picker
        placeholder="Select project..."
        searchPlaceholder="Search project..."
        selected={project}
        onSelect={setProject}
        search={projectSearch}
        onSearch={setProjectSearch}
        options={projectOptions}
        empty="No project found."
      />
      <Button type="button" onClick={add} className="rounded-md">
        Add to Compare
      </Button>
    </div>
  );
}
