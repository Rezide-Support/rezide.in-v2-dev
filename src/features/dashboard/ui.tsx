"use client";

import { Fragment, type ComponentProps, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon, type IconName } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* ---------- formatting ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "22 Mar 26", the prototype's compact table date. */
export function shortDate(iso: string, comma = false) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]}${comma ? "," : ""} ${String(y).slice(-2)}`;
}

/** "14 Jan 2027" */
export function longDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

export const nameInitials = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Tells the user a module or action isn't part of this prototype. Never claims success. */
export function notAvailable(what: string) {
  toast(`${what} isn’t part of this prototype.`, { description: "Nothing was sent or changed." });
}

/* ---------- layout ---------- */

export function PageHeader({
  crumbs = [],
  title,
  subtitle,
  actions,
}: {
  crumbs?: string[];
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-1">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-rez-graphite">
            {crumbs.map((c) => (
              <Fragment key={c}>
                <li>{c}</li>
                <li aria-hidden>/</li>
              </Fragment>
            ))}
            <li aria-current="page" className="font-medium text-black">
              {title}
            </li>
          </ol>
        </nav>
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-rez-graphite">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[16px] border border-[#E0E0E0] bg-white", className)} {...props} />;
}

export const thClass = "px-3 py-3.5 text-left text-[11px] font-bold tracking-[0.06em] whitespace-nowrap text-black uppercase first:pl-5 last:pr-5";
export const tdClass = "px-3 py-3 align-middle first:pl-5 last:pr-5";

/** Bordered card holding a scrollable table. The table scrolls inside its own container on small screens. */
export function TableCard({ children, footer, className }: { children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="relative overflow-x-auto">{children}</div>
      {footer}
    </Card>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-[#E0E0E0] bg-[#F4F4F4]">{children}</thead>;
}

export function Avatar({ name, label, dark, size = 36, className }: { name?: string; label?: string; dark?: boolean; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
        dark ? "bg-black text-rez-full-white" : "bg-[#F0F0F0] text-black",
        className,
      )}
    >
      {label ?? nameInitials(name ?? "")}
    </span>
  );
}

const TYPE_STYLE: Record<string, string> = {
  Customer: "bg-[#F0F0F0] text-black",
  Broker: "bg-[#F0EAE2] text-black",
  Developer: "bg-black text-rez-full-white",
  Vendor: "bg-rez-cloud text-black",
};

export function TypePill({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-[6px] px-2.5 text-[11px] font-bold tracking-[0.06em] uppercase", TYPE_STYLE[type] ?? TYPE_STYLE.Customer, className)}>
      {type}
    </span>
  );
}

export function LabelChip({ children, tone = "plain", className }: { children: ReactNode; tone?: "plain" | "warm"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-[180px] items-center truncate rounded-[6px] border px-2 text-[11px] font-semibold",
        tone === "warm" ? "border-transparent bg-[#F0EAE2]" : "border-rez-smoke bg-[#F9F9F9]",
        className,
      )}
    >
      {children}
    </span>
  );
}

const waDigits = (mobile: string) => mobile.replace(/\D/g, "").slice(-10);

/**
 * Sample contacts carry made-up numbers that may belong to real people, so
 * WhatsApp only opens when the app runs on real data (mocking off).
 */
const SAMPLE_NUMBERS = process.env.NEXT_PUBLIC_API_MOCKING !== "off";
const sampleNotice = () =>
  toast("WhatsApp isn't opened for sample contacts", {
    description: "These numbers are sample data. It opens WhatsApp Web once real contacts are connected.",
  });

export const waHref = (mobile: string) => `https://web.whatsapp.com/send?phone=91${waDigits(mobile)}`;

/** Props for a WhatsApp anchor: a real link on live data, a notice on sample data. */
export function whatsAppProps(mobile: string, name: string) {
  const label = `WhatsApp ${name}`;
  return SAMPLE_NUMBERS
    ? {
        href: "#",
        "aria-label": `${label} (not opened for sample contacts)`,
        onClick: (e: { preventDefault: () => void }) => {
          e.preventDefault();
          sampleNotice();
        },
      }
    : { href: waHref(mobile), target: "_blank", rel: "noopener noreferrer", "aria-label": `${label} (opens WhatsApp Web in a new tab)` };
}

/** Opens WhatsApp Web for the number in a new tab, as the prototype does. */
export function WhatsAppLink({ mobile, name, className }: { mobile: string; name: string; className?: string }) {
  if (waDigits(mobile).length !== 10) return null;
  return (
    <a
      {...whatsAppProps(mobile, name)}
      title="Open WhatsApp Web"
      className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-rez-smoke text-black hover:border-black hover:bg-[#F4F4F4]", className)}
    >
      <Icon name="message" size={14} />
    </a>
  );
}

/* ---------- controls ---------- */

export function DashSelect({ className, wrapperClassName, children, ...props }: ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <span className={cn("relative inline-flex", wrapperClassName)}>
      <select
        className={cn(
          "h-[42px] w-full min-w-0 appearance-none rounded-[8px] border border-rez-smoke bg-white pr-10 pl-3.5 text-sm text-black outline-none hover:border-black focus-visible:border-black focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/40",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <Icon name="chevron-left" size={16} aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 -rotate-90" />
    </span>
  );
}

export function SearchBox({ value, onChange, label, placeholder, className }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string; className?: string }) {
  return (
    <label className={cn("flex h-[42px] min-w-0 items-center gap-2 rounded-[8px] border border-rez-smoke bg-white px-3.5 focus-within:border-black focus-within:ring-[3px] focus-within:ring-rez-mocaccino/40", className)}>
      <Icon name="search" size={16} aria-hidden />
      <span className="sr-only">{label}</span>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? label} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-rez-space" />
    </label>
  );
}

/** Segmented "track" toggle used for Table/List, Members/Teams and statement periods. */
export function TrackToggle<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-[8px] bg-[#F4F4F4] p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-[34px] rounded-[6px] px-3.5 text-sm whitespace-nowrap transition-colors",
            o.value === value ? "bg-white font-medium text-black shadow-[0_1px_2px_rgba(2,17,12,.12)]" : "text-rez-graphite hover:text-black",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FilterChips({ chips, onClear }: { chips: { label: string; onRemove: () => void }[]; onClear: () => void }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <span key={c.label} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#F0EAE2] pr-1.5 pl-3 text-xs font-semibold">
          {c.label}
          <button type="button" onClick={c.onRemove} aria-label={`Remove filter ${c.label}`} className="flex size-5 items-center justify-center rounded-full hover:bg-black/10">
            <Icon name="x" size={12} />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClear} className="text-xs font-semibold underline underline-offset-4">
        Clear all
      </button>
    </div>
  );
}

export type MenuEntry = { header: string } | { label: string; icon: IconName; tone?: "warm" | "green" | "danger"; onSelect: () => void };

const ICON_BG = { warm: "bg-[#F0EAE2]", green: "bg-[#E6EDEB]", danger: "bg-[#F3E9EC]" } as const;

/** The "…" actions button and its menu. Keyboard operable (Radix), Escape closes. */
export function RowActions({ label, items, align = "start", className }: { label: string; items: MenuEntry[]; align?: "start" | "end"; className?: string }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn("flex h-8 w-[52px] items-center justify-center rounded-[8px] border border-rez-smoke bg-white hover:border-black data-[state=open]:border-black", className)}
        >
          <Icon name="dots" size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56 rounded-[12px] p-1.5">
        {items.map((it, i) =>
          "header" in it ? (
            <Fragment key={`h${i}`}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-[10px] font-bold tracking-[0.08em] text-rez-graphite uppercase">{it.header}</DropdownMenuLabel>
            </Fragment>
          ) : (
            <DropdownMenuItem
              key={it.label}
              onSelect={it.onSelect}
              className={cn("gap-2.5 rounded-[8px] px-2 py-1.5 text-[13px] font-medium", it.tone === "danger" && "text-rez-burgundy focus:text-rez-burgundy")}
            >
              <span className={cn("flex size-7 items-center justify-center rounded-[6px]", it.tone ? ICON_BG[it.tone] : "bg-[#F4F4F4]")}>
                <Icon name={it.icon} size={14} />
              </span>
              {it.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Showing 10 of 10 contacts · Rows per page · Page no." footer. */
export function TableFooter({
  showing,
  perPage,
  onPerPage,
  page,
  pageCount,
  onPage,
}: {
  showing: string;
  perPage?: number;
  onPerPage?: (n: number) => void;
  page?: number;
  pageCount?: number;
  onPage?: (n: number) => void;
}) {
  const box = "h-8 appearance-none rounded-[6px] border border-rez-smoke bg-white px-2.5 text-center text-[13px] font-medium outline-none hover:border-black focus-visible:ring-[3px] focus-visible:ring-rez-mocaccino/40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E0E0E0] px-5 py-3.5 text-[13px] text-rez-graphite">
      <span aria-live="polite">{showing}</span>
      {onPerPage && onPage && (
        <span className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            Rows per page
            <select value={perPage} onChange={(e) => onPerPage(Number(e.target.value))} className={box}>
              {[10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Page no.
            <select value={page} onChange={(e) => onPage(Number(e.target.value))} className={box}>
              {Array.from({ length: pageCount ?? 1 }, (_, i) => (
                <option key={i}>{i + 1}</option>
              ))}
            </select>
          </label>
        </span>
      )}
    </div>
  );
}

export function HeaderButton({ icon, children, variant = "secondary", asChild, ...props }: ComponentProps<typeof Button> & { icon?: IconName }) {
  return (
    <Button variant={variant} className="h-10 px-5 text-[15px]" asChild={asChild} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {icon && <Icon name={icon} size={18} />}
          {children}
        </>
      )}
    </Button>
  );
}

export function Loading({ className }: { className?: string }) {
  return <div className={cn("h-72 animate-pulse rounded-[16px] bg-[#F4F4F4]", className)} aria-busy="true" aria-label="Loading" />;
}

/**
 * Resets its subtree on each fresh (push/replace) navigation while keeping
 * state on back/forward. Used for "start fresh" flows such as Add Contact,
 * since Cache Components otherwise preserves page state across navigations.
 */
export function FreshOnNavigate({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
