"use client";

import {
  memo,
  useCallback,
} from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileText, X } from "lucide-react";

import {
  BranchPanelResizeHandle,
  useBranchPanelResize,
  type BranchPanelSize,
} from "@/components/canvas/nodes/branch-panel-resize";
import {
  CaptionTextPanel,
  type CaptionLineWire,
} from "@/components/canvas/nodes/output/caption-text-panel";
import {
  PipelineNodeHeader,
  type PipelineNodeVisualState,
} from "@/components/canvas/nodes/pipeline-node-header";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { Switch } from "@/components/ui/switch";
import { useRefreshNodeHandles } from "@/hooks/use-refresh-node-handles";
import {
  CAPTION_BRANCH_PANEL_DEFAULT,
  CAPTION_BRANCH_PANEL_MAX,
  CAPTION_BRANCH_PANEL_MIN,
} from "@/lib/canvas/caption-branch-meta";
import { getNodeReadiness } from "@/lib/canvas/node-readiness";
import { upstreamSatisfiesInput } from "@/lib/canvas/resolve-upstream";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { formatWireLabel } from "@/lib/canvas/wire-labels";
import { getModelWireKinds } from "@/lib/canvas/wire-types";
import { cn } from "@/lib/utils";

function getPipelineNodeVisualState(
  runStatus: PipelineNodeData["runStatus"],
  isSelected: boolean,
): PipelineNodeVisualState {
  if (runStatus === "error") return "error";
  if (runStatus === "running") return "running";
  if (isSelected) return "selected";
  return "idle";
}

function shellClassName(visualState: PipelineNodeVisualState): string {
  return cn(
    "ocrflow-caption-branch-node ocrflow-caption-text-output-card ocrflow-caption-branch-panel relative flex flex-col rounded-xl border bg-card overflow-hidden transition-[border-color,box-shadow] duration-150",
    visualState === "idle" &&
      "border-border/60 shadow-sm group-hover:shadow-[0_4px_12px_-2px_color-mix(in_srgb,var(--foreground)_5%,transparent)]",
    (visualState === "selected" || visualState === "running") &&
      "border-[var(--pulse)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--pulse)_34%,transparent),0_0_28px_-4px_color-mix(in_srgb,var(--pulse)_26%,transparent),0_12px_32px_-12px_color-mix(in_srgb,var(--foreground)_14%,transparent)]",
    visualState === "error" &&
      "border-destructive shadow-[0_0_0_3px_color-mix(in_srgb,var(--destructive)_32%,transparent),0_0_20px_-4px_color-mix(in_srgb,var(--destructive)_22%,transparent)]",
  );
}

function clampPanelSize(width: number, height: number) {
  return {
    width: Math.min(
      CAPTION_BRANCH_PANEL_MAX.width,
      Math.max(CAPTION_BRANCH_PANEL_MIN.width, Math.round(width)),
    ),
    height: Math.min(
      CAPTION_BRANCH_PANEL_MAX.height,
      Math.max(CAPTION_BRANCH_PANEL_MIN.height, Math.round(height)),
    ),
  };
}

function PortStatusDot({ status }: { status: "ok" | "warn" | "error" | "none" }) {
  if (status === "none") return null;
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-1/2 -left-3 size-1.5 -translate-y-1/2 rounded-full",
        status === "ok" && "bg-[var(--status-ok)]",
        status === "warn" && "bg-[var(--status-warn)]",
        status === "error" && "bg-destructive",
      )}
    />
  );
}

function CaptionBranchPipelineNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as PipelineNodeData;

  const {
    projectId,
    getUpstream,
    updateNodeData,
    closeCaptionBranch,
    focusPulseNodeId,
    selectedNodeId,
  } = usePipelineGraphActions();

  const isSelected = selected || selectedNodeId === id;
  const visualState = getPipelineNodeVisualState(nodeData.runStatus, isSelected);

  const requiredInput = getModelWireKinds(
    nodeData.modelId,
    nodeData.inputType,
    nodeData.outputType,
  ).input;
  const upstream = getUpstream(id, requiredInput);
  const linesOutput = upstream.output;
  const lines =
    linesOutput?.kind === "lines"
      ? ((linesOutput.raw as { lines?: CaptionLineWire[] }).lines ?? []).filter(
          (line): line is CaptionLineWire => Boolean(line?.id),
        )
      : [];

  const storedPanelSize = clampPanelSize(
    nodeData.branchPanelWidth ?? CAPTION_BRANCH_PANEL_DEFAULT.width,
    nodeData.branchPanelHeight ?? CAPTION_BRANCH_PANEL_DEFAULT.height,
  );

  const handleResizeEnd = useCallback(
    (next: BranchPanelSize) => {
      updateNodeData(
        id,
        { branchPanelWidth: next.width, branchPanelHeight: next.height },
        true,
      );
    },
    [id, updateNodeData],
  );

  const handleMarkdownPreviewChange = useCallback(
    (checked: boolean) => {
      updateNodeData(id, { captionMarkdownPreview: checked }, true);
    },
    [id, updateNodeData],
  );

  const markdownPreview = Boolean(nodeData.captionMarkdownPreview);

  const {
    panelRef,
    panelSize: { width: panelWidth, height: panelHeight },
    isResizing,
    handleResizePointerDown,
  } = useBranchPanelResize({
    width: storedPanelSize.width,
    height: storedPanelSize.height,
    min: CAPTION_BRANCH_PANEL_MIN,
    max: CAPTION_BRANCH_PANEL_MAX,
    onResizeEnd: handleResizeEnd,
  });

  let inputStatus: "ok" | "warn" | "error" | "none" = "none";
  if (!upstream.output) {
    inputStatus = "warn";
  } else if (!upstreamSatisfiesInput(requiredInput, upstream.output)) {
    inputStatus = "error";
  } else {
    const readiness = getNodeReadiness(nodeData.modelId, nodeData, upstream, projectId);
    inputStatus = readiness.ready ? "ok" : "warn";
  }

  useRefreshNodeHandles(
    true,
    true,
    lines.length,
    panelWidth,
    panelHeight,
    linesOutput?.kind,
    nodeData.runStatus,
    true,
    0,
    lines.length,
  );

  return (
    <div
      className={cn(
        "ocrflow-pipeline-node relative group",
        isSelected && "selected",
        focusPulseNodeId === id && "focus-pulse",
      )}
      data-category={nodeData.category}
    >
      <div
        ref={panelRef}
        className={cn(shellClassName(visualState), isResizing && "select-none")}
        style={{
          width: panelWidth,
          height: panelHeight,
          minWidth: CAPTION_BRANCH_PANEL_MIN.width,
          minHeight: CAPTION_BRANCH_PANEL_MIN.height,
          maxWidth: CAPTION_BRANCH_PANEL_MAX.width,
          maxHeight: CAPTION_BRANCH_PANEL_MAX.height,
        }}
      >
        <PipelineNodeHeader
          data={nodeData}
          visualState={visualState}
          actions={
            <>
              <label
                className="nodrag nopan flex items-center gap-1 rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-muted-foreground shadow-sm transition-colors hover:border-muted-foreground/40 hover:bg-secondary/40 hover:text-foreground"
                title="Render caption text as Markdown"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <FileText className="size-3 shrink-0" strokeWidth={1.75} />
                <span className="font-mono text-[8px] tracking-wide uppercase">MD</span>
                <Switch
                  checked={markdownPreview}
                  onCheckedChange={handleMarkdownPreviewChange}
                  size="sm"
                  aria-label="Render caption text as Markdown"
                />
              </label>
              <button
                type="button"
                className="nodrag nopan flex size-6 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground shadow-sm transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                aria-label="Close Caption Branch"
                title="Close Caption Branch"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  closeCaptionBranch(id);
                }}
              >
                <X className="size-3.5" strokeWidth={1.8} />
              </button>
            </>
          }
        />

        <div className="ocrflow-caption-branch-scroll min-h-0 flex-1 overflow-hidden px-2 pb-2 pt-1.5">
          <CaptionTextPanel
            lines={lines}
            variant="unified"
            renderAsMarkdown={markdownPreview}
          />
        </div>

        <p className="shrink-0 border-t border-border/20 px-2 py-1 font-mono text-[7px] tracking-wide text-muted-foreground/60 uppercase">
          Drag corner to resize
        </p>

        <BranchPanelResizeHandle onPointerDown={handleResizePointerDown} />

        {nodeData.runStatus === "running" && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-[var(--pulse)]/15"
            aria-hidden
          >
            <div className="h-full w-2/5 animate-[ocrflow-node-progress_1.4s_ease-in-out_infinite] bg-[var(--pulse)]" />
          </div>
        )}
      </div>

      <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 z-10">
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          isConnectable
          isConnectableEnd
          className="!w-3 !h-3 !border-2 !bg-card !relative !transform-none !top-0 !left-0"
          style={{ borderColor: "var(--node-accent)" }}
          aria-label={`Input: ${formatWireLabel(nodeData.inputType)}`}
        />
        <PortStatusDot status={inputStatus} />
      </div>

      <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 z-10">
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          isConnectable
          isConnectableStart
          className="!w-3 !h-3 !border-2 !bg-card !relative !transform-none !top-0 !right-0"
          style={{ borderColor: "var(--node-accent)" }}
          title={`Output: ${formatWireLabel(nodeData.outputType)}`}
          aria-label={`Output: ${formatWireLabel(nodeData.outputType)}`}
        />
      </div>
    </div>
  );
}

export const CaptionBranchPipelineNode = memo(CaptionBranchPipelineNodeComponent);
