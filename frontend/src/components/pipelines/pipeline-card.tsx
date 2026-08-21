"use client";

import Image from "next/image";
import Link from "next/link";
import { GitBranch, Play } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { PipelineFlowPreview } from "@/components/pipelines/pipeline-flow-preview";
import { PipelineCardMenu } from "@/components/pipelines/pipeline-card-menu";
import { RelativeTime } from "@/components/relative-time";
import { projectCardClassName } from "@/components/dashboard/dashboard-styles";
import type { Pipeline } from "@/lib/api/client";
import { getPipelineLogoUrl } from "@/lib/api/pipelines";
import {
  formatPipelineIO,
  formatPipelineMeta,
  getPipelineStats,
} from "@/lib/pipelines/stats";
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
        width={42}
        height={42}
        className="size-[42px] rounded-[11px] object-cover"
        unoptimized
      />
    );
  }

  return (
    <Image
      src="/brand/mark.svg"
      alt=""
      width={42}
      height={42}
      className="size-[42px] rounded-[11px] bg-primary/10 p-2 object-contain"
    />
  );
}

export function PipelineCard({ pipeline, canWrite = true }: PipelineCardProps) {
  const stats = getPipelineStats(pipeline);
  const meta = formatPipelineMeta(stats);
  const canvasHref = `/app/pipelines/${pipeline.id}/canvas`;
  const ioLabel = formatPipelineIO(pipeline);
  const description = pipeline.description?.trim();
  const hasDescription = Boolean(description);
  const isReady = Boolean(ioLabel);

  return (
    <article className={cn(projectCardClassName, "relative flex flex-col")}>
      <div className="flex items-start justify-between gap-3">
        <Link
          href={canvasHref}
          className="flex size-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[11px] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          style={{
            boxShadow: `inset 0 0 0 1px ${pipeline.accent_color}33`,
          }}
          aria-label={`Open ${pipeline.name}`}
        >
          <PipelineLogo pipeline={pipeline} />
        </Link>

        <div className="flex items-start gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              isReady
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                isReady ? "bg-emerald-500" : "bg-amber-500",
              )}
              aria-hidden
            />
            {isReady ? "Ready" : "Draft"}
          </span>
          {isReady && !pipeline.is_archived ? (
            <Link
              href={`/app/jobs/new?pipeline=${pipeline.id}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 gap-1.5 rounded-lg text-[12px] font-semibold",
              )}
            >
              <Play className="size-3.5" aria-hidden />
              Apply
            </Link>
          ) : null}
          {canWrite ? <PipelineCardMenu pipeline={pipeline} /> : null}
        </div>
      </div>

      <Link
        href={canvasHref}
        className="mt-[18px] flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <h2 className="text-lg font-bold tracking-[-0.01em] text-foreground">
          {pipeline.name}
        </h2>
        <p
          className={cn(
            "mt-1.5 min-h-[42px] line-clamp-2 text-sm leading-normal",
            hasDescription ? "text-muted-foreground" : "text-muted-foreground/70",
          )}
        >
          {hasDescription ? description : "No description yet."}
        </p>

        <div className="mt-4">
          <PipelineFlowPreview pipeline={pipeline} />
        </div>

        {ioLabel ? (
          <p className="mt-3 font-mono text-[11px] text-primary">{ioLabel}</p>
        ) : null}

        <div className="mt-[18px] flex items-center justify-between gap-3 border-t border-[var(--landing-hairline)] pt-4">
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="size-3" aria-hidden />
              {meta.nodes}
            </span>
            <span className="text-border">·</span>
            <span>{meta.models}</span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.04em] text-muted-foreground uppercase">
            <RelativeTime value={pipeline.updated_at} />
          </span>
        </div>
      </Link>
    </article>
  );
}
