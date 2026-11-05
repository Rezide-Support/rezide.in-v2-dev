"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type KeyboardEvent, type ReactNode, useLayoutEffect } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { dq, useDeleteContact, useSaveGroup, useUpdateContact, type Contact } from "./api";
import { COLUMNS, DEFAULT_COLUMNS, MAX_LABELS, displayName, type ColumnPref } from "./contact-model";
import { useContactsUi } from "./store";
import { nameInitials, type MenuEntry } from "./ui";

export const dialogBtn = "h-11 flex-1 text-[13px] font-bold tracking-[0.08em] uppercase";

export function DashDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("flex max-h-[90dvh] flex-col gap-4 rounded-[16px] p-6 sm:max-w-[520px]", className)}>
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description ? <DialogDescription className="text-[13px] text-rez-graphite">{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter className="flex-row gap-3 sm:justify-stretch">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Labels ---------- */

/** Chip editor: Enter or comma adds, up to four labels, with "Used before" suggestions. */
export function LabelEditor({ value, onChange, allLabels, inputId }: { value: string[]; onChange: (v: string[]) => void; allLabels: string[]; inputId?: string }) {
  const [draft, setDraft] = useState("");
  const full = value.length >= MAX_LABELS;
  const add = (raw: string) => {
    const x = raw.trim();
    if (!x) return;
    if (value.some((v) => v.toLowerCase() === x.toLowerCase())) return setDraft("");
    if (full) return toast("A contact can have up to 4 labels.");
    onChange([...value, x]);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  const sugg = full ? [] : allLabels.filter((l) => !value.includes(l)).slice(0, 6);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-[8px] border border-rez-smoke px-2.5 py-2 focus-within:border-black">
        {value.map((l) => (
          <span key={l} className="inline-flex h-7 items-center gap-1 rounded-[6px] bg-[#F0EAE2] pr-1 pl-2.5 text-xs font-semibold">
            {l}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== l))} aria-label={`Remove label ${l}`} className="flex size-5 items-center justify-center rounded hover:bg-black/10">
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
        {full ? (
          <span className="px-1 text-xs text-rez-graphite">Maximum 4 labels</span>
        ) : (
          <input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => draft.trim() && add(draft)}
            aria-label="Add a label"
            placeholder={value.length ? "Add another label" : "Type a label and press Enter"}
            className="h-7 min-w-[160px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-rez-space"
          />
        )}
      </div>
      {sugg.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-rez-graphite">Used before</span>
          {sugg.map((l) => (
            <button key={l} type="button" onClick={() => add(l)} className="inline-flex h-7 items-center gap-1 rounded-[6px] border border-dashed border-rez-smoke px-2 text-xs font-medium hover:border-black">
              <Icon name="plus" size={10} />
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function useAllLabels() {
  const contacts = useQuery(dq.contacts());
  return useMemo(() => Array.from(new Set((contacts.data ?? []).flatMap((c) => c.labels))).sort(), [contacts.data]);
}

function LabelsDialog({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const update = useUpdateContact();
  const all = useAllLabels();
  const [labels, setLabels] = useState(contact.labels);
  const save = (next: string[]) => {
    setLabels(next);
    update.mutate({ id: contact.id, labels: next });
  };
  return (
    <DashDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Labels · ${displayName(contact)}`}
      description="Up to 4 labels. Press Enter to add."
      footer={
        <Button className={dialogBtn} onClick={onClose}>
          Done
        </Button>
      }
    >
      <LabelEditor value={labels} onChange={save} allLabels={all} />
    </DashDialog>
  );
}

/* ---------- Picker rows ---------- */

export function PickRow({ checked, onToggle, badge, round, title, sub, note, locked }: { checked: boolean; onToggle: () => void; badge: string; round?: boolean; title: string; sub?: string; note?: string; locked?: boolean }) {
  return (
    <li>
      <label className={cn("flex cursor-pointer items-center gap-3 rounded-[12px] border px-3 py-2.5", checked && !locked ? "border-black bg-rez-cream-warm" : "border-[#E0E0E0] bg-white", locked && "cursor-default")}>
        <input type="checkbox" checked={checked} disabled={locked} onChange={onToggle} className="size-4 shrink-0 accent-black" />
        <span className={cn("flex size-9 shrink-0 items-center justify-center text-[11px] font-bold", round ? "rounded-full bg-[#F0F0F0]" : "rounded-[8px] bg-[#F0EAE2]")}>{badge}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{title}</span>
          {sub && <span className="truncate text-xs text-rez-graphite">{sub}</span>}
        </span>
        {note && <span className="shrink-0 text-xs text-rez-graphite">{note}</span>}
      </label>
    </li>
  );
}

function GroupsPickerDialog({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const groups = useQuery(dq.groups());
  const update = useUpdateContact();
  const saveGroup = useSaveGroup();
  const [picked, setPicked] = useState(contact.groupIds);
  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const rows = (groups.data ?? []).filter((g) => g.name.toLowerCase().includes(q.trim().toLowerCase()));
  const busy = update.isPending || saveGroup.isPending;
  const confirm = async () => {
    let ids = picked;
    const nn = newName.trim();
    if (nn) {
      const g = await saveGroup.mutateAsync({ name: nn, description: "" }).catch(() => null);
      if (!g) return;
      ids = [...ids, g.id];
    }
    const res = await update.mutateAsync({ id: contact.id, groupIds: ids }).catch(() => null);
    if (!res) return;
    toast.success(`${displayName(contact)} is in ${ids.length} ${ids.length === 1 ? "group" : "groups"}.`, { description: "Saved in this demo session." });
    onClose();
  };
  return (
    <DashDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Groups · ${displayName(contact)}`}
      description="Tick the groups this contact belongs to."
      footer={
        <>
          <Button variant="secondary" className={dialogBtn} onClick={onClose}>
            Cancel
          </Button>
          <Button className={dialogBtn} onClick={confirm} disabled={busy}>
            {busy ? "Saving…" : "Save Groups"}
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-between text-[13px]">
        <b>Groups</b>
        <span className="text-rez-graphite">{picked.length} selected</span>
      </div>
      <label className="flex h-10 items-center gap-2 rounded-[8px] border border-rez-smoke px-3 focus-within:border-black">
        <Icon name="search" size={16} />
        <span className="sr-only">Search groups</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups" className="flex-1 bg-transparent text-sm outline-none" />
      </label>
      <ul className="-mx-1 flex max-h-[300px] flex-col gap-2 overflow-y-auto px-1">
        {rows.map((g) => (
          <PickRow
            key={g.id}
            checked={picked.includes(g.id)}
            onToggle={() => setPicked((p) => (p.includes(g.id) ? p.filter((x) => x !== g.id) : [...p, g.id]))}
            badge={nameInitials(g.name)}
            title={g.name}
            sub={g.description}
            note={`${g.count} contacts`}
          />
        ))}
        {rows.length === 0 && <li className="py-6 text-center text-sm text-rez-graphite">No groups match.</li>}
      </ul>
      <label className="flex flex-col gap-2 text-[13px] font-semibold">
        Or create a new group
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New group name" className="h-10 rounded-[8px] border border-rez-smoke px-3 text-sm font-normal outline-none focus:border-black" />
      </label>
    </DashDialog>
  );
}

/* ---------- Columns ---------- */

export function ColumnsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const saved = useContactsUi((s) => s.columns);
  const setColumns = useContactsUi((s) => s.setColumns);
  const [cols, setCols] = useState<ColumnPref[]>(saved);
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCols(saved);
      setQ("");
    }
  }
  const label = (k: string) => COLUMNS.find((c) => c.key === k)!;
  const move = (from: number, to: number) => {
    if (to < 0 || to >= cols.length || from === to) return;
    const next = [...cols];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setCols(next);
  };
  const rows = cols.map((c, i) => ({ c, i })).filter(({ c }) => label(c.key).label.toLowerCase().includes(q.trim().toLowerCase()));
  const shown = cols.filter((c) => c.on).length;
  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Manage Columns"
      description="Drag or use the arrows to reorder. Toggle to show or hide."
      footer={
        <>
          <Button variant="secondary" className={dialogBtn} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className={dialogBtn}
            onClick={() => {
              setColumns(cols);
              onOpenChange(false);
              toast.success(`Custom view saved. ${shown} columns shown.`, { description: "Remembered in this browser." });
            }}
          >
            <Icon name="check" size={16} /> Save
          </Button>
        </>
      }
    >
      <label className="flex h-10 items-center gap-2 rounded-[8px] border border-rez-smoke px-3 focus-within:border-black">
        <span className="sr-only">Search columns</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search columns" className="flex-1 bg-transparent text-sm outline-none" />
        <Icon name="search" size={16} />
      </label>
      <div className="flex justify-between text-xs text-rez-graphite">
        <span>
          {rows.length} of {cols.length} columns
        </span>
        <span>{shown} shown in table</span>
      </div>
      <ul className="-mx-1 flex max-h-[340px] flex-col gap-1.5 overflow-y-auto px-1">
        {rows.map(({ c, i }) => {
          const def = label(c.key);
          return (
            <li
              key={c.key}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                setDrag(c.key);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!drag || drag === c.key) return;
                move(cols.findIndex((x) => x.key === drag), i);
              }}
              onDragEnd={() => setDrag(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(null);
              }}
              className={cn("flex items-center gap-2 rounded-[8px] border px-2.5 py-2", drag === c.key ? "border-black bg-rez-cream-warm opacity-70" : "border-rez-smoke bg-white")}
            >
              <Icon name="dots-vertical" size={16} className="cursor-grab text-rez-space" aria-hidden />
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{def.label}</span>
                {def.locked && <span className="text-[11px] text-rez-graphite">Always shown</span>}
              </span>
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${def.label} up`} className="flex size-7 items-center justify-center rounded hover:bg-[#F4F4F4] disabled:opacity-30">
                <Icon name="chevron-left" size={14} className="rotate-90" />
              </button>
              <button type="button" onClick={() => move(i, i + 1)} disabled={i === cols.length - 1} aria-label={`Move ${def.label} down`} className="flex size-7 items-center justify-center rounded hover:bg-[#F4F4F4] disabled:opacity-30">
                <Icon name="chevron-left" size={14} className="-rotate-90" />
              </button>
              <span className={cn("w-12 text-right text-[11px] font-semibold", c.on ? "text-rez-timber" : "text-rez-graphite")}>{c.on ? "Visible" : "Hidden"}</span>
              <Switch
                checked={c.on}
                disabled={def.locked}
                aria-label={`Show ${def.label} column`}
                onCheckedChange={(on) => setCols((all) => all.map((x) => (x.key === c.key ? { ...x, on } : x)))}
              />
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => setCols(DEFAULT_COLUMNS)} className="w-fit text-xs font-semibold underline underline-offset-4">
        Reset to default
      </button>
    </DashDialog>
  );
}

/* ---------- Delete ---------- */

function DeleteDialog({ contact, onClose, onDeleted }: { contact: Contact; onClose: () => void; onDeleted?: () => void }) {
  const del = useDeleteContact();
  return (
    <DashDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Delete ${displayName(contact)}?`}
      description="The contact is removed from this demo session. Reloading the page restores the sample data."
      footer={
        <>
          <Button variant="secondary" className={dialogBtn} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="announce"
            className={dialogBtn}
            disabled={del.isPending}
            onClick={() =>
              del.mutate(contact.id, {
                onSuccess: () => {
                  toast.success(`${displayName(contact)} deleted.`);
                  onClose();
                  onDeleted?.();
                },
              })
            }
          >
            Delete
          </Button>
        </>
      }
    />
  );
}

/* ---------- Actions ---------- */

type Pending = { kind: "labels" | "groups" | "delete"; contact: Contact } | null;

/** Menu items for a contact plus the dialogs they open. Render `dialogs` once per page. */
export function useContactActions(opts: { onDeleted?: () => void } = {}) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  // Dialogs opened from a menu shouldn’t reappear when the user comes back to the page.
  useLayoutEffect(() => () => setPending(null), []);
  const close = () => setPending(null);

  const share = async (c: Contact) => {
    const text = [displayName(c), c.type === "Developer" || c.entity === "Company" ? `Contact: ${c.firstName} ${c.lastName}` : "", `+91 ${c.mobile}`, c.email ?? ""].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Contact card copied to the clipboard.");
    } catch {
      toast.error("Couldn’t copy. Your browser blocked clipboard access.");
    }
  };

  const items = (c: Contact, withView = true): MenuEntry[] => [
    { header: "Label Actions" },
    { label: "View Labels", icon: "badge-star", tone: "warm", onSelect: () => setPending({ kind: "labels", contact: c }) },
    { header: "Other Actions" },
    ...(withView ? [{ label: "View Contact", icon: "user" as const, onSelect: () => router.push(`/dashboard/contacts/${c.id}`) }] : []),
    { label: "Edit", icon: "pencil", onSelect: () => router.push(`/dashboard/contacts/${c.id}/edit`) },
    { label: "Associate Property", icon: "map-pin", onSelect: () => router.push(`/dashboard/contacts/${c.id}/associate`) },
    { label: "Add to Group", icon: "user-alt", onSelect: () => setPending({ kind: "groups", contact: c }) },
    { label: "Share Contact", icon: "share", tone: "green", onSelect: () => void share(c) },
    { label: "Delete", icon: "trash", tone: "danger", onSelect: () => setPending({ kind: "delete", contact: c }) },
  ];

  const dialogs = pending ? (
    pending.kind === "labels" ? (
      <LabelsDialog key={pending.contact.id} contact={pending.contact} onClose={close} />
    ) : pending.kind === "groups" ? (
      <GroupsPickerDialog key={pending.contact.id} contact={pending.contact} onClose={close} />
    ) : (
      <DeleteDialog contact={pending.contact} onClose={close} onDeleted={opts.onDeleted} />
    )
  ) : null;

  return { items, dialogs, openLabels: (c: Contact) => setPending({ kind: "labels", contact: c }), openGroups: (c: Contact) => setPending({ kind: "groups", contact: c }) };
}
