import {
  Activity,
  Cpu,
  FileStack,
  FolderKanban,
  GitBranch,
  Layers,
  Network,
  Percent,
  ScrollText,
  Workflow,
} from "lucide-react";

import {
  AdminSectionHeading,
  AdminStatCard,
} from "@/components/admin/analytics/admin-analytics-primitives";
import { ActivityChart } from "@/components/analytics/activity-chart";
import { AnalyticsKpiGrid } from "@/components/analytics/analytics-kpi-grid";
import { ModelUsageChart } from "@/components/analytics/model-usage-chart";
import { RunKindChart } from "@/components/analytics/run-kind-chart";
import { RunOutcomesChart } from "@/components/analytics/run-outcomes-chart";
import { TopPipelinesList } from "@/components/analytics/top-pipelines-list";
import { RelativeTime } from "@/components/relative-time";
import type {
  ActivitySeries,
  AnalyticsOverview,
  AnalyticsRange,
  AnalyticsSummary,
  ModelUsageList,
  PipelineLibraryStats,
  RunKindBreakdown,
  RunOutcomes,
  TopPipelineList,
} from "@/lib/api/analytics";
import { formatSuccessRate } from "@/lib/api/analytics";

type AdminAnalyticsOverviewProps = {
  overview: AnalyticsOverview;
  summary: AnalyticsSummary;
  activity: ActivitySeries;
  outcomes: RunOutcomes;
  topPipelines: TopPipelineList;
  models: ModelUsageList;
  pipelineLibrary: PipelineLibraryStats;
  runKinds: RunKindBreakdown;
  range: AnalyticsRange;
};

export function AdminAnalyticsOverview({
  overview,
  summary,
  activity,
  outcomes,
  topPipelines,
  models,
  pipelineLibrary,
  runKinds,
}: AdminAnalyticsOverviewProps) {
  return (
    <div className="space-y-6">

      {/* ── Platform stats bento ── 5 cols × 2 rows, no orphans */}
      <section aria-labelledby="admin-overview-stats">
        <AdminSectionHeading
          title="Platform overview"
          subtitle="inventory and lifetime totals"
          action={
            overview.last_activity_at ? (
              <p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                Last activity <RelativeTime value={overview.last_activity_at} />
              </p>
            ) : undefined
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <AdminStatCard label="Projects" value={overview.project_count} icon={FolderKanban} />
          <AdminStatCard
            label="Pipeline nodes"
            value={overview.total_nodes}
            icon={GitBranch}
            hint={
              overview.active_pipelines > 0
                ? `${overview.active_pipelines} active`
                : undefined
            }
          />
          <AdminStatCard
            label="Definitions"
            value={pipelineLibrary.total_pipelines}
            icon={Workflow}
            hint={`${pipelineLibrary.active_pipelines} active`}
          />
          <AdminStatCard
            label="Models in use"
            value={overview.unique_models}
            icon={Cpu}
            hint={`${overview.total_edges} connections`}
          />
          <AdminStatCard label="Uploaded files" value={overview.total_files} icon={FileStack} />
          <AdminStatCard label="Total runs" value={overview.total_runs} icon={Activity} />
          <AdminStatCard
            label="Pages processed"
            value={overview.pages_processed}
            icon={ScrollText}
          />
          <AdminStatCard
            label="Runs today"
            value={overview.runs_today > 0 ? overview.runs_today : "—"}
            icon={Layers}
          />
          <AdminStatCard
            label="Success rate"
            value={formatSuccessRate(overview.success_rate)}
            icon={Percent}
          />
          <AdminStatCard
            label="Avg complexity"
            value={pipelineLibrary.avg_nodes.toFixed(1)}
            icon={Network}
            hint="nodes per definition"
          />
        </div>
      </section>

      {/* ── Period KPIs ── */}
      <section aria-labelledby="admin-period-kpis">
        <AdminSectionHeading
          title="Period performance"
          subtitle={`${summary.range} window`}
        />
        <AnalyticsKpiGrid kpis={summary.kpis} />
      </section>

      {/* ── Activity bento ── area chart full width, then model usage below */}
      <section aria-labelledby="admin-overview-charts">
        <AdminSectionHeading
          title="Activity"
          subtitle="runs and pages over time"
        />
        {/* ActivityChart and ModelUsageChart are both self-contained — no extra wrapper */}
        <ActivityChart series={activity} />
      </section>

      {/* ── Model + outcomes + run kinds bento ── */}
      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr_1fr]">
        <ModelUsageChart models={models} />
        <RunOutcomesChart outcomes={outcomes} />
        <RunKindChart runKinds={runKinds} />
      </div>

      {/* ── Top pipelines ── full width to give projects breathing room */}
      <TopPipelinesList pipelines={topPipelines.items} />

    </div>
  );
}
