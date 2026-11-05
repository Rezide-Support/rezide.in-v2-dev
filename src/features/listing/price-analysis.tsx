"use client";

import { useState } from "react";
import { DemoNotice } from "@/components/common/feedback";
import { Segmented } from "@/components/common/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/format";
import type { ListingDraft } from "@/types/models";

/**
 * Illustrative price comparison using the prototype's fixed sample ranges.
 * INTEGRATION: replace SAMPLE with registered-transaction data for the unit.
 */
const SAMPLE = {
  unit: { count: 9, lo: 4.15e7, med: 5.35e7, hi: 6e7, loNote: "Floor 2 · Dec 2025", hiNote: "Floor 18 · Jan 2026" },
  config: { count: 21, lo: 3.91e7, med: 4.95e7, hi: 6.5e7, loNote: "Floor 4 · Nov 2025", hiNote: "Floor 27 · Jul 2026" },
};

export function comparePrice(price: number, range: { lo: number; med: number; hi: number }) {
  const within = price >= range.lo && price <= range.hi;
  const position = Math.max(3, Math.min(97, ((price - range.lo) / (range.hi - range.lo)) * 100));
  const delta = ((price - range.med) / range.med) * 100;
  return { within, below: price < range.lo, position, delta };
}

export function PriceAnalysisDialog({
  open,
  onOpenChange,
  draft,
  onChangePrice,
  initialTab = "unit",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  draft: ListingDraft;
  onChangePrice: () => void;
  /** Comparison shown first (the "similar units" / "similar config" shortcuts open it on their tab). */
  initialTab?: "unit" | "config";
}) {
  const [tab, setTab] = useState<"unit" | "config">(initialTab);
  const d = SAMPLE[tab];
  const price = Number(draft.price) || d.med;
  const c = comparePrice(price, d);
  const medPos = ((d.med - d.lo) / (d.hi - d.lo)) * 100;
  const tone = c.within ? "#15302B" : "#380516";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-[640px]">
        <DialogHeader>
          <span className="eyebrow text-rez-mocaccino-ink">Price analysis · sample</span>
          <DialogTitle>
            Prices in {draft.locality || "this locality"}, {draft.city || "Mumbai"}.
          </DialogTitle>
          <DialogDescription>Illustrative comparison for the prototype.</DialogDescription>
        </DialogHeader>
        <Segmented
          label="Compare with"
          value={tab}
          onChange={setTab}
          appearance="solid"
          size="sm"
          options={[
            { value: "unit", label: "Similar units (same area)" },
            { value: "config", label: "Similar config (same BHK)" },
          ]}
        />
        <p className="rounded-2xl border border-rez-smoke px-[18px] py-4 text-[15px] leading-relaxed">
          {d.count} sample sales range from {formatPrice(d.lo)} to {formatPrice(d.hi)} (median {formatPrice(d.med)}). Your price of{" "}
          {formatPrice(price)} is <b>{c.within ? "within" : c.below ? "below" : "above"}</b> that range.
        </p>
        <div className="flex flex-col gap-3.5 rounded-2xl border border-rez-smoke p-[18px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <b className="text-[15px] font-semibold">Sale price, last 12 months</b>
            <span className="text-[13px] font-semibold" style={{ color: tone }}>
              You · {formatPrice(price)} · {c.delta >= 0 ? "+" : ""}
              {c.delta.toFixed(1)}% vs median
            </span>
          </div>
          <div className="relative mx-2.5 my-2 h-3 rounded-full border border-rez-smoke bg-rez-cloud" aria-hidden>
            <span className="absolute -top-1.5 h-6 w-0.5 bg-rez-graphite" style={{ left: `${medPos}%` }} />
            <span
              className="absolute top-1/2 -mt-[11px] -ml-[11px] size-[22px] rounded-full border-4 border-white"
              style={{ left: `${c.position}%`, background: tone, boxShadow: `0 0 0 1.5px ${tone}` }}
            />
          </div>
          <dl className="grid grid-cols-3 gap-2">
            {[
              [`Low · ${d.loNote}`, formatPrice(d.lo)],
              ["Median", formatPrice(d.med)],
              [`High · ${d.hiNote}`, formatPrice(d.hi)],
            ].map(([l, v]) => (
              <div key={l} className="flex flex-col-reverse gap-1.5 rounded-xl bg-rez-cloud px-3.5 py-3">
                <dt className="text-xs text-rez-graphite">{l}</dt>
                <dd className="text-base font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <DemoNotice>These figures are fixed sample data, not registered transactions for your property.</DemoNotice>
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="secondary"
            size="xl"
            onClick={() => {
              onChangePrice();
              onOpenChange(false);
            }}
          >
            Change price
          </Button>
          <Button size="xl" onClick={() => onOpenChange(false)}>
            Carry on
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
