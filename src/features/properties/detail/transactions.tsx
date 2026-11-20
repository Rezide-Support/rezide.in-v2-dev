"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { formatArea, formatDate, formatPrice } from "@/lib/format";
import { transactionQueries } from "@/lib/queries";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionKind } from "@/services/transactions";
import { useSession } from "@/stores/session";
import { SectionHeading } from "./detail-ui";
import { formatRupees } from "./format";

const SALE_COLUMNS = ["Transaction date", "Wing", "Flat no.", "Configuration", "Area (in sqft.)", "Value", "Rate per sqft.", "Ready Reckoner"];
const RENT_COLUMNS = ["Transaction date", "Wing", "Flat no.", "Configuration", "Area (in sqft.)", "Security deposit", "Monthly rent", "Rate per sqft."];

/** Bar widths for the blurred placeholder cells (no real values are rendered). */
const WIDTHS = ["w-24", "w-10", "w-6", "w-10", "w-10", "w-12", "w-20", "w-20"];

const DASH = "—";
const price = (n: number | undefined, monthly = false) => (n === undefined ? DASH : formatPrice(n, { monthly }));
const rupees = (n: number | undefined) => (n === undefined ? DASH : formatRupees(n));

/** A transaction's cells, in column order. */
function cells(t: Transaction, kind: TransactionKind): string[] {
  const first = [t.date ? formatDate(t.date) : DASH, t.wing ?? DASH, t.flat ?? DASH, t.config ?? DASH, t.areaSqft === undefined ? DASH : `${formatArea(t.areaSqft)}${t.areaLabel ? ` (${t.areaLabel})` : ""}`];
  return kind === "sale"
    ? [...first, price(t.value), rupees(t.ratePerSqft), price(t.readyReckoner)]
    : [...first, price(t.securityDeposit), price(t.monthlyRent, true), rupees(t.ratePerSqft)];
}

/**
 * v1 "Recent transactions": the project's latest registered transactions from the
 * Rezide backend, shown to signed-in visitors as rezide.in does. Signed-out visitors
 * see a blurred, illustrative table behind "Login to view" (those placeholder rows
 * contain no data at all). Without a `projectId` there is nothing to look up.
 */
export function Transactions({
  title,
  path,
  projectId,
  initial = "sale",
  toggle,
  centered,
}: {
  title: string;
  path: string;
  /** The project's id on the Rezide backend; transactions are recorded per project. */
  projectId?: string;
  initial?: "sale" | "rent";
  /** Show the Sale / Rent switch (project page). */
  toggle?: boolean;
  centered?: boolean;
}) {
  const [kind, setKind] = useState<"sale" | "rent">(initial);
  const { status } = useSession();
  const columns = kind === "sale" ? SALE_COLUMNS : RENT_COLUMNS;
  const live = status === "authenticated" && Boolean(projectId);
  const records = useQuery({ ...transactionQueries.recent(projectId ?? "", kind), enabled: live });
  const availability = useQuery({
    queryKey: ["transaction-availability", projectId, kind],
    enabled: status === "anonymous" && !!projectId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<{ hasTransactions: boolean }>(`/api/projects/${encodeURIComponent(projectId ?? "")}/transaction-summary`, { baseURL: "", params: { kind } });
      return data.hasTransactions;
    },
  });
  const rows = live ? records.data?.items : undefined;
  const noun = kind === "sale" ? "sale" : "rental";
  if (!projectId || (status === "anonymous" && availability.data === false) || (live && records.isSuccess && rows?.length === 0)) return null;

  return (
    <section id={live && rows && rows.length > 0 ? "recent" : undefined} aria-labelledby="txn-heading" className="flex scroll-mt-32 flex-col gap-5">
      <div className={cn("flex flex-wrap items-center gap-3", centered ? "justify-center text-center" : "justify-between")}>
        <SectionHeading id="txn-heading" className={cn(centered && "lg:text-[26px]")}>
          {kind === "sale" ? (toggle ? "Recent transactions" : "Sale transactions") : "Rental transactions"} in {title}
        </SectionHeading>
        {toggle && (
          <Segmented
            label="Transaction type"
            appearance="solid"
            size="sm"
            value={kind}
            onChange={setKind}
            options={[
              { value: "sale", label: "Sale" },
              { value: "rent", label: "Rent" },
            ]}
            className="border border-black bg-white"
          />
        )}
      </div>
      <div className="relative overflow-hidden rounded-lg border border-rez-smoke">
        <div className="overflow-x-auto outline-none focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/60" tabIndex={0} role="region" aria-label={`${kind === "sale" ? "Sale" : "Rental"} transactions table (scrolls sideways)`}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">
              {kind === "sale" ? "Sale" : "Rental"} transactions in {title}.
              {rows ? "" : " Hidden until you sign in and the records load."}
            </caption>
            <thead className="bg-rez-cream-warm">
              <tr>
                {columns.map((c) => (
                  <th key={c} scope="col" className="px-3 py-3 font-semibold whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            {rows && rows.length > 0 ? (
              <tbody>
                {rows.map((t, r) => (
                  <tr key={t.id || r} className="border-t border-rez-smoke">
                    {cells(t, kind).map((v, k) => (
                      <td key={columns[k]} className="px-3 py-4 whitespace-nowrap">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : rows ? (
              <tbody>
                <tr className="border-t border-rez-smoke">
                  <td colSpan={columns.length} className="px-3 py-8 text-center text-rez-graphite">
                    No {noun} transactions are recorded in {title} yet.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody aria-hidden aria-busy={live && records.isPending}>
                {Array.from({ length: 5 }, (_, r) => (
                  <tr key={r} className="border-t border-rez-smoke">
                    {columns.map((c, k) => (
                      <td key={c} className="px-3 py-4">
                        <span className={cn("block h-2.5 rounded-full bg-rez-steel/70 blur-[3px]", WIDTHS[k])} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {!rows && !(live && records.isPending) && (
          <div className="absolute inset-0 top-11 flex flex-col items-center justify-center gap-2 bg-white/30 px-4 text-center">
            {status !== "authenticated" ? (
              <>
                <Button asChild size="sm" className="rounded-md px-4 text-[13px]">
                  <Link href={`/login?next=${encodeURIComponent(path)}`}>Login to view</Link>
                </Button>
              </>
            ) : records.isError ? (
              <p className="max-w-sm rounded-lg bg-black px-4 py-2.5 text-[13px] font-medium text-rez-full-white">
                Transactions couldn&apos;t be loaded. Please try again later.
              </p>
            ) : (
              // Signed in, but no backend project to look up (e.g. project pages until Projects is live).
              <p className="max-w-sm rounded-lg bg-black px-4 py-2.5 text-[13px] font-medium text-rez-full-white">
                Transaction records aren&apos;t connected for {title} yet.
              </p>
            )}
          </div>
        )}
      </div>
      {live && rows && rows.length > 0 && (
        <div className="mt-4 grid w-full items-center gap-4 lg:flex lg:justify-between">
          <p className="text-xs">
            <b>Disclaimer </b>* - The Transaction Data has been sourced from IndexTap and is available for informational purposes only. No representation or warranty is expressly or impliedly given as to its accuracy. You are advised to visit the relevant IGR Maharashtra website to know more.
          </p>
          <div className="flex shrink-0 justify-center">
            <Image
              src="/images/indextap_color.png"
              alt="IndexTap"
              width={300}
              height={300}
              className="h-[50px] w-[100px] object-contain lg:h-[70px] lg:w-[200px]"
            />
          </div>
        </div>
      )}
    </section>
  );
}
