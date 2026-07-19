"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { pipelineCompositionChartConfig } from "@/components/analytics/chart-theme";
import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { PipelineBreakdownList } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";

type PipelineCompositionChartProps = {
  pipelines: PipelineBreakdownList;
};

function buildIOFrequency(pipelines: PipelineBreakdownList) {
  const counts = new Map<string, number>();

  for (const pipeline of pipelines.items) {
    if (!pipeline.input_type_label || !pipeline.output_type_label) continue;
    const label = `${pipeline.input_type_label} → ${pipeline.output_type_label}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function PipelineCompositionChart({ pipelines }: PipelineCompositionChartProps) {
  const data = buildIOFrequency(pipelines);

  return (
    <div className={cn(dashboardCardClassName, "p-6")}>
      <div>
        <h2 className="text-[17px] font-bold tracking-tight text-foreground">
          Pipeline I/O composition
        </h2>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          input → output type frequency across definitions
        </p>
      </div>

      {data.length === 0 ? (
        <div className="mt-6 flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          No pipeline I/O types defined yet.
        </div>
      ) : (
        <ChartContainer
          config={pipelineCompositionChartConfig}
          className="mt-5 aspect-auto h-[220px] w-full"
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 8, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={140}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              fillOpacity={0.85}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
