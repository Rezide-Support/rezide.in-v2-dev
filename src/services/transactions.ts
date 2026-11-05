import { api } from "@/lib/api/client";

/*
 * Registered sale and rental transactions in a project, from the Rezide
 * backend's POST /transaction/filter, as rezide.in's listing and project pages
 * show them. A public read (never mocked); the UI shows rows only to signed-in
 * visitors, as rezide.in does. Contract: docs/API.md → Transactions.
 */

export type TransactionKind = "sale" | "rent";

/** One registered transaction, as the table shows it. Money in INR. */
export type Transaction = {
  id: string;
  /** ISO date. */
  date?: string;
  wing?: string;
  flat?: string;
  /** e.g. "2.5 BHK" */
  config?: string;
  areaSqft?: number;
  /** Sale: the transaction value. */
  value?: number;
  /** Sale: the government ready-reckoner value. */
  readyReckoner?: number;
  /** Rent: monthly rent. */
  monthlyRent?: number;
  /** Rent: security deposit. */
  securityDeposit?: number;
  ratePerSqft?: number;
};

export type TransactionPage = { items: Transaction[]; total: number };

type Labelled = { label?: string } | null | undefined;

/** A row as the backend returns it (the fields rezide.in reads). */
export type BackendTransaction = {
  _id?: string;
  area?: number;
  bhk?: string;
  property_details?: { tower?: Labelled; unit_no?: Labelled; bhk?: string; area?: number };
  transaction_details?: {
    transaction_date?: string;
    // The backend reuses these fields: for a sale, rate_per_month is the transaction
    // value and security_deposit the ready-reckoner value (as rezide.in labels them).
    rate_per_month?: number;
    security_deposit?: number;
    rpsf?: number;
  };
};

const money = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined);
const label = (l: Labelled) => l?.label?.trim() || undefined;

export function toTransaction(raw: BackendTransaction, kind: TransactionKind): Transaction {
  const t = raw.transaction_details ?? {};
  const pd = raw.property_details ?? {};
  return {
    id: String(raw._id ?? ""),
    date: t.transaction_date || undefined,
    wing: label(pd.tower),
    flat: label(pd.unit_no),
    config: (raw.bhk || pd.bhk)?.trim() || undefined,
    areaSqft: money(raw.area ?? pd.area),
    ratePerSqft: money(t.rpsf),
    ...(kind === "sale"
      ? { value: money(t.rate_per_month), readyReckoner: money(t.security_deposit) }
      : { monthlyRent: money(t.rate_per_month), securityDeposit: money(t.security_deposit) }),
  };
}

/** The most recent registered transactions of one kind in a project. */
export async function fetchTransactions(projectId: string, kind: TransactionKind, pageSize = 5): Promise<TransactionPage> {
  const { data } = await api.post<{ result_count?: number; data?: BackendTransaction[] }>(
    "/transaction/filter",
    { projectIds: [projectId], transaction_type: kind === "sale" ? "Sale" : "Rental" },
    { params: { page: 1, pageSize } },
  );
  const items = (data.data ?? []).map((r) => toTransaction(r, kind));
  return { items, total: data.result_count ?? items.length };
}
