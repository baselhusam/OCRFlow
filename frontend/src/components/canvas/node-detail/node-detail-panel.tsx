"use client";

import { useEffect } from "react";

import { NodeDetailConnectionsStrip } from "@/components/canvas/node-detail/node-detail-connections-strip";
import { NodeDetailHeader } from "@/components/canvas/node-detail/node-detail-header";
import { NodeDetailPreviewSection } from "@/components/canvas/node-detail/node-detail-preview-section";
import { NodeDetailRunFooter } from "@/components/canvas/node-detail/node-detail-run-footer";
import { NodeDetailSetupTab } from "@/components/canvas/node-detail/node-detail-setup-tab";
import { NodeDetailStatusBar } from "@/components/canvas/node-detail/node-detail-status-bar";
import { PlannedNodeNotice } from "@/components/canvas/node-detail/planned-node-notice";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { CANVAS_INSPECTOR_WIDTH } from "@/lib/canvas/canvas-chrome";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { isPageBranchNode } from "@/lib/canvas/page-branch-meta";
import { isRegionBranchNode } from "@/lib/canvas/region-branch-meta";
import { CustomPipelineDetailOverview } from "@/components/canvas/node-detail/custom-pipeline-detail-overview";
import { isCustomPipelineNodeData } from "@/lib/canvas/custom-pipeline-node-data";
import { getNodeWireKinds } from "@/lib/canvas/wire-types";

function NodeDetailBody({
  nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}) {
  const { nodes, getUpstream, modelCatalog } = usePipelineGraphActions();
  const node = nodes.find((n) => n.id === nodeId);

  const data = node?.data;
  const requiredInput = data ? getNodeWireKinds(data).input : null;
  const upstream =
    data && requiredInput ? getUpstream(nodeId, requiredInput) : null;

  if (!node || !data) return null;

  if (isCustomPipelineNodeData(data)) {
    const upstreamContext = upstream ?? {
      nodeId: null,
      output: null,
      rawOutput: null,
      modelId: null,
      sourceHandle: null,
      edgeId: null,
      assetId: null,
    };

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <NodeDetailHeader data={data} onClose={onClose} />
        <div className="ocrflow-inspector-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <NodeDetailConnectionsStrip
            nodeId={nodeId}
            data={data}
            upstream={upstreamContext}
          />
          <CustomPipelineDetailOverview
            data={data}
            modelCatalog={modelCatalog}
          />
        </div>
        <NodeDetailRunFooter nodeId={nodeId} data={data} />
      </div>
    );
  }

  if (!upstream) return null;

  // Items nodes run nothing: they fan an upstream collection out into wires.
  if (isPageBranchNode(data.modelId) || isRegionBranchNode(data.modelId)) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <NodeDetailHeader data={{ ...data, label: "Items" }} onClose={onClose} />
        <div className="ocrflow-inspector-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <NodeDetailConnectionsStrip nodeId={nodeId} data={data} upstream={upstream} />
          <div className="border-b border-border/60 px-[18px] py-4">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Every item of the upstream collection gets its own output port on
              the canvas. Drag from a port to send that one item downstream, or
              tick several items and wire the group port. Use the filter and
              page switcher on the node to find items.
            </p>
          </div>
          <NodeDetailPreviewSection
            key={nodeId}
            nodeId={nodeId}
            data={data}
            upstream={upstream}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <NodeDetailHeader data={data} onClose={onClose} />
      {!SOURCE_NODE_MODELS.has(data.modelId) && (
        <NodeDetailStatusBar data={data} upstream={upstream} />
      )}
      <PlannedNodeNotice data={data} />

      {/* One scroll: where it's wired, how it's configured, what it produces. */}
      <div className="ocrflow-inspector-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <NodeDetailConnectionsStrip
          nodeId={nodeId}
          data={data}
          upstream={upstream}
        />
        <NodeDetailSetupTab nodeId={nodeId} data={data} />
        <NodeDetailPreviewSection
          nodeId={nodeId}
          data={data}
          upstream={upstream}
        />
      </div>

      <NodeDetailRunFooter nodeId={nodeId} data={data} />
    </div>
  );
}

export function NodeDetailPanel() {
  const { selectedNodeId, clearSelection, nodes } = usePipelineGraphActions();
  const isMobile = useIsMobile();
  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  useEffect(() => {
    if (selectedNodeId && !selectedNode) {
      clearSelection();
    }
  }, [selectedNodeId, selectedNode, clearSelection]);

  if (!selectedNodeId || !selectedNode) {
    return null;
  }

  return (
    <>
      {!isMobile && (
        <aside
          className="ocrflow-inspector hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-border bg-card md:flex"
          style={{ width: CANVAS_INSPECTOR_WIDTH }}
        >
          <NodeDetailBody nodeId={selectedNodeId} onClose={clearSelection} />
        </aside>
      )}

      {isMobile && (
        <Sheet
          open={Boolean(selectedNodeId)}
          onOpenChange={(open) => {
            if (!open) clearSelection();
          }}
        >
          <SheetContent
            side="right"
            className="flex w-full min-h-0 flex-col overflow-hidden p-0"
            style={{ maxWidth: CANVAS_INSPECTOR_WIDTH }}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Node details</SheetTitle>
            </SheetHeader>
            <NodeDetailBody nodeId={selectedNodeId} onClose={clearSelection} />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
