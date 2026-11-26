/** Indian-number formatting helpers (lakh / crore). */

const trim = (s: string) => s.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");

/** ₹ 1.45 Cr · ₹ 68 L · ₹ 45k. Appends " / mo" for rents. */
export function formatPrice(value: number, opts: { monthly?: boolean; compact?: boolean } = {}): string {
  const sep = opts.compact ? "" : " ";
  let out: string;
  if (value >= 1_00_00_000) out = `₹${sep}${trim((value / 1_00_00_000).toFixed(2))} Cr`;
  else if (value >= 1_00_000) out = `₹${sep}${trim((value / 1_00_000).toFixed(2))} L`;
  else if (value >= 1_000) out = `₹${sep}${trim((value / 1_000).toFixed(1))}k`;
  else out = `₹${sep}${value.toLocaleString("en-IN")}`;
  return opts.monthly ? `${out} / mo` : out;
}

export const formatNumber = (n: number) => n.toLocaleString("en-IN");

export const formatArea = (sqft: number) => `${formatNumber(sqft)} sq ft`;

export function formatRate(price: number, sqft: number, monthly = false) {
  if (!sqft) return "";
  return `₹ ${formatNumber(Math.round(price / sqft))} per sq ft${monthly ? " / mo" : ""}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "Oct 17, 2026" from an ISO date string, in UTC. A fixed month table rather than
 * Intl: locale data differs between Node and browsers ("Sept" vs "Sep"), which
 * would also make server and client render different text.
 */
export function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}, ${d.getUTCFullYear()}`;
}

/** "+91 98200 87676" */
export function formatPhone(phone: string): string {
  // Another country's number already carries its code ("+1 4155550123", from the sign-in country picker).
  if (phone.trim().startsWith("+") && !phone.trim().startsWith("+91")) return phone.trim();
  const digits = phone.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : phone;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const pluralize = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Today's date as "YYYY-MM-DD" in the user's own time zone, for `<input type="date">`
 * minimums and "not in the past" checks. (`toISOString()` is UTC, which in India
 * is still yesterday until 05:30.)
 */
export function localIsoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Lodha Group's", but "Godrej Properties'" for names ending in s. */
export const possessive = (name: string) => (/s$/i.test(name.trim()) ? `${name.trim()}'` : `${name.trim()}'s`);
