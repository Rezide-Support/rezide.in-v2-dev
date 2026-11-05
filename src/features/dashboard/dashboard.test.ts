import { beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { CONTACTS, CREDITS, MEMBERS, SEATS_TOTAL, TEAMS } from "@/mocks/fixtures/dashboard";
import type { Contact, TeamMember } from "@/types/dashboard";
import { resetDashboardStore } from "@/mocks/fixtures/dashboard-handlers";
import { displayName, filterContacts, subLine, toCsv, type ContactFilters } from "./contact-model";
import { statementRows } from "./credits";
import { reportsTo } from "./teams";

const NONE: ContactFilters = { type: "", group: "", label: "", q: "", sort: 1 };

describe("contact display", () => {
  it("lists company brokers under the company with the contact person beneath", () => {
    const c4 = CONTACTS.find((c) => c.id === "c4")!;
    expect(displayName(c4)).toBe("Kanaiyalal H. Desai & Co");
    expect(subLine(c4)).toBe("Contact · Aakash D. Desai");
  });
  it("shows a developer's company and an individual's organisation", () => {
    expect(subLine(CONTACTS.find((c) => c.id === "c8")!)).toBe("Oberoi Realty Ltd");
    expect(subLine(CONTACTS.find((c) => c.id === "c3")!)).toBe("Individual");
  });
});

describe("filterContacts", () => {
  it("ANDs type, group and label filters", () => {
    expect(filterContacts(CONTACTS, { ...NONE, type: "Broker" }).map((c) => c.id).sort()).toEqual(["c10", "c4", "c5"]);
    expect(filterContacts(CONTACTS, { ...NONE, type: "Broker", label: "Oshiwara" }).map((c) => c.id)).toEqual(["c5"]);
    expect(filterContacts(CONTACTS, { ...NONE, group: "g1" }).map((c) => c.id)).toEqual(["c1", "c2"]);
  });
  it("searches name, mobile digits (ignoring spaces) and email", () => {
    expect(filterContacts(CONTACTS, { ...NONE, q: "9820087" }).map((c) => c.id)).toEqual(["c3"]);
    expect(filterContacts(CONTACTS, { ...NONE, q: "urban space" }).map((c) => c.id)).toEqual(["c5"]);
    expect(filterContacts(CONTACTS, { ...NONE, q: "bansalhomes" }).map((c) => c.id)).toEqual(["c10"]);
    expect(filterContacts(CONTACTS, { ...NONE, q: "zzz" })).toEqual([]);
  });
  it("sorts by display name in either direction", () => {
    const asc = filterContacts(CONTACTS, NONE).map(displayName);
    expect(asc[0]).toBe("A. S. Rana");
    expect(filterContacts(CONTACTS, { ...NONE, sort: -1 }).map(displayName)).toEqual([...asc].reverse());
  });
});

describe("toCsv", () => {
  it("quotes cells, names groups and escapes quotes", () => {
    const c: Contact = { ...CONTACTS[0], firstName: 'Sam "SJ"', lastName: "Joshi", labels: ["A", "B"], groupIds: ["g1"] };
    const csv = toCsv([c], (id) => (id === "g1" ? "NARVIGATE Delegates" : id));
    const [head, row] = csv.split("\r\n");
    expect(head).toContain('"Name","Contact person","Type"');
    expect(row).toContain('"Sam ""SJ"" Joshi"');
    expect(row).toContain('"A; B"');
    expect(row).toContain('"NARVIGATE Delegates"');
    expect(row).toContain('"+91 91041 03391"');
  });
});

describe("credit statement", () => {
  it("includes entries within the period, inclusive", () => {
    expect(statementRows(CREDITS, "2026-09-14", "2026-10-14")).toHaveLength(5);
    expect(statementRows(CREDITS, "2026-04-14", "2026-10-14")).toHaveLength(10);
    expect(statementRows(CREDITS, "2027-01-01", "2027-02-01")).toHaveLength(0);
  });
});

describe("reportsTo", () => {
  it("derives the reporting line from role and team manager", () => {
    const data = { members: MEMBERS, teams: TEAMS, seatsTotal: SEATS_TOTAL, renewsOn: "2027-01-14" };
    const by = (n: string) => MEMBERS.find((m) => m.name === n)!;
    expect(reportsTo(by("Viraj Bhatia"), data)).toBeNull();
    expect(reportsTo(by("Priya Nair"), data)).toBe("Viraj Bhatia");
    expect(reportsTo(by("Aakash Shah"), data, TEAMS[0])).toBe("Priya Nair");
  });
});

describe("dashboard mock API", () => {
  beforeEach(() => resetDashboardStore());

  it("validates new contacts, including the company name for company contacts", async () => {
    await expect(api.post("/dashboard/contacts", { firstName: "", mobile: "9876543210" })).rejects.toMatchObject({ status: 422 });
    await expect(api.post("/dashboard/contacts", { firstName: "A", mobile: "12345" })).rejects.toMatchObject({ status: 422 });
    await expect(api.post("/dashboard/contacts", { firstName: "A", mobile: "9876543210", type: "Broker", entity: "Company" })).rejects.toMatchObject({ status: 422 });
    const { data } = await api.post<Contact>("/dashboard/contacts", { firstName: "Riya", mobile: "98765 43210" });
    expect(data.id).toBeTruthy();
    expect((await api.get<Contact[]>("/dashboard/contacts")).data[0].firstName).toBe("Riya");
  });

  it("caps labels at four and persists edits", async () => {
    await expect(api.patch("/dashboard/contacts/c1", { labels: ["a", "b", "c", "d", "e"] })).rejects.toMatchObject({ status: 422 });
    await api.patch("/dashboard/contacts/c1", { labels: ["VIP"] });
    expect((await api.get<Contact>("/dashboard/contacts/c1")).data.labels).toEqual(["VIP"]);
  });

  it("creates groups with members and strips them on delete", async () => {
    const { data: g } = await api.post<{ id: string }>("/dashboard/groups", { name: "Powai", contactIds: ["c3", "c6"] });
    let groups = (await api.get<{ id: string; count: number }[]>("/dashboard/groups")).data;
    expect(groups.find((x) => x.id === g.id)?.count).toBe(2);
    await api.delete(`/dashboard/groups/${g.id}`);
    groups = (await api.get<{ id: string; count: number }[]>("/dashboard/groups")).data;
    expect(groups.some((x) => x.id === g.id)).toBe(false);
    expect((await api.get<Contact>("/dashboard/contacts/c3")).data.groupIds).not.toContain(g.id);
  });

  it("matches upload records to contacts by mobile number", async () => {
    const before = (await api.get<{ records: { name: string; contactId?: string }[] }>("/dashboard/uploads/f3")).data.records;
    expect(before.find((r) => r.name === "JIGAR SHAH")?.contactId).toBeUndefined();
    await api.post("/dashboard/contacts", { firstName: "Jigar", mobile: "98217 22382" });
    const after = (await api.get<{ records: { name: string; contactId?: string }[] }>("/dashboard/uploads/f3")).data.records;
    expect(after.find((r) => r.name === "JIGAR SHAH")?.contactId).toBeTruthy();
  });

  it("refuses to add members beyond the licence count", async () => {
    for (let i = MEMBERS.length; i < SEATS_TOTAL; i++) await api.post("/dashboard/team/members", { name: `Member ${i}` });
    await expect(api.post("/dashboard/team/members", { name: "One too many" })).rejects.toMatchObject({ status: 409 });
    const tooMany: TeamMember[] = Array.from({ length: SEATS_TOTAL + 1 }, (_, i) => ({ ...MEMBERS[0], id: `x${i}` }));
    await expect(api.patch("/dashboard/team", { members: tooMany })).rejects.toMatchObject({ status: 409 });
  });
});
