"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useLayoutEffect } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/brand/icon";
import { EmptyState, ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dq, useUpdateTeam, type Team, type TeamData, type TeamMember } from "./api";
import { DashDialog, PickRow, dialogBtn } from "./contact-dialogs";
import { inputCls } from "./form-bits";
import {
  Avatar,
  Card,
  DashSelect,
  FilterChips,
  HeaderButton,
  Loading,
  PageHeader,
  RowActions,
  SearchBox,
  TableFooter,
  THead,
  TrackToggle,
  longDate,
  nameInitials,
  notAvailable,
  tdClass,
  thClass,
} from "./ui";

const roleLabel = (r: TeamMember["role"]) => (r === "admin" ? "Admin · Owner" : r === "manager" ? "Manager" : "Agent");
const ROLE_FILTERS = [
  { value: "", label: "All Roles" },
  { value: "manager", label: "Managers" },
  { value: "agent", label: "Agents" },
  { value: "admin", label: "Admin" },
];

export function reportsTo(m: TeamMember, data: TeamData, shown?: Team) {
  if (m.reportsTo) return m.reportsTo;
  if (m.role === "admin") return null;
  const owner = data.members.find((x) => x.role === "admin")?.name ?? "Admin";
  if (m.role === "manager") return owner;
  return data.members.find((x) => x.id === shown?.managerId)?.name ?? owner;
}

type Dlg = { kind: "create" } | { kind: "add"; teamId: string } | { kind: "member-teams"; member: TeamMember } | { kind: "remove"; member: TeamMember } | { kind: "delete-team"; team: Team } | { kind: "full" } | null;

function SeatsFullDialog({ total, onClose }: { total: number; onClose: () => void }) {
  return (
    <DashDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`All ${total} licenses are in use.`}
      description="Buy more licenses or remove a member to free a seat."
      footer={
        <>
          <Button variant="secondary" className={dialogBtn} onClick={onClose}>
            Close
          </Button>
          <Button asChild className={dialogBtn}>
            <Link href="/realtor-corner#pricing">Buy Licenses</Link>
          </Button>
        </>
      }
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-[#F4F4F4]">
        <Icon name="lock" size={24} />
      </span>
    </DashDialog>
  );
}

function TeamDialog({ mode, teamId, data, onClose, onInvite }: { mode: "create" | "add"; teamId?: string; data: TeamData; onClose: () => void; onInvite: () => void }) {
  const update = useUpdateTeam();
  const team = data.teams.find((t) => t.id === teamId);
  const owner = data.members.find((m) => m.role === "admin");
  const leads = data.members.filter((m) => m.role !== "agent");
  const [name, setName] = useState("");
  const [manager, setManager] = useState(owner?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const tName = (id: string) => data.teams.find((t) => t.id === id)?.name;
  const rows = data.members
    .filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()))
    .map((m) => ({ m, inTeam: mode === "add" && !!teamId && m.teamIds.includes(teamId) }))
    .sort((a, b) => Number(b.inTeam) - Number(a.inTeam) || a.m.name.localeCompare(b.m.name));
  const n = picked.length;

  const confirm = () => {
    if (mode === "create") {
      if (!name.trim()) return setError("Give the team a name.");
      const id = `t${Date.now()}`;
      const members = [...new Set([...picked, manager])];
      update.mutate(
        { teams: [...data.teams, { id, name: name.trim(), managerId: manager, area: "Focus area not set" }], members: data.members.map((m) => (members.includes(m.id) ? { ...m, teamIds: [...m.teamIds, id] } : m)) },
        { onSuccess: () => (toast.success(`${name.trim()} created${n ? ` with ${n} members` : ""}.`, { description: "Saved in this demo session." }), onClose()) },
      );
    } else if (team) {
      if (!n) return onClose();
      update.mutate(
        { members: data.members.map((m) => (picked.includes(m.id) && !m.teamIds.includes(team.id) ? { ...m, teamIds: [...m.teamIds, team.id] } : m)) },
        { onSuccess: () => (toast.success(`${n} ${n === 1 ? "member" : "members"} added to ${team.name}.`), onClose()) },
      );
    }
  };

  return (
    <DashDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={mode === "create" ? "Create Team" : `Add Members · ${team?.name ?? ""}`}
      description={mode === "create" ? "Name the team, pick a manager (Admin or Manager) and add members." : "Tick members to add. They keep their other teams."}
      footer={
        <>
          <Button variant="secondary" className={dialogBtn} onClick={onClose}>
            Cancel
          </Button>
          <Button className={dialogBtn} onClick={confirm} disabled={update.isPending}>
            {mode === "create" ? (n ? `Create · ${n} Members` : "Create Team") : n ? `Add ${n} ${n === 1 ? "Member" : "Members"}` : "Add Members"}
          </Button>
        </>
      }
    >
      {mode === "create" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-[13px] font-semibold">
            Team Name *
            <input value={name} onChange={(e) => (setName(e.target.value), setError(""))} placeholder="e.g. Powai Rentals" aria-invalid={error ? true : undefined} className={cn(inputCls, "font-normal")} />
            {error && (
              <span role="alert" className="text-xs font-medium text-destructive">
                {error}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">
            Team Manager *
            <DashSelect value={manager} onChange={(e) => setManager(e.target.value)} className="font-normal">
              {leads.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role === "admin" ? "Admin" : "Manager"})
                </option>
              ))}
            </DashSelect>
          </label>
        </div>
      )}
      <div className="flex items-center justify-between text-[13px]">
        <b>Select Members</b>
        <span className="text-rez-graphite">{n ? `${n} selected` : "None selected"}</span>
      </div>
      <SearchBox value={q} onChange={setQ} label="Search agents and managers" className="h-10" />
      <ul className="-mx-1 flex max-h-[280px] flex-col gap-2 overflow-y-auto px-1">
        {rows.map(({ m, inTeam }) => {
          const others = m.teamIds.filter((x) => x !== teamId).map(tName).filter(Boolean);
          return (
            <PickRow
              key={m.id}
              round
              locked={inTeam}
              checked={inTeam || picked.includes(m.id)}
              onToggle={() => setPicked((p) => (p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id]))}
              badge={nameInitials(m.name)}
              title={m.name}
              sub={roleLabel(m.role)}
              note={inTeam ? "Already in team" : others.length ? `Also in ${others.join(", ")}` : "No team yet"}
            />
          );
        })}
      </ul>
      <button type="button" onClick={onInvite} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold underline underline-offset-4">
        <Icon name="plus" size={14} /> Add a new member to this team
      </button>
    </DashDialog>
  );
}

function MemberTeamsDialog({ member, data, onClose }: { member: TeamMember; data: TeamData; onClose: () => void }) {
  const update = useUpdateTeam();
  const [teams, setTeams] = useState(member.teamIds);
  const [warn, setWarn] = useState("");
  return (
    <DashDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Teams · ${member.name}`}
      description="A member can belong to more than one team."
      footer={
        <>
          <Button variant="secondary" className={dialogBtn} onClick={onClose}>
            Cancel
          </Button>
          <Button
            className={dialogBtn}
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { members: data.members.map((m) => (m.id === member.id ? { ...m, teamIds: teams } : m)) },
                { onSuccess: () => (toast.success(`${member.name} is in ${teams.length} ${teams.length === 1 ? "team" : "teams"}.`), onClose()) },
              )
            }
          >
            Save Teams
          </Button>
        </>
      }
    >
      <ul className="flex flex-col gap-2">
        {data.teams.map((t) => {
          const on = teams.includes(t.id);
          const count = data.members.filter((m) => m.teamIds.includes(t.id)).length;
          const mgr = data.members.find((m) => m.id === t.managerId)?.name ?? "—";
          return (
            <PickRow
              key={t.id}
              checked={on}
              onToggle={() => {
                if (on && t.managerId === member.id) return setWarn(`${member.name} manages ${t.name}. Assign a new manager first.`);
                setWarn("");
                setTeams((x) => (on ? x.filter((y) => y !== t.id) : [...x, t.id]));
              }}
              badge={nameInitials(t.name)}
              title={t.name}
              sub={`Manager · ${mgr}`}
              note={`${count} members`}
            />
          );
        })}
      </ul>
      {warn && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {warn}
        </p>
      )}
    </DashDialog>
  );
}

export function TeamsPage() {
  const router = useRouter();
  const q = useQuery(dq.team());
  const update = useUpdateTeam();
  const [view, setView] = useState<"members" | "teams">("members");
  const [teamFilter, setTeamFilter] = useState("");
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [sel, setSel] = useState<string[]>([]);
  const [dlg, setDlg] = useState<Dlg>(null);
  // Close transient dialogs when the page is hidden by a navigation (Cache Components keeps page state).
  useLayoutEffect(() => () => setDlg(null), []);

  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (q.isPending) return <Loading />;
  const data = q.data;
  const { members, teams, seatsTotal, renewsOn } = data;
  const used = members.length;
  const left = Math.max(0, seatsTotal - used);
  const needle = search.trim().toLowerCase();
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const list = members
    .filter((m) => (!teamFilter || m.teamIds.includes(teamFilter)) && (!role || m.role === role) && (!needle || m.name.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name) * sortDir);
  const teamRows = teams.filter((t) => !needle || t.name.toLowerCase().includes(needle) || (members.find((m) => m.id === t.managerId)?.name ?? "").toLowerCase().includes(needle));
  const counts = { admin: members.filter((m) => m.role === "admin").length, manager: members.filter((m) => m.role === "manager").length, agent: members.filter((m) => m.role === "agent").length };
  const allOn = list.length > 0 && list.every((m) => sel.includes(m.id));
  const manages = (m: TeamMember) => teams.filter((t) => t.managerId === m.id);
  const startAdd = () => (left === 0 ? setDlg({ kind: "full" }) : router.push(`/dashboard/teams/new${teamFilter ? `?team=${teamFilter}` : ""}`));

  const chips = [
    teamFilter && { label: teamById.get(teamFilter)?.name ?? teamFilter, onRemove: () => setTeamFilter("") },
    role && { label: ROLE_FILTERS.find((r) => r.value === role)!.label, onRemove: () => setRole("") },
    needle && { label: `“${search.trim()}”`, onRemove: () => setSearch("") },
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  const setMembers = (next: TeamMember[], msg: string) => update.mutate({ members: next }, { onSuccess: () => toast.success(msg, { description: "Saved in this demo session." }) });

  const bulk = (value: string) => {
    if (!value) return;
    const id = value.slice(1);
    const add = value[0] === "+";
    const t = teamById.get(id);
    if (!t) return;
    const ids = add ? sel : sel.filter((x) => x !== t.managerId);
    setMembers(
      members.map((m) => (ids.includes(m.id) ? { ...m, teamIds: add ? (m.teamIds.includes(id) ? m.teamIds : [...m.teamIds, id]) : m.teamIds.filter((x) => x !== id) } : m)),
      `${ids.length} ${ids.length === 1 ? "member" : "members"} ${add ? "added to" : "removed from"} ${t.name}.${!add && ids.length < sel.length ? " The team manager stays." : ""}`,
    );
    setSel([]);
  };

  return (
    <>
      <PageHeader
        crumbs={["Admin"]}
        title="Manage Teams"
        actions={
          <>
            <HeaderButton icon="plus" onClick={() => setDlg({ kind: "create" })}>
              Create Team
            </HeaderButton>
            <HeaderButton variant="default" icon="plus" onClick={startAdd}>
              Add Member
            </HeaderButton>
          </>
        }
      />

      <section aria-label="Licenses" className="flex flex-col gap-x-8 gap-y-4 rounded-[16px] bg-black sm:flex-row sm:items-center px-6 py-5 text-rez-full-white">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-xs font-bold tracking-[0.12em] uppercase">Licenses</span>
            <span className="text-2xl font-semibold">
              {used} of {seatsTotal} in use.
            </span>
            <span className="text-[13px] text-rez-mocaccino">{left === 0 ? "No licenses left" : `${left} ${left === 1 ? "license" : "licenses"} available`}</span>
          </p>
          <div role="img" aria-label={`${used} of ${seatsTotal} licenses in use`} className="flex gap-1">
            {Array.from({ length: seatsTotal }, (_, i) => (
              <span key={i} className={cn("h-2 flex-1 rounded-full border", i < used ? "border-rez-full-white bg-rez-full-white" : "border-rez-mocaccino")} />
            ))}
          </div>
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            <span>{counts.admin} Admin</span>
            <span>{counts.manager} Managers</span>
            <span>{counts.agent} Agents</span>
            <span>Renews {longDate(renewsOn)}</span>
          </p>
        </div>
        <Button asChild variant="warm" className="h-10 w-fit px-5 text-[max(12px,calc(15px*var(--property-type-scale,1)))]">
          <Link href="/realtor-corner#pricing">Buy Licenses</Link>
        </Button>
      </section>

      <Card className="flex flex-wrap items-center gap-2.5 p-4">
        {view === "members" && (
          <>
            <DashSelect aria-label="Team" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} wrapperClassName="w-full sm:w-[220px]">
              <option value="">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </DashSelect>
            <DashSelect aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} wrapperClassName="w-full sm:w-[160px]">
              {ROLE_FILTERS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </DashSelect>
          </>
        )}
        <SearchBox value={search} onChange={setSearch} label={view === "members" ? "Search members" : "Search teams"} className="w-full sm:w-[240px]" />
        <TrackToggle
          label="View"
          value={view}
          onChange={(v) => (setView(v), setSearch(""), setSel([]))}
          options={[
            { value: "members", label: "Members" },
            { value: "teams", label: "Teams" },
          ]}
          className="sm:ml-auto"
        />
      </Card>
      {view === "members" && <FilterChips chips={chips} onClear={() => (setTeamFilter(""), setRole(""), setSearch(""))} />}

      {view === "members" && sel.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] bg-rez-cream-warm px-4 py-3 text-sm" aria-live="polite">
          <b>
            {sel.length} {sel.length === 1 ? "member" : "members"} selected
          </b>
          <DashSelect aria-label="Team actions for selected members" value="" onChange={(e) => bulk(e.target.value)} wrapperClassName="w-full sm:w-[260px]" className="h-9">
            <option value="">Team Actions</option>
            {teams.map((t) => (
              <option key={`+${t.id}`} value={`+${t.id}`}>
                Add to {t.name}
              </option>
            ))}
            {teams.map((t) => (
              <option key={`-${t.id}`} value={`-${t.id}`}>
                Remove from {t.name}
              </option>
            ))}
          </DashSelect>
          <button type="button" onClick={() => setSel([])} className="text-xs font-semibold underline underline-offset-4">
            Clear
          </button>
        </div>
      )}

      {view === "members" ? (
        list.length === 0 ? (
          <EmptyState icon="user-alt" title="No members match these filters." className="bg-white" />
        ) : (
          <Card className="overflow-hidden">
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[calc(960px*var(--property-space-scale,1))] text-sm">
                <caption className="sr-only">Team members</caption>
                <THead>
                  <tr>
                    <th scope="col" className={cn(thClass, "w-12")}>
                      <input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? [] : list.map((m) => m.id))} aria-label="Select all members shown" className="size-4 accent-black" />
                    </th>
                    <th scope="col" className={thClass}>
                      Actions
                    </th>
                    <th scope="col" className={thClass} aria-sort={sortDir === 1 ? "ascending" : "descending"}>
                      <button type="button" onClick={() => setSortDir(sortDir === 1 ? -1 : 1)} className="inline-flex items-center gap-1 uppercase">
                        Member <Icon name="chevron-left" size={14} className={sortDir === 1 ? "-rotate-90" : "rotate-90"} aria-hidden />
                        <span className="sr-only">, sort {sortDir === 1 ? "Z to A" : "A to Z"}</span>
                      </button>
                    </th>
                    {["Team", "Contact", "Active Areas"].map((h) => (
                      <th key={h} scope="col" className={thClass}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </THead>
                <tbody>
                  {list.map((m) => {
                    const ts = m.teamIds.map((id) => teamById.get(id)).filter(Boolean) as Team[];
                    const shown = (teamFilter && ts.find((t) => t.id === teamFilter)) || ts[0];
                    const lead = manages(m);
                    const rep = reportsTo(m, data, shown);
                    const on = sel.includes(m.id);
                    const isAdmin = m.role === "admin";
                    return (
                      <tr key={m.id} className={cn("border-t border-[#E8E8E8] first:border-t-0", on ? "bg-rez-cream-warm" : "hover:bg-[#FAFAFA]")}>
                        <td className={tdClass}>
                          <input type="checkbox" checked={on} onChange={() => setSel((s) => (on ? s.filter((x) => x !== m.id) : [...s, m.id]))} aria-label={`Select ${m.name}`} className="size-4 accent-black" />
                        </td>
                        <td className={tdClass}>
                          <RowActions
                            label={`Actions for ${m.name}`}
                            items={[
                              { label: isAdmin ? "Edit My Profile" : "Edit Profile", icon: "pencil", onSelect: () => (isAdmin ? router.push("/dashboard/profile") : notAvailable("Editing another member’s profile")) },
                              { label: "Manage Teams", icon: "user-alt", onSelect: () => setDlg({ kind: "member-teams", member: m }) },
                              ...(isAdmin
                                ? []
                                : [
                                    {
                                      label: m.role === "agent" ? "Make Manager" : "Make Agent",
                                      icon: "badge-star" as const,
                                      onSelect: () => {
                                        if (m.role === "manager" && lead.length) return toast.error(`${m.name} manages ${lead.map((t) => t.name).join(", ")}. Assign a new manager first.`);
                                        setMembers(
                                          members.map((x) => (x.id === m.id ? { ...x, role: m.role === "agent" ? ("manager" as const) : ("agent" as const) } : x)),
                                          `${m.name} is now ${m.role === "agent" ? "a Manager" : "an Agent"}.`,
                                        );
                                      },
                                    },
                                    {
                                      label: "Remove User",
                                      icon: "trash" as const,
                                      tone: "danger" as const,
                                      onSelect: () => (lead.length ? toast.error(`${m.name} manages ${lead.map((t) => t.name).join(", ")}. Assign a new manager first.`) : setDlg({ kind: "remove", member: m })),
                                    },
                                  ]),
                            ]}
                          />
                        </td>
                        <td className={tdClass}>
                          <span className="flex items-center gap-3">
                            <Avatar name={m.name} />
                            <span className="flex flex-col">
                              <b className="font-semibold">{m.name}</b>
                              <span className="text-xs text-rez-graphite">
                                {roleLabel(m.role)}
                                {lead.length ? ` · leads ${lead.length} ${lead.length === 1 ? "team" : "teams"}` : ""}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className={tdClass}>
                          <span className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-2">
                              {shown?.name ?? "No Team"}
                              {ts.length > 1 && (
                                <button type="button" onClick={() => setDlg({ kind: "member-teams", member: m })} aria-label={`${m.name} is in ${ts.length} teams. Manage teams`} className="rounded-[6px] bg-[#F0EAE2] px-1.5 py-0.5 text-[10px] font-bold">
                                  +{ts.length - 1}
                                </button>
                              )}
                            </span>
                            <span className="text-xs text-rez-graphite">{rep ? `Reports to ${rep}` : "Firm owner"}</span>
                          </span>
                        </td>
                        <td className={cn(tdClass, "whitespace-nowrap")}>{m.phone || "-"}</td>
                        <td className={tdClass}>
                          <span className="flex flex-col">
                            {m.areas}
                            <span className="text-xs text-rez-graphite">Mumbai</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TableFooter showing={`Showing ${list.length} of ${members.length} members · Page 1 of 1`} />
          </Card>
        )
      ) : teamRows.length === 0 ? (
        <EmptyState icon="user-alt" title="No teams match this search." className="bg-white" />
      ) : (
        <Card className="overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[calc(900px*var(--property-space-scale,1))] text-sm">
              <caption className="sr-only">Teams</caption>
              <THead>
                <tr>
                  {["Actions", "Team", "Manager", "Members", "Breakdown", ""].map((h, i) => (
                    <th key={i} scope="col" className={thClass}>
                      {h || <span className="sr-only">Add members</span>}
                    </th>
                  ))}
                </tr>
              </THead>
              <tbody>
                {teamRows.map((t) => {
                  const mem = members.filter((m) => m.teamIds.includes(t.id));
                  const mgr = members.find((m) => m.id === t.managerId);
                  const leadsN = mem.filter((m) => m.role !== "agent").length;
                  const viewMembers = () => (setView("members"), setTeamFilter(t.id), setSearch(""));
                  return (
                    <tr key={t.id} className="border-t border-[#E8E8E8] first:border-t-0 hover:bg-[#FAFAFA]">
                      <td className={tdClass}>
                        <RowActions
                          label={`Actions for ${t.name}`}
                          items={[
                            { label: "Add Members", icon: "plus", onSelect: () => setDlg({ kind: "add", teamId: t.id }) },
                            { label: "View Members", icon: "user-alt", onSelect: viewMembers },
                            { label: "Delete Team", icon: "trash", tone: "danger", onSelect: () => setDlg({ kind: "delete-team", team: t }) },
                          ]}
                        />
                      </td>
                      <td className={tdClass}>
                        <button type="button" onClick={viewMembers} className="flex flex-col text-left hover:underline">
                          <b className="font-semibold">{t.name}</b>
                          <span className="text-xs text-rez-graphite">{t.area}</span>
                        </button>
                      </td>
                      <td className={tdClass}>
                        <span className="flex flex-col">
                          {mgr?.name ?? "—"}
                          <span className="text-xs text-rez-graphite">{mgr?.role === "admin" ? "Admin" : "Manager"}</span>
                        </span>
                      </td>
                      <td className={tdClass}>
                        <span className="flex items-center gap-2">
                          <span className="flex -space-x-1.5" aria-hidden>
                            {mem.slice(0, 4).map((m) => (
                              <Avatar key={m.id} name={m.name} size={24} className="border-2 border-white text-[9px]" />
                            ))}
                          </span>
                          {mem.length} {mem.length === 1 ? "member" : "members"}
                        </span>
                      </td>
                      <td className={cn(tdClass, "text-rez-graphite")}>
                        {leadsN} {leadsN === 1 ? "lead" : "leads"} · {mem.length - leadsN} agents
                      </td>
                      <td className={cn(tdClass, "text-right")}>
                        <Button variant="secondary" size="sm" className="h-9 rounded-[8px] px-4 text-[11px] font-bold tracking-[0.06em] uppercase" onClick={() => setDlg({ kind: "add", teamId: t.id })}>
                          <Icon name="plus" size={14} /> Add Members
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TableFooter showing={`${teams.length} teams · teams do not use licenses`} />
        </Card>
      )}

      {dlg?.kind === "full" && <SeatsFullDialog total={seatsTotal} onClose={() => setDlg(null)} />}
      {(dlg?.kind === "create" || dlg?.kind === "add") && (
        <TeamDialog
          mode={dlg.kind}
          teamId={dlg.kind === "add" ? dlg.teamId : undefined}
          data={data}
          onClose={() => setDlg(null)}
          onInvite={() => {
            const tid = dlg.kind === "add" ? dlg.teamId : "";
            setDlg(null);
            if (left === 0) setDlg({ kind: "full" });
            else router.push(`/dashboard/teams/new${tid ? `?team=${tid}` : ""}`);
          }}
        />
      )}
      {dlg?.kind === "member-teams" && <MemberTeamsDialog member={dlg.member} data={data} onClose={() => setDlg(null)} />}
      {dlg?.kind === "remove" && (
        <DashDialog
          open
          onOpenChange={(o) => !o && setDlg(null)}
          title={`Remove ${dlg.member.name}?`}
          description="They lose access to the firm’s dashboard and one license is freed. This only changes the demo session."
          footer={
            <>
              <Button variant="secondary" className={dialogBtn} onClick={() => setDlg(null)}>
                Cancel
              </Button>
              <Button
                variant="announce"
                className={dialogBtn}
                onClick={() => {
                  setMembers(members.filter((x) => x.id !== dlg.member.id), `${dlg.member.name} removed. 1 license freed.`);
                  setSel((s) => s.filter((x) => x !== dlg.member.id));
                  setDlg(null);
                }}
              >
                Remove
              </Button>
            </>
          }
        />
      )}
      {dlg?.kind === "delete-team" && (
        <DashDialog
          open
          onOpenChange={(o) => !o && setDlg(null)}
          title={`Delete ${dlg.team.name}?`}
          description="Members stay on the account; they’re only removed from this team."
          footer={
            <>
              <Button variant="secondary" className={dialogBtn} onClick={() => setDlg(null)}>
                Cancel
              </Button>
              <Button
                variant="announce"
                className={dialogBtn}
                onClick={() => {
                  const id = dlg.team.id;
                  update.mutate(
                    { teams: teams.filter((x) => x.id !== id), members: members.map((m) => ({ ...m, teamIds: m.teamIds.filter((x) => x !== id) })) },
                    { onSuccess: () => toast.success(`${dlg.team.name} deleted. Members stay on the account.`) },
                  );
                  if (teamFilter === id) setTeamFilter("");
                  setDlg(null);
                }}
              >
                Delete
              </Button>
            </>
          }
        />
      )}
    </>
  );
}
