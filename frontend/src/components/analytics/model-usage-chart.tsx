"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { modelUsageChartConfig } from "@/components/analytics/chart-theme";
import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ModelUsageList } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";

type ModelUsageChartProps = {
  models: ModelUsageList;
};

const ROW_HEIGHT = 30;
const MIN_CHART_HEIGHT = 260;
const MAX_LABEL_LENGTH = 19;

// Non-breaking spaces keep Recharts from wrapping a label onto a second row.
function truncateLabel(value: string): string {
  const label =
    value.length > MAX_LABEL_LENGTH
      ? `${value.slice(0, MAX_LABEL_LENGTH - 1)}…`
      : value;
  return label.replace(/ /g, "\u00a0");
}

export function ModelUsageChart({ models }: ModelUsageChartProps) {
  const data = models.items.map((item) => ({
    name: item.display_name ?? item.model_id.split("/").pop() ?? item.model_id,
    run_count: item.run_count,
    model_id: item.model_id,
  }));

  if (data.length === 0) {
    return (
      <div
        className={cn(
          dashboardCardClassName,
          "flex h-72 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10 px-6 text-sm text-muted-foreground",
        )}
      >
        No model runs recorded yet.
      </div>
    );
  }

  return (
    <div className={cn(dashboardCardClassName, "h-full p-8 transition-all duration-300 hover:shadow-lg")}>
      <h2 className="text-[18px] font-extrabold tracking-[-0.03em] text-foreground">
        Model usage
      </h2>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-primary/40" />
        <p className="font-mono text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Runs per model
        </p>
      </div>

      <ChartContainer
        config={modelUsageChartConfig}
        className="mt-8 aspect-auto w-full"
        // One row per model so long lists never squeeze labels into each other.
        style={{ height: Math.max(MIN_CHART_HEIGHT, data.length * ROW_HEIGHT + 40) }}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500, fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={160}
            interval={0}
            tickFormatter={truncateLabel}
            tick={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
          />
          <ChartTooltip content={<ChartTooltipContent nameKey="model_id" />} />
          <Bar
            dataKey="run_count"
            fill="var(--color-run_count)"
            fillOpacity={0.9}
            radius={[0, 6, 6, 0]}
            barSize={24}
            animationDuration={1500}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
