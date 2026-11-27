"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { ActivityDeepDiveChart } from "@/components/analytics/activity-deep-dive-chart";
import { AnalyticsDataTabs } from "@/components/analytics/analytics-data-tabs";
import { AnalyticsKpiGrid } from "@/components/analytics/analytics-kpi-grid";
import { AnalyticsProjectFilter } from "@/components/analytics/analytics-project-filter";
import { ModelUsageChart } from "@/components/analytics/model-usage-chart";
import { PipelineLibrarySection } from "@/components/analytics/pipeline-library-section";
import { RecentRunsTable } from "@/components/analytics/recent-runs-table";
import { RunKindChart } from "@/components/analytics/run-kind-chart";
import { RunOutcomesChart } from "@/components/analytics/run-outcomes-chart";
import { TopPipelinesList } from "@/components/analytics/top-pipelines-list";
import { Button } from "@/components/ui/button";
import type {
  ActivitySeries,
  AnalyticsRange,
  AnalyticsSummary,
  DocumentBreakdownList,
  ModelUsageList,
  NodeBreakdownList,
  PipelineBreakdownList,
  PipelineLibraryStats,
  ProjectBreakdownList,
  RecentRunList,
  RunKindBreakdown,
  RunOutcomes,
  TopPipelineList,
} from "@/lib/api/analytics";
import {
  ANALYTICS_RANGES,
  getAnalyticsExportUrl,
  RANGE_LABELS,
} from "@/lib/api/analytics";
import type { Project } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type AnalyticsDashboardProps = {
  summary: AnalyticsSummary;
  activity: ActivitySeries;
  outcomes: RunOutcomes;
  runKinds: RunKindBreakdown;
  topPipelines: TopPipelineList;
  recentRuns: RecentRunList;
  pipelineLibrary: PipelineLibraryStats;
  pipelines: PipelineBreakdownList;
  models: ModelUsageList;
  projects: ProjectBreakdownList;
  nodes: NodeBreakdownList;
  documents: DocumentBreakdownList;
  allProjects: Project[];
  selectedProjectId: string | null;
  range: AnalyticsRange;
};

export function AnalyticsDashboard({
  summary,
  activity,
  outcomes,
  runKinds,
  topPipelines,
  recentRuns,
  pipelineLibrary,
  pipelines,
  models,
  projects,
  nodes,
  documents,
  allProjects,
  selectedProjectId,
  range,
}: AnalyticsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setRange(nextRange: AnalyticsRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextRange);
    router.push(`/app/analytics?${params.toString()}`);
  }

  const exportUrl = getAnalyticsExportUrl(range, selectedProjectId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Throughput, reliability, and model performance across your projects and pipelines."
        actions={
          <>
            <div
              role="tablist"
              aria-label="Date range"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-card p-0.5"
            >
              {ANALYTICS_RANGES.map((option) => {
                const active = range === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setRange(option)}
                    className={cn(
                      "h-full rounded-md px-3 text-[13px] font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary dark:bg-primary/25"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {RANGE_LABELS[option]}
                  </button>
                );
              })}
            </div>
            <AnalyticsProjectFilter
              projects={allProjects}
              selectedProjectId={selectedProjectId}
            />
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-lg px-4 text-[13px] font-semibold"
              nativeButton={false}
              render={<a href={exportUrl} download />}
            >
              <Download className="size-4 text-primary" aria-hidden />
              Export
            </Button>
          </>
        }
      />

      <section aria-labelledby="analytics-kpi-heading">
        <div className="mb-5 flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-2">
            <div className="h-px w-8 bg-primary/30" />
            <h2
              id="analytics-kpi-heading"
              className="font-mono text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase"
            >
              Core Metrics
            </h2>
          </div>
          <p className="font-mono text-[10px] font-medium tracking-[0.1em] text-muted-foreground/70 uppercase">
            {RANGE_LABELS[range]} window
          </p>
        </div>
        <AnalyticsKpiGrid kpis={summary.kpis} />
      </section>

      <section aria-labelledby="analytics-performance-heading">
        <div className="mb-5 flex items-center gap-2 px-1">
          <div className="h-px w-8 bg-primary/30" />
          <h2
            id="analytics-performance-heading"
            className="font-mono text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase"
          >
            Performance Bento
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8 xl:row-span-2">
            <ActivityDeepDiveChart series={activity} range={range} />
          </div>
          <div className="xl:col-span-4 xl:row-span-2">
            <TopPipelinesList pipelines={topPipelines.items} />
          </div>
          <div className="xl:col-span-3">
            <RunOutcomesChart outcomes={outcomes} />
          </div>
          <div className="xl:col-span-3">
            <RunKindChart runKinds={runKinds} />
          </div>
          <div className="xl:col-span-6">
            <ModelUsageChart models={models} />
          </div>
          <div className="xl:col-span-12">
            <RecentRunsTable runs={recentRuns.items} />
          </div>
        </div>
      </section>

      <section aria-labelledby="analytics-library-heading">
        <h2
          id="analytics-library-heading"
          className="mb-4 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase"
        >
          Pipeline library
        </h2>
        <PipelineLibrarySection stats={pipelineLibrary} pipelines={pipelines} />
      </section>

      <section aria-labelledby="analytics-breakdown-heading">
        <h2
          id="analytics-breakdown-heading"
          className="mb-4 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase"
        >
          Data breakdown
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
