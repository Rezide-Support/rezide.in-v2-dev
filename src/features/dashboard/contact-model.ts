import type { Contact } from "@/types/dashboard";

/** Brokers and vendors saved as a company are listed under the company name. */
export const isCompany = (c: Pick<Contact, "entity" | "type">) => c.entity === "Company" && c.type !== "Developer";

export const personName = (c: Pick<Contact, "firstName" | "lastName">) => [c.firstName, c.lastName].filter(Boolean).join(" ");

export const displayName = (c: Contact) => (isCompany(c) ? c.company || personName(c) : personName(c));

export const subLine = (c: Contact) =>
  c.type === "Developer" ? c.company || "Developer" : isCompany(c) ? `Contact · ${personName(c)}` : c.details.organisation || "Individual";

export const addedVia = (c: Contact) => (c.addedBy === "Upload" ? "Upload" : `Manual · ${c.addedBy}`);

export const MAX_LABELS = 4;

export type ColumnKey = "name" | "type" | "mobile" | "email" | "labels" | "added" | "alt" | "altEmail" | "firm" | "groups" | "occupation" | "city";

export const COLUMNS: { key: ColumnKey; label: string; locked?: boolean; minW: number }[] = [
  { key: "name", label: "Name", locked: true, minW: 190 },
  { key: "type", label: "Type", minW: 110 },
  { key: "mobile", label: "Mobile No.", minW: 165 },
  { key: "email", label: "Email", minW: 190 },
  { key: "labels", label: "Labels", minW: 170 },
  { key: "added", label: "Added", minW: 150 },
  { key: "alt", label: "Alt. Mobile No.", minW: 165 },
  { key: "altEmail", label: "Alt. Email", minW: 190 },
  { key: "firm", label: "Firm / Company", minW: 160 },
  { key: "groups", label: "Groups", minW: 170 },
  { key: "occupation", label: "Occupation", minW: 150 },
  { key: "city", label: "City", minW: 110 },
];

export type ColumnPref = { key: ColumnKey; on: boolean };
export const DEFAULT_COLUMNS: ColumnPref[] = COLUMNS.map((c, i) => ({ key: c.key, on: i < 6 }));

export type ContactFilters = { type: string; group: string; label: string; q: string; sort: 1 | -1 };

/** Type, group and label filters AND together; search matches name, mobile digits or email. Sorted by display name. */
export function filterContacts(all: Contact[], f: ContactFilters): Contact[] {
  const q = f.q.trim().toLowerCase();
  const qDigits = q.replace(/\s/g, "");
  return all
    .filter(
      (c) =>
        (!f.type || c.type === f.type) &&
        (!f.group || c.groupIds.includes(f.group)) &&
        (!f.label || c.labels.includes(f.label)) &&
        (!q ||
          displayName(c).toLowerCase().includes(q) ||
          personName(c).toLowerCase().includes(q) ||
          (/\d/.test(qDigits) && c.mobile.replace(/\s/g, "").includes(qDigits)) ||
          (c.email ?? "").toLowerCase().includes(q)),
    )
    .sort((a, b) => displayName(a).localeCompare(displayName(b)) * f.sort);
}

/** CSV of the given rows (runs in the browser; nothing is uploaded). */
export function toCsv(rows: Contact[], groupName: (id: string) => string = (id) => id): string {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Name", "Contact person", "Type", "Sub-type", "Mobile", "Alt. mobile", "Email", "Labels", "Groups", "Added", "Added by"];
  const body = rows.map((c) =>
    [
      displayName(c),
      isCompany(c) || c.type === "Developer" ? personName(c) : "",
      c.type,
      c.subType,
      c.mobile ? `+91 ${c.mobile}` : "",
      c.altMobile ? `+91 ${c.altMobile}` : "",
      c.email,
      c.labels.join("; "),
      c.groupIds.map(groupName).join("; "),
      c.addedOn,
      addedVia(c),
    ]
      .map(cell)
      .join(","),
  );
  return [head.map(cell).join(","), ...body].join("\r\n");
}

export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
