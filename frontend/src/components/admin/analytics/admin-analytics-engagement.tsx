import { AdminUsersLeaderboard } from "@/components/admin/analytics/admin-users-leaderboard";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import { PlatformHealthChart } from "@/components/analytics/platform-health-chart";
import type { ActivitySeries, AnalyticsRange, UserActivitySeries } from "@/lib/api/analytics";
import type { UserLeaderboardList } from "@/lib/api/admin";

type AdminAnalyticsEngagementProps = {
  userActivity: UserActivitySeries;
  activity: ActivitySeries;
  userLeaderboard: UserLeaderboardList;
  range: AnalyticsRange;
};

export function AdminAnalyticsEngagement({
  userActivity,
  activity,
  userLeaderboard,
  range,
}: AdminAnalyticsEngagementProps) {
  return (
    <div className="space-y-6">
      {/* ── Charts bento — EngagementChart self-wraps, PlatformHealthChart self-wraps */}
      <div className="grid gap-5 xl:grid-cols-2">
        <EngagementChart series={userActivity} range={range} />
        <PlatformHealthChart series={activity} range={range} />
      </div>

      {/* ── User leaderboard ── */}
      <section aria-labelledby="admin-engagement-users">
        <AdminUsersLeaderboard users={userLeaderboard} />
      </section>
    </div>
  );
}
