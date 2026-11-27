"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, FileStack, Play } from "lucide-react";

import {
  EmptyState,
  ListToolbar,
  SegmentedControl,
} from "@/components/app/list-toolbar";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { RelativeTime } from "@/components/relative-time";
import { buttonVariants } from "@/components/ui/button";
import type { PipelineJobSummary } from "@/lib/api/jobs";
import { isJobActive } from "@/lib/api/jobs";
import { cn } from "@/lib/utils";

type JobsViewProps = {
  jobs: PipelineJobSummary[];
  canWrite?: boolean;
  /** Number of non-archived ready pipelines; drives the empty-state CTA. */
  readyPipelineCount?: number;
};

type JobsTab = "all" | "active" | "failed";

function matchesTab(job: PipelineJobSummary, tab: JobsTab): boolean {
  if (tab === "active") return isJobActive(job.status);
  if (tab === "failed") return job.status === "failed" || job.failed_count > 0;
  return true;
}

const STEPS = [
  { title: "Pick a ready pipeline", body: "Any pipeline with one input and one output." },
  { title: "Drop in documents", body: "PDFs or images — as many as you like." },
  { title: "Trace every file", body: "Follow each document node by node as it runs." },
];

function JobRow({ job }: { job: PipelineJobSummary }) {
  const done = job.succeeded_count + job.failed_count + job.cancelled_count;
  const percent = job.document_count
    ? Math.round((done / job.document_count) * 100)
    : 0;
  const active = isJobActive(job.status);

  return (
    <li>
      <Link
        href={`/app/jobs/${job.id}`}
        className="group/row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-primary/[0.035] focus-visible:bg-primary/[0.05] focus-visible:outline-none sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_96px_16px] sm:px-5"
      >
        <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-3 sm:col-start-auto sm:row-start-auto">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-primary/10 text-primary">
            <FileStack className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-foreground">
              {job.pipeline_name ?? "Pipeline"}
            </span>
            <span className="block font-mono text-[11px] text-muted-foreground">
              {job.document_count} document{job.document_count === 1 ? "" : "s"} ·{" "}
              <RelativeTime value={job.created_at} />
            </span>
          </span>
        </span>

        <span className="col-span-2 flex items-center gap-3 sm:col-span-1">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.07]">
            <span
              className={cn(
                "block h-full rounded-full transition-[width]",
                job.failed_count > 0 && !active ? "bg-[var(--status-warn)]" : "bg-primary",
                job.status === "failed" && "bg-destructive",
              )}
              style={{ width: `${percent}%` }}
            />
          </span>
          <span className="w-[86px] shrink-0 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
            {job.succeeded_count} ok
            {job.failed_count > 0 ? ` · ${job.failed_count} ✕` : ""}
          </span>
        </span>

        <span className="col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto">
          <JobStatusBadge status={job.status} />
        </span>
        <ChevronRight
          className="hidden size-4 text-muted-foreground/60 transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-primary sm:block"
          aria-hidden
        />
      </Link>
    </li>
  );
}

export function JobsView({
  jobs,
  canWrite = true,
  readyPipelineCount = 0,
}: JobsViewProps) {
  const [tab, setTab] = useState<JobsTab>("all");
  const visible = useMemo(
    () => jobs.filter((job) => matchesTab(job, tab)),
    [jobs, tab],
  );
  const tabOptions = useMemo(
    () =>
      (
        [
          { key: "all", label: "All" },
          { key: "active", label: "In progress" },
          { key: "failed", label: "With failures" },
        ] as const
      ).map((option) => ({
        ...option,
        count: jobs.filter((job) => matchesTab(job, option.key)).length,
      })),
    [jobs],
  );

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileStack className="size-6" aria-hidden />
          </span>
        }
        title="No jobs yet"
        description="Jobs apply a pipeline you trust to many documents at once."
        actions={
          canWrite ? (
            readyPipelineCount > 0 ? (
              <Link
                href="/app/jobs/new"
                className={cn(
                  buttonVariants(),
                  "h-10 gap-2 rounded-lg px-4 text-sm font-semibold shadow-[0_8px_22px_-12px_var(--accent)]",
                )}
              >
                <Play className="size-4" aria-hidden />
                Start your first job
              </Link>
            ) : (
              <Link
                href="/app/pipelines"
                className={cn(
                  buttonVariants(),
                  "h-10 gap-2 rounded-lg px-4 text-sm font-semibold shadow-[0_8px_22px_-12px_var(--accent)]",
                )}
              >
                Create a pipeline first
              </Link>
            )
          ) : null
        }
      >
        <ol className="mt-8 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-xl border border-border bg-card p-4"
            >
              <span className="font-mono text-[11px] text-primary">
                0{index + 1}
              </span>
              <p className="mt-1.5 text-[13.5px] font-semibold text-foreground">
                {step.title}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </EmptyState>
    );
  }

  return (
    <div>
      <ListToolbar>
        <SegmentedControl
          ariaLabel="Filter jobs"
          options={tabOptions}
          value={tab}
          onChange={setTab}
        />
      </ListToolbar>
      <div className="mt-6">
        {visible.length === 0 ? (
          <EmptyState
            title={tab === "active" ? "Nothing running" : "No failures"}
            description={
              tab === "active"
                ? "All jobs have finished."
                : "Every document in every job went through cleanly."
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--landing-hairline)] overflow-hidden rounded-xl border border-border bg-card">
            {visible.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
