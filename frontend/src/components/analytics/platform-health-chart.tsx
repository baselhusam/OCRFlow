"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
import { platformHealthChartConfig } from "@/components/analytics/chart-theme";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ActivitySeries, AnalyticsRange } from "@/lib/api/analytics";
import { RANGE_CAPTIONS } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";

type PlatformHealthChartProps = {
  series: ActivitySeries;
  range: AnalyticsRange;
};

function formatAxisLabel(value: string, range: AnalyticsRange): string {
  const date = new Date(value);
  if (range === "7d") {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  if (range === "90d") {
    return date.toLocaleDateString(undefined, { month: "short" });
  }
  const week = Math.ceil(date.getDate() / 7);
  return `Wk ${week}`;
}

export function PlatformHealthChart({ series, range }: PlatformHealthChartProps) {
  const data = series.items.map((item) => ({
    label: formatAxisLabel(item.bucket_start, range),
    errors: item.errors,
    active_projects: item.active_projects,
  }));

  const isEmpty = data.every(
    (item) => item.errors === 0 && item.active_projects === 0,
  );

  return (
    <div className={cn(dashboardCardClassName, "p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-bold tracking-tight text-foreground">
            Platform health
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {RANGE_CAPTIONS[range]} · errors and active projects
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className="mt-6 flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          No platform health data in this range yet.
        </div>
      ) : (
        <ChartContainer config={platformHealthChartConfig} className="mt-5 aspect-auto h-[220px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="errorsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-errors)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-errors)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="activeProjectsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-active_projects)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--color-active_projects)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={32}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="errors"
              stroke="var(--color-errors)"
              fill="url(#errorsFill)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="active_projects"
              stroke="var(--color-active_projects)"
              fill="url(#activeProjectsFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
