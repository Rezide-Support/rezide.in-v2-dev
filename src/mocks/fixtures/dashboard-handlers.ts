import type MockAdapter from "axios-mock-adapter";
import type { AxiosRequestConfig } from "axios";
import {
  ASSOCIATE_PROJECTS,
  ASSOCIATE_UNITS,
  CONTACTS,
  CREDITS,
  FIRM_PROFILE,
  GROUPS,
  LICENCE_RENEWAL,
  MEMBERS,
  MY_PROFILE,
  SEATS_TOTAL,
  STATEMENT_DATE,
  TEAMS,
  UPLOADS,
  UPLOAD_RECORDS,
} from "./dashboard";
import type {
  Contact,
  ContactGroup,
  ContactInput,
  ContactPatch,
  CreditsData,
  FirmProfile,
  GroupInput,
  GroupWithCount,
  MyProfile,
  TeamData,
  TeamMember,
  TeamPatch,
} from "@/types/dashboard";

/**
 * Mock realtor-dashboard API. Every write lives in this in-memory store and is
 * lost on reload; nothing is sent anywhere.
 */
type Reply = [number, unknown?];

const body = <T>(config: AxiosRequestConfig): T => {
  if (typeof config.data === "string") {
    try {
      return JSON.parse(config.data) as T;
    } catch {
      return {} as T;
    }
  }
  return (config.data ?? {}) as T;
};
const segments = (config: AxiosRequestConfig) => (config.url ?? "").split("?")[0].split("/").filter(Boolean).map(decodeURIComponent);
const lastId = (config: AxiosRequestConfig) => segments(config).pop() ?? "";
const digits = (p: unknown) => String(p ?? "").replace(/\D/g, "").slice(-10);
const validPhone = (p: unknown) => /^[6-9]\d{9}$/.test(digits(p));
const notFound = (what: string): Reply => [404, { message: `${what} not found.`, code: "not_found" }];
/** 422 in the shared error format; `field` names the offending body field. */
const invalid = (message: string, field?: string): Reply => [
  422,
  { message, code: "validation", ...(field ? { fieldErrors: { [field]: message } } : {}) },
];
const today = () => new Date().toISOString().slice(0, 10);
let seq = 5000;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const dashboardStore = {
  contacts: clone(CONTACTS),
  groups: clone(GROUPS),
  members: clone(MEMBERS),
  teams: clone(TEAMS),
  firm: clone(FIRM_PROFILE),
  me: clone(MY_PROFILE),
};

/** Resets the store (used by tests). */
export function resetDashboardStore() {
  dashboardStore.contacts = clone(CONTACTS);
  dashboardStore.groups = clone(GROUPS);
  dashboardStore.members = clone(MEMBERS);
  dashboardStore.teams = clone(TEAMS);
  dashboardStore.firm = clone(FIRM_PROFILE);
  dashboardStore.me = clone(MY_PROFILE);
}

function validateContact(c: Partial<Contact>): Reply | null {
  if (!c.firstName?.trim()) return invalid("Add a first name.", "firstName");
  if (!validPhone(c.mobile)) return invalid("Enter a valid 10-digit Indian mobile number.", "mobile");
  const needsCompany = c.type === "Developer" || c.entity === "Company";
  if (needsCompany && !c.company?.trim()) return invalid("Add the company name.", "company");
  if (c.labels && c.labels.length > 4) return invalid("A contact can have up to 4 labels.", "labels");
  return null;
}

const groupsWithCounts = (): GroupWithCount[] =>
  dashboardStore.groups.map((g) => ({ ...g, count: dashboardStore.contacts.filter((c) => c.groupIds.includes(g.id)).length }));

export function registerDashboardHandlers(mock: MockAdapter) {
  const s = dashboardStore;

  /* Contacts */
  mock.onGet(/\/dashboard\/contacts\/[^/?]+$/).reply((config): Reply => {
    const contact = s.contacts.find((c) => c.id === lastId(config));
    return contact ? [200, contact] : notFound("Contact");
  });
  mock.onGet(/\/dashboard\/contacts$/).reply((): Reply => [200, s.contacts]);
  mock.onPost(/\/dashboard\/contacts$/).reply((config): Reply => {
    const input = body<ContactInput>(config);
    const error = validateContact(input);
    if (error) return error;
    const contact: Contact = {
      type: "Customer",
      subType: "",
      entity: "Individual",
      salutation: "Mr.",
      lastName: "",
      firmLevel: false,
      labels: [],
      groupIds: [],
      details: {},
      relatives: [],
      properties: [],
      leads: [],
      ...input,
      firstName: input.firstName!.trim(),
      mobile: String(input.mobile),
      id: nextId("c"),
      addedOn: today(),
      addedBy: "Viraj Bhatia",
    } as Contact;
    s.contacts = [contact, ...s.contacts];
    return [201, contact];
  });
  mock.onPatch(/\/dashboard\/contacts\/[^/?]+$/).reply((config): Reply => {
    const id = lastId(config);
    const current = s.contacts.find((c) => c.id === id);
    if (!current) return notFound("Contact");
    const next = { ...current, ...body<ContactPatch>(config), id, addedOn: current.addedOn, addedBy: current.addedBy };
    const error = validateContact(next);
    if (error) return error;
    s.contacts = s.contacts.map((c) => (c.id === id ? next : c));
    return [200, next];
  });
  mock.onDelete(/\/dashboard\/contacts\/[^/?]+$/).reply((config): Reply => {
    const id = lastId(config);
    if (!s.contacts.some((c) => c.id === id)) return notFound("Contact");
    s.contacts = s.contacts.filter((c) => c.id !== id);
    return [204];
  });

  /* Groups */
  mock.onGet(/\/dashboard\/groups$/).reply((): Reply => [200, groupsWithCounts()]);
  const applyMembers = (groupId: string, contactIds: string[] | undefined) => {
    if (!contactIds) return;
    s.contacts = s.contacts.map((c) => {
      const others = c.groupIds.filter((g) => g !== groupId);
      return { ...c, groupIds: contactIds.includes(c.id) ? [...others, groupId] : others };
    });
  };
  mock.onPost(/\/dashboard\/groups$/).reply((config): Reply => {
    const input = body<GroupInput>(config);
    if (!input.name?.trim()) return invalid("Give the group a name.", "name");
    const group: ContactGroup = { id: nextId("g"), name: input.name.trim(), description: input.description?.trim() ?? "", created: today() };
    s.groups = [...s.groups, group];
    applyMembers(group.id, input.contactIds ?? []);
    return [201, group];
  });
  mock.onPatch(/\/dashboard\/groups\/[^/?]+$/).reply((config): Reply => {
    const id = lastId(config);
    const current = s.groups.find((g) => g.id === id);
    if (!current) return notFound("Group");
    const input = body<GroupInput>(config);
    if (input.name !== undefined && !input.name.trim()) return invalid("Give the group a name.", "name");
    const next = { ...current, name: input.name?.trim() ?? current.name, description: input.description?.trim() ?? current.description };
    s.groups = s.groups.map((g) => (g.id === id ? next : g));
    applyMembers(id, input.contactIds);
    return [200, next];
  });
  mock.onDelete(/\/dashboard\/groups\/[^/?]+$/).reply((config): Reply => {
    const id = lastId(config);
    if (!s.groups.some((g) => g.id === id)) return notFound("Group");
    s.groups = s.groups.filter((g) => g.id !== id);
    s.contacts = s.contacts.map((c) => ({ ...c, groupIds: c.groupIds.filter((g) => g !== id) }));
    return [204];
  });

  /* Database uploads */
  const recordsFor = (count: number) =>
    UPLOAD_RECORDS.slice(0, Math.min(count, UPLOAD_RECORDS.length)).map((r) => {
      const match = s.contacts.find((c) => digits(c.mobile) === digits(r.mobile));
      return { ...r, contactId: match?.id, contactType: match?.type };
    });
  mock.onGet(/\/dashboard\/uploads\/[^/?]+$/).reply((config): Reply => {
    const file = UPLOADS.find((f) => f.id === lastId(config));
    return file ? [200, { file, records: recordsFor(file.records) }] : notFound("Upload");
  });
  mock.onGet(/\/dashboard\/uploads$/).reply((): Reply => [200, UPLOADS]);

  /* Credits */
  mock.onGet(/\/dashboard\/credits$/).reply((): Reply => [
    200,
    { balance: CREDITS[0].balance, monthlyGrant: 0, renewsOn: LICENCE_RENEWAL, statementDate: STATEMENT_DATE, entries: CREDITS } satisfies CreditsData,
  ]);

  /* Team */
  const team = (): TeamData => ({ members: s.members, teams: s.teams, seatsTotal: SEATS_TOTAL, renewsOn: LICENCE_RENEWAL });
  mock.onGet(/\/dashboard\/team$/).reply((): Reply => [200, team()]);
  mock.onPatch(/\/dashboard\/team$/).reply((config): Reply => {
    const input = body<TeamPatch>(config);
    if (input.members && input.members.length > SEATS_TOTAL) return [409, { message: `All ${SEATS_TOTAL} licences are in use.`, code: "seats_full" }];
    if (input.members) s.members = input.members;
    if (input.teams) s.teams = input.teams;
    return [200, team()];
  });
  mock.onPost(/\/dashboard\/team\/members$/).reply((config): Reply => {
    if (s.members.length >= SEATS_TOTAL) return [409, { message: `All ${SEATS_TOTAL} licences are in use.`, code: "seats_full" }];
    const input = body<Partial<TeamMember>>(config);
    if (!input.name?.trim()) return invalid("Add the member's name.", "name");
    const member: TeamMember = {
      id: nextId("m"),
      name: input.name.trim(),
      role: input.role === "manager" ? "manager" : "agent",
      teamIds: input.teamIds ?? [],
      areas: input.areas || "Not set",
      email: input.email ?? "",
      phone: input.phone ?? "-",
      reportsTo: input.reportsTo,
    };
    s.members = [...s.members, member];
    return [201, member];
  });

  /* Profiles */
  mock.onGet(/\/dashboard\/firm$/).reply((): Reply => [200, s.firm]);
  mock.onPut(/\/dashboard\/firm$/).reply((config): Reply => {
    const input = body<Partial<FirmProfile>>(config);
    if (input.name !== undefined && !input.name.trim()) return invalid("Add the firm name.", "name");
    s.firm = { ...s.firm, ...input };
    return [200, s.firm];
  });
  mock.onGet(/\/dashboard\/me$/).reply((): Reply => [200, s.me]);
  mock.onPut(/\/dashboard\/me$/).reply((config): Reply => {
    const input = body<Partial<MyProfile>>(config);
    if (input.firstName !== undefined && !input.firstName.trim()) return invalid("Add your first name.", "firstName");
    if (input.mobile !== undefined && !validPhone(input.mobile)) return invalid("Enter a valid 10-digit Indian mobile number.", "mobile");
    s.me = { ...s.me, ...input };
    return [200, s.me];
  });

  /* Associate Property: Rezide projects and their units */
  mock.onGet(/\/dashboard\/associable-projects\/[^/?]+\/units$/).reply((config): Reply => {
    const projectId = segments(config).at(-2) ?? "";
    const project = ASSOCIATE_PROJECTS.find((p) => p.id === projectId);
    if (!project) return notFound("Project");
    const tower = String((config.params as { tower?: string } | undefined)?.tower ?? "");
    if (!project.towers.includes(tower)) return invalid("Choose a building or tower of this project.", "tower");
    return [200, ASSOCIATE_UNITS];
  });
  mock.onGet(/\/dashboard\/associable-projects$/).reply((config): Reply => {
    const p = (config.params ?? {}) as { propertyType?: string; unitType?: string; q?: string };
    const q = (p.q ?? "").trim().toLowerCase();
    return [
      200,
      ASSOCIATE_PROJECTS.filter(
        (x) =>
          (!p.propertyType || x.propertyType === p.propertyType) &&
          (!p.unitType || x.unitTypes.includes(p.unitType)) &&
          `${x.name} ${x.locality} ${x.developer}`.toLowerCase().includes(q),
      ),
    ];
  });
}
