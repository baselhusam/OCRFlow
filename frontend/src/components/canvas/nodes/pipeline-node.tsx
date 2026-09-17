"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Cable, X } from "lucide-react";
import { memo, useMemo, useState, type CSSProperties } from "react";
import { Handle, NodeToolbar, Position, type NodeProps } from "@xyflow/react";

import { AssetPreviewDialog } from "@/components/canvas/asset-preview-dialog";
import { PageLoaderNodeBody } from "@/components/canvas/nodes/bodies/page-loader-node-body";
import { NodePreviewCard } from "@/components/canvas/nodes/preview/node-preview-card";
import { PipelineNodeFooter } from "@/components/canvas/nodes/pipeline-node-footer";
import { PipelineNodeSummary } from "@/components/canvas/nodes/pipeline-node-summary";
import { CollectionItemsNode } from "@/components/canvas/nodes/collection-items-node";
import { CaptionBranchPipelineNode } from "@/components/canvas/nodes/caption-branch-pipeline-node";
import { DocumentBranchPipelineNode } from "@/components/canvas/nodes/document-branch-pipeline-node";
import { CaptionExpandPanel } from "@/components/canvas/nodes/output/caption-expand-panel";
import { ClassificationResultsPanel } from "@/components/canvas/nodes/output/classification-results-panel";
import { DocumentExpandPanel } from "@/components/canvas/nodes/output/document-expand-panel";
import {
  hasOutputData,
  OutputPanel,
} from "@/components/canvas/nodes/output/output-panel";
import { LayoutExpandPanel } from "@/components/canvas/nodes/output/layout-expand-panel";
import { PageAtLaunchPanel } from "@/components/canvas/nodes/output/page-at-launch-panel";
import type { RegionWire } from "@/components/canvas/nodes/output/region-thumbnail-panel";
import { PipelineNodeHeader } from "@/components/canvas/nodes/pipeline-node-header";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import { useRefreshNodeHandles } from "@/hooks/use-refresh-node-handles";
import { useSourceLoaderLoad } from "@/hooks/use-source-loader-load";
import { collectMapPages } from "@/lib/canvas/map-execution";
import {
  getUpstreamPagesForNode,
  getNodeReadiness,
} from "@/lib/canvas/node-readiness";
import {
  getOutgoingEdgeCount,
  upstreamSatisfiesInput,
} from "@/lib/canvas/resolve-upstream";
import {
  SOURCE_NODE_CATEGORIES,
  SOURCE_NODE_MODELS,
} from "@/lib/canvas/category-meta";
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

function PortStatusDot({
  status,
}: {
  status: "ok" | "warn" | "error" | "none";
}) {
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
  const nodeData = props.data as PipelineNodeData;
  if (isPageBranchNode(nodeData.modelId) || isRegionBranchNode(nodeData.modelId)) {
    return <CollectionItemsNode {...props} />;
  }
  if (isCaptionBranchNode(nodeData.modelId)) {
    return <CaptionBranchPipelineNode {...props} />;
  }
  if (isDocumentBranchNode(nodeData.modelId)) {
    return <DocumentBranchPipelineNode {...props} />;
  }
  return <DefaultPipelineNode {...props} />;
}

// Default node body — rendered for every model that isn't one of the branch
// node types dispatched above. Extracted into its own component so the Hooks
// below always run unconditionally; the model-type early returns live in the
// dispatcher (PipelineNodeComponent), keeping this component's Hook order stable.
function DefaultPipelineNode(props: NodeProps) {
  const { id, data, selected } = props;
  const nodeData = data as PipelineNodeData;

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
    selectNode,
  } = usePipelineGraphActions();

  const isSelected = selected || selectedNodeId === id;
  const visualState = getPipelineNodeVisualState(
    nodeData.runStatus,
    isSelected,
  );

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
      className="nodrag nopan flex size-6 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition-all duration-150 hover:border-destructive/40 hover:bg-destructive/8 hover:text-destructive focus-visible:ring-2 focus-visible:ring-[var(--pulse)]/45 focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none"
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
      const readiness = getNodeReadiness(
        nodeData.modelId,
        nodeData,
        upstream,
        projectId,
      );
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
    ).filter((region): region is RegionWire =>
      Boolean(
        region?.id && Array.isArray(region.bbox) && region.bbox.length === 4,
      ),
    );
  }, [nodeData.cachedOutput]);
  const captionLines = useMemo(() => {
    if (nodeData.cachedOutput?.kind !== "lines")
      return [] as Array<{ id: string; text?: string | null }>;
    return (
      (
        nodeData.cachedOutput.raw as {
          lines?: Array<{ id: string; text?: string | null }>;
        }
      ).lines ?? []
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
    ).filter(
      (
        figure,
      ): figure is {
        id: string;
        category?: string | null;
        caption?: string | null;
        description?: string | null;
        bbox?: number[];
      } => Boolean(figure?.id),
    );
  }, [nodeData.cachedOutput]);
  const showOutput =
    (isPageAt &&
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
    (isFigureClassifier && !isSourceLoader && classifiedFigures.length > 0);
  // Every node previews through the same screen-scale card. Anchor nodes
  // (page selector, layout, caption, converter, classifier) additionally own
  // an in-node "item ports" panel so single pages/regions/lines can be wired
  // downstream; that panel is what `outputPanelOpen` persists.
  const isAnchorNode =
    isPageAt ||
    isLayoutNode ||
    isCaptionTextNode ||
    isDocumentConverter ||
    isFigureClassifier;
  const hasLinkedBranch =
    linkedPageBranchExists ||
    linkedRegionBranchExists ||
    linkedCaptionBranchExists ||
    linkedDocumentBranchExists;
  const assetId = nodeData.params.assetId as string | undefined;
  const previewAvailable = isSourceLoader
    ? Boolean(nodeData.cachedOutput || assetId)
    : Boolean(
        nodeData.cachedOutput ||
        nodeData.runResult?.previewBase64 ||
        upstream.output ||
        pages.length,
      );
  // Loaders with an uploaded-but-not-loaded file preview the raw asset in a
  // dialog instead of the canvas card (there are no pages to render yet).
  const previewsAsset =
    isSourceLoader && !nodeData.cachedOutput && Boolean(assetId);
  const [assetPreviewOpen, setAssetPreviewOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const cardOpen = previewOpen && previewAvailable && !previewsAsset;
  const portsOpen =
    isAnchorNode && showOutput && nodeData.outputPanelOpen === true;
  const sourceLoad = useSourceLoaderLoad(id, nodeData);
  // "Apply to all pages" is offered when the node's document has >1 page.
  const mapPageCount = useMemo(
    () =>
      // Loaders, Select Page and whole-document converters are not per-page.
      isSourceLoader || isPageAt || isDocumentConverter
        ? 0
        : collectMapPages(id, nodes, edges).length,
    [edges, id, isDocumentConverter, isPageAt, isSourceLoader, nodes],
  );
  const footerRun = isSourceLoader
    ? {
        label: sourceLoad.isLoaded ? "Loaded" : "Load",
        onClick: sourceLoad.handleLoadClick,
        disabled: !sourceLoad.canLoadDocument,
        tooltip: assetId
          ? sourceLoad.isLoaded
            ? "Document loaded — upload another file to replace it"
            : "Render the document into pages"
          : "Upload a document first",
      }
    : isPageAt
      ? (false as const)
      : undefined;

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
    portsOpen,
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
          actions={clearAction}
        />

        <div className="flex flex-col gap-2 p-3">
          {!isSourceLoader && (
            <div className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground">
              {!hideInput && (
                <>
                  <span
                    className="max-w-[96px] truncate rounded-md border border-border/60 bg-secondary/50 px-1.5 py-0.5 text-foreground/85"
                    title={`Input: ${nodeData.inputType}`}
                  >
                    {formatWireLabel(nodeData.inputType)}
                  </span>
                  <span aria-hidden className="text-muted-foreground/60">
                    →
                  </span>
                </>
              )}
              <span
                className="max-w-[96px] truncate rounded-md border border-border/60 bg-secondary/50 px-1.5 py-0.5 text-foreground/85"
                title={`Output: ${nodeData.outputType}`}
              >
                {formatWireLabel(nodeData.outputType)}
              </span>
              {outgoingCount > 0 && (
                <span
                  className="ml-auto rounded-md bg-secondary px-1 py-0.5 text-foreground/80"
                  title={`${outgoingCount} downstream connection${outgoingCount === 1 ? "" : "s"}`}
                >
                  ×{outgoingCount}
                </span>
              )}
            </div>
          )}

          {isPageLoader ? (
            <PageLoaderNodeBody nodeId={id} data={nodeData} />
          ) : (
            <PipelineNodeSummary
              data={nodeData}
              missingInput={inputStatus === "warn" && !upstream.output}
              incompatibleInput={inputStatus === "error"}
            />
          )}

          {nodeData.runStatus === "error" && nodeData.runResult?.error && (
            <button
              type="button"
              className="nodrag nopan flex w-full items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/6 px-2 py-1.5 text-left text-[10px] leading-snug text-destructive transition-colors hover:bg-destructive/10"
              title="Open details"
              onClick={(event) => {
                event.stopPropagation();
                selectNode(id);
              }}
            >
              <AlertCircle className="mt-px size-3 shrink-0" />
              <span className="line-clamp-2">{nodeData.runResult.error}</span>
            </button>
          )}
        </div>

        <PipelineNodeFooter
          nodeId={id}
          data={nodeData}
          run={footerRun}
          mapPageCount={mapPageCount}
          previewOpen={cardOpen || assetPreviewOpen}
          previewCount={outputItemCount}
          previewAvailable={previewAvailable}
          onTogglePreview={() => {
            if (previewsAsset) setAssetPreviewOpen((open) => !open);
            else setPreviewOpen((open) => !open);
          }}
        />

        {previewsAsset && assetId && (
          <AssetPreviewDialog
            open={assetPreviewOpen}
            onOpenChange={setAssetPreviewOpen}
            projectId={projectId}
            assetId={assetId}
            format={nodeData.params.format as string | undefined}
            filename={nodeData.params.assetFilename as string | undefined}
          />
        )}

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
            style={{ borderColor: "var(--node-accent)" }}
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
            isPageAt &&
              pages.length > 0 &&
              "ocrflow-node-output-handle-page-at",
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
            className="pointer-events-none absolute top-1/2 left-full ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-md border border-[var(--node-accent)]/40 bg-card/90 px-1 py-px font-mono text-[7px] tracking-[0.08em] text-[var(--node-accent)] uppercase shadow-sm"
            aria-hidden
          >
            p.{selectedPageIndex + 1}
          </span>
        )}
      </div>

      <AnimatePresence>
        {portsOpen && (
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
              <div className="flex items-center justify-between gap-2 border-b border-border/40 px-2 py-1.5">
                <span className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
                  Item ports · {outputItemCount}
                </span>
                <button
                  type="button"
                  aria-label="Hide item ports"
                  className="nodrag nopan flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleOutputPanel(id);
                  }}
                >
                  <X className="size-3" />
                </button>
              </div>
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
                  onSelectPage={(index) =>
                    updateNodeConfig(id, { page_index: index })
                  }
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

      {/* Preview card: portal-rendered at screen scale so it stays readable at
          any canvas zoom. The anchor "item ports" panel above must stay inside
          the node DOM because React Flow measures handles there. */}
      <NodeToolbar
        isVisible={cardOpen}
        position={Position.Right}
        align="start"
        offset={14}
        className="ocrflow-node-preview-toolbar"
        // The toolbar portals outside the node, so re-establish its accent.
        style={{ "--node-accent": nodeData.categoryColor } as CSSProperties}
      >
        <motion.div
          initial={{ opacity: 0, x: -10, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <NodePreviewCard
            nodeId={id}
            data={nodeData}
            upstream={upstream}
            pages={pages}
            onClose={() => setPreviewOpen(false)}
            footer={
              isAnchorNode && (showOutput || hasLinkedBranch) ? (
                <div className="flex flex-col gap-1.5">
                  {isPageAt && (
                    <PageAtLaunchPanel
                      nodeId={id}
                      pages={pages}
                      branchNodeId={nodeData.pageBranchNodeId}
                    />
                  )}
                  {isLayoutNode && (
                    <LayoutExpandPanel
                      nodeId={id}
                      regions={layoutRegions}
                      branchNodeId={nodeData.regionBranchNodeId}
                    />
                  )}
                  {isCaptionTextNode && (
                    <CaptionExpandPanel
                      nodeId={id}
                      lineCount={captionLines.length}
                      branchNodeId={nodeData.captionBranchNodeId}
                    />
                  )}
                  {isDocumentConverter && (
                    <DocumentExpandPanel
                      nodeId={id}
                      hasOutput={hasOutputData(nodeData, pages)}
                      branchNodeId={nodeData.documentBranchNodeId}
                    />
                  )}
                  {showOutput && (
                    <button
                      type="button"
                      aria-pressed={portsOpen}
                      className={cn(
                        "nodrag nopan flex h-7 w-full items-center justify-center gap-1.5 rounded-md border text-[10.5px] font-medium transition-colors",
                        portsOpen
                          ? "border-[var(--node-accent)]/40 bg-[var(--node-accent)]/10 text-[var(--node-accent)]"
                          : "border-border/60 bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      )}
                      onClick={() => toggleOutputPanel(id)}
                    >
                      <Cable className="size-3" />
                      {portsOpen ? "Hide item ports" : "Show item ports on node"}
                    </button>
                  )}
                </div>
              ) : undefined
            }
          />
        </motion.div>
      </NodeToolbar>
    </div>
  );
}

export const PipelineNode = memo(PipelineNodeComponent);
