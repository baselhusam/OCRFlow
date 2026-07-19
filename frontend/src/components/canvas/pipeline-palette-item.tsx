"use client";

import { GripVertical } from "lucide-react";
import Image from "next/image";

import type { Pipeline } from "@/lib/api/client";
import { getPipelineLogoUrl } from "@/lib/api/pipelines";
import { formatPipelineIO, getPipelineStats } from "@/lib/pipelines/stats";
import { DRAG_PIPELINE_MIME } from "@/lib/canvas/types";
import { requestPaletteAddPipeline } from "@/lib/canvas/palette-add-bridge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type PipelinePaletteItemProps = {
  pipeline: Pipeline;
  className?: string;
};

export function PipelinePaletteItem({
  pipeline,
  className,
}: PipelinePaletteItemProps) {
  const ioLabel = formatPipelineIO(pipeline);
  const stats = getPipelineStats(pipeline);
  const accent = pipeline.accent_color || "var(--primary)";

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData(
      DRAG_PIPELINE_MIME,
      JSON.stringify({ type: "pipeline", pipelineId: pipeline.id }),
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const handleClick = () => {
    requestPaletteAddPipeline(pipeline.id);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            draggable
            onDragStart={handleDragStart}
            onClick={handleClick}
            className={cn(
              "flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-left",
              "transition-colors hover:bg-muted/40 active:cursor-grabbing",
              className,
            )}
            style={{ borderLeftWidth: 2.5, borderLeftColor: accent }}
          >
            {pipeline.has_logo ? (
              <Image
                src={getPipelineLogoUrl(pipeline.id)}
                alt=""
                width={24}
                height={24}
                className="size-6 shrink-0 rounded-md object-cover"
                unoptimized
              />
            ) : (
              <Image
                src="/brand/mark.svg"
                alt=""
                width={24}
                height={24}
                className="size-6 shrink-0 rounded-md bg-primary/10 p-0.5 object-contain"
              />
            )}
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-foreground">
              {pipeline.name}
            </span>
            <GripVertical
              className="size-3.5 shrink-0 text-muted-foreground/50"
              aria-hidden
            />
          </button>
        }
      />
      <TooltipContent side="right" align="start" className="max-w-xs">
        <div className="space-y-1.5">
          <p className="font-medium">{pipeline.name}</p>
          {pipeline.description ? (
            <p className="text-background/80">{pipeline.description}</p>
          ) : null}
          {ioLabel ? (
            <p className="font-mono text-[10px] text-background/70">{ioLabel}</p>
          ) : null}
          <p className="font-mono text-[10px] text-background/70">
            {stats.nodeCount} node{stats.nodeCount === 1 ? "" : "s"} ·{" "}
            {stats.modelCount} model{stats.modelCount === 1 ? "" : "s"}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
