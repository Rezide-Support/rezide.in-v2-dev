"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { transactionQueries } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionKind } from "@/services/transactions";
import { useSession } from "@/stores/session";
import { rsInr, V1Title, V1Toggle } from "./v1-ui";

/*
 * "Recent Transaction In <project>", as on rezide.in's project page: the latest five registered
 * sale or rental transactions. Signed-out visitors see blurred placeholder rows ("####", no
 * data) behind "Login to view"; signed-in visitors see the rows and the IndexTap disclaimer.
 */

type Column = { short: string; full: string; right?: boolean; width: string };

const FIRST: Column[] = [
  { short: "Trans. date", full: "Transaction date", width: "w-[110px] lg:w-[150px]" },
  { short: "Wing", full: "Wing", width: "w-[80px]" },
  { short: "Flat no.", full: "Flat no.", width: "w-[90px]" },
  { short: "Config", full: "Configuration", width: "w-[80px] lg:w-[150px]" },
  { short: "Area (sqft.)", full: "Area (in sqft.)", width: "w-[110px]" },
];
const COLUMNS: Record<TransactionKind, Column[]> = {
  sale: [
    ...FIRST,
    { short: "Value", full: "Value", right: true, width: "w-[110px] lg:w-[150px]" },
    { short: "Rate per sqft.", full: "Rate per sqft.", right: true, width: "w-[110px] lg:w-[150px]" },
    { short: "Ready Reckoner", full: "Ready Reckoner", right: true, width: "w-[110px] lg:w-[150px]" },
  ],
  rent: [
    ...FIRST,
    { short: "S.D.", full: "Security Deposit", right: true, width: "w-[110px] lg:w-[150px]" },
    { short: "Monthly Rent", full: "Monthly Rent", right: true, width: "w-[110px]" },
    { short: "Rate per sqft.", full: "Rate per sqft.", right: true, width: "w-[110px]" },
  ],
};

/** rezide.in's date: "Oct 26, 2026". */
const dateLabel = (iso: string | undefined) =>
  iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "-";

/** One row's cells, formatted as rezide.in formats them. */
function cells(t: Transaction, kind: TransactionKind): string[] {
  const first = [dateLabel(t.date), t.wing ?? "-", t.flat ?? "-", t.config ?? "-", t.areaSqft ? String(t.areaSqft) : "-"];
  if (kind === "sale") {
    return [
      ...first,
      t.value ? `${rsInr(t.value)}/-` : "-",
      t.ratePerSqft ? `₹ ${t.ratePerSqft}/-` : "N/A",
      t.readyReckoner ? `${rsInr(t.readyReckoner)}/-` : "-",
    ];
  }
  return [
    ...first,
    t.securityDeposit ? `${rsInr(t.securityDeposit)} /-` : "-",
    t.monthlyRent ? `${rsInr(t.monthlyRent)} /-` : "-",
    t.ratePerSqft ? `${rsInr(t.ratePerSqft)} /-` : "-",
  ];
}

/** Placeholder rows behind "Login to view": masks only, never real values. */
const MASKS = ["##########", "####", "####", "####", "####", "########", "########", "########"];

function TransactionTable({ kind, projectId, path }: { kind: TransactionKind; projectId: string; path: string }) {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const query = useQuery({ ...transactionQueries.recent(projectId, kind), enabled: signedIn });
  const columns = COLUMNS[kind];
  const rows = query.data?.items ?? [];
  const noun = kind === "sale" ? "sale" : "rental";
  const cell = "text-xs lg:text-sm";

  return (
    <div className="relative mt-5 w-full overflow-x-auto" role="region" aria-label={`${kind === "sale" ? "Sale" : "Rental"} transactions (scrolls sideways)`} tabIndex={0}>
      <table className="m-auto w-full caption-bottom border-collapse border border-[#F3F0F0] text-sm">
        <thead>
          <tr className="border-b bg-[#FAFAF9] text-xs lg:text-sm">
            {columns.map((c) => (
              <th key={c.full} scope="col" className={cn("h-10 px-2 text-left align-middle text-xs font-semibold text-[#242424] lg:text-sm", c.right && "text-right")}>
                <div className={cn("flex lg:hidden", c.width, c.right && "justify-end")}>{c.short}</div>
                <div className={cn("hidden lg:flex", c.width, c.right && "justify-end")}>{c.full}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-busy={signedIn && query.isPending}>
          {!signedIn ? (
            MASKS.slice(0, 5).map((_, r) => (
              <tr key={r} aria-hidden className="border-b bg-white blur-sm">
                {columns.map((c, k) => (
                  <td key={c.full} className={cn("p-2", k === 0 && "p-4")}>
                    {MASKS[k]}
                  </td>
                ))}
              </tr>
            ))
          ) : query.isPending ? (
            <tr>
              <td colSpan={columns.length} className="border p-4 text-center text-sm text-[#242424]">
                Loading {noun} transactions…
              </td>
            </tr>
          ) : query.isError ? (
            <tr>
              <td colSpan={columns.length} className="border p-4 text-center text-sm text-[#242424]">
                The {noun} transactions couldn&apos;t be loaded.{" "}
                <button type="button" className="font-semibold underline" onClick={() => query.refetch()}>
                  Retry
                </button>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="border p-4">
                <p className="text-center text-sm text-[#242424]">No {noun} transactions available</p>
              </td>
            </tr>
          ) : (
            rows.map((t, r) => (
              <tr key={t.id || r} className="border-b transition-colors hover:bg-gray-50">
                {cells(t, kind).map((v, k) => (
                  <td key={columns[k].full} className={cn("p-2", cell, k === 0 && "p-4", columns[k].right && "text-right")}>
                    {v}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!signedIn && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button asChild className="rounded-md">
            <Link href={`/login?next=${encodeURIComponent(path)}`}>Login to view</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export function ProjectTransactions({ projectId, name, path }: { projectId: string; name: string; path: string }) {
  const [kind, setKind] = useState<TransactionKind>("sale");
  const { status } = useSession();
  return (
    <section aria-labelledby="txn-heading" className="flex flex-col">
      {/* rezide.in's short phone title; the full one below is the heading screen readers use. */}
      <div aria-hidden className="mb-5 text-left text-xl font-semibold text-black uppercase lg:hidden">
        Recent Transaction
      </div>
      <div className="grid gap-3 lg:flex lg:items-center lg:justify-between">
        <V1Title id="txn-heading" className="sr-only lg:not-sr-only lg:flex">
          Recent Transaction In {name}
        </V1Title>
        <V1Toggle
          label="Transaction type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "sale", label: "Sale" },
            { value: "rent", label: "Rent" },
          ]}
        />
      </div>
      <TransactionTable key={kind} kind={kind} projectId={projectId} path={path} />
      {status === "authenticated" && (
        <div className="mt-4 grid w-full items-center justify-between gap-3 lg:flex">
          <p className="text-xs">
            <b>Disclaimer </b>* - The Transaction Data has been sourced from IndexTap and is available for informational purposes only. No representation or warranty is
            expressly or impliedly given as to its accuracy. You are advised to visit the relevant IGR Maharashtra website to know more.
          </p>
          <div className="flex justify-center">
            <Image src="/images/indextap_color.png" alt="IndexTap" width={300} height={300} className="h-[50px] w-[100px] object-contain lg:h-[70px] lg:w-[200px]" />
          </div>
        </div>
      )}
    </section>
  );
}
