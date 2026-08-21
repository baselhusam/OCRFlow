"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

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
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-[0_1px_3px_rgba(20,18,37,0.05)] md:p-10">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[45%] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_75%)]"
          aria-hidden
        />
        <div className="relative flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <p className="font-mono text-[12px] font-semibold tracking-[0.2em] text-primary uppercase">
                Workspace intelligence
              </p>
            </div>
            <h1 className="mt-4 text-[40px] font-extrabold leading-[1.05] tracking-[-0.035em] text-foreground">
              Pipeline analytics
            </h1>
            <p className="mt-5 max-w-[600px] text-[17px] leading-[1.6] text-muted-foreground">
              Real-time visibility into your document processing throughput, 
              reliability, and model performance across all active projects.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-border/60 bg-background/50 p-1.5 backdrop-blur-md">
              <div className="flex items-center gap-1">
                {ANALYTICS_RANGES.map((option) => {
                  const active = range === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRange(option)}
                      className={cn(
                        "rounded-lg px-4 py-2 text-[13px] font-bold transition-all",
                        active
                          ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                      )}
                    >
                      {RANGE_LABELS[option]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AnalyticsProjectFilter
                projects={allProjects}
                selectedProjectId={selectedProjectId}
              />
              <Button
                variant="outline"
                className="h-11 gap-2.5 rounded-xl border-border/60 px-5 text-[13px] font-bold shadow-sm transition-all hover:bg-secondary/50"
                nativeButton={false}
                render={<a href={exportUrl} download />}
              >
                <Download className="size-4 text-primary" aria-hidden />
                Export
              </Button>
            </div>
          </div>
        </div>
      </section>

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
