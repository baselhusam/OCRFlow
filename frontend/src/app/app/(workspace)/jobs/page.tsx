import type { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";

import { EmptyState } from "@/components/app/list-toolbar";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { JobsView } from "@/components/jobs/jobs-view";
import { buttonVariants } from "@/components/ui/button";
import type { PipelineJobSummary } from "@/lib/api/jobs";
import type { PipelineList, User } from "@/lib/api/client";
import { isPipelineReady } from "@/lib/api/pipelines";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";
import { canWrite } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Jobs",
};

export default async function JobsPage() {
  let user: User;
  try {
    const me = await authenticatedApiFetch<User>("/api/v1/auth/me");
    user = me.data;
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect("/login?next=/app/jobs");
    }
    throw error;
  }

  let jobs: PipelineJobSummary[] = [];
  let loadError: string | null = null;
  try {
    const { data } = await authenticatedApiFetch<{ items: PipelineJobSummary[] }>(
      "/api/v1/jobs",
    );
    jobs = data.items;
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect("/login?next=/app/jobs");
    }
    loadError =
      error instanceof Error ? error.message : "Failed to load jobs";
  }

  const writable = canWrite(user);
  const readyPipelineCount = await authenticatedApiFetch<PipelineList>(
    "/api/v1/pipelines",
  )
    .then(
      ({ data }) =>
        data.items.filter(
          (pipeline) => !pipeline.is_archived && isPipelineReady(pipeline),
        ).length,
    )
    .catch(() => 0);

  return (
    <PageContainer>
      <PageHeader
        title="Jobs"
        description="Apply a pipeline you already trust to many documents. Watch every file, page, and node as it runs."
        actions={
          writable && jobs.length > 0 ? (
            <Link
              href="/app/jobs/new"
              className={cn(
                buttonVariants(),
                "h-10 gap-2 rounded-lg px-4 text-sm font-semibold shadow-[0_8px_22px_-12px_var(--accent)]",
              )}
            >
              <Play className="size-4" aria-hidden />
              New job
            </Link>
          ) : null
        }
      />

      <div className="mt-8">
        {loadError ? (
          <EmptyState
            className="border-solid border-destructive/30 bg-destructive/5"
            title="Couldn’t load jobs"
            description={loadError}
          />
        ) : (
          <JobsView
            jobs={jobs}
            canWrite={writable}
            readyPipelineCount={readyPipelineCount}
          />
        )}
      </div>
    </PageContainer>
  );
}
