import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminDashboard, type AdminTab } from "@/components/admin/admin-dashboard";
import type { AdminAnalyticsSubTab } from "@/lib/api/admin";
import type { AdminUserList, UserLeaderboardList } from "@/lib/api/admin";
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
import { resolveActivityRangeDates } from "@/lib/api/analytics";
import type { User } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";
import { canAccessAdminPanel } from "@/lib/auth/roles";

const VALID_TABS = new Set<AdminTab>(["users", "analytics"]);

const VALID_ANALYTICS_TABS = new Set<AdminAnalyticsSubTab>([
  "overview",
  "engagement",
  "pipelines",
  "breakdown",
  "timeline",
]);

function parseRange(value: string | undefined): AnalyticsRange {
  if (value === "7d" || value === "90d") return value;
  return "30d";
}

function parseAnalyticsTab(value: string | undefined): AdminAnalyticsSubTab {
  if (value && VALID_ANALYTICS_TABS.has(value as AdminAnalyticsSubTab)) {
    return value as AdminAnalyticsSubTab;
  }
  return "overview";
}

type AdminPageProps = {
  searchParams: Promise<{ tab?: string; range?: string; analyticsTab?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const tabParam = params.tab;
  const initialTab =
    tabParam && VALID_TABS.has(tabParam as AdminTab)
      ? (tabParam as AdminTab)
      : "users";
  const range = parseRange(params.range);
  const analyticsTab = parseAnalyticsTab(params.analyticsTab);
  const activityRange = resolveActivityRangeDates(range);

  const { data: user } = await authenticatedApiFetch<User>("/api/v1/auth/me");

  if (!canAccessAdminPanel(user)) {
    redirect("/app");
  }

  const [
    { data: userList },
    { data: overview },
    { data: summary },
    { data: activity },
    { data: userActivity },
    { data: outcomes },
    { data: topPipelines },
    { data: recentRuns },
    { data: userLeaderboard },
    { data: models },
    { data: projects },
    { data: nodes },
    { data: documents },
    { data: pipelineLibrary },
    { data: pipelines },
    { data: runKinds },
  ] = await Promise.all([
    authenticatedApiFetch<AdminUserList>("/api/v1/admin/users"),
    authenticatedApiFetch<AnalyticsOverview>("/api/v1/admin/analytics/overview"),
    authenticatedApiFetch<AnalyticsSummary>(
      `/api/v1/admin/analytics/summary?range=${range}`,
    ),
    authenticatedApiFetch<ActivitySeries>(
      `/api/v1/admin/analytics/activity?from=${encodeURIComponent(activityRange.from)}&to=${encodeURIComponent(activityRange.to)}&bucket=day`,
    ),
    authenticatedApiFetch<UserActivitySeries>(
      `/api/v1/admin/analytics/user-activity?from=${encodeURIComponent(activityRange.from)}&to=${encodeURIComponent(activityRange.to)}&bucket=day`,
    ),
    authenticatedApiFetch<RunOutcomes>(
      `/api/v1/admin/analytics/outcomes?range=${range}`,
    ),
    authenticatedApiFetch<TopPipelineList>(
      `/api/v1/admin/analytics/top-pipelines?range=${range}&limit=5`,
    ),
    authenticatedApiFetch<RecentRunList>(
      `/api/v1/admin/analytics/runs?range=${range}&limit=50`,
    ),
    authenticatedApiFetch<UserLeaderboardList>(
      `/api/v1/admin/analytics/users?range=${range}&limit=50`,
    ),
    authenticatedApiFetch<ModelUsageList>("/api/v1/admin/analytics/models?limit=20"),
    authenticatedApiFetch<ProjectBreakdownList>("/api/v1/admin/analytics/projects"),
    authenticatedApiFetch<NodeBreakdownList>("/api/v1/admin/analytics/nodes"),
    authenticatedApiFetch<DocumentBreakdownList>("/api/v1/admin/analytics/documents"),
    authenticatedApiFetch<PipelineLibraryStats>(
      "/api/v1/admin/analytics/pipeline-library",
    ),
    authenticatedApiFetch<PipelineBreakdownList>(
      "/api/v1/admin/analytics/pipelines?limit=50",
    ),
    authenticatedApiFetch<RunKindBreakdown>(
      `/api/v1/admin/analytics/run-kinds?range=${range}`,
    ),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1320px] flex-1 px-6 py-11 md:px-12">
      <Suspense>
        <AdminDashboard
          user={user}
          users={userList.items}
          overview={overview}
          summary={summary}
          activity={activity}
          userActivity={userActivity}
          outcomes={outcomes}
          topPipelines={topPipelines}
          recentRuns={recentRuns}
          userLeaderboard={userLeaderboard}
          models={models}
          projects={projects}
          nodes={nodes}
          documents={documents}
          pipelineLibrary={pipelineLibrary}
          pipelines={pipelines}
          runKinds={runKinds}
          initialTab={initialTab}
          range={range}
          analyticsTab={analyticsTab}
        />
      </Suspense>
    </main>
  );
}
