import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AnalyticsStatProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
};

export function AnalyticsStat({
  label,
  value,
  icon: Icon,
  hint,
}: AnalyticsStatProps) {
  return (
    <div className="border border-border bg-card px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
          {label}
        </p>
        <Icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? (
        <p className={cn("mt-1 text-xs text-muted-foreground")}>{hint}</p>
      ) : null}
    </div>
  );
}

type AnalyticsStatGridProps = {
  children: React.ReactNode;
};

export function AnalyticsStatGrid({ children }: AnalyticsStatGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
  );
}
