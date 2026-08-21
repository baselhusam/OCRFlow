"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Square } from "lucide-react";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Button } from "@/components/ui/button";
import { cancelJob, getJob, isJobActive, type PipelineJob } from "@/lib/api/jobs";
import type { PipelineRun } from "@/lib/api/pipeline-runs";
import { cn } from "@/lib/utils";

type JobTraceViewProps = {
  initialJob: PipelineJob;
  canWrite?: boolean;
};

function pickDocumentId(items: PipelineRun[]): string | null {
  return (
    items.find((item) => item.status === "failed")?.id ??
    items.find((item) => item.status === "running")?.id ??
    items[0]?.id ??
    null
  );
}

function progressLabel(run: PipelineRun): string {
  if (run.total_count > 0) {
    return `${run.completed_count}/${run.total_count} nodes`;
  }
  return run.status;
}

export function JobTraceView({ initialJob, canWrite = true }: JobTraceViewProps) {
  const [job, setJob] = useState(initialJob);
  const [selectedRunId, setSelectedRunId] = useState(
    pickDocumentId(initialJob.items),
  );
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isJobActive(job.status)) return;
    const timer = window.setInterval(() => {
      void getJob(job.id)
        .then((next) => {
          setJob(next);
          setSelectedRunId((current) =>
            current && next.items.some((item) => item.id === current)
              ? current
              : pickDocumentId(next.items),
          );
        })
        .catch(() => {
          // Keep showing the last known state if a poll fails.
        });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [job.id, job.status]);

  const selected = useMemo(
    () => job.items.find((item) => item.id === selectedRunId) ?? null,
    [job.items, selectedRunId],
  );

  const done =
    job.succeeded_count + job.failed_count + job.cancelled_count;
  const percent = job.document_count
    ? Math.round((done / job.document_count) * 100)
    : 0;

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    setError(null);
    try {
      const next = await cancelJob(job.id);
      setJob(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }, [job.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="border-b border-border px-6 py-6 md:px-12">
        <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">
          Jobs
        </p>
        <nav
          aria-label="Breadcrumb"
          className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href="/app/jobs" className="hover:text-foreground">
            Jobs
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="font-semibold text-foreground">
            {job.pipeline_name ?? "Job"}
          </span>
        </nav>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.035em]">
                {job.pipeline_name ?? "Pipeline job"}
              </h1>
              <JobStatusBadge status={job.status} />
            </div>
            <p className="mt-2 font-mono text-[12px] text-muted-foreground">
              {done}/{job.document_count} documents · {job.succeeded_count} ok ·{" "}
              {job.failed_count} failed
              {selected?.page_count
                ? ` · ${selected.page_count} pages on selected file`
                : ""}
            </p>
          </div>
          {canWrite && isJobActive(job.status) ? (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={cancelling}
              onClick={() => void handleCancel()}
            >
              <Square className="size-3.5 fill-current" />
              {cancelling ? "Cancelling…" : "Cancel job"}
            </Button>
          ) : null}
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary shadow-[0_0_12px_-2px_var(--pulse)] transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        {error ? (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        ) : null}
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="border-b border-border bg-card/40 lg:border-r lg:border-b-0">
          <p className="px-5 py-3 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Documents
          </p>
          <ul className="max-h-[40vh] overflow-auto lg:max-h-none">
            {job.items.map((run) => {
              const active = run.id === selectedRunId;
              return (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 px-5 py-3 text-left text-sm transition-colors",
                      active
                        ? "bg-primary/8 shadow-[inset_3px_0_0_var(--primary)]"
                        : "hover:bg-secondary/50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {run.input_filename ?? run.input_asset_id ?? "Document"}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                        {progressLabel(run)}
                        {run.page_count ? ` · ${run.page_count} pages` : ""}
                      </span>
                    </span>
                    <JobStatusBadge status={run.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="min-w-0 px-5 py-5 md:px-8">
          {selected ? (
            <DocumentTrace run={selected} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a document to inspect node traces and logs.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function DocumentTrace({ run }: { run: PipelineRun }) {
  const traces = run.node_traces ?? [];
  const logs = run.logs ?? [];

  return (
    <div className="space-y-8">
      {run.error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {run.error}
        </div>
      ) : null}

      <div>
        <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          Nodes
        </p>
        {traces.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {run.status === "failed"
              ? "This document failed before any node started."
              : run.status === "succeeded"
                ? "No node traces were recorded."
                : "Waiting for the first node to start…"}
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {traces.map((trace) => (
              <li
                key={trace.node_id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {trace.model_id}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {trace.output_kind ?? "node"}
                    {trace.page_count ? ` · ${trace.page_count} pages` : ""}
                    {trace.message ? ` · ${trace.message}` : ""}
                  </p>
                  {trace.error ? (
                    <p className="mt-1 text-xs text-destructive">{trace.error}</p>
                  ) : null}
                </div>
                <JobStatusBadge status={trace.status} />
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          Log
        </p>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No log lines yet.</p>
        ) : (
          <ol className="mt-3 max-h-[28rem] space-y-1 overflow-auto rounded-xl border border-border bg-night/5 p-3 font-mono text-[11px] leading-relaxed dark:bg-black/20">
            {logs.map((entry, index) => (
              <li
                key={`${entry.ts}-${index}`}
                className={cn(
                  "whitespace-pre-wrap",
                  entry.level === "error" && "text-destructive",
                  entry.level === "warn" && "text-amber-700 dark:text-amber-300",
                )}
              >
                <span className="text-muted-foreground">
                  {entry.ts.slice(11, 19)}
                </span>{" "}
                {entry.node_id ? `[${entry.node_id}] ` : ""}
                {entry.message}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
