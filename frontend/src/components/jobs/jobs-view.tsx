"use client";

import Link from "next/link";
import { FileStack, Play } from "lucide-react";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { projectCardClassName } from "@/components/dashboard/dashboard-styles";
import { RelativeTime } from "@/components/relative-time";
import { buttonVariants } from "@/components/ui/button";
import type { PipelineJobSummary } from "@/lib/api/jobs";
import { cn } from "@/lib/utils";

type JobsViewProps = {
  jobs: PipelineJobSummary[];
  canWrite?: boolean;
};

export function JobsView({ jobs, canWrite = true }: JobsViewProps) {
  if (jobs.length === 0) {
    return (
      <div className="mt-9 rounded-xl border border-dashed border-border px-8 py-14 text-center">
        <p className="text-lg font-bold tracking-tight text-foreground">
          No jobs yet
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a ready pipeline, upload documents, and apply it. Each document
          is traced node by node.
        </p>
        {canWrite ? (
          <div className="mt-6 flex justify-center">
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
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {jobs.map((job) => {
        const done =
          job.succeeded_count + job.failed_count + job.cancelled_count;
        return (
          <Link
            key={job.id}
            href={`/app/jobs/${job.id}`}
            className={cn(
              projectCardClassName,
              "flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-[42px] items-center justify-center rounded-[11px] bg-primary/10 text-primary">
                <FileStack className="size-5" aria-hidden />
              </span>
              <JobStatusBadge status={job.status} />
            </div>
            <h2 className="mt-[18px] text-lg font-bold tracking-[-0.01em] text-foreground">
              {job.pipeline_name ?? "Pipeline"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {job.document_count}{" "}
              {job.document_count === 1 ? "document" : "documents"}
              {job.failed_count > 0
                ? ` · ${job.failed_count} failed`
                : ""}
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{
                  width: `${job.document_count ? Math.round((done / job.document_count) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="mt-[18px] flex items-center justify-between border-t border-[var(--landing-hairline)] pt-4 font-mono text-[11px] text-muted-foreground">
              <span>
                {job.succeeded_count} succeeded · {job.failed_count} failed
              </span>
              <RelativeTime value={job.created_at} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
