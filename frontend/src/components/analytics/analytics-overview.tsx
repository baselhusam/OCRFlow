"use client";

import {
  Activity,
  Cpu,
  FileStack,
  FolderKanban,
  GitBranch,
  Layers,
  Percent,
  ScrollText,
} from "lucide-react";

import { ActivityChart } from "@/components/analytics/activity-chart";
import { AnalyticsProjectFilter } from "@/components/analytics/analytics-project-filter";
import { AnalyticsStat, AnalyticsStatGrid } from "@/components/analytics/analytics-stat-grid";
import { AnalyticsDataTabs } from "@/components/analytics/analytics-data-tabs";
import { ModelUsageChart } from "@/components/analytics/model-usage-chart";
import { RelativeTime } from "@/components/relative-time";
import type {
  ActivitySeries,
  AnalyticsOverview,
  DocumentBreakdownList,
  ModelUsageList,
  NodeBreakdownList,
  ProjectBreakdownList,
} from "@/lib/api/analytics";
import { formatSuccessRate } from "@/lib/api/analytics";
import type { Project } from "@/lib/api/client";

type AnalyticsOverviewPanelProps = {
  overview: AnalyticsOverview;
  activity: ActivitySeries;
  models: ModelUsageList;
  projects: ProjectBreakdownList;
  nodes: NodeBreakdownList;
  documents: DocumentBreakdownList;
  allProjects: Project[];
  selectedProjectId: string | null;
};

export function AnalyticsOverviewPanel({
  overview,
  activity,
  models,
  projects,
  nodes,
  documents,
  allProjects,
  selectedProjectId,
}: AnalyticsOverviewPanelProps) {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] tracking-[0.3em] text-primary uppercase">
            Workspace
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Analytics
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            In-depth metrics for projects, pipelines, models, and processed
            documents. Time-series data builds as you run nodes on the canvas.
          </p>
        </div>
        <AnalyticsProjectFilter
          projects={allProjects}
          selectedProjectId={selectedProjectId}
        />
      </div>

      <section aria-labelledby="analytics-stats-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2
            id="analytics-stats-heading"
            className="font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase"
          >
            Overview
          </h2>
          {overview.last_activity_at ? (
            <p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
              Last activity <RelativeTime value={overview.last_activity_at} />
            </p>
          ) : null}
        </div>
        <AnalyticsStatGrid>
          <AnalyticsStat
            label="Projects"
            value={overview.project_count}
            icon={FolderKanban}
          />
          <AnalyticsStat
            label="Pipeline nodes"
            value={overview.total_nodes}
            icon={GitBranch}
            hint={
              overview.active_pipelines > 0
                ? `${overview.active_pipelines} active pipeline${overview.active_pipelines === 1 ? "" : "s"}`
                : undefined
            }
          />
          <AnalyticsStat
            label="Models in use"
            value={overview.unique_models}
            icon={Cpu}
            hint={`${overview.total_edges} connection${overview.total_edges === 1 ? "" : "s"}`}
          />
          <AnalyticsStat
            label="Uploaded files"
            value={overview.total_files}
            icon={FileStack}
          />
          <AnalyticsStat
            label="Total runs"
            value={overview.total_runs}
            icon={Activity}
          />
          <AnalyticsStat
            label="Pages processed"
            value={overview.pages_processed}
            icon={ScrollText}
          />
          <AnalyticsStat
            label="Runs today"
            value={overview.runs_today > 0 ? overview.runs_today : "—"}
            icon={Layers}
          />
          <AnalyticsStat
            label="Success rate"
            value={formatSuccessRate(overview.success_rate)}
            icon={Percent}
          />
        </AnalyticsStatGrid>
      </section>

      <section aria-labelledby="analytics-charts-heading">
        <h2
          id="analytics-charts-heading"
          className="mb-4 font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase"
        >
          Activity
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
              Runs & pages over time
            </p>
            <ActivityChart series={activity} />
          </div>
          <div>
            <p className="mb-3 font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
              Most used models
            </p>
            <ModelUsageChart models={models} />
          </div>
        </div>
      </section>

      <section aria-labelledby="analytics-tables-heading">
        <h2
          id="analytics-tables-heading"
          className="mb-4 font-mono text-[11px] tracking-[0.25em] text-muted-foreground uppercase"
        >
          Breakdown
        </h2>
        <AnalyticsDataTabs
          projects={projects}
          nodes={nodes}
          models={models}
          documents={documents}
        />
      </section>
    </div>
  );
}
