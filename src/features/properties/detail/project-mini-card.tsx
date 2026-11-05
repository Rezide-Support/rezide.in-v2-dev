"use client";

import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/types/models";
import { formatPriceRange } from "./format";
import { SaveIconButton } from "./save-actions";

/** v1 right-column project card on a property page. */
export function ProjectMiniCard({ project: p, stock }: { project: Project; stock?: { sale: number; rent: number } }) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-rez-smoke bg-white shadow-rez-sm">
      <div className="relative aspect-[4/3] bg-rez-cloud">
        <Image src={p.images[0]} alt="" fill sizes="(min-width: 1024px) 330px, 100vw" quality={70} className="object-cover" />
        <div className="absolute top-2 right-2 z-10 flex gap-1.5 [&_button]:size-8 [&_button]:bg-white/90 [&_button]:hover:bg-white">
          <SaveIconButton list="shortlist" kind="project" id={p.id} title={p.name} />
          <SaveIconButton list="compare" kind="project" id={p.id} title={p.name} />
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[17px] leading-tight font-semibold">
              <Link href={`/projects/${p.id}`} className="hover:underline">
                {p.name}
              </Link>
            </h2>
            <p className="truncate text-[13px] text-rez-graphite">
              {p.locality}, {p.city}
            </p>
          </div>
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rez-smoke text-[11px] font-bold">
            {p.developer
              .split(/\s+/)
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </span>
        </div>
        <dl className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-rez-graphite">
          <div className="flex gap-1">
            <dt>Available rent</dt>
            <dd className="font-semibold text-black">{stock?.rent ?? 0}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Available sale</dt>
            <dd className="font-semibold text-black">{stock?.sale ?? 0}</dd>
          </div>
          <div className="flex w-full gap-1">
            <dt>Price range</dt>
            <dd className="font-semibold text-black">
              {formatPriceRange(p.priceFrom, p.priceTo)}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
