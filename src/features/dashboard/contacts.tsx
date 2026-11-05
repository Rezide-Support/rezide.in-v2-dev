"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode, useLayoutEffect } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/brand/icon";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { CONTACT_SUBTYPES, type ContactType } from "@/lib/constants";
import { dq, type Contact } from "./api";
import { ColumnsDialog, useContactActions } from "./contact-dialogs";
import { COLUMNS, addedVia, displayName, downloadText, filterContacts, subLine, toCsv, type ColumnKey } from "./contact-model";
import { useContactsUi } from "./store";
import {
  Avatar,
  Card,
  DashSelect,
  FilterChips,
  HeaderButton,
  LabelChip,
  Loading,
  PageHeader,
  RowActions,
  SearchBox,
  TableFooter,
  THead,
  TrackToggle,
  TypePill,
  WhatsAppLink,
  notAvailable,
  shortDate,
  tdClass,
  thClass,
} from "./ui";

export { toCsv } from "./contact-model";

const TYPES = Object.keys(CONTACT_SUBTYPES) as ContactType[];

/** Filter chips shared by the table and list views. */
export function useContactFilterChips(groupName: (id: string) => string | undefined) {
  const ui = useContactsUi();
  const chips = [
    ui.type && { label: ui.type, onRemove: () => ui.set({ type: "" }) },
    ui.group && { label: `Group · ${groupName(ui.group) ?? ui.group}`, onRemove: () => ui.set({ group: "" }) },
    ui.label && { label: `Label · ${ui.label}`, onRemove: () => ui.set({ label: "" }) },
    ui.q.trim() && { label: `“${ui.q.trim()}”`, onRemove: () => ui.set({ q: "" }) },
  ].filter(Boolean) as { label: string; onRemove: () => void }[];
  return { chips, clear: ui.clear };
}

/** Header actions shared by the table and list views. */
export function ContactsHeaderActions({ view, rows }: { view: "table" | "list"; rows: Contact[] }) {
  const router = useRouter();
  const groups = useQuery(dq.groups());
  const exportCsv = () => {
    const names = new Map((groups.data ?? []).map((g) => [g.id, g.name]));
    downloadText("rezide-contacts.csv", toCsv(rows, (id) => names.get(id) ?? id));
    toast.success(`Exported ${rows.length} contacts to CSV.`, { description: "The file was generated in your browser." });
  };
  return (
    <>
      <TrackToggle
        label="Contacts view"
        value={view}
        onChange={(v) => {
          if (v === view) return;
          router.push(v === "table" ? "/dashboard/contacts" : `/dashboard/contacts/${rows[0]?.id ?? ""}`);
        }}
        options={[
          { value: "table", label: "Table View" },
          { value: "list", label: "List View" },
        ]}
      />
      <HeaderButton icon="file-text" onClick={exportCsv} disabled={!rows.length}>
        Export
      </HeaderButton>
      <HeaderButton icon="file-upload" onClick={() => notAvailable("Contact upload")}>
        Upload
      </HeaderButton>
      <HeaderButton variant="default" asChild>
        <Link href="/dashboard/contacts/new">
          <Icon name="plus" size={18} />
          Add Contact
        </Link>
      </HeaderButton>
    </>
  );
}

function Chips({ items, empty, onClick, tone, label }: { items: string[]; empty: string; onClick: () => void; tone: "plain" | "warm"; label: string }) {
  if (!items.length) {
    return (
      <button type="button" onClick={onClick} className="text-[13px] text-rez-graphite underline underline-offset-4 hover:text-black">
        {empty}
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex max-w-full flex-wrap items-center gap-1 rounded-[6px] text-left">
      {items.slice(0, 2).map((l) => (
        <LabelChip key={l} tone={tone}>
          {l}
        </LabelChip>
      ))}
      {items.length > 2 && <LabelChip tone={tone}>+{items.length - 2}</LabelChip>}
    </button>
  );
}

function TwoLine({ main, sub }: { main?: string; sub?: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className={main ? "text-black" : "text-rez-space"}>{main || "NA"}</span>
      {sub && <span className="text-xs text-rez-graphite">{sub}</span>}
    </span>
  );
}

function Phone({ mobile, name }: { mobile?: string; name: string }) {
  if (!mobile) return <span className="text-rez-space">NA</span>;
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      +91 {mobile}
      <WhatsAppLink mobile={mobile} name={name} />
    </span>
  );
}

function Mail({ email }: { email?: string }) {
  if (!email) return <span className="text-rez-space">NA</span>;
  return (
    <a href={`mailto:${email}`} className="block max-w-[180px] truncate hover:underline" title={email}>
      {email}
    </a>
  );
}

export function ContactsPage() {
  const searchParams = useSearchParams();
  const contacts = useQuery(dq.contacts());
  const groups = useQuery(dq.groups());
  const ui = useContactsUi();
  const [colsOpen, setColsOpen] = useState(false);
  useLayoutEffect(() => () => setColsOpen(false), []);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const actions = useContactActions();

  // "View Contacts" on a group links here with ?group=<id>.
  const groupParam = searchParams.get("group");
  const setFilters = ui.set;
  useEffect(() => {
    if (groupParam) setFilters({ group: groupParam, type: "", label: "", q: "" });
  }, [groupParam, setFilters]);

  const all = useMemo(() => contacts.data ?? [], [contacts.data]);
  const labels = useMemo(() => Array.from(new Set(all.flatMap((c) => c.labels))).sort(), [all]);
  const filtered = useMemo(() => filterContacts(all, ui), [all, ui]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * perPage, current * perPage);
  const gName = (id: string) => groups.data?.find((g) => g.id === id)?.name;
  const { chips, clear } = useContactFilterChips(gName);
  const visible = ui.columns.filter((c) => c.on).map((c) => COLUMNS.find((d) => d.key === c.key)!);
  const filter = (patch: Parameters<typeof ui.set>[0]) => {
    ui.set(patch);
    setPage(1);
  };

  const cell = (c: Contact, key: ColumnKey): ReactNode => {
    const name = displayName(c);
    switch (key) {
      case "name":
        return (
          <Link href={`/dashboard/contacts/${c.id}`} className="group flex items-center gap-3">
            <Avatar name={name} />
            <span className="flex min-w-0 flex-col">
              <span className="font-semibold group-hover:underline">{name}</span>
              <span className="truncate text-xs text-rez-graphite">{subLine(c)}</span>
            </span>
          </Link>
        );
      case "type":
        return (
          <span className="flex flex-col items-start gap-1">
            <TypePill type={c.type} />
            <span className="text-xs text-rez-graphite">{c.subType || "-"}</span>
          </span>
        );
      case "mobile":
        return <Phone mobile={c.mobile} name={name} />;
      case "alt":
        return <Phone mobile={c.altMobile} name={name} />;
      case "email":
        return <Mail email={c.email} />;
      case "altEmail":
        return <Mail email={c.altEmail} />;
      case "labels":
        return <Chips items={c.labels} empty="Add label" tone="plain" onClick={() => actions.openLabels(c)} label={`Labels for ${name}: ${c.labels.join(", ")}. Edit labels`} />;
      case "groups": {
        const names = c.groupIds.map((id) => gName(id)).filter(Boolean) as string[];
        return <Chips items={names} empty="Add to group" tone="warm" onClick={() => actions.openGroups(c)} label={`Groups for ${name}: ${names.join(", ")}. Edit groups`} />;
      }
      case "firm":
        return <TwoLine main={c.company || c.details.organisation} />;
      case "occupation":
        return <TwoLine main={c.details.occupation} sub={c.details.designation} />;
      case "city":
        return <TwoLine main={c.details.city} sub={c.details.city ? c.details.state : undefined} />;
      case "added":
        return (
          <span className="whitespace-nowrap">
            <TwoLine main={shortDate(c.addedOn)} sub={addedVia(c)} />
          </span>
        );
    }
  };

  return (
    <>
      <PageHeader crumbs={["Contact"]} title="All Contacts" subtitle={`Total ${all.length} Contacts`} actions={<ContactsHeaderActions view="table" rows={filtered} />} />

      <Card className="flex flex-wrap items-center gap-2.5 p-4">
        <DashSelect aria-label="Contact type" value={ui.type} onChange={(e) => filter({ type: e.target.value })} wrapperClassName="w-full sm:w-[170px]">
          <option value="">All Types</option>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </DashSelect>
        <DashSelect aria-label="Group" value={ui.group} onChange={(e) => filter({ group: e.target.value })} wrapperClassName="w-full sm:w-[210px]">
          <option value="">All Groups</option>
          {groups.data?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </DashSelect>
        <DashSelect aria-label="Label" value={ui.label} onChange={(e) => filter({ label: e.target.value })} wrapperClassName="w-full sm:w-[190px]">
          <option value="">All Labels</option>
          {labels.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </DashSelect>
        <SearchBox value={ui.q} onChange={(q) => filter({ q })} label="Search contacts" placeholder="Search name, mobile or email" className="w-full sm:w-[240px]" />
        <Button variant="ghost" onClick={() => setColsOpen(true)} className="h-[42px] rounded-[8px] border border-rez-smoke bg-[#F4F4F4] px-4 text-sm font-medium sm:ml-auto">
          <Icon name="sliders" size={16} /> Custom View <span className="text-xs text-rez-graphite">{visible.length} / {COLUMNS.length}</span>
        </Button>
      </Card>
      <FilterChips chips={chips} onClear={clear} />

      {contacts.isError ? (
        <ErrorState onRetry={() => contacts.refetch()} />
      ) : contacts.isPending ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState icon="user" title="No contacts match these filters." className="bg-white" action={chips.length ? <Button variant="secondary" onClick={clear}>Clear filters</Button> : null} />
      ) : (
        <Card className="overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Contacts, sorted by name</caption>
              <THead>
                <tr>
                  <th scope="col" className={thClass}>
                    Actions
                  </th>
                  {visible.map((col) => (
                    <th key={col.key} scope="col" className={thClass} style={{ minWidth: col.minW }} aria-sort={col.key === "name" ? (ui.sort === 1 ? "ascending" : "descending") : undefined}>
                      {col.key === "name" ? (
                        <button type="button" onClick={() => ui.set({ sort: ui.sort === 1 ? -1 : 1 })} className="inline-flex items-center gap-1 uppercase">
                          {col.label}
                          <Icon name="chevron-left" size={14} className={ui.sort === 1 ? "-rotate-90" : "rotate-90"} aria-hidden />
                          <span className="sr-only">, sort {ui.sort === 1 ? "Z to A" : "A to Z"}</span>
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </THead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t border-[#E8E8E8] first:border-t-0 hover:bg-[#FAFAFA]">
                    <td className={tdClass}>
                      <RowActions label={`Actions for ${displayName(c)}`} items={actions.items(c)} />
                    </td>
                    {visible.map((col) => (
                      <td key={col.key} className={tdClass}>
                        {cell(c, col.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TableFooter
            showing={`Showing ${rows.length} of ${filtered.length} contacts`}
            perPage={perPage}
            onPerPage={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            page={current}
            pageCount={pageCount}
            onPage={setPage}
          />
        </Card>
      )}
      <ColumnsDialog open={colsOpen} onOpenChange={setColsOpen} />
      {actions.dialogs}
    </>
  );
}
