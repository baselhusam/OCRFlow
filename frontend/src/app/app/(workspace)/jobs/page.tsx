import Link from "next/link";
import { Play } from "lucide-react";

import { JobsView } from "@/components/jobs/jobs-view";
import { buttonVariants } from "@/components/ui/button";
import type { PipelineJobSummary } from "@/lib/api/jobs";
import type { User } from "@/lib/api/client";
import {
  authenticatedApiFetch,
  UnauthenticatedError,
} from "@/lib/api/server";
import { canWrite } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

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

  return (
    <main className="mx-auto w-full max-w-[1320px] flex-1 px-6 py-11 md:px-12">
      <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">
        Workspace
      </p>

      <div className="mt-3.5 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground">
            Jobs
          </h1>
          <p className="mt-3.5 max-w-[560px] text-base leading-relaxed text-muted-foreground">
            Apply a pipeline you already trust to many documents. Watch every
            file, page count, and node as it runs.
          </p>
        </div>
        {writable ? (
          <Link
            href="/app/jobs/new"
            className={cn(
              buttonVariants(),
              "h-auto gap-2 rounded-lg px-5 py-3 text-sm font-semibold shadow-[0_8px_22px_-10px_var(--accent)]",
            )}
          >
            <Play className="size-4" aria-hidden />
            New job
          </Link>
        ) : null}
      </div>

      <div className="mt-9 h-px bg-[var(--landing-hairline)]" />

      {loadError ? (
        <div className="mt-9 rounded-xl border border-destructive/30 bg-destructive/5 px-8 py-10 text-center">
          <p className="text-lg font-bold tracking-tight text-foreground">
            Couldn’t load jobs
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
        </div>
      ) : (
        <JobsView jobs={jobs} canWrite={writable} />
      )}
    </main>
  );
}
