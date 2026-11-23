"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/brand/icon";
import { ErrorState } from "@/components/common/feedback";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dq, type CreditEntry } from "./api";
import { downloadText } from "./contact-model";
import { inputCls } from "./form-bits";
import { Card, Loading, PageHeader, THead, TrackToggle, longDate, shortDate, tdClass, thClass } from "./ui";

type Period = "1m" | "3m" | "6m" | "custom";
const MONTHS = { "1m": 1, "3m": 3, "6m": 6 } as const;
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthsBack = (anchor: string, n: number) => {
  const d = new Date(`${anchor}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - n);
  return iso(d);
};
const fmt = (n: number, sign = false) => `${sign && n > 0 ? "+" : n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("en-IN")}`;

/** Statement rows between two ISO dates (inclusive). */
export function statementRows(entries: CreditEntry[], from: string, to: string) {
  return entries.filter((e) => e.date >= from && e.date <= to);
}

export function CreditsPage() {
  const credits = useQuery(dq.credits());
  const team = useQuery(dq.team());
  const [period, setPeriod] = useState<Period>("1m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  if (credits.isError) return <ErrorState onRetry={() => credits.refetch()} />;
  if (credits.isPending) return <Loading />;
  const { balance, entries, statementDate, renewsOn } = credits.data;

  const from = period === "custom" ? customFrom || monthsBack(statementDate, 1) : monthsBack(statementDate, MONTHS[period]);
  const to = period === "custom" ? customTo || statementDate : statementDate;
  const rows = statementRows(entries, from, to);
  const month = statementDate.slice(0, 7);
  const usedEntries = entries.filter((e) => e.date.startsWith(month) && e.amount < 0);
  const used = usedEntries.reduce((s, e) => s + -e.amount, 0);
  const usedBy = new Set(usedEntries.map((e) => e.by)).size;
  const seats = team.data ? `${team.data.members.length} of ${team.data.seatsTotal}` : "—";

  const download = () => {
    const csv = ["Date,Activity,By,Credits,Balance", ...rows.map((r) => `${r.date},"${r.activity}","${r.by}",${r.amount},${r.balance}`)].join("\r\n");
    downloadText(`rezide-credit-statement-${from}-to-${to}.csv`, csv);
    toast.success(`Statement for ${longDate(from)} – ${longDate(to)} downloaded.`, { description: "Generated in your browser from the sample ledger." });
  };

  const cards = [
    { label: "Credit Balance", value: balance.toLocaleString("en-IN"), sub: "Credits available to the firm", dark: true },
    { label: "Used This Month", value: used.toLocaleString("en-IN"), sub: `Across ${usedBy} ${usedBy === 1 ? "member" : "members"} in ${MONTH_NAMES[Number(month.slice(5)) - 1]}` },
    { label: "Licenses", value: seats, sub: `Seats in use · renews ${longDate(renewsOn)}`, link: true },
  ];

  return (
    <>
      <PageHeader
        crumbs={["Admin", "Manage Account"]}
        title="View Credits"
        actions={
          <Button asChild className="h-10 px-5 text-[max(12px,calc(15px*var(--property-type-scale,1)))]">
            <Link href="/realtor-corner#pricing">
              <Icon name="plus" size={18} /> Buy Credits
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 max-w-[1020px] gap-3 md:grid-cols-3">
        {cards.map((k) => (
          <div key={k.label} className={cn("flex min-h-[146px] flex-col gap-2 rounded-[16px] border p-5", k.dark ? "border-black bg-black text-rez-full-white" : "border-[#E0E0E0] bg-white")}>
            <span className={cn("text-xs font-bold tracking-[0.08em] uppercase", k.dark ? "text-rez-full-white" : "text-rez-arsenic")}>{k.label}</span>
            <span className="text-[max(12px,calc(30px*var(--property-type-scale,1)))] leading-none font-semibold">{k.value}</span>
            <span className={cn("text-[13px]", k.dark ? "text-rez-full-white/85" : "text-rez-graphite")}>{k.sub}</span>
            {k.link && (
              <Link href="/dashboard/teams" className="mt-1 w-fit text-xs font-bold tracking-[0.04em] uppercase underline underline-offset-4">
                Manage Teams
              </Link>
            )}
          </div>
        ))}
      </div>
      <Card className="max-w-[1020px] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[13px] font-bold tracking-[0.06em] uppercase">Account Statement</h2>
            <p className="text-xs text-rez-graphite" aria-live="polite">
              {longDate(from)} – {longDate(to)} · {rows.length} {rows.length === 1 ? "entry" : "entries"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TrackToggle
              label="Statement period"
              value={period}
              onChange={(p) => {
                if (p === "custom" && !customFrom) {
                  setCustomFrom(monthsBack(statementDate, 1));
                  setCustomTo(statementDate);
                }
                setPeriod(p);
              }}
              options={[
                { value: "1m", label: "This Month" },
                { value: "3m", label: "3 Months" },
                { value: "6m", label: "6 Months" },
                { value: "custom", label: "Custom Period" },
              ]}
            />
            <Button variant="secondary" onClick={download} disabled={!rows.length} className="h-10 rounded-[8px] px-4 text-xs font-bold tracking-[0.06em] uppercase">
              <Icon name="file-text" size={14} /> Download
            </Button>
          </div>
        </div>
        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
            <input type="date" aria-label="Statement from" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className={cn(inputCls, "w-auto")} />
            <span className="text-sm text-rez-graphite">to</span>
            <input type="date" aria-label="Statement to" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className={cn(inputCls, "w-auto")} />
          </div>
        )}
        {rows.length === 0 ? (
          <p className="border-t border-[#E8E8E8] px-5 py-10 text-center text-sm text-rez-graphite">No credit activity in this period.</p>
        ) : (
          <div className="relative overflow-x-auto border-t border-[#E0E0E0] outline-none focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/60" tabIndex={0} role="region" aria-label="Credit history table (scrolls sideways)">
            <table className="w-full min-w-[calc(640px*var(--property-space-scale,1))] text-sm">
              <caption className="sr-only">Credit statement</caption>
              <THead>
                <tr>
                  {["Date", "Activity", "By", "Credits", "Balance"].map((h, i) => (
                    <th key={h} scope="col" className={cn(thClass, i > 2 && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </THead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-[#E8E8E8] first:border-t-0">
                    <td className={cn(tdClass, "whitespace-nowrap text-rez-graphite")}>{shortDate(e.date)}</td>
                    <td className={cn(tdClass, "font-medium")}>{e.activity}</td>
                    <td className={tdClass}>{e.by}</td>
                    <td className={cn(tdClass, "text-right font-semibold", e.amount > 0 ? "text-rez-timber" : "text-black")}>{fmt(e.amount, true)}</td>
                    <td className={cn(tdClass, "text-right")}>{fmt(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
