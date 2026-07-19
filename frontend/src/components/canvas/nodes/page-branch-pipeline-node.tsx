"use client";

import {
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";

import { PageThumbnailPanel } from "@/components/canvas/nodes/output/output-panel";
import { ItemOutputHandle } from "@/components/canvas/nodes/output/item-output-handle";
import {
  BranchPanelResizeHandle,
  useBranchPanelResize,
  type BranchPanelSize,
} from "@/components/canvas/nodes/branch-panel-resize";
import {
  PipelineNodeHeader,
  type PipelineNodeVisualState,
} from "@/components/canvas/nodes/pipeline-node-header";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { useRefreshNodeHandles } from "@/hooks/use-refresh-node-handles";
import {
  readPageAtHintDismissed,
  writePageAtHintDismissed,
} from "@/lib/canvas/page-at-prefs";
import { getUpstreamPagesForNode, getNodeReadiness } from "@/lib/canvas/node-readiness";
import {
  PAGE_BRANCH_PANEL_DEFAULT,
  PAGE_BRANCH_PANEL_MAX,
  PAGE_BRANCH_PANEL_MIN,
} from "@/lib/canvas/page-branch-meta";
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
    "ocrflow-page-branch-node ocrflow-page-at-output-card ocrflow-page-branch-panel relative flex flex-col rounded-xl border bg-card overflow-hidden transition-[border-color,box-shadow] duration-150 has-page-at-ports",
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
      PAGE_BRANCH_PANEL_MAX.width,
      Math.max(PAGE_BRANCH_PANEL_MIN.width, Math.round(width)),
    ),
    height: Math.min(
      PAGE_BRANCH_PANEL_MAX.height,
      Math.max(PAGE_BRANCH_PANEL_MIN.height, Math.round(height)),
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

function PageBranchPipelineNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as PipelineNodeData;
  const selectedPageIndex = Number(nodeData.params.page_index ?? 0);
  const nodeRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const portRowRefs = useRef(new Map<number, HTMLDivElement>());
  const [hintDismissed, setHintDismissed] = useState(() => readPageAtHintDismissed());
  const [portOffsets, setPortOffsets] = useState<Record<number, number>>({});
  const updateNodeInternals = useUpdateNodeInternals();

  const {
    projectId,
    getUpstream,
    updateNodeConfig,
    updateNodeData,
    closePageBranch,
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
  const pages = getUpstreamPagesForNode(nodeData, upstream);

  const storedPanelSize = clampPanelSize(
    nodeData.branchPanelWidth ?? PAGE_BRANCH_PANEL_DEFAULT.width,
    nodeData.branchPanelHeight ?? PAGE_BRANCH_PANEL_DEFAULT.height,
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

  const {
    panelRef,
    panelSize: { width: panelWidth, height: panelHeight },
    isResizing,
    handleResizePointerDown,
  } = useBranchPanelResize({
    width: storedPanelSize.width,
    height: storedPanelSize.height,
    min: PAGE_BRANCH_PANEL_MIN,
    max: PAGE_BRANCH_PANEL_MAX,
    onResizeEnd: handleResizeEnd,
  });

  const portOffsetsRef = useRef<Record<number, number>>({});

  const remeasurePortOffsets = useCallback(() => {
    const nodeEl = nodeRef.current;
    if (!nodeEl) return;
    const nodeRect = nodeEl.getBoundingClientRect();
    const scaleY = nodeEl.offsetHeight > 0 ? nodeRect.height / nodeEl.offsetHeight : 1;
    const clipRect = scrollContainerRef.current?.getBoundingClientRect();
    const next: Record<number, number> = {};
    for (const [pageIndex, anchor] of portRowRefs.current.entries()) {
      const anchorRect = anchor.getBoundingClientRect();
      if (clipRect) {
        const rowVisible =
          anchorRect.bottom > clipRect.top && anchorRect.top < clipRect.bottom;
        if (!rowVisible) continue;
      }
      const centerY = anchorRect.top + anchorRect.height / 2;
      next[pageIndex] = Math.round(((centerY - nodeRect.top) / scaleY) * 2) / 2;
    }

    const prev = portOffsetsRef.current;
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    const unchanged =
      prevKeys.length === nextKeys.length &&
      nextKeys.every((key) => prev[Number(key)] === next[Number(key)]);
    if (unchanged) return;

    portOffsetsRef.current = next;
    setPortOffsets(next);
    requestAnimationFrame(() => updateNodeInternals(id));
  }, [id, updateNodeInternals]);

  const remeasurePortOffsetsRef = useRef(remeasurePortOffsets);

  useLayoutEffect(() => {
    remeasurePortOffsetsRef.current = remeasurePortOffsets;
  }, [remeasurePortOffsets]);

  const handlePortLayoutChange = useCallback(() => {
    remeasurePortOffsetsRef.current();
  }, []);

  useLayoutEffect(() => {
    remeasurePortOffsets();
  }, [
    remeasurePortOffsets,
    pages.length,
    selectedPageIndex,
    panelWidth,
    panelHeight,
    nodeData.cachedOutput?.kind,
    nodeData.runStatus,
  ]);

  useLayoutEffect(() => {
    const panelEl = panelRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!panelEl) return;
    const observer = new ResizeObserver(() => remeasurePortOffsets());
    observer.observe(panelEl);
    if (scrollEl) observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [panelRef, remeasurePortOffsets, pages.length]);

  const handlePortRowMount = useCallback(
    (pageIndex: number, element: HTMLDivElement | null) => {
      if (element) {
        portRowRefs.current.set(pageIndex, element);
      } else {
        portRowRefs.current.delete(pageIndex);
      }
      requestAnimationFrame(() => remeasurePortOffsetsRef.current());
    },
    [],
  );

  const handleScrollContainerMount = useCallback(
    (element: HTMLDivElement | null) => {
      scrollContainerRef.current = element;
      if (element) {
        requestAnimationFrame(() => remeasurePortOffsetsRef.current());
      }
    },
    [],
  );

  let inputStatus: "ok" | "warn" | "error" | "none" = "none";
  if (!upstream.output) {
    inputStatus = "warn";
  } else if (!upstreamSatisfiesInput(requiredInput, upstream.output)) {
    inputStatus = "error";
  } else {
    const readiness = getNodeReadiness(nodeData.modelId, nodeData, upstream, projectId);
    inputStatus = readiness.ready ? "ok" : "warn";
  }

  useLayoutEffect(() => {
    const storedWidth = nodeData.branchPanelWidth;
    const storedHeight = nodeData.branchPanelHeight;
    if (storedWidth == null && storedHeight == null) return;
    const clamped = clampPanelSize(
      storedWidth ?? PAGE_BRANCH_PANEL_DEFAULT.width,
      storedHeight ?? PAGE_BRANCH_PANEL_DEFAULT.height,
    );
    if (
      storedWidth !== clamped.width ||
      storedHeight !== clamped.height
    ) {
      updateNodeData(
        id,
        { branchPanelWidth: clamped.width, branchPanelHeight: clamped.height },
        true,
      );
    }
  }, [id, nodeData.branchPanelWidth, nodeData.branchPanelHeight, updateNodeData]);

  useRefreshNodeHandles(
    true,
    true,
    pages.length,
    panelWidth,
    panelHeight,
    nodeData.cachedOutput?.kind,
    nodeData.runStatus,
    true,
    selectedPageIndex,
    pages.length,
  );

  const handleDismissHint = () => {
    setHintDismissed(true);
    writePageAtHintDismissed(true);
  };

  return (
    <div
      ref={nodeRef}
      className={cn(
        "ocrflow-pipeline-node relative overflow-visible group",
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
          minWidth: PAGE_BRANCH_PANEL_MIN.width,
          minHeight: PAGE_BRANCH_PANEL_MIN.height,
          maxWidth: PAGE_BRANCH_PANEL_MAX.width,
          maxHeight: PAGE_BRANCH_PANEL_MAX.height,
        }}
      >
        <PipelineNodeHeader
          data={{
            ...nodeData,
            categoryLabel:
              pages.length > 0
                ? `${pages.length} pg`
                : nodeData.categoryLabel,
          }}
          visualState={visualState}
          actions={
            <button
              type="button"
              className="nodrag nopan flex size-6 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground shadow-sm transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              aria-label="Close Page Branch"
              title="Close Page Branch"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                closePageBranch(id);
              }}
            >
              <X className="size-3.5" strokeWidth={1.8} />
            </button>
          }
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          {pages.length > 0 ? (
            <PageThumbnailPanel
              pages={pages}
              selectedIndex={selectedPageIndex}
              onSelectPage={(index) => updateNodeConfig(id, { page_index: index })}
              showConnectionPorts
              portVariant="page-branch"
              fillContainer
              hintDismissed={hintDismissed}
              onDismissHint={handleDismissHint}
              onPortRowMount={handlePortRowMount}
              onScrollContainerMount={handleScrollContainerMount}
              onPortLayoutChange={handlePortLayoutChange}
            />
          ) : (
            <p className="flex h-full items-center justify-center px-3 text-center text-[10px] text-muted-foreground">
              Connect to Select Page and run upstream loader.
            </p>
          )}
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

      {Object.entries(portOffsets).map(([pageIndex, top]) => (
        <div
          key={pageIndex}
          className="ocrflow-page-branch-port absolute top-0 -right-1.5 z-10 -translate-y-1/2"
          style={{ top }}
        >
          <ItemOutputHandle
            itemKind="page"
            itemId={pageIndex}
            variant="node-border"
          />
        </div>
      ))}

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
    </div>
  );
}

export const PageBranchPipelineNode = memo(PageBranchPipelineNodeComponent);
