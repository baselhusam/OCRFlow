"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitBranch, Play, Upload } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { isPipelineReady } from "@/lib/api/pipelines";
import type { Pipeline } from "@/lib/api/client";
import {
  startPipelineJob,
  uploadPipelineAssetsBatch,
} from "@/lib/api/jobs";
import { formatPipelineIO } from "@/lib/pipelines/stats";
import { cn } from "@/lib/utils";

type NewJobComposerProps = {
  pipelines: Pipeline[];
  initialPipelineId?: string | null;
};

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export function NewJobComposer({
  pipelines,
  initialPipelineId,
}: NewJobComposerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const readyPipelines = useMemo(
    () =>
      pipelines.filter(
        (pipeline) => isPipelineReady(pipeline) && !pipeline.is_archived,
      ),
    [pipelines],
  );
  const [pipelineId, setPipelineId] = useState(
    initialPipelineId &&
      readyPipelines.some((item) => item.id === initialPipelineId)
      ? initialPipelineId
      : (readyPipelines[0]?.id ?? ""),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const selected = readyPipelines.find((item) => item.id === pipelineId) ?? null;

  const onPick = useCallback((list: FileList | null | File[]) => {
    if (!list) return;
    const next = Array.from(list).filter((file) =>
      /pdf|png|jpe?g|webp/i.test(file.type || file.name),
    );
    setFiles(next.slice(0, 50));
    setError(null);
  }, []);

  const onSubmit = useCallback(async () => {
    if (!pipelineId) {
      setError("Select a ready pipeline");
      return;
    }
    if (files.length === 0) {
      setError("Choose one or more PDF or image files");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadPipelineAssetsBatch(pipelineId, files);
      const job = await startPipelineJob(
        pipelineId,
        uploaded.items.map((item) => item.asset_id),
      );
      router.push(`/app/jobs/${job.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start job");
    } finally {
      setBusy(false);
    }
  }, [files, pipelineId, router]);

  if (readyPipelines.length === 0) {
    return (
      <div className="mt-9 rounded-xl border border-dashed border-border px-8 py-14 text-center">
        <p className="text-lg font-bold tracking-tight text-foreground">
          No ready pipelines
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Save a pipeline with a valid input and output first — from Pipelines
          or by selecting nodes on a project canvas.
        </p>
        <Link
          href="/app/pipelines"
          className={cn(
            buttonVariants(),
            "mt-6 h-auto gap-2 rounded-lg px-5 py-3 text-sm font-semibold shadow-[0_8px_22px_-10px_var(--accent)]",
          )}
        >
          <GitBranch className="size-4" aria-hidden />
          Go to pipelines
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(20,18,37,0.05)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
        <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          1 · Pipeline
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {readyPipelines.map((pipeline) => {
            const active = pipeline.id === pipelineId;
            return (
              <button
                key={pipeline.id}
                type="button"
                onClick={() => setPipelineId(pipeline.id)}
                className={cn(
                  "rounded-xl border px-4 py-3.5 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/8 shadow-[inset_0_0_0_1px_rgba(91,46,239,0.25)]"
                    : "border-border hover:border-primary/30 hover:bg-secondary/30",
                )}
              >
                <p className="text-sm font-semibold tracking-tight">
                  {pipeline.name}
                </p>
                <p className="mt-1.5 font-mono text-[11px] text-primary">
                  {formatPipelineIO(pipeline) ?? "Ready"}
                </p>
              </button>
            );
          })}
        </div>

        <p className="mt-8 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          2 · Documents
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => onPick(event.target.files)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            onPick(event.dataTransfer.files);
          }}
          className={cn(
            "mt-4 flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/8"
              : "border-border bg-muted/20 hover:border-primary/40 hover:bg-secondary/30",
          )}
        >
          <Upload className="size-5 text-primary" aria-hidden />
          <p className="mt-3 text-sm font-semibold">Drop PDFs or images here</p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse · up to 50 files
          </p>
        </button>
        {files.length > 0 ? (
          <ul className="mt-3 max-h-48 space-y-1 overflow-auto rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-sm">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`} className="truncate">
                {file.name}
              </li>
            ))}
          </ul>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        ) : null}
        <Button
          type="button"
          className="mt-6 h-auto gap-2 rounded-lg px-5 py-3 text-sm font-semibold shadow-[0_8px_22px_-10px_var(--accent)]"
          disabled={busy || !pipelineId || files.length === 0}
          onClick={() => void onSubmit()}
        >
          <Play className="size-4" aria-hidden />
          {busy ? "Starting…" : "Apply pipeline"}
        </Button>
      </section>

      <aside className="h-fit rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(20,18,37,0.05)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
        <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          Apply
        </p>
        <h2 className="mt-2 text-lg font-bold tracking-tight">
          {selected?.name ?? "Select a pipeline"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Each file becomes its own run. The job page traces every document,
          page count, and node so you can see exactly where a file stopped.
        </p>
        {selected?.description ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {selected.description}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
