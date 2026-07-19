"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { PageLoaderNodeBody } from "@/components/canvas/nodes/bodies/page-loader-node-body";
import { PageBranchPipelineNode } from "@/components/canvas/nodes/page-branch-pipeline-node";
import { RegionBranchPipelineNode } from "@/components/canvas/nodes/region-branch-pipeline-node";
import { CaptionBranchPipelineNode } from "@/components/canvas/nodes/caption-branch-pipeline-node";
import { DocumentBranchPipelineNode } from "@/components/canvas/nodes/document-branch-pipeline-node";
import { CaptionExpandPanel } from "@/components/canvas/nodes/output/caption-expand-panel";
import { ClassificationResultsPanel } from "@/components/canvas/nodes/output/classification-results-panel";
import { DocumentExpandPanel } from "@/components/canvas/nodes/output/document-expand-panel";
import { NodeInlinePreview } from "@/components/canvas/nodes/node-inline-preview";
import {
  hasOutputData,
  OutputPanel,
} from "@/components/canvas/nodes/output/output-panel";
import { LayoutExpandPanel } from "@/components/canvas/nodes/output/layout-expand-panel";
import { PageAtLaunchPanel } from "@/components/canvas/nodes/output/page-at-launch-panel";
import type { RegionWire } from "@/components/canvas/nodes/output/region-thumbnail-panel";
import { PipelineNodeHeader } from "@/components/canvas/nodes/pipeline-node-header";
import { PipelineNodeParams } from "@/components/canvas/nodes/pipeline-node-params";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { useRefreshNodeHandles } from "@/hooks/use-refresh-node-handles";
import { getUpstreamPagesForNode, getNodeReadiness } from "@/lib/canvas/node-readiness";
import { getOutgoingEdgeCount, upstreamSatisfiesInput } from "@/lib/canvas/resolve-upstream";
import { SOURCE_NODE_CATEGORIES, SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import {
  getParentCaptionNodeId,
  isCaptionBranchNode,
  isFigureCaptionTextOutput,
} from "@/lib/canvas/caption-branch-meta";
import {
  getParentDocumentNodeId,
  isDocumentBranchNode,
} from "@/lib/canvas/document-branch-meta";
import {
  getParentSelectPageId,
  isPageAtAnchor,
  isPageBranchNode,
} from "@/lib/canvas/page-branch-meta";
import {
  getParentLayoutNodeId,
  isLayoutAnchor,
  isRegionBranchNode,
} from "@/lib/canvas/region-branch-meta";
import { isDocumentConverterNode } from "@/lib/canvas/document-converter-meta";
import { isFigureClassificationNode } from "@/lib/canvas/figure-classification-meta";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { formatWireLabel } from "@/lib/canvas/wire-labels";
import { getModelWireKinds } from "@/lib/canvas/wire-types";
import { cn } from "@/lib/utils";
import type { PipelineNodeVisualState } from "@/components/canvas/nodes/pipeline-node-header";

function getPipelineNodeVisualState(
  runStatus: PipelineNodeData["runStatus"],
  isSelected: boolean,
): PipelineNodeVisualState {
  if (runStatus === "error") return "error";
  if (runStatus === "running") return "running";
  if (isSelected) return "selected";
  return "idle";
}

function pipelineNodeShellClassName(
  visualState: PipelineNodeVisualState,
): string {
  return cn(
    "ocrflow-pipeline-node-shell relative flex flex-col bg-card rounded-xl border overflow-hidden transition-[border-color,box-shadow] duration-150",
    "w-[260px]",
    visualState === "idle" &&
      "border-border/60 shadow-sm group-hover:shadow-[0_4px_12px_-2px_color-mix(in_srgb,var(--foreground)_5%,transparent)]",
    (visualState === "selected" || visualState === "running") &&
      "border-[var(--pulse)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--pulse)_34%,transparent),0_0_28px_-4px_color-mix(in_srgb,var(--pulse)_26%,transparent),0_12px_32px_-12px_color-mix(in_srgb,var(--foreground)_14%,transparent)]",
    visualState === "error" &&
      "border-destructive shadow-[0_0_0_3px_color-mix(in_srgb,var(--destructive)_32%,transparent),0_0_20px_-4px_color-mix(in_srgb,var(--destructive)_22%,transparent)]",
  );
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

function PipelineNodeComponent(props: NodeProps) {
  const { id, data, selected } = props;
  const nodeData = data as PipelineNodeData;
  if (isPageBranchNode(nodeData.modelId)) {
    return <PageBranchPipelineNode {...props} />;
  }
  if (isRegionBranchNode(nodeData.modelId)) {
    return <RegionBranchPipelineNode {...props} />;
  }
  if (isCaptionBranchNode(nodeData.modelId)) {
    return <CaptionBranchPipelineNode {...props} />;
  }
  if (isDocumentBranchNode(nodeData.modelId)) {
    return <DocumentBranchPipelineNode {...props} />;
  }

  const isPageLoader = nodeData.category === "page_loader";
  const isPageAt = isPageAtAnchor(nodeData.modelId);
  const isLayoutNode = isLayoutAnchor(nodeData.modelId, nodeData.category);
  const isCaptionTextNode = isFigureCaptionTextOutput(nodeData.modelId);
  const isDocumentConverter = isDocumentConverterNode(nodeData.modelId);
  const isFigureClassifier = isFigureClassificationNode(
    nodeData.modelId,
    nodeData.category,
  );
  const selectedPageIndex = Number(nodeData.params.page_index ?? 0);
  const {
    projectId,
    getUpstream,
    toggleOutputPanel,
    updateNodeConfig,
    clearNodeRunState,
    nodes,
    edges,
    focusPulseNodeId,
    selectedNodeId,
  } = usePipelineGraphActions();

  const isSelected = selected || selectedNodeId === id;
  const visualState = getPipelineNodeVisualState(nodeData.runStatus, isSelected);

  const isSourceLoader = SOURCE_NODE_MODELS.has(nodeData.modelId);

  const hasRunState =
    nodeData.cachedOutput != null ||
    (nodeData.runStatus != null &&
      nodeData.runStatus !== "idle" &&
      nodeData.runStatus !== "running");

  const clearLabel = isSourceLoader ? "Unload" : "Clear output";

  const clearAction = hasRunState ? (
    <button
      type="button"
      aria-label={clearLabel}
      title={clearLabel}
      className="nodrag nopan flex size-6 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition-all duration-150 hover:border-destructive/40 hover:bg-destructive/8 hover:text-destructive"
      onClick={(e) => {
        e.stopPropagation();
        clearNodeRunState(id);
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <X className="size-3" />
    </button>
  ) : null;

  const hideInput =
    SOURCE_NODE_CATEGORIES.has(nodeData.category) && isSourceLoader;

  const requiredInput = getModelWireKinds(
    nodeData.modelId,
    nodeData.inputType,
    nodeData.outputType,
  ).input;
  const upstream = getUpstream(id, requiredInput);
  const pages = useMemo(
    () => getUpstreamPagesForNode(nodeData, upstream),
    [nodeData, upstream],
  );

  const outgoingCount = getOutgoingEdgeCount(id, edges);

  let inputStatus: "ok" | "warn" | "error" | "none" = "none";
  if (!hideInput) {
    if (!upstream.output) {
      inputStatus = "warn";
    } else if (!upstreamSatisfiesInput(requiredInput, upstream.output)) {
      inputStatus = "error";
    } else {
      const readiness = getNodeReadiness(nodeData.modelId, nodeData, upstream, projectId);
      inputStatus = readiness.ready ? "ok" : "warn";
    }
  }

  const linkedPageBranchExists =
    isPageAt &&
    nodes.some(
      (node) =>
        isPageBranchNode(node.data.modelId) &&
        (node.id === nodeData.pageBranchNodeId ||
          getParentSelectPageId(node.data.params) === id),
    );
  const linkedRegionBranchExists =
    isLayoutNode &&
    nodes.some(
      (node) =>
        isRegionBranchNode(node.data.modelId) &&
        (node.id === nodeData.regionBranchNodeId ||
          getParentLayoutNodeId(node.data.params) === id),
    );
  const linkedCaptionBranchExists =
    isCaptionTextNode &&
    nodes.some(
      (node) =>
        isCaptionBranchNode(node.data.modelId) &&
        (node.id === nodeData.captionBranchNodeId ||
          getParentCaptionNodeId(node.data.params) === id),
    );
  const linkedDocumentBranchExists =
    isDocumentConverter &&
    nodes.some(
      (node) =>
        isDocumentBranchNode(node.data.modelId) &&
        (node.id === nodeData.documentBranchNodeId ||
          getParentDocumentNodeId(node.data.params) === id),
    );
  const layoutRegions = useMemo(() => {
    if (nodeData.cachedOutput?.kind !== "regions") return [] as RegionWire[];
    return (
      (nodeData.cachedOutput.raw as { regions?: RegionWire[] }).regions ?? []
    ).filter(
      (region): region is RegionWire =>
        Boolean(region?.id && Array.isArray(region.bbox) && region.bbox.length === 4),
    );
  }, [nodeData.cachedOutput]);
  const captionLines = useMemo(() => {
    if (nodeData.cachedOutput?.kind !== "lines") return [] as Array<{ id: string; text?: string | null }>;
    return (
      (nodeData.cachedOutput.raw as { lines?: Array<{ id: string; text?: string | null }> })
        .lines ?? []
    );
  }, [nodeData.cachedOutput]);
  const classifiedFigures = useMemo(() => {
    if (nodeData.cachedOutput?.kind !== "figures") return [];
    return (
      (
        nodeData.cachedOutput.raw as {
          figures?: Array<{
            id: string;
            category?: string | null;
            caption?: string | null;
            description?: string | null;
            bbox?: number[];
          }>;
        }
      ).figures ?? []
    ).filter((figure): figure is {
      id: string;
      category?: string | null;
      caption?: string | null;
      description?: string | null;
      bbox?: number[];
    } => Boolean(figure?.id));
  }, [nodeData.cachedOutput]);
  const showOutput =
    ((isPageAt &&
      !linkedPageBranchExists &&
      !isSourceLoader &&
      hasOutputData(nodeData, pages)) ||
      (isLayoutNode &&
        !linkedRegionBranchExists &&
        !isSourceLoader &&
        hasOutputData(nodeData, pages)) ||
      (isCaptionTextNode &&
        !linkedCaptionBranchExists &&
        !isSourceLoader &&
        captionLines.length > 0) ||
      (isDocumentConverter &&
        !linkedDocumentBranchExists &&
        !isSourceLoader &&
        hasOutputData(nodeData, pages)) ||
      (isFigureClassifier &&
        !isSourceLoader &&
        classifiedFigures.length > 0));
  const outputOpen = nodeData.outputPanelOpen === true;

  const outputItemCount = isPageAt
    ? pages.length
    : isLayoutNode
      ? layoutRegions.length
      : isCaptionTextNode
        ? captionLines.length
        : isDocumentConverter
          ? (nodeData.cachedOutput?.preview?.pageCount ??
            nodeData.cachedOutput?.preview?.itemCount ??
            0)
          : isFigureClassifier
            ? classifiedFigures.length
          : (nodeData.cachedOutput?.preview?.itemCount ??
            nodeData.cachedOutput?.preview?.pageCount ??
            pages.length ??
            0);

  useRefreshNodeHandles(
    showOutput,
    outputOpen,
    outputItemCount,
    nodeData.cachedOutput?.kind,
    nodeData.runStatus,
    false,
    selectedPageIndex,
    pages.length,
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
      <div className={pipelineNodeShellClassName(visualState)}>
        <PipelineNodeHeader
          data={nodeData}
          visualState={visualState}
          showOutputToggle={showOutput}
          outputToggleVariant={isFigureClassifier ? "preview" : "panel"}
          outputOpen={outputOpen}
          outputItemCount={outputItemCount}
          onToggleOutput={() => toggleOutputPanel(id)}
          actions={clearAction}
        />

        <div className="p-3 flex flex-col gap-3">
          {!isSourceLoader && (
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              {!hideInput && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider opacity-70">IN</span>
                  <span
                    className="max-w-[80px] truncate rounded border border-border/50 bg-secondary/50 px-1.5 py-0.5 text-foreground/80"
                    title={nodeData.inputType}
                  >
                    {formatWireLabel(nodeData.inputType)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-wider opacity-70">OUT</span>
                <span
                  className="max-w-[80px] truncate rounded border border-border/50 bg-secondary/50 px-1.5 py-0.5 text-foreground/80"
                  title={nodeData.outputType}
                >
                  {formatWireLabel(nodeData.outputType)}
                </span>
                {outgoingCount > 0 && (
                  <span className="rounded-sm bg-secondary px-1 text-foreground/70">
                    {outgoingCount}
                  </span>
                )}
              </div>
            </div>
          )}

          {isPageLoader ? (
            <PageLoaderNodeBody nodeId={id} data={nodeData} />
          ) : (
            <PipelineNodeParams nodeId={id} data={nodeData} />
          )}

          {!isSourceLoader &&
            !isPageAt &&
            !isLayoutNode &&
            !isCaptionTextNode &&
            !isDocumentConverter &&
            !isFigureClassifier && (
            <NodeInlinePreview
              nodeId={id}
              data={nodeData}
              upstream={upstream}
              pages={pages}
            />
          )}
        </div>

        {nodeData.runStatus === "running" && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-[var(--pulse)]/15"
            aria-hidden
          >
            <div className="h-full w-2/5 animate-[ocrflow-node-progress_1.4s_ease-in-out_infinite] bg-[var(--pulse)]" />
          </div>
        )}
      </div>

      {/* Handles */}
      {!hideInput && (
        <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 z-10">
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            isConnectable
            isConnectableEnd
            className="!w-3 !h-3 !border-2 !bg-card !relative !transform-none !top-0 !left-0"
            style={{ borderColor: 'var(--node-accent)' }}
            aria-label={`Input: ${formatWireLabel(nodeData.inputType)}`}
          />
          <PortStatusDot status={inputStatus} />
        </div>
      )}
      
      <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 z-10">
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          isConnectable
          isConnectableStart
          className={cn(
            "!w-3 !h-3 !border-2 !bg-card !relative !transform-none !top-0 !right-0",
            (isPageAt &&
              pages.length > 0 &&
              "ocrflow-node-output-handle-page-at"),
          )}
          style={{ borderColor: "var(--node-accent)" }}
          title={
            isPageAt && pages.length > 0
              ? `Connect selected page (p.${selectedPageIndex + 1}) to downstream nodes`
              : `Output: ${formatWireLabel(nodeData.outputType)}`
          }
          aria-label={
            isPageAt && pages.length > 0
              ? `Output: selected page ${selectedPageIndex + 1}`
              : `Output: ${formatWireLabel(nodeData.outputType)}`
          }
        />
        {isPageAt && pages.length > 0 && (
          <span
            className="pointer-events-none absolute top-1/2 left-full ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-sm border border-[var(--node-accent)]/30 bg-card/90 px-1 py-px font-mono text-[7px] tracking-wide text-[var(--node-accent)] uppercase shadow-sm"
            aria-hidden
          >
            p.{selectedPageIndex + 1}
          </span>
        )}
      </div>

      <AnimatePresence>
        {showOutput && outputOpen && (
          <motion.div
            key="output-panel"
            initial={{ opacity: 0, x: -12, scale: 0.96, y: "-50%" }}
            animate={{ opacity: 1, x: 0, scale: 1, y: "-50%" }}
            exit={{ opacity: 0, x: -8, scale: 0.98, y: "-50%" }}
            transition={{
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="ocrflow-pipeline-node-output-shell absolute top-1/2 left-full z-10 ml-3"
          >
            <div
              className={cn(
                "ocrflow-page-at-output-card rounded-xl",
                isLayoutNode && "ocrflow-layout-output-card has-regions",
                isCaptionTextNode && "ocrflow-caption-text-output-card",
                isDocumentConverter && "ocrflow-document-output-card",
                isFigureClassifier && "ocrflow-classification-output-card",
              )}
            >
              {isFigureClassifier ? (
                <ClassificationResultsPanel
                  figures={classifiedFigures}
                  showConnectionPorts
                />
              ) : (
                <OutputPanel
                  nodeId={id}
                  data={nodeData}
                  pages={pages}
                  onSelectPage={(index) => updateNodeConfig(id, { page_index: index })}
                  compactLayoutMode={isLayoutNode}
                />
              )}
              {(isPageAt || isLayoutNode) && (
                <div className="border-t border-border/30 px-1.5 py-1.5">
                  {isPageAt ? (
                    <PageAtLaunchPanel
                      nodeId={id}
                      pages={pages}
                      branchNodeId={nodeData.pageBranchNodeId}
                    />
                  ) : (
                    <LayoutExpandPanel
                      nodeId={id}
                      regions={layoutRegions}
                      branchNodeId={nodeData.regionBranchNodeId}
                    />
                  )}
                </div>
              )}
              {isCaptionTextNode && (
                <div className="border-t border-border/30 px-1.5 py-1.5">
                  <CaptionExpandPanel
                    nodeId={id}
                    lineCount={captionLines.length}
                    branchNodeId={nodeData.captionBranchNodeId}
                  />
                </div>
              )}
              {isDocumentConverter && (
                <div className="border-t border-border/30 px-1.5 py-1.5">
                  <DocumentExpandPanel
                    nodeId={id}
                    hasOutput={hasOutputData(nodeData, pages)}
                    branchNodeId={nodeData.documentBranchNodeId}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const PipelineNode = memo(PipelineNodeComponent);
