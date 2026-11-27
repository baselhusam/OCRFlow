"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

import { SegmentMark } from "@/components/brand/segment-mark";
import { GraphThumbnail } from "@/components/app/graph-thumbnail";
import { StatusPill } from "@/components/app/status-pill";
import { PipelineCardMenu } from "@/components/pipelines/pipeline-card-menu";
import { RelativeTime } from "@/components/relative-time";
import type { Pipeline } from "@/lib/api/client";
import { getPipelineLogoUrl } from "@/lib/api/pipelines";
import { formatPipelineIO, getPipelineStats } from "@/lib/pipelines/stats";
import { cn } from "@/lib/utils";

type PipelineCardProps = {
  pipeline: Pipeline;
  canWrite?: boolean;
};

function PipelineLogo({ pipeline }: { pipeline: Pipeline }) {
  if (pipeline.has_logo) {
    return (
      <Image
        src={getPipelineLogoUrl(pipeline.id)}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-[9px] object-cover"
        unoptimized
      />
    );
  }

  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-[9px]"
      style={{
        backgroundColor: `color-mix(in srgb, ${pipeline.accent_color} 15%, transparent)`,
      }}
    >
      <SegmentMark className="size-[18px] text-foreground" />
    </span>
  );
}

/**
 * Pipeline card: the surface opens the pipeline canvas; "Apply" (ready
 * pipelines only) jumps straight to a new job with this pipeline selected.
 */
export function PipelineCard({ pipeline, canWrite = true }: PipelineCardProps) {
  const stats = getPipelineStats(pipeline);
  const canvasHref = `/app/pipelines/${pipeline.id}/canvas`;
  const ioLabel = formatPipelineIO(pipeline);
  const description = pipeline.description?.trim();
  const isReady = Boolean(ioLabel);

  return (
    <article
      className={cn(
        "project-card group/card relative flex flex-col overflow-hidden",
        pipeline.is_archived && "opacity-80",
      )}
    >
      <div className="relative">
        <GraphThumbnail
          graph={pipeline.graph}
          accent={pipeline.accent_color}
          className="h-[120px] border-b border-[var(--landing-hairline)]"
          emptyLabel="No components yet"
        />
        {ioLabel ? (
          <span className="absolute top-2.5 left-2.5 rounded-md border border-[var(--landing-node-border)] bg-card/90 px-2 py-0.5 font-mono text-[10px] text-foreground backdrop-blur-sm">
            {ioLabel}
          </span>
        ) : null}
        <span
          className="pointer-events-none absolute right-3 bottom-3 inline-flex translate-y-1 items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-[12px] font-semibold text-background opacity-0 transition-[opacity,transform] duration-200 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100"
          aria-hidden
        >
          Edit pipeline
          <ArrowRight className="size-3.5" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <PipelineLogo pipeline={pipeline} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-bold tracking-[-0.01em] text-foreground">
              <Link
                href={canvasHref}
                className="outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-primary/50 focus-visible:after:ring-inset"
              >
                {pipeline.name}
              </Link>
            </h3>
            <p
              className={cn(
                "mt-0.5 truncate text-[13px]",
                description ? "text-muted-foreground" : "text-muted-foreground/60",
              )}
            >
              {description || "No description"}
            </p>
          </div>
          {canWrite ? (
            <div className="relative z-10 -mt-1 -mr-1.5">
              <PipelineCardMenu pipeline={pipeline} />
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            {pipeline.is_archived ? (
              <StatusPill tone="neutral">Archived</StatusPill>
            ) : isReady ? (
              <StatusPill tone="ok">Ready</StatusPill>
            ) : (
              <StatusPill tone="warn">Draft</StatusPill>
            )}
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {stats.nodeCount} node{stats.nodeCount === 1 ? "" : "s"} ·{" "}
              <RelativeTime value={pipeline.updated_at} />
            </span>
          </div>
          {isReady && !pipeline.is_archived && canWrite ? (
            <Link
              href={`/app/jobs/new?pipeline=${pipeline.id}`}
              className="relative z-10 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-primary/10 px-2.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground dark:bg-primary/25 dark:hover:bg-primary dark:hover:text-primary-foreground"
            >
              <Play className="size-3" aria-hidden />
              Apply
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
