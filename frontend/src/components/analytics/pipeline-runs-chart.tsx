"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
import { pipelineRunsChartConfig } from "@/components/analytics/chart-theme";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ActivitySeries, AnalyticsRange } from "@/lib/api/analytics";
import { RANGE_CAPTIONS } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";

type PipelineRunsChartProps = {
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

export function PipelineRunsChart({ series, range }: PipelineRunsChartProps) {
  const data = series.items.map((item) => ({
    label: formatAxisLabel(item.bucket_start, range),
    runs: item.runs,
  }));

  const isEmpty = data.every((item) => item.runs === 0);

  return (
    <div className={cn(dashboardCardClassName, "p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-bold tracking-tight text-foreground">
            Pipeline runs
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {RANGE_CAPTIONS[range]}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <span className="size-2.5 rounded-sm bg-primary" aria-hidden />
          runs / day
        </span>
      </div>

      {isEmpty ? (
        <div className="mt-6 flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          No pipeline runs recorded in this range yet.
        </div>
      ) : (
        <ChartContainer config={pipelineRunsChartConfig} className="mt-5 aspect-auto h-[220px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="runsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-runs)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-runs)" stopOpacity={0} />
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
            <Area
              type="monotone"
              dataKey="runs"
              stroke="var(--color-runs)"
              fill="url(#runsFill)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
