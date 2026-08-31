"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  AdminAnalyticsTab,
} from "@/components/admin/admin-analytics-tab";
import { AdminUsersTab } from "@/components/admin/admin-users-tab";
import type { AdminAnalyticsSubTab, AdminUser } from "@/lib/api/admin";
import type { UserLeaderboardList } from "@/lib/api/admin";
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
import type { User } from "@/lib/api/client";
import { canManageUsers } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

export type AdminTab = "users" | "analytics";

type AdminDashboardProps = {
  user: User;
  users: AdminUser[];
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
  initialTab: AdminTab;
  range: AnalyticsRange;
  analyticsTab: AdminAnalyticsSubTab;
};

const TAB_OPTIONS: { key: AdminTab; label: string }[] = [
  { key: "users", label: "Users" },
  { key: "analytics", label: "Analytics" },
];

export function AdminDashboard({
  user,
  users,
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
  initialTab,
  range,
  analyticsTab,
}: AdminDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = initialTab;

  function setTab(tab: AdminTab) {
    if (tab === "users") {
      router.push("/app/admin/users");
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/app/admin?${params.toString()}`);
  }

  return (
    <div>
      <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Admin</p>
      <h1 className="mt-3.5 text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground">
        Admin Panel
      </h1>
      <p className="mt-3.5 max-w-[640px] text-base leading-relaxed text-muted-foreground">
        Manage platform users and review cross-workspace analytics.
      </p>

      <div className="mt-9 flex gap-7 border-b border-border">
        {TAB_OPTIONS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTab(tab.key)}
              className={cn(
                "pb-3.5 text-sm font-semibold transition-colors",
                active
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "users" ? (
        <AdminUsersTab
          users={users}
          canManage={canManageUsers(user)}
          currentUserId={user.id}
        />
      ) : null}

      {activeTab === "analytics" ? (
        <AdminAnalyticsTab
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
          range={range}
          analyticsTab={analyticsTab}
        />
      ) : null}
    </div>
  );
}
