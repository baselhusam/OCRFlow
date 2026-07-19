import type { ProjectList, User } from "@/lib/api/client";
import { authenticatedApiFetch } from "@/lib/api/server";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getUserFirstName } from "@/lib/auth/display-name";
import { getWorkspaceStats } from "@/lib/projects/stats";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function AppDashboardPage() {
  const [{ data: projects }, { data: user }] = await Promise.all([
    authenticatedApiFetch<ProjectList>("/api/v1/projects"),
    authenticatedApiFetch<User>("/api/v1/auth/me"),
  ]);

  const stats = getWorkspaceStats(projects.items);

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-11 md:px-12">
      <DashboardOverview
        greeting={getGreeting()}
        displayName={getUserFirstName(user)}
        stats={stats}
        projects={projects.items}
      />
    </main>
  );
}
