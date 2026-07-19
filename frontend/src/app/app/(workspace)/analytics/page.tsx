import { Suspense } from "react";

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
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
  buildAnalyticsDashboardQuery,
  resolveActivityRangeDates,
} from "@/lib/api/analytics";
import type { ProjectList } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";

type AnalyticsPageProps = {
  searchParams: Promise<{ project?: string; range?: string }>;
};

function parseRange(value: string | undefined): AnalyticsRange {
  if (value === "7d" || value === "90d") return value;
  return "30d";
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const { project: selectedProjectId, range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  const activityRange = resolveActivityRangeDates(range);

  const [
    { data: allProjects },
    { data: summary },
    { data: activity },
    { data: outcomes },
    { data: runKinds },
    { data: topPipelines },
    { data: recentRuns },
    { data: pipelineLibrary },
    { data: pipelines },
    { data: models },
    { data: projects },
    { data: nodes },
    { data: documents },
  ] = await Promise.all([
    authenticatedApiFetch<ProjectList>("/api/v1/projects"),
    authenticatedApiFetch<AnalyticsSummary>(
      buildAnalyticsDashboardQuery("/api/v1/analytics/summary", {
        range,
        project_id: selectedProjectId,
      }),
    ),
    authenticatedApiFetch<ActivitySeries>(
      `/api/v1/analytics/activity?from=${encodeURIComponent(activityRange.from)}&to=${encodeURIComponent(activityRange.to)}&bucket=day${selectedProjectId ? `&project_id=${selectedProjectId}` : ""}`,
    ),
    authenticatedApiFetch<RunOutcomes>(
      buildAnalyticsDashboardQuery("/api/v1/analytics/outcomes", {
        range,
        project_id: selectedProjectId,
      }),
    ),
    authenticatedApiFetch<RunKindBreakdown>(
      buildAnalyticsDashboardQuery("/api/v1/analytics/run-kinds", {
        range,
        project_id: selectedProjectId,
      }),
    ),
    authenticatedApiFetch<TopPipelineList>(
      buildAnalyticsDashboardQuery("/api/v1/analytics/top-pipelines", {
        range,
        project_id: selectedProjectId,
        limit: 5,
      }),
    ),
    authenticatedApiFetch<RecentRunList>(
      buildAnalyticsDashboardQuery("/api/v1/analytics/runs", {
        range,
        project_id: selectedProjectId,
        limit: 20,
      }),
    ),
    authenticatedApiFetch<PipelineLibraryStats>("/api/v1/analytics/pipeline-library"),
    authenticatedApiFetch<PipelineBreakdownList>("/api/v1/analytics/pipelines?limit=20"),
    authenticatedApiFetch<ModelUsageList>(
      `/api/v1/analytics/models?limit=10${selectedProjectId ? `&project_id=${selectedProjectId}` : ""}`,
    ),
    authenticatedApiFetch<ProjectBreakdownList>("/api/v1/analytics/projects"),
    authenticatedApiFetch<NodeBreakdownList>(
      selectedProjectId
        ? `/api/v1/analytics/nodes?project_id=${selectedProjectId}`
        : "/api/v1/analytics/nodes",
    ),
    authenticatedApiFetch<DocumentBreakdownList>(
      selectedProjectId
        ? `/api/v1/analytics/documents?project_id=${selectedProjectId}`
        : "/api/v1/analytics/documents",
    ),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1320px] flex-1 px-6 py-11 md:px-12">
      <Suspense>
        <AnalyticsDashboard
          summary={summary}
          activity={activity}
          outcomes={outcomes}
          runKinds={runKinds}
          topPipelines={topPipelines}
          recentRuns={recentRuns}
          pipelineLibrary={pipelineLibrary}
          pipelines={pipelines}
          models={models}
          projects={projects}
          nodes={nodes}
          documents={documents}
          allProjects={allProjects.items}
          selectedProjectId={selectedProjectId ?? null}
          range={range}
        />
      </Suspense>
    </main>
  );
}
