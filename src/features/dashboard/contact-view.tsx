"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/brand/icon";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { dq, useUpdateContact, type Contact } from "./api";
import { LabelEditor, useAllLabels, useContactActions } from "./contact-dialogs";
import { DETAIL_SECTIONS } from "./contact-fields";
import { MAX_LABELS, addedVia, displayName, filterContacts, isCompany, personName, subLine } from "./contact-model";
import { ContactsHeaderActions, useContactFilterChips } from "./contacts";
import { RelativesEditor } from "./relatives";
import { useContactsUi } from "./store";
import { Avatar, Card, FilterChips, Loading, PageHeader, RowActions, TypePill, WhatsAppLink, nameInitials, notAvailable, shortDate, thClass, tdClass, THead, whatsAppProps } from "./ui";

const TABS = ["info", "props", "leads", "groups"] as const;
type Tab = (typeof TABS)[number];

function ListPanel({ rows, total, activeId }: { rows: Contact[]; total: number; activeId: string }) {
  const ui = useContactsUi();
  return (
    <Card className="flex flex-col overflow-hidden lg:sticky lg:top-6 lg:max-h-[calc(100dvh-48px)]">
      <div className="flex flex-col gap-3 border-b border-[#E0E0E0] p-3.5">
        <label className="flex h-10 items-center gap-2 rounded-[8px] border border-rez-smoke px-3 focus-within:border-black">
          <Icon name="search" size={16} />
          <span className="sr-only">Search contacts</span>
          <input type="search" value={ui.q} onChange={(e) => ui.set({ q: e.target.value })} placeholder="Search contacts" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
          {["Customer", "Broker", "Developer"].map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={ui.type === t}
              onClick={() => ui.set({ type: ui.type === t ? "" : t })}
              className={cn("h-7 rounded-full px-3 text-xs font-semibold", ui.type === t ? "bg-black text-rez-full-white" : "bg-[#F0F0F0] text-rez-arsenic hover:text-black")}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-xs text-rez-graphite" aria-live="polite">
          Showing {rows.length} of {total} contacts
        </p>
      </div>
      <ul className="overflow-y-auto">
        {rows.map((c) => {
          const on = c.id === activeId;
          const name = c.type === "Broker" ? personName(c) : displayName(c);
          const sub = c.type === "Broker" ? c.company || c.details.organisation || "Firm not added" : c.type === "Customer" ? c.labels.join(" · ") || "No labels" : subLine(c);
          return (
            <li key={c.id} className={cn("flex items-center gap-3 border-b border-[#E8E8E8] px-3.5 py-3 last:border-b-0", on ? "bg-[#F4F4F4]" : "hover:bg-[#FAFAFA]")}>
              <Avatar name={displayName(c)} dark={on} />
              <Link href={`/dashboard/contacts/${c.id}`} aria-current={on ? "page" : undefined} className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate text-sm", on ? "font-bold" : "font-semibold")}>{name}</span>
                <span className="truncate text-xs text-rez-graphite">{sub}</span>
              </Link>
              <WhatsAppLink mobile={c.mobile} name={displayName(c)} className="size-7 border-none bg-[#F0F0F0]" />
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-rez-graphite">No contacts match.</li>}
      </ul>
    </Card>
  );
}

function SectionCard({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("flex flex-col gap-4 p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-bold tracking-[0.06em] uppercase">{title}</h2>
        {aside}
      </div>
      {children}
    </Card>
  );
}

function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 border-b border-[#E8E8E8] pb-3">
      <dt className="text-xs text-rez-graphite">{k}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-[15px] break-words">{children}</dd>
    </div>
  );
}

function InfoTab({ c, onTab }: { c: Contact; onTab: (t: Tab) => void }) {
  const update = useUpdateContact();
  const allLabels = useAllLabels();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const name = displayName(c);
  const na = <span className="text-rez-space">N/A</span>;
  const patch = (p: Partial<Contact>) => update.mutate({ id: c.id, ...p });
  const editHref = (section?: string) => `/dashboard/contacts/${c.id}/edit${section ? `?open=${section}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Contact Details" aside={<Link href={editHref()} className="text-[13px] font-semibold underline underline-offset-4">Edit</Link>}>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          <KV k="Mobile No.">
            {c.mobile ? `+91 ${c.mobile}` : na}
            {c.mobile && <WhatsAppLink mobile={c.mobile} name={name} />}
          </KV>
          <KV k="Alternate Mobile No.">
            {c.altMobile ? `+91 ${c.altMobile}` : na}
            {c.altMobile && <WhatsAppLink mobile={c.altMobile} name={name} />}
          </KV>
          <KV k="Email ID">{c.email ? <a href={`mailto:${c.email}`} className="truncate underline underline-offset-4">{c.email}</a> : na}</KV>
          <KV k="Alternate Email ID">{c.altEmail ? <a href={`mailto:${c.altEmail}`} className="truncate underline underline-offset-4">{c.altEmail}</a> : na}</KV>
          <KV k="Contact Type">{c.type + (c.subType ? ` · ${c.subType}` : "")}</KV>
          <KV k={c.type === "Developer" ? "Developer Company" : "Contact Is"}>{c.type === "Developer" ? c.company || na : c.entity + (c.company ? ` · ${c.company}` : "")}</KV>
        </dl>
      </SectionCard>

      <SectionCard title="Family & Relatives" aside={<span className="text-[13px] text-rez-graphite">{c.relatives.length} {c.relatives.length === 1 ? "relative" : "relatives"}</span>}>
        <RelativesEditor value={c.relatives} onChange={(relatives) => patch({ relatives })} />
      </SectionCard>

      {DETAIL_SECTIONS.map((sec) => {
        const fields = sec.fields.filter((f) => f.kind !== "check");
        const rows = fields.map((f) => ({ k: f.label, v: c.details[f.key] ?? "" })).filter((r) => r.v && !(r.k === "Country" && r.v === "India" && !c.details.line1 && !c.details.city));
        const isOpen = open[sec.id] ?? rows.length > 0;
        const panelId = `sec-${sec.id}`;
        return (
          <Card key={sec.id} className="overflow-hidden">
            <h2>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((o) => ({ ...o, [sec.id]: !isOpen }))}
                className={cn("flex w-full items-center justify-between gap-3 px-5 py-4 text-left", isOpen && "bg-[#F4F4F4]")}
              >
                <span className="text-[13px] font-bold tracking-[0.06em] uppercase">{sec.title}</span>
                <span className="flex items-center gap-3 text-[13px] text-rez-graphite">
                  {rows.length ? `${rows.length} of ${fields.length} filled` : "Not added"}
                  <Icon name="chevron-left" size={16} className={isOpen ? "rotate-90" : "-rotate-90"} aria-hidden />
                </span>
              </button>
            </h2>
            {isOpen && (
              <div id={panelId} className="px-5 pt-4 pb-5">
                {rows.length ? (
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                    {rows.map((r) => (
                      <KV key={r.k} k={r.k}>
                        {r.v}
                      </KV>
                    ))}
                  </dl>
                ) : (
                  <p className="flex flex-wrap items-center gap-3 text-sm text-rez-graphite">
                    Nothing added yet.
                    <Link href={editHref(sec.id)} className="inline-flex items-center gap-1 font-semibold text-black underline underline-offset-4">
                      <Icon name="plus" size={14} /> Add Details
                    </Link>
                  </p>
                )}
              </div>
            )}
          </Card>
        );
      })}

      <SectionCard title="Labels" aside={<span className="text-[13px] text-rez-graphite">{c.labels.length} / {MAX_LABELS}</span>}>
        <LabelEditor value={c.labels} onChange={(labels) => patch({ labels })} allLabels={allLabels} />
      </SectionCard>

      <Card className="grid grid-cols-1 gap-px overflow-hidden bg-[#E8E8E8] sm:grid-cols-5">
        {(
          [
            ["Properties", `${c.properties.length} linked`, "props"],
            ["Leads", `${c.leads.length} leads`, "leads"],
            ["Groups", `${c.groupIds.length} groups`, "groups"],
            ["Saved At", c.firmLevel ? "Firm level" : "My contacts"],
            ["Added", `${shortDate(c.addedOn)} · ${addedVia(c)}`],
          ] as [string, string, Tab?][]
        ).map(([k, v, tab]) => {
          const inner = (
            <>
              <span className="text-xs text-rez-graphite">{k}</span>
              <span className="text-sm font-semibold">{v}</span>
            </>
          );
          return tab ? (
            <button key={k} type="button" onClick={() => onTab(tab)} className="flex flex-col gap-1 bg-white px-4 py-3.5 text-left hover:bg-[#FAFAFA]">
              {inner}
            </button>
          ) : (
            <div key={k} className="flex flex-col gap-1 bg-white px-4 py-3.5">
              {inner}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function PropsTab({ c }: { c: Contact }) {
  const update = useUpdateContact();
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-[13px] font-bold tracking-[0.06em] uppercase">Associated Properties</h2>
        <Button asChild size="sm" className="h-10 px-5 font-bold tracking-[0.06em] uppercase">
          <Link href={`/dashboard/contacts/${c.id}/associate`}>
            <Icon name="plus" size={14} /> Associate Property
          </Link>
        </Button>
      </div>
      {c.properties.length ? (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Properties linked to {displayName(c)}</caption>
            <THead>
              <tr>
                {["Property / Unit", "Property Type", "Unit Type", "Association", "Location", "Source", ""].map((h, i) => (
                  <th key={i} scope="col" className={thClass}>
                    {h || <span className="sr-only">Remove</span>}
                  </th>
                ))}
              </tr>
            </THead>
            <tbody>
              {c.properties.map((p) => (
                <tr key={p.id} className="border-t border-[#E8E8E8] first:border-t-0">
                  <td className={tdClass}>
                    <span className="flex flex-col">
                      <b className="font-semibold">{p.unit}</b>
                      <span className="text-xs text-rez-graphite">{p.project}</span>
                    </span>
                  </td>
                  <td className={tdClass}>{p.propertyType}</td>
                  <td className={tdClass}>{p.unitType}</td>
                  <td className={tdClass}>
                    <span className="rounded-full bg-[#F0EAE2] px-2.5 py-1 text-xs font-semibold whitespace-nowrap">{p.relation}</span>
                  </td>
                  <td className={tdClass}>{p.locality}</td>
                  <td className={tdClass}>{p.source}</td>
                  <td className={tdClass}>
                    <button
                      type="button"
                      aria-label={`Unlink ${p.unit}, ${p.project}`}
                      title="Remove association"
                      onClick={() => update.mutate({ id: c.id, properties: c.properties.filter((x) => x.id !== p.id) }, { onSuccess: () => toast.success(`${p.unit} unlinked.`) })}
                      className="flex size-8 items-center justify-center rounded-full hover:bg-[#F4F4F4]"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border-t border-[#E8E8E8] px-5 py-10 text-center text-sm text-rez-graphite">No properties linked to this contact yet.</p>
      )}
    </Card>
  );
}

function LeadsTab({ c }: { c: Contact }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-[13px] font-bold tracking-[0.06em] uppercase">Leads</h2>
        <Button size="sm" className="h-10 px-5 font-bold tracking-[0.06em] uppercase" onClick={() => notAvailable("Lead creation")}>
          <Icon name="plus" size={14} /> Create Lead
        </Button>
      </div>
      {c.leads.length ? (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <caption className="sr-only">Leads for {displayName(c)}</caption>
            <THead>
              <tr>
                {["Looking To", "Property / Unit Type", "Stage / Sub-stage", "Flag", "Budget", "Assigned To", "Created"].map((h) => (
                  <th key={h} scope="col" className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </THead>
            <tbody>
              {c.leads.map((l) => {
                const [pt, ut] = l.propertyType.split(" · ");
                const [st, sub] = l.stage.split(" · ");
                return (
                  <tr key={l.created + l.stage} className="border-t border-[#E8E8E8] first:border-t-0">
                    <td className={cn(tdClass, "font-semibold")}>{l.looking}</td>
                    <td className={tdClass}>
                      <span className="flex flex-col">
                        {pt}
                        <span className="text-xs text-rez-graphite">{ut}</span>
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="flex flex-col">
                        {st}
                        <span className="text-xs text-rez-graphite">{sub}</span>
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", l.flag === "Hot" ? "bg-[#F0EAE2]" : "bg-[#F0F0F0]")}>{l.flag}</span>
                    </td>
                    <td className={cn(tdClass, "whitespace-nowrap")}>{l.budget}</td>
                    <td className={tdClass}>{l.assignedTo}</td>
                    <td className={cn(tdClass, "whitespace-nowrap")}>{shortDate(l.created)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border-t border-[#E8E8E8] px-5 py-10 text-center text-sm text-rez-graphite">No leads for this contact yet.</p>
      )}
    </Card>
  );
}

function GroupsTab({ c, onAdd }: { c: Contact; onAdd: () => void }) {
  const groups = useQuery(dq.groups());
  const update = useUpdateContact();
  const mine = (groups.data ?? []).filter((g) => c.groupIds.includes(g.id));
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-[13px] font-bold tracking-[0.06em] uppercase">Groups</h2>
        <Button size="sm" className="h-10 px-5 font-bold tracking-[0.06em] uppercase" onClick={onAdd}>
          <Icon name="plus" size={14} /> Add to Group
        </Button>
      </div>
      {mine.length ? (
        <ul className="border-t border-[#E8E8E8]">
          {mine.map((g) => (
            <li key={g.id} className="flex items-center gap-3 border-b border-[#E8E8E8] px-5 py-3 last:border-b-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-[#F0EAE2] text-[11px] font-bold" aria-hidden>
                {nameInitials(g.name)}
              </span>
              <Link href={`/dashboard/contacts?group=${g.id}`} className="flex min-w-0 flex-1 flex-col hover:underline">
                <b className="text-sm font-semibold">{g.name}</b>
                <span className="truncate text-xs text-rez-graphite">{g.description}</span>
              </Link>
              <span className="text-xs text-rez-graphite">{g.count} contacts</span>
              <button
                type="button"
                aria-label={`Remove from ${g.name}`}
                title="Remove from group"
                onClick={() => update.mutate({ id: c.id, groupIds: c.groupIds.filter((x) => x !== g.id) }, { onSuccess: () => toast.success(`Removed from ${g.name}.`) })}
                className="flex size-8 items-center justify-center rounded-full hover:bg-[#F4F4F4]"
              >
                <Icon name="x" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-[#E8E8E8] px-5 py-10 text-center text-sm text-rez-graphite">This contact is not in any group yet.</p>
      )}
    </Card>
  );
}

export function ContactView({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contact = useQuery(dq.contact(id));
  const contacts = useQuery(dq.contacts());
  const groups = useQuery(dq.groups());
  const ui = useContactsUi();
  const tabParam = searchParams.get("tab") as Tab | null;
  const validTab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : null;
  const [tab, setTab] = useState<Tab>(validTab ?? "info");
  // Follow ?tab= when it changes (e.g. returning from Associate Property); the page itself is preserved across navigations.
  const [seenTabParam, setSeenTabParam] = useState(validTab);
  if (validTab !== seenTabParam) {
    setSeenTabParam(validTab);
    if (validTab) setTab(validTab);
  }
  const actions = useContactActions({ onDeleted: () => router.push("/dashboard/contacts") });

  const all = useMemo(() => contacts.data ?? [], [contacts.data]);
  const rows = useMemo(() => filterContacts(all, ui), [all, ui]);
  const { chips, clear } = useContactFilterChips((gid) => groups.data?.find((g) => g.id === gid)?.name);

  const header = <PageHeader crumbs={["Contact"]} title="All Contacts" actions={<ContactsHeaderActions view="list" rows={rows} />} />;

  if (contact.isError) {
    return (
      <>
        {header}
        {contact.error instanceof ApiError && contact.error.status === 404 ? (
          <EmptyState icon="user" title="Contact not found." className="bg-white" action={<Link className="font-semibold underline" href="/dashboard/contacts">Back to contacts</Link>}>
            It may have been deleted in this session.
          </EmptyState>
        ) : (
          <ErrorState onRetry={() => contact.refetch()} />
        )}
      </>
    );
  }

  const c = contact.data;
  const name = c ? displayName(c) : "";
  const counts: Record<Tab, number | null> = { info: null, props: c?.properties.length ?? 0, leads: c?.leads.length ?? 0, groups: c?.groupIds.length ?? 0 };
  const tabLabel: Record<Tab, string> = { info: "Info", props: "Properties", leads: "Leads", groups: "Groups" };

  return (
    <>
      {header}
      <FilterChips chips={chips} onClear={clear} />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <ListPanel rows={rows} total={all.length} activeId={id} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Link href="/dashboard/contacts" className="inline-flex w-fit items-center gap-1 text-[13px] font-semibold underline underline-offset-4 lg:hidden">
            <Icon name="chevron-left" size={14} /> All contacts
          </Link>
          {!c ? (
            <Loading />
          ) : (
            <>
              <Card className="flex flex-wrap items-center gap-4 p-5">
                <Avatar name={name} size={60} className="text-lg" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h2 className="text-[22px] leading-tight font-semibold">{isCompany(c) ? name : [c.salutation, name].join(" ")}</h2>
                  <span className="flex flex-wrap items-center gap-2 text-sm text-rez-arsenic">
                    <TypePill type={c.type} />
                    {[c.subType, c.type === "Developer" || isCompany(c) ? subLine(c) : c.details.organisation].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="secondary" className="h-10 px-4 text-[13px] font-bold tracking-[0.06em] uppercase">
                    <a {...whatsAppProps(c.mobile, name)}>
                      <Icon name="message" size={16} /> WhatsApp
                    </a>
                  </Button>
                  <Button asChild variant="secondary" className="h-10 px-4 text-[13px] font-bold tracking-[0.06em] uppercase">
                    <Link href={`/dashboard/contacts/${c.id}/edit`}>
                      <Icon name="pencil" size={16} /> Edit
                    </Link>
                  </Button>
                  <RowActions label={`More actions for ${name}`} items={actions.items(c, false)} align="end" className="h-10" />
                </div>
              </Card>

              <div role="tablist" aria-label="Contact sections" className="flex gap-1 overflow-x-auto border-b border-[#E0E0E0] scrollbar-none">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    id={`tab-${t}`}
                    aria-selected={tab === t}
                    aria-controls={`panel-${t}`}
                    tabIndex={tab === t ? 0 : -1}
                    onClick={() => setTab(t)}
                    onKeyDown={(e) => {
                      const i = TABS.indexOf(t);
                      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        const n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
                        setTab(n);
                        document.getElementById(`tab-${n}`)?.focus();
                      }
                    }}
                    className={cn("-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-[15px]", tab === t ? "border-black font-semibold text-black" : "border-transparent text-rez-graphite hover:text-black")}
                  >
                    {tabLabel[t]}
                    {counts[t] !== null && <span className="text-sm font-normal text-rez-space">{counts[t]}</span>}
                  </button>
                ))}
              </div>
              <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                {tab === "info" && <InfoTab c={c} onTab={setTab} />}
                {tab === "props" && <PropsTab c={c} />}
                {tab === "leads" && <LeadsTab c={c} />}
                {tab === "groups" && <GroupsTab c={c} onAdd={() => actions.openGroups(c)} />}
              </div>
            </>
          )}
        </div>
      </div>
      {actions.dialogs}
    </>
  );
}
