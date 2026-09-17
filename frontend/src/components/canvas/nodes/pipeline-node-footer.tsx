"use client";

import {
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  Layers,
  Loader2,
  Play,
  Square,
} from "lucide-react";

import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getNodeTestRunReadiness } from "@/lib/canvas/node-readiness";
import { formatComputeTier } from "@/lib/canvas/model-utils";
import { isPlannedNode } from "@/lib/canvas/planned-categories";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

export type NodeFooterRunOverride = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
};

type PipelineNodeFooterProps = {
  nodeId: string;
  data: PipelineNodeData;
  /**
   * Replace the default "run this node" action (source loaders use "Load"),
   * or pass `false` to hide it (page selectors have nothing to run).
   */
  run?: NodeFooterRunOverride | false;
  /** Pages in the node's document when it can be applied to all of them (0 otherwise). */
  mapPageCount?: number;
  previewOpen: boolean;
  previewCount?: number;
  /** Whether there is anything (input or output) to show in the preview card. */
  previewAvailable: boolean;
  onTogglePreview: () => void;
};

/** Run + Preview actions pinned to the bottom of a lean node card. */
export function PipelineNodeFooter({
  nodeId,
  data,
  run,
  mapPageCount = 0,
  previewOpen,
  previewCount = 0,
  previewAvailable,
  onTogglePreview,
}: PipelineNodeFooterProps) {
  const { projectId, runNode, runNodeAllPages, cancelMapRun, nodes, edges } =
    usePipelineGraphActions();
  const readiness = getNodeTestRunReadiness(nodeId, nodes, edges, projectId);
  const planned = isPlannedNode(data.modelId, data.category);
  const mapProgress = data.mapProgress;
  const mappedCount =
    data.cachedOutput?.mapped?.filter((entry) => !entry.error).length ?? 0;
  const canMap = !run && mapPageCount > 1 && !planned;
  const running = data.runStatus === "running";
  const succeeded = data.runStatus === "success";
  const failed = data.runStatus === "error";
  const isGpu = data.compute === "gpu-low" || data.compute === "gpu-mid";

  const runTooltip = run
    ? (run.tooltip ?? run.label)
    : planned
      ? "Planned model — run unavailable"
      : !readiness.ready
        ? (readiness.issues[0] ?? "Not ready")
        : isGpu
          ? `Run · ${formatComputeTier(data.compute ?? "gpu-low")}`
          : "Run this node";
  const runDisabled = run
    ? Boolean(run.disabled) || running
    : !readiness.ready || running || planned;
  const runLabel = run
    ? running
      ? "Loading"
      : run.label
    : running
      ? mapProgress
        ? `${mapProgress.completed}/${mapProgress.total}`
        : "Running"
      : failed
        ? "Retry"
        : succeeded
          ? mappedCount > 1
            ? `${mappedCount} pages`
            : "Re-run"
          : "Run";

  const RunIcon = running
    ? Loader2
    : failed
      ? AlertCircle
      : succeeded
        ? Check
        : Play;

  return (
    <div className="flex items-stretch border-t border-border/50">
      {run !== false && running && mapProgress ? (
        <button
          type="button"
          className="nodrag nopan flex h-8 flex-1 items-center justify-center gap-1.5 text-[11px] font-semibold text-[var(--pulse)] transition-colors hover:bg-destructive/8 hover:text-destructive"
          title="Stop after the current page"
          onClick={(event) => {
            event.stopPropagation();
            cancelMapRun(nodeId);
          }}
        >
          <Square className="size-3 fill-current" />
          {runLabel}
          <span className="font-mono text-[9px] font-normal text-muted-foreground">
            pages
          </span>
        </button>
      ) : run !== false ? (
        <div className="flex flex-1 items-stretch">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  disabled={runDisabled}
                  className={cn(
                    "nodrag nopan flex h-8 flex-1 items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors",
                    "disabled:cursor-not-allowed disabled:text-muted-foreground/60",
                    !failed &&
                      !succeeded &&
                      "text-foreground hover:bg-secondary/60",
                    succeeded &&
                      "text-[var(--status-ok)] hover:bg-[var(--status-ok)]/8",
                    failed && "text-destructive hover:bg-destructive/8",
                    running && "text-[var(--pulse)]",
                  )}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (run) run.onClick();
                    else void runNode(nodeId);
                  }}
                />
              }
            >
              <RunIcon
                className={cn("size-3.5", running && "animate-spin")}
                strokeWidth={2.25}
              />
              {runLabel}
            </TooltipTrigger>
            <TooltipContent side="bottom">{runTooltip}</TooltipContent>
          </Tooltip>

          {canMap && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    disabled={running}
                    aria-label="More run options"
                    className="nodrag nopan flex w-6 items-center justify-center border-l border-border/40 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground disabled:opacity-40"
                    onClick={(event) => event.stopPropagation()}
                  />
                }
              >
                <ChevronDown className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem
                  disabled={!readiness.ready}
                  onClick={() => void runNode(nodeId)}
                >
                  <Play className="size-3.5" />
                  Run this page only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void runNodeAllPages(nodeId)}>
                  <Layers className="size-3.5" />
                  <span className="flex-1">
                    Apply to all {mapPageCount} pages
                  </span>
                  {mappedCount > 0 && mappedCount < mapPageCount && (
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {mappedCount} done
                    </span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ) : null}

      {run !== false && <span className="w-px bg-border/50" aria-hidden />}

      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              disabled={!previewAvailable}
              aria-pressed={previewOpen}
              className={cn(
                "nodrag nopan relative flex h-8 flex-1 items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors",
                "disabled:cursor-not-allowed disabled:text-muted-foreground/60",
                previewOpen
                  ? "bg-[var(--node-accent)]/12 text-[var(--node-accent)]"
                  : "text-foreground hover:bg-secondary/60",
              )}
              onClick={(event) => {
                event.stopPropagation();
                onTogglePreview();
              }}
            />
          }
        >
          <Eye className="size-3.5" strokeWidth={2.25} />
          Preview
          {previewCount > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 py-px font-mono text-[9px] leading-none",
                previewOpen
                  ? "bg-[var(--node-accent)] text-white"
                  : "bg-secondary text-foreground/80",
              )}
            >
              {previewCount > 99 ? "99+" : previewCount}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {!previewAvailable
            ? "Connect an input or run the node to preview"
            : previewOpen
              ? "Hide preview"
              : data.cachedOutput
                ? "Show output preview"
                : "Show input preview"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
