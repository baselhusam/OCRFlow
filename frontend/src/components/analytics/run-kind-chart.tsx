"use client";

import { Cell, Pie, PieChart } from "recharts";

import { runKindChartConfig } from "@/components/analytics/chart-theme";
import { dashboardCardClassName } from "@/components/dashboard/dashboard-styles";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { RunKindBreakdown } from "@/lib/api/analytics";

const RUN_KIND_COLORS: Record<string, string> = {
  test_run: "#E8A317",
  pipeline_run: "#5b2eef",
  inference_run: "#2F6BFF",
};

type RunKindChartProps = {
  runKinds: RunKindBreakdown;
};

export function RunKindChart({ runKinds }: RunKindChartProps) {
  const data = runKinds.segments.map((segment) => ({
    name: segment.label,
    value: segment.count,
    percentage: segment.percentage,
    colorKey: segment.color_key,
  }));

  return (
    <div className={cn(dashboardCardClassName, "flex h-full flex-col p-8 transition-all duration-300 hover:shadow-lg")}>
      <h2 className="text-[18px] font-extrabold tracking-[-0.03em] text-foreground">
        Run kinds
      </h2>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-primary/40" />
        <p className="font-mono text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Execution types
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-10 text-sm text-muted-foreground">
          No run kind data in this range yet.
        </div>
      ) : (
        <>
          <div className="relative mx-auto my-8 flex items-center justify-center">
            <ChartContainer config={runKindChartConfig} className="aspect-square h-[160px] w-[160px]">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={70}
                  strokeWidth={0}
                  paddingAngle={4}
                  animationDuration={1500}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={RUN_KIND_COLORS[entry.colorKey] ?? "#9A95B5"}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-[28px] font-extrabold leading-none tracking-[-0.04em] text-foreground">
                {runKinds.total_runs.toLocaleString()}
              </p>
              <p className="mt-1 font-mono text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                total
              </p>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            {runKinds.segments.map((segment) => (
              <div
                key={segment.label}
                className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-2 py-1 transition-colors hover:bg-secondary/30"
              >
                <span className="inline-flex items-center gap-2.5 text-[13px] font-bold text-foreground/90">
                  <span
                    className="size-2.5 rounded-sm shadow-sm"
                    style={{
                      backgroundColor:
                        RUN_KIND_COLORS[segment.color_key] ?? "#9A95B5",
                    }}
                    aria-hidden
                  />
                  {segment.label}
                </span>
                <span className="font-mono text-[13px] font-bold text-foreground">
                  {segment.percentage}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
