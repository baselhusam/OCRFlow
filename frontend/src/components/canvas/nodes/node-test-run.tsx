"use client";

import { Loader2, Play } from "lucide-react";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { NodeErrorPanel } from "@/components/canvas/node-detail/node-error-panel";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getNodeTestRunReadiness } from "@/lib/canvas/node-readiness";
import { getNodeRunLabel, getNodeRunTooltip } from "@/lib/canvas/node-run-label";
import { formatComputeTier } from "@/lib/canvas/model-utils";
import { isPlannedNode } from "@/lib/canvas/planned-categories";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

type NodeTestRunProps = {
  nodeId: string;
  data: PipelineNodeData;
};

export function NodeTestRun({ nodeId, data }: NodeTestRunProps) {
  const { projectId, runNode, nodes, edges } = usePipelineGraphActions();
  const readiness = getNodeTestRunReadiness(nodeId, nodes, edges, projectId);
  const planned = isPlannedNode(data.modelId, data.category);
  const isGpu =
    data.compute === "gpu-low" || data.compute === "gpu-mid";
  const showExpanded =
    data.runStatus === "error" ||
    data.runStatus === "running" ||
    !readiness.ready ||
    planned;

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {isGpu && showExpanded && (
        <p className="font-mono text-[9px] text-[var(--status-warn)] px-1">
          {formatComputeTier(data.compute ?? "gpu-low")} — may require GPU
        </p>
      )}

      {planned && showExpanded && (
        <p className="text-[9px] leading-snug text-muted-foreground px-1">
          This model is planned — run unavailable.
        </p>
      )}

      {data.runResult?.error && (
        <NodeErrorPanel
          compact
          error={data.runResult.error}
          errorCode={data.runResult.errorCode}
          errorContext={data.runResult.errorContext}
          nodeLabel={data.label}
          className="mx-1"
        />
      )}

      {data.runStatus === "success" && data.runResult?.pageCount !== undefined && (
        <p className="font-mono text-[9px] text-muted-foreground px-1">
          {data.runResult.pageCount} result
          {data.runResult.pageCount === 1 ? "" : "s"}
        </p>
      )}

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "font-mono text-[10px] tracking-wide uppercase bg-background hover:bg-muted/50 transition-colors w-full h-7",
                data.runStatus === "success" && "border-[var(--status-ok)]/50 text-[var(--status-ok)]",
                data.runStatus === "error" && "border-destructive/50 text-destructive"
              )}
              disabled={
                !readiness.ready || data.runStatus === "running" || planned
              }
              title={readiness.issues.join(" · ")}
              onClick={() => void runNode(nodeId)}
            />
          }
        >
          {data.runStatus === "running" ? (
            <Loader2 className="size-3 animate-spin mr-1.5" />
          ) : (
            <Play className="size-3 mr-1.5" />
          )}
          <span>{getNodeRunLabel(data.category, data.runStatus)}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          {planned
            ? "Planned model"
            : readiness.ready
              ? getNodeRunTooltip(data.category)
              : readiness.issues[0] ?? "Not ready"}
        </TooltipContent>
      </Tooltip>

      {!readiness.ready && readiness.issues.length > 0 && showExpanded && (
        <div className="space-y-0.5 px-1">
          {readiness.issues.map((issue) => (
            <p
              key={issue}
              className="text-[9px] leading-snug text-muted-foreground/80"
            >
              • {issue}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
