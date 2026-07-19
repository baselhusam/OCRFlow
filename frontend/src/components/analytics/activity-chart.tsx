"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { activityChartConfig } from "@/components/analytics/chart-theme";
import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ActivitySeries } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";

type ActivityChartProps = {
  series: ActivitySeries;
};

function formatBucketLabel(value: string, bucket: string): string {
  const date = new Date(value);
  if (bucket === "hour") {
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
    });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ActivityChart({ series }: ActivityChartProps) {
  const data = series.items.map((item) => ({
    label: formatBucketLabel(item.bucket_start, series.bucket),
    runs: item.runs,
    pages: item.pages,
  }));

  if (data.every((item) => item.runs === 0 && item.pages === 0)) {
    return (
      <div
        className={cn(
          dashboardCardClassName,
          "flex h-64 items-center justify-center px-6 text-sm text-muted-foreground",
        )}
      >
        No activity recorded yet. Run a pipeline node to populate this chart.
      </div>
    );
  }

  return (
    <ChartContainer
      config={activityChartConfig}
      className={cn(dashboardCardClassName, "aspect-auto h-72 w-full p-5")}
    >
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="runsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-runs)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-runs)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="pagesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-pages)" stopOpacity={0.16} />
            <stop offset="100%" stopColor="var(--color-pages)" stopOpacity={0} />
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
          dataKey="runs"
          stroke="var(--color-runs)"
          fill="url(#runsFill)"
          strokeWidth={2.5}
        />
        <Area
          type="monotone"
          dataKey="pages"
          stroke="var(--color-pages)"
          fill="url(#pagesFill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
