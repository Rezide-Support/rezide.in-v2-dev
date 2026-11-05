import Link from "next/link";
import { Icon } from "@/components/brand/icon";
import { CoverImage } from "@/components/common/cover-image";
import { SampleBadge } from "@/components/common/feedback";
import { formatArea, formatDate, formatPrice, formatRate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Property } from "@/types/models";

export const propertyHref = (p: Pick<Property, "id">) => `/properties/${p.id}`;

/** The headline price, or "Price on request" when the owner withholds it (as rezide.in shows it). */
export const priceLabel = (p: Property) =>
  p.priceHidden ? "Price on request" : formatPrice(p.price, { monthly: p.intent === "rent" });

/** Verification is illustrative in this build; the badge says so. */
function VerificationPill({ property, small }: { property: Property; small?: boolean }) {
  const verified = property.verification === "verified";
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full font-semibold",
        small ? "h-[26px] px-2.5 text-[11px]" : "h-7 px-3 text-xs",
        verified ? "bg-black text-rez-full-white" : "bg-white text-black",
      )}
    >
      <Icon name={verified ? "shield-check" : "clock"} size={small ? 13 : 14} />
      {verified ? "Verified (sample)" : "Verification pending"}
    </span>
  );
}

/** Full card: the prototype's default list card (variant "C"). */
export function PropertyCard({
  property: p,
  priority,
  layout = "stack",
}: {
  property: Property;
  priority?: boolean;
  /** "row": photo left, details right from the md breakpoint (account lists in the prototype). */
  layout?: "stack" | "row";
}) {
  const rent = p.intent === "rent";
  return (
    <article
      className={cn(
        "group relative flex w-full min-w-0 flex-col overflow-hidden rounded-[20px] border border-rez-smoke bg-white transition-shadow duration-200 ease-rez hover:shadow-rez-md",
        layout === "row" && "md:grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]",
      )}
    >
      <div className={cn("relative aspect-[4/3] bg-rez-cloud", layout === "row" && "md:aspect-auto md:min-h-[290px]")}>
        <CoverImage
          src={p.images[0]}
          alt={`${p.title}, ${p.locality}`}
          sizes="(min-width: 1000px) 400px, (min-width: 680px) 50vw, 100vw"
          priority={priority}
        />
        <VerificationPill property={p} />
        <SampleBadge className="absolute top-3 right-3">Sample</SampleBadge>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-[22px] pt-5 pb-[22px]">
        <div className="flex flex-col gap-1">
          <h3 className="text-[19px] leading-tight font-semibold tracking-[-0.01em]">
            <Link href={propertyHref(p)} className="after:absolute after:inset-0 after:z-0 focus-visible:outline-none">
              {p.title}
            </Link>
          </h3>
          <span className="text-sm text-rez-graphite">
            {p.locality}, {p.city}
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-2xl leading-none font-bold tracking-[-0.01em]">{priceLabel(p)}</span>
            <span className="text-[13px] text-rez-graphite">{p.priceHidden ? "" : formatRate(p.price, p.areaSqft, rent)}</span>
          </div>
          <span className="rounded-lg bg-rez-cloud px-2.5 py-[7px] text-[13px] font-semibold whitespace-nowrap">
            {p.areaBasis}: {formatArea(p.areaSqft)}
          </span>
        </div>
        <dl className="grid grid-cols-4 gap-1 rounded-2xl bg-rez-cloud px-2 py-3.5">
          {p.specs.slice(0, 4).map((s) => (
            <div key={s.label} className="flex min-w-0 flex-col-reverse items-center gap-1 text-center">
              <dt className="max-w-full truncate text-[11px] leading-tight text-rez-graphite" title={s.label}>{s.label}</dt>
              <dd className="truncate text-sm leading-tight font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex justify-between gap-3 text-xs leading-snug text-rez-graphite">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span>Listing realtor</span>
            <span className="truncate text-[13px] font-semibold text-black">{p.realtorFirm}</span>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span>Last updated</span>
            <span className="text-[13px] font-semibold whitespace-nowrap text-black">{formatDate(p.updatedAt)}</span>
          </div>
        </div>
        <div className="relative z-10 mt-auto grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-2.5">
          <Link
            href={`${propertyHref(p)}#enquire`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black text-sm font-semibold hover:bg-black/[0.06]"
          >
            <Icon name="message-dots" size={18} />
            Message
          </Link>
          <Link
            href={`${propertyHref(p)}#enquire`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black text-sm font-semibold text-rez-full-white hover:bg-rez-arsenic"
          >
            <Icon name="phone-outgoing" size={18} />
            Contact
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Compact row used beside the map. */
export function PropertyRow({
  property: p,
  highlighted,
  onHover,
  priority,
}: {
  property: Property;
  highlighted?: boolean;
  /** Above the fold: load the photo eagerly. */
  priority?: boolean;
  onHover?: (id: string | null) => void;
}) {
  return (
    <article
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "relative grid grid-cols-[132px_minmax(0,1fr)] overflow-hidden rounded-[20px] border bg-white transition-shadow hover:shadow-rez-md",
        highlighted ? "border-black shadow-rez-md" : "border-rez-smoke",
      )}
    >
      <div className="relative min-h-[132px] bg-rez-cloud">
        <CoverImage src={p.images[0]} alt="" sizes="132px" priority={priority} />
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1.5 px-4 py-3.5">
        <span className="text-[19px] leading-none font-bold tracking-[-0.01em]">{priceLabel(p)}</span>
        <h3 className="truncate text-sm font-semibold">
          <Link href={propertyHref(p)} className="after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>
        <span className="truncate text-[13px] text-rez-graphite">
          {p.locality}, {p.city}
        </span>
        <span className="text-[13px] font-medium">
          {[p.specs[0]?.value, p.specs[1]?.value, formatArea(p.areaSqft)].filter(Boolean).join(" · ")}
        </span>
      </div>
    </article>
  );
}

/** Photo + key facts card beside the map (prototype map-card variant "B"). */
export function PropertyPhotoCard({
  property: p,
  highlighted,
  onHover,
  priority,
}: {
  property: Property;
  highlighted?: boolean;
  /** Above the fold: load the photo eagerly. */
  priority?: boolean;
  onHover?: (id: string | null) => void;
}) {
  const facts = [p.specs[0]?.value, p.specs[1]?.value, formatArea(p.areaSqft)].filter(Boolean);
  return (
    <article
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[20px] border bg-white transition-shadow hover:shadow-rez-md",
        highlighted ? "border-black shadow-rez-md" : "border-rez-smoke",
      )}
    >
      <div className="relative aspect-video bg-rez-cloud">
        <CoverImage src={p.images[0]} alt="" sizes="460px" priority={priority} />
        <VerificationPill property={p} small />
      </div>
      <div className="flex flex-col gap-2 px-[18px] pt-3.5 pb-4">
        <span className="text-[21px] leading-none font-bold tracking-[-0.01em]">{priceLabel(p)}</span>
        <h3 className="truncate text-sm font-semibold">
          <Link href={propertyHref(p)} className="after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm leading-tight font-medium">
          {facts.map((f, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="h-3.5 w-px bg-rez-smoke" />}
              {f}
            </span>
          ))}
        </div>
        <span className="truncate text-[13px] text-rez-graphite">
          {p.locality}, {p.city}
        </span>
      </div>
    </article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-[20px] border border-rez-smoke" aria-hidden>
      <div className="aspect-[4/3] bg-rez-cloud" />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-5 w-3/4 rounded bg-rez-cloud" />
        <div className="h-4 w-1/2 rounded bg-rez-cloud" />
        <div className="h-6 w-1/3 rounded bg-rez-cloud" />
        <div className="h-16 rounded-2xl bg-rez-cloud" />
      </div>
    </div>
  );
}
