"use client";

import { AlertTriangle, CheckCircle2, FileInput, Loader2, Play, RotateCcw } from "lucide-react";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { NodeErrorPanel } from "@/components/canvas/node-detail/node-error-panel";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { formatComputeTier } from "@/lib/canvas/model-utils";
import { useSourceLoaderLoad } from "@/hooks/use-source-loader-load";
import { getNodeTestRunReadiness } from "@/lib/canvas/node-readiness";
import { getNodeRunLabel } from "@/lib/canvas/node-run-label";
import { isPlannedNode } from "@/lib/canvas/planned-categories";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

type NodeDetailRunFooterProps = {
  nodeId: string;
  data: PipelineNodeData;
};

export function NodeDetailRunFooter({ nodeId, data }: NodeDetailRunFooterProps) {
  const { projectId, runNode, clearNodeRunState, nodes, edges } = usePipelineGraphActions();
  const readiness = getNodeTestRunReadiness(nodeId, nodes, edges, projectId);
  const planned = isPlannedNode(data.modelId, data.category);
  const isSourceLoader = SOURCE_NODE_MODELS.has(data.modelId);
  const isGpu = data.compute === "gpu-low" || data.compute === "gpu-mid";
  const hasAsset = Boolean(data.params.assetId);
  const {
    handleLoadClick,
    isRunning,
    isLoaded,
    loadLabel,
    canLoadDocument,
  } = useSourceLoaderLoad(nodeId, data);
  const canRun = isSourceLoader
    ? canLoadDocument && !planned
    : readiness.ready && !isRunning && !planned;

  const hasRunState =
    data.cachedOutput != null ||
    (data.runStatus != null &&
      data.runStatus !== "idle" &&
      data.runStatus !== "running");
  const clearLabel = isSourceLoader ? "Unload" : "Clear output";

  const statusLine =
    data.runResult?.error ??
    (isGpu ? `${formatComputeTier(data.compute ?? "gpu-low")} — may require GPU` : null);

  const helperMessage = isSourceLoader
    ? !hasAsset
      ? "Upload a file to load"
      : null
    : !canRun && readiness.issues.length > 0
      ? readiness.issues[0]
      : null;

  return (
    <div className="shrink-0 border-t border-border bg-card px-[18px] py-3.5">
      {(statusLine || helperMessage) && (
        <div className="mb-2.5 flex items-start gap-1.5">
          {isGpu && !data.runResult?.error && !isSourceLoader && (
            <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div className="min-w-0 flex-1">
            {data.runResult?.error && (
              <NodeErrorPanel
                error={data.runResult.error}
                errorCode={data.runResult.errorCode}
                errorContext={data.runResult.errorContext}
                nodeLabel={data.label}
              />
            )}
            {isGpu && !data.runResult?.error && !isSourceLoader && (
              <p className="font-mono text-[9px] text-amber-600/80 dark:text-amber-400/80">
                {formatComputeTier(data.compute ?? "gpu-low")} — may require GPU
              </p>
            )}
            {helperMessage && !data.runResult?.error && (
              isSourceLoader ? (
                <p className="truncate text-[10px] text-muted-foreground">{helperMessage}</p>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <p className="cursor-default truncate text-[10px] text-muted-foreground">
                        {helperMessage}
                        {readiness.issues.length > 1
                          ? ` (+${readiness.issues.length - 1} more)`
                          : ""}
                      </p>
                    }
                  />
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <ul className="space-y-0.5">
                      {readiness.issues.map((issue) => (
                        <li key={issue}>· {issue}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )
            )}
          </div>
        </div>
      )}

      {planned && (
        <p className="mb-2.5 text-[10px] text-muted-foreground">
          Not yet runnable — model implementation pending.
        </p>
      )}

      <Button
        type="button"
        size="sm"
        disabled={!canRun}
        className={cn(
          "h-10 w-full rounded-lg text-[13px] font-semibold",
          !canRun && "bg-secondary text-muted-foreground",
          canRun &&
            isSourceLoader &&
            isLoaded &&
            "cursor-default border border-[var(--status-ok)]/45 bg-[var(--status-ok)]/12 text-[var(--status-ok)] shadow-none hover:bg-[var(--status-ok)]/12",
          canRun &&
            (!isSourceLoader || !isLoaded) &&
            "bg-primary text-primary-foreground shadow-[0_8px_20px_-10px_var(--pulse)] hover:bg-primary/90",
        )}
        onClick={(event) => {
          event.stopPropagation();
          if (isSourceLoader) {
            handleLoadClick();
            return;
          }
          void runNode(nodeId);
        }}
      >
        {isRunning ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : isSourceLoader && isLoaded ? (
          <CheckCircle2 className="mr-1.5 size-3.5" />
        ) : isSourceLoader ? (
          <FileInput className="mr-1.5 size-3.5" />
        ) : (
          <Play className="mr-1.5 size-3.5 fill-current" />
        )}
        {isSourceLoader
          ? loadLabel
          : getNodeRunLabel(data.category, isRunning ? "running" : data.runStatus)}
      </Button>

      {hasRunState && !isRunning ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-8 w-full rounded-lg text-[12px] font-medium text-muted-foreground hover:border-destructive/40 hover:bg-destructive/8 hover:text-destructive"
          onClick={() => clearNodeRunState(nodeId)}
        >
          <RotateCcw className="mr-1.5 size-3.5" />
          {clearLabel}
        </Button>
      ) : null}
    </div>
  );
}
