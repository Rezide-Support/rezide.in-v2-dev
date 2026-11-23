"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useLayoutEffect } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/brand/icon";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { dq, useDeleteGroup, useSaveGroup, type GroupWithCount } from "./api";
import { DashDialog, PickRow, dialogBtn } from "./contact-dialogs";
import { displayName } from "./contact-model";
import { inputCls } from "./form-bits";
import { Avatar, Card, HeaderButton, Loading, PageHeader, RowActions, SearchBox, THead, nameInitials, notAvailable, shortDate, tdClass, thClass } from "./ui";

function GroupDialog({ group, onClose }: { group: GroupWithCount | null; onClose: () => void }) {
  const contacts = useQuery(dq.contacts());
  const save = useSaveGroup();
  const all = useMemo(() => contacts.data ?? [], [contacts.data]);
  const [name, setName] = useState(group?.name ?? "");
  const [desc, setDesc] = useState(group?.description ?? "");
  const [picked, setPicked] = useState<string[]>(() => (group ? all.filter((c) => c.groupIds.includes(group.id)).map((c) => c.id) : []));
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const rows = all.filter((c) => displayName(c).toLowerCase().includes(q.trim().toLowerCase()));
  const n = picked.length;
  const confirm = () => {
    if (!name.trim()) return setError("Give the group a name.");
    save.mutate(
      { id: group?.id, name, description: desc, contactIds: picked },
      {
        onSuccess: () => {
          toast.success(group ? `${name.trim()} updated.` : `${name.trim()} created with ${n} ${n === 1 ? "contact" : "contacts"}.`, { description: "Saved in this demo session." });
          onClose();
        },
      },
    );
  };
  return (
    <DashDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={group ? "Manage Group" : "Create Group"}
      description={group ? "Rename the group and tick the contacts that belong in it." : "Name the group and pick its contacts. A contact can be in many groups."}
      footer={
        <>
          <Button variant="secondary" className={dialogBtn} onClick={onClose}>
            Cancel
          </Button>
          <Button className={dialogBtn} onClick={confirm} disabled={save.isPending}>
            {group ? "Save Group" : n ? `Create · ${n} Contacts` : "Create Group"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-[13px] font-semibold">
          Group Name *
          <input
            value={name}
            onChange={(e) => (setName(e.target.value), setError(""))}
            placeholder="e.g. Powai Investors"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "group-name-err" : undefined}
            className={`${inputCls} font-normal`}
          />
        </label>
        <label className="flex flex-col gap-2 text-[13px] font-semibold">
          Description
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What brings them together" className={`${inputCls} font-normal`} />
        </label>
      </div>
      {error && (
        <p id="group-name-err" role="alert" className="-mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between text-[13px]">
        <b>Contacts</b>
        <span className="text-rez-graphite">{n} selected</span>
      </div>
      <SearchBox value={q} onChange={setQ} label="Search contacts" className="h-10" />
      <ul className="-mx-1 flex max-h-[280px] flex-col gap-2 overflow-y-auto px-1">
        {rows.map((c) => {
          const others = c.groupIds.filter((g) => g !== group?.id).length;
          return (
            <PickRow
              key={c.id}
              round
              checked={picked.includes(c.id)}
              onToggle={() => setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))}
              badge={nameInitials(displayName(c))}
              title={displayName(c)}
              sub={c.type + (c.subType ? ` · ${c.subType}` : "")}
              note={others ? `In ${others} other ${others === 1 ? "group" : "groups"}` : undefined}
            />
          );
        })}
      </ul>
    </DashDialog>
  );
}

export function GroupsPage() {
  const router = useRouter();
  const groups = useQuery(dq.groups());
  const contacts = useQuery(dq.contacts());
  const del = useDeleteGroup();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ group: GroupWithCount | null } | null>(null);
  const [deleting, setDeleting] = useState<GroupWithCount | null>(null);
  useLayoutEffect(
    () => () => {
      setDialog(null);
      setDeleting(null);
    },
    [],
  );
  const all = groups.data ?? [];
  const rows = all.filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase()));
  const grouped = (contacts.data ?? []).filter((c) => c.groupIds.length).length;
  const members = (gid: string) => (contacts.data ?? []).filter((c) => c.groupIds.includes(gid));

  return (
    <>
      <PageHeader
        crumbs={["Contact"]}
        title="Groups"
        subtitle={`${all.length} groups · ${grouped} contacts grouped`}
        actions={
          <HeaderButton variant="default" icon="plus" onClick={() => setDialog({ group: null })}>
            Create Group
          </HeaderButton>
        }
      />
      <Card className="p-4">
        <SearchBox value={search} onChange={setSearch} label="Search groups" className="w-full sm:w-[320px]" />
      </Card>
      {groups.isError ? (
        <ErrorState onRetry={() => groups.refetch()} />
      ) : groups.isPending ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="user-alt" title={all.length ? "No groups match this search." : "No groups yet."} className="bg-white">
          {all.length ? null : "Create one to message contacts together."}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[calc(860px*var(--property-space-scale,1))] text-sm">
              <caption className="sr-only">Contact groups</caption>
              <THead>
                <tr>
                  {["Actions", "Group", "Contacts", "Created", ""].map((h, i) => (
                    <th key={i} scope="col" className={thClass}>
                      {h || <span className="sr-only">Manage</span>}
                    </th>
                  ))}
                </tr>
              </THead>
              <tbody>
                {rows.map((g) => {
                  const mem = members(g.id);
                  return (
                    <tr key={g.id} className="border-t border-[#E8E8E8] first:border-t-0 hover:bg-[#FAFAFA]">
                      <td className={tdClass}>
                        <RowActions
                          label={`Actions for ${g.name}`}
                          items={[
                            { label: "View Contacts", icon: "user", onSelect: () => router.push(`/dashboard/contacts?group=${g.id}`) },
                            { label: "Manage Contacts", icon: "user-alt", onSelect: () => setDialog({ group: g }) },
                            { label: "WhatsApp Group", icon: "message", onSelect: () => notAvailable("WhatsApp broadcast") },
                            { label: "Delete Group", icon: "trash", tone: "danger", onSelect: () => setDeleting(g) },
                          ]}
                        />
                      </td>
                      <td className={tdClass}>
                        <Link href={`/dashboard/contacts?group=${g.id}`} className="group flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-[#F0EAE2] text-[11px] font-bold" aria-hidden>
                            {nameInitials(g.name)}
                          </span>
                          <span className="flex flex-col">
                            <b className="font-semibold group-hover:underline">{g.name}</b>
                            <span className="text-xs text-rez-graphite">{g.description || "No description"}</span>
                          </span>
                        </Link>
                      </td>
                      <td className={tdClass}>
                        <span className="flex items-center gap-2">
                          <span className="flex -space-x-1.5" aria-hidden>
                            {mem.slice(0, 4).map((c) => (
                              <Avatar key={c.id} name={displayName(c)} size={24} className="border-2 border-white text-[9px]" />
                            ))}
                          </span>
                          {g.count} {g.count === 1 ? "contact" : "contacts"}
                        </span>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>{shortDate(g.created)}</td>
                      <td className={`${tdClass} text-right`}>
                        <Button variant="secondary" size="sm" className="h-9 rounded-[8px] px-4 text-[11px] font-bold tracking-[0.06em] uppercase" onClick={() => setDialog({ group: g })}>
                          <Icon name="user-alt" size={14} /> Manage Contacts
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {dialog && <GroupDialog key={dialog.group?.id ?? "new"} group={dialog.group} onClose={() => setDialog(null)} />}
      <DashDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "group"}?`}
        description="The group is removed from this demo session. Its contacts are kept."
        footer={
          <>
            <Button variant="secondary" className={dialogBtn} onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="announce"
              className={dialogBtn}
              disabled={del.isPending}
              onClick={() =>
                deleting &&
                del.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success(`${deleting.name} deleted. Contacts are kept.`);
                    setDeleting(null);
                  },
                })
              }
            >
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}
