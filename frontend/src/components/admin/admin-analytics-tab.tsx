"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ChartColumn,
  Clock3,
  Download,
  GitBranch,
  LayoutDashboard,
  Table2,
} from "lucide-react";

import { AdminAnalyticsBreakdown } from "@/components/admin/analytics/admin-analytics-breakdown";
import { AdminAnalyticsEngagement } from "@/components/admin/analytics/admin-analytics-engagement";
import { AdminAnalyticsOverview } from "@/components/admin/analytics/admin-analytics-overview";
import { AdminAnalyticsPipelines } from "@/components/admin/analytics/admin-analytics-pipelines";
import { AdminAnalyticsTimeline } from "@/components/admin/analytics/admin-analytics-timeline";
import { Button } from "@/components/ui/button";
import type { UserLeaderboardList } from "@/lib/api/admin";
import type { AdminAnalyticsSubTab } from "@/lib/api/admin";
import { getAdminAnalyticsExportUrl } from "@/lib/api/admin";
import type {
  ActivitySeries,
  AnalyticsOverview,
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
  UserActivitySeries,
} from "@/lib/api/analytics";
import { ANALYTICS_RANGES, RANGE_LABELS } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";

const ANALYTICS_SUB_TABS: {
  key: AdminAnalyticsSubTab;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "engagement", label: "Engagement", icon: Activity },
  { key: "pipelines", label: "Pipelines", icon: GitBranch },
  { key: "breakdown", label: "Breakdown", icon: Table2 },
  { key: "timeline", label: "Timeline", icon: Clock3 },
];

type AdminAnalyticsTabProps = {
  overview: AnalyticsOverview;
  summary: AnalyticsSummary;
  activity: ActivitySeries;
  userActivity: UserActivitySeries;
  outcomes: RunOutcomes;
  topPipelines: TopPipelineList;
  recentRuns: RecentRunList;
  userLeaderboard: UserLeaderboardList;
  models: ModelUsageList;
  projects: ProjectBreakdownList;
  nodes: NodeBreakdownList;
  documents: DocumentBreakdownList;
  pipelineLibrary: PipelineLibraryStats;
  pipelines: PipelineBreakdownList;
  runKinds: RunKindBreakdown;
  range: AnalyticsRange;
  analyticsTab: AdminAnalyticsSubTab;
};

export function AdminAnalyticsTab({
  overview,
  summary,
  activity,
  userActivity,
  outcomes,
  topPipelines,
  recentRuns,
  userLeaderboard,
  models,
  projects,
  nodes,
  documents,
  pipelineLibrary,
  pipelines,
  runKinds,
  range,
  analyticsTab,
}: AdminAnalyticsTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setRange(nextRange: AnalyticsRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "analytics");
    params.set("range", nextRange);
    router.push(`/app/admin?${params.toString()}`);
  }

  function setAnalyticsTab(nextTab: AdminAnalyticsSubTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "analytics");
    params.set("analyticsTab", nextTab);
    router.push(`/app/admin?${params.toString()}`);
  }

  const exportUrl = getAdminAnalyticsExportUrl(range);

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ChartColumn className="size-3.5" aria-hidden />
            </span>
            <h2 className="text-[17px] font-bold text-foreground">Platform analytics</h2>
          </div>
          <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            cross-workspace metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-secondary/80 p-0.5">
            {ANALYTICS_RANGES.map((option) => {
              const active = range === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  className={cn(
                    "rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {RANGE_LABELS[option]}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-lg px-4 text-[13px] font-semibold"
            nativeButton={false}
            render={<a href={exportUrl} download />}
          >
            <Download className="size-4" aria-hidden />
            Export
          </Button>
        </div>
      </div>

      <div className="flex gap-7 border-b border-border">
        {ANALYTICS_SUB_TABS.map((tab) => {
          const active = analyticsTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setAnalyticsTab(tab.key)}
              className={cn(
                "flex items-center gap-2 pb-3.5 text-sm font-semibold transition-colors",
                active
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>

      {analyticsTab === "overview" ? (
        <AdminAnalyticsOverview
          overview={overview}
          summary={summary}
          activity={activity}
          outcomes={outcomes}
          topPipelines={topPipelines}
          models={models}
          pipelineLibrary={pipelineLibrary}
          runKinds={runKinds}
          range={range}
        />
      ) : null}

      {analyticsTab === "engagement" ? (
        <AdminAnalyticsEngagement
          userActivity={userActivity}
          activity={activity}
          userLeaderboard={userLeaderboard}
          range={range}
        />
      ) : null}

      {analyticsTab === "pipelines" ? (
        <AdminAnalyticsPipelines
          pipelineLibrary={pipelineLibrary}
          pipelines={pipelines}
        />
      ) : null}

      {analyticsTab === "breakdown" ? (
        <AdminAnalyticsBreakdown
          projects={projects}
          nodes={nodes}
          models={models}
          documents={documents}
          userLeaderboard={userLeaderboard}
        />
      ) : null}

      {analyticsTab === "timeline" ? (
        <AdminAnalyticsTimeline recentRuns={recentRuns} />
      ) : null}
    </div>
  );
}
