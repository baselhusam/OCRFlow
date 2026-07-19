"use client";

import { dashboardStatCardClassName } from "@/components/dashboard/dashboard-styles";
import type { AnalyticsKpi } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";

type AnalyticsKpiGridProps = {
  kpis: AnalyticsKpi[];
};

function DeltaBadge({ kpi }: { kpi: AnalyticsKpi }) {
  const isPositive = kpi.delta_direction === "up";
  const isNeutral = kpi.delta_direction === "neutral";

  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold",
          isNeutral && "bg-secondary text-muted-foreground",
          !isNeutral && isPositive && "bg-[rgba(18,166,91,0.10)] text-[#0E7C45]",
          !isNeutral && !isPositive && "bg-[rgba(224,36,94,0.10)] text-[#B5113F]",
        )}
      >
        {!isNeutral ? (isPositive ? "▲" : "▼") : null} {kpi.delta}
      </span>
      <span className="font-mono text-[11px] text-muted-foreground">
        {kpi.delta_label}
      </span>
    </div>
  );
}

export function AnalyticsKpiGrid({ kpis }: AnalyticsKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className={cn(
            dashboardStatCardClassName,
            "relative overflow-hidden p-6 transition-all duration-300 hover:shadow-lg",
            i === 0 && "bg-primary/5 ring-1 ring-primary/20",
          )}
        >
          <div className="relative z-10">
            <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              {kpi.label}
            </p>
            <p
              className={cn(
                "mt-4 font-extrabold leading-none tracking-[-0.05em]",
                i === 0 ? "text-[42px] text-primary" : "text-[36px] text-foreground",
              )}
            >
              {kpi.value}
            </p>
            <DeltaBadge kpi={kpi} />
          </div>
          {i === 0 && (
            <div className="absolute -right-4 -top-4 size-24 rounded-full bg-primary/10 blur-2xl" />
          )}
        </div>
      ))}
    </div>
  );
}
