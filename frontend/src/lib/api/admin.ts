import type { UserRole } from "@/lib/api/client";
import type {
  ActivitySeries,
  AnalyticsOverview,
  AnalyticsRange,
  AnalyticsSummary,
  DocumentBreakdownList,
  ModelUsageList,
  NodeBreakdownList,
  ProjectBreakdownList,
  RecentRunList,
  RunOutcomes,
  TopPipelineList,
  UserActivitySeries,
} from "@/lib/api/analytics";

export type AdminAnalyticsSubTab =
  | "overview"
  | "engagement"
  | "breakdown"
  | "timeline"
  | "pipelines";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  role: UserRole;
  is_active: boolean;
  project_count: number;
  run_count: number;
  pages_processed: number;
  last_login_at: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUserList = {
  items: AdminUser[];
};

export type AdminUserCreate = {
  email: string;
  password: string;
  full_name?: string | null;
  role?: UserRole;
};

export type AdminUserUpdate = {
  full_name?: string | null;
  display_name?: string | null;
  role?: UserRole;
  is_active?: boolean;
};

export type UserLeaderboardItem = {
  user_id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  role: string;
  project_count: number;
  run_count: number;
  pages_processed: number;
  last_login_at: string | null;
  last_run_at: string | null;
};

export type UserLeaderboardList = {
  items: UserLeaderboardItem[];
};

export type AdminAnalyticsSummary = AnalyticsSummary;
export type AdminActivitySeries = ActivitySeries;
export type AdminRunOutcomes = RunOutcomes;
export type AdminTopPipelineList = TopPipelineList;
export type AdminRecentRunList = RecentRunList;
export type AdminAnalyticsOverview = AnalyticsOverview;
export type AdminModelUsageList = ModelUsageList;
export type AdminUserActivitySeries = UserActivitySeries;
export type AdminProjectBreakdownList = ProjectBreakdownList;
export type AdminNodeBreakdownList = NodeBreakdownList;
export type AdminDocumentBreakdownList = DocumentBreakdownList;

export function buildAdminAnalyticsQuery(range: AnalyticsRange): string {
  return `range=${range}`;
}

export function buildAdminAnalyticsTabQuery(options: {
  range?: AnalyticsRange;
  analyticsTab?: AdminAnalyticsSubTab;
}): string {
  const params = new URLSearchParams({
    tab: "analytics",
    range: options.range ?? "30d",
    analyticsTab: options.analyticsTab ?? "overview",
  });
  return params.toString();
}

export function getAdminAnalyticsExportUrl(range: AnalyticsRange): string {
  return `/api/admin/analytics/export?range=${range}`;
}

export async function createAdminUser(payload: AdminUserCreate): Promise<Response> {
  return fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUser(
  userId: string,
  payload: AdminUserUpdate,
): Promise<Response> {
  return fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function resetAdminUserPassword(
  userId: string,
  password: string,
): Promise<Response> {
  return fetch(`/api/admin/users/${userId}/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

export async function deleteAdminUser(userId: string): Promise<Response> {
  return fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
}
