import type { Metadata } from "next";

import { PageContainer } from "@/components/app/page-header";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import type { PipelineList, ProjectList, User } from "@/lib/api/client";
import type { PipelineJobSummary } from "@/lib/api/jobs";
import { authenticatedApiFetch } from "@/lib/api/server";
import { getUserFirstName } from "@/lib/auth/display-name";
import { canAccessAdminPanel, canWrite } from "@/lib/auth/roles";
import { getWorkspaceStats } from "@/lib/projects/stats";

export const metadata: Metadata = {
  title: "Dashboard",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function AppDashboardPage() {
  const [{ data: projects }, { data: user }, pipelines, jobs] =
    await Promise.all([
      authenticatedApiFetch<ProjectList>("/api/v1/projects"),
      authenticatedApiFetch<User>("/api/v1/auth/me"),
      // Secondary panels: a failure here should not take the dashboard down.
      authenticatedApiFetch<PipelineList>("/api/v1/pipelines")
        .then(({ data }) => data.items)
        .catch(() => []),
      authenticatedApiFetch<{ items: PipelineJobSummary[] }>("/api/v1/jobs")
        .then(({ data }) => data.items)
        .catch(() => [] as PipelineJobSummary[]),
    ]);

  return (
    <PageContainer>
      <DashboardOverview
        greeting={getGreeting()}
        displayName={getUserFirstName(user)}
        stats={getWorkspaceStats(projects.items)}
        projects={projects.items}
        pipelines={pipelines}
        jobs={jobs}
        canWrite={canWrite(user)}
        isAdmin={canAccessAdminPanel(user)}
      />
    </PageContainer>
  );
}
