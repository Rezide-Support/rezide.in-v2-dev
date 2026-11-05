import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon = "search",
  title,
  children,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3.5 rounded-[20px] border border-dashed border-rez-smoke px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-rez-cloud">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="text-[22px] leading-tight font-semibold">{title}</h3>
      {children && <div className="max-w-md text-[15px] leading-relaxed text-rez-graphite">{children}</div>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "We couldn't load this.",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-3 rounded-[20px] border border-rez-smoke px-6 py-12 text-center", className)}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-rez-cloud text-destructive">
        <Icon name="alert-circle" size={24} />
      </span>
      <h3 className="text-xl font-semibold">{title}</h3>
      {message && <p className="max-w-md text-sm text-rez-graphite">{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Marks content that is sample data or a simulated action, not a live integration. */
export function SampleBadge({ children = "Sample", className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-rez-graphite bg-white/95 px-2.5 text-[11px] font-semibold tracking-wide text-rez-arsenic uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Inline notice explaining that a feature runs on demo data or is not yet connected. */
export function DemoNotice({ children, className, tone = "light" }: { children: ReactNode; className?: string; tone?: "light" | "dark" }) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] leading-snug",
        tone === "light" ? "border border-dashed border-rez-steel bg-rez-cream text-rez-arsenic" : "border border-dashed border-white/30 bg-white/5 text-rez-full-white/85",
        className,
      )}
    >
      <Icon name="alert-circle" size={16} className="mt-px" />
      <span>{children}</span>
    </p>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("eyebrow text-rez-graphite", className)}>{children}</span>;
}
