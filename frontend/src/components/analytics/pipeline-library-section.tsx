"use client";

import Link from "next/link";
import { GitBranch, Layers, Workflow } from "lucide-react";

import {
  dashboardCardClassName,
  dashboardStatCardClassName,
} from "@/components/dashboard/dashboard-styles";
import { RelativeTime } from "@/components/relative-time";
import type { PipelineBreakdownList, PipelineLibraryStats } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";

type PipelineLibrarySectionProps = {
  stats: PipelineLibraryStats;
  pipelines: PipelineBreakdownList;
};

function formatPipelineIO(
  input: string | null,
  output: string | null,
): string | null {
  if (!input || !output) return null;
  return `${input} → ${output}`;
}

function StatItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 text-muted-foreground/70" aria-hidden /> : null}
        <p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
      </div>
      <p className="text-[28px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
        {value}
      </p>
    </div>
  );
}

export function PipelineLibrarySection({
  stats,
  pipelines,
}: PipelineLibrarySectionProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
      {/* Stats widget */}
      <div className={cn(dashboardCardClassName, "flex flex-col gap-8 p-8 transition-all duration-300 hover:shadow-lg")}>
        <div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary/40" />
            <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
              Library
            </p>
          </div>
          <h2 className="mt-2 text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
            Pipeline library
          </h2>
          <p className="mt-1 font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            reusable definitions
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-8">
          <StatItem
            label="Total"
            value={stats.total_pipelines}
            icon={Workflow}
          />
          <StatItem
            label="Active"
            value={stats.active_pipelines}
            icon={GitBranch}
          />
          <StatItem
            label="Avg nodes"
            value={stats.avg_nodes.toFixed(1)}
            icon={Layers}
          />
          <StatItem
            label="Avg models"
            value={stats.avg_models.toFixed(1)}
            icon={GitBranch}
          />
        </div>

        {stats.unique_io_types > 0 ? (
          <div className="mt-auto rounded-xl border border-primary/10 bg-primary/5 px-5 py-4 ring-1 ring-primary/10">
            <p className="font-mono text-[10px] font-bold tracking-[0.1em] text-primary uppercase">
              I/O types
            </p>
            <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-foreground">
              {stats.unique_io_types}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              unique input → output combinations
            </p>
          </div>
        ) : null}
      </div>

      {/* Table card */}
      <div className={cn(dashboardCardClassName, "overflow-hidden transition-all duration-300 hover:shadow-lg")}>
        <div className="flex items-center justify-between px-8 pt-8 pb-6">
          <div>
            <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-foreground">
              Definitions
            </h2>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary/40" />
              <p className="font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                all reusable pipelines
              </p>
            </div>
          </div>
        </div>

        {pipelines.items.length === 0 ? (
          <div className="px-8 py-12 text-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <p>No pipeline definitions yet.</p>
              <p className="text-xs opacity-70 text-primary">Create one from the Pipelines page.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-y border-border bg-secondary/20 font-mono text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  <th className="px-8 py-4">Pipeline</th>
                  <th className="px-6 py-4">I/O</th>
                  <th className="px-6 py-4 text-right">Nodes</th>
                  <th className="px-6 py-4 text-right">Models</th>
                  <th className="px-8 py-4">Updated</th>
                </tr>
              </thead>
              <tbody>
                {pipelines.items.map((pipeline) => {
                  const ioLabel = formatPipelineIO(
                    pipeline.input_type_label,
                    pipeline.output_type_label,
                  );

                  return (
                    <tr
                      key={pipeline.pipeline_id}
                      className="group/row border-b border-border/40 transition-colors hover:bg-secondary/10 last:border-b-0"
                    >
                      <td className="px-8 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <span
                            className="size-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor]"
                            style={{ backgroundColor: pipeline.accent_color, color: pipeline.accent_color }}
                            aria-hidden
                          />
                          <Link
                            href={`/app/pipelines/${pipeline.pipeline_id}/canvas`}
                            className="text-[14px] font-bold text-foreground transition-colors group-hover/row:text-primary"
                          >
                            {pipeline.name}
                          </Link>
                          {pipeline.is_archived ? (
                            <span className="rounded-md bg-secondary/80 px-2 py-0.5 font-mono text-[9px] font-bold text-muted-foreground uppercase ring-1 ring-border/50">
                              Archived
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className="font-mono text-[12px] font-medium text-muted-foreground">
                          {ioLabel ?? "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right align-middle font-mono text-[13px] font-bold tabular-nums text-foreground">
                        {pipeline.node_count}
                      </td>
                      <td className="px-6 py-4 text-right align-middle font-mono text-[13px] font-bold tabular-nums text-foreground">
                        {pipeline.model_count}
                      </td>
                      <td className="px-8 py-4 align-middle">
                        <span className="text-[13px] text-muted-foreground">
                          <RelativeTime value={pipeline.updated_at} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
