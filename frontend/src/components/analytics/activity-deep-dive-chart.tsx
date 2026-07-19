"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { activityDeepDiveChartConfig } from "@/components/analytics/chart-theme";
import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
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

type ActivityDeepDiveChartProps = {
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

export function ActivityDeepDiveChart({ series, range }: ActivityDeepDiveChartProps) {
  const data = series.items.map((item) => ({
    label: formatAxisLabel(item.bucket_start, range),
    runs: item.runs,
    pages: item.pages,
    errors: item.errors,
  }));

  const isEmpty = data.every(
    (item) => item.runs === 0 && item.pages === 0 && item.errors === 0,
  );

  return (
    <div className={cn(dashboardCardClassName, "h-full p-8 transition-all duration-300 hover:shadow-lg")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-foreground">
            Activity deep dive
          </h2>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary/40" />
            <p className="font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {RANGE_CAPTIONS[range]} · throughput & errors
            </p>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="mt-8 flex h-[300px] items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10 text-sm text-muted-foreground">
          No activity recorded in this range yet.
        </div>
      ) : (
        <ChartContainer
          config={activityDeepDiveChartConfig}
          className="mt-8 aspect-auto h-[320px] w-full"
        >
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="deepRunsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-runs)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--color-runs)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="deepPagesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-pages)" stopOpacity={0.1} />
                <stop offset="100%" stopColor="var(--color-pages)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="deepErrorsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-errors)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--color-errors)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500, fontFamily: "var(--font-mono)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500, fontFamily: "var(--font-mono)" }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent className="mt-4" />} />
            <Area
              type="monotone"
              dataKey="runs"
              stroke="var(--color-runs)"
              fill="url(#deepRunsFill)"
              strokeWidth={3}
              animationDuration={1500}
            />
            <Area
              type="monotone"
              dataKey="pages"
              stroke="var(--color-pages)"
              fill="url(#deepPagesFill)"
              strokeWidth={2}
              animationDuration={1500}
            />
            <Area
              type="monotone"
              dataKey="errors"
              stroke="var(--color-errors)"
              fill="url(#deepErrorsFill)"
              strokeWidth={2}
              animationDuration={1500}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
