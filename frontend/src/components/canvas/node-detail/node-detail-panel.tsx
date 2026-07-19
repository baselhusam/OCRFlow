"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, GitBranch, SlidersHorizontal } from "lucide-react";

import { NodeDetailConnectionsTab } from "@/components/canvas/node-detail/node-detail-connections-tab";
import { NodeDetailHeader } from "@/components/canvas/node-detail/node-detail-header";
import { NodeDetailPreviewTab } from "@/components/canvas/node-detail/node-detail-preview-tab";
import { NodeDetailRunFooter } from "@/components/canvas/node-detail/node-detail-run-footer";
import { NodeDetailSetupTab } from "@/components/canvas/node-detail/node-detail-setup-tab";
import { NodeDetailStatusBar } from "@/components/canvas/node-detail/node-detail-status-bar";
import {
  getNodeDetailTabBadges,
  getPreviewSubTab,
  type NodeDetailTab,
} from "@/components/canvas/node-detail/node-detail-tabs";
import { PlannedNodeNotice } from "@/components/canvas/node-detail/planned-node-notice";
import { usePipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  CANVAS_INSPECTOR_WIDTH,
  canvasInspectorTabTriggerClassName,
  canvasInspectorTabsListClassName,
  canvasInspectorTabsShellClassName,
} from "@/lib/canvas/canvas-chrome";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import type { PipelineNodeData } from "@/lib/canvas/types";
import { CustomPipelineDetailOverview } from "@/components/canvas/node-detail/custom-pipeline-detail-overview";
import { isCustomPipelineNodeData } from "@/lib/canvas/custom-pipeline-node-data";
import { getNodeWireKinds } from "@/lib/canvas/wire-types";

function TabBadge({
  count,
  variant = "count",
}: {
  count?: number;
  variant?: "count" | "warning" | "success" | "error";
}) {
  if (variant === "count" && (!count || count <= 0)) return null;

  if (variant === "warning") {
    return (
      <span className="size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
    );
  }

  if (variant === "success") {
    return (
      <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
    );
  }

  if (variant === "error") {
    return (
      <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
    );
  }

  return (
    <span className="rounded-sm bg-amber-500/15 px-1 font-mono text-[8px] text-amber-700 dark:text-amber-400">
      {count}
    </span>
  );
}

function NodeDetailBody({
  nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}) {
  const { nodes, projectId, getUpstream, modelCatalog } =
    usePipelineGraphActions();
  const node = nodes.find((n) => n.id === nodeId);
  const [activeTab, setActiveTab] = useState<NodeDetailTab>("setup");
  const prevRunStatusRef = useRef<PipelineNodeData["runStatus"]>("idle");

  const data = node?.data;
  const requiredInput = data ? getNodeWireKinds(data).input : null;
  const upstream =
    data && requiredInput ? getUpstream(nodeId, requiredInput) : null;

  useEffect(() => {
    setActiveTab("setup");
    prevRunStatusRef.current =
      nodes.find((n) => n.id === nodeId)?.data.runStatus ?? "idle";
    // Reset tab only when a different node is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  useEffect(() => {
    if (!node || !data) return;

    const prevRunStatus = prevRunStatusRef.current;
    prevRunStatusRef.current = data.runStatus;

    if (
      SOURCE_NODE_MODELS.has(data.modelId) &&
      prevRunStatus === "running" &&
      data.runStatus === "success" &&
      data.cachedOutput
    ) {
      setActiveTab("preview");
    }
  }, [node, data, data?.runStatus, data?.cachedOutput, data?.modelId]);

  if (!node || !data) return null;

  if (isCustomPipelineNodeData(data)) {
    const upstreamContext = upstream ?? {
      nodeId: null,
      output: null,
      rawOutput: null,
      modelId: null,
      sourceHandle: null,
      edgeId: null,
    };

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <NodeDetailHeader data={data} onClose={onClose} />
        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className={canvasInspectorTabsShellClassName}>
            <TabsList className={canvasInspectorTabsListClassName}>
              <TabsTrigger value="overview" className={canvasInspectorTabTriggerClassName}>
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="connections"
                className={canvasInspectorTabTriggerClassName}
              >
                <GitBranch className="size-3.5 shrink-0 opacity-70" aria-hidden />
                Connections
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            value="overview"
            className="ocrflow-inspector-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <CustomPipelineDetailOverview
              data={data}
              modelCatalog={modelCatalog}
            />
          </TabsContent>
          <TabsContent
            value="connections"
            className="ocrflow-inspector-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <NodeDetailConnectionsTab
              nodeId={nodeId}
              data={data}
              upstream={upstreamContext}
            />
          </TabsContent>
        </Tabs>
        <NodeDetailRunFooter nodeId={nodeId} data={data} />
      </div>
    );
  }

  if (!upstream) return null;

  const badges = getNodeDetailTabBadges(data, upstream, projectId);
  const previewSubTab = getPreviewSubTab(data);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <NodeDetailHeader data={data} onClose={onClose} />
      {!SOURCE_NODE_MODELS.has(data.modelId) && (
        <NodeDetailStatusBar data={data} upstream={upstream} />
      )}
      <PlannedNodeNotice data={data} />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as NodeDetailTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className={canvasInspectorTabsShellClassName}>
          <TabsList className={canvasInspectorTabsListClassName}>
            <TabsTrigger
              value="setup"
              className={canvasInspectorTabTriggerClassName}
            >
              <SlidersHorizontal className="size-3.5 shrink-0 opacity-70" aria-hidden />
              Setup
              <TabBadge count={badges.setupIssues} />
            </TabsTrigger>
            <TabsTrigger
              value="connections"
              className={canvasInspectorTabTriggerClassName}
            >
              <GitBranch className="size-3.5 shrink-0 opacity-70" aria-hidden />
              Connections
              {badges.connectionsWarning && <TabBadge variant="warning" />}
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className={canvasInspectorTabTriggerClassName}
            >
              <Eye className="size-3.5 shrink-0 opacity-70" aria-hidden />
              Preview
              {badges.previewDot === "success" && <TabBadge variant="success" />}
              {badges.previewDot === "error" && <TabBadge variant="error" />}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="setup"
          className="ocrflow-inspector-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <NodeDetailSetupTab nodeId={nodeId} data={data} />
        </TabsContent>

        <TabsContent
          value="connections"
          className="ocrflow-inspector-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <NodeDetailConnectionsTab
            nodeId={nodeId}
            data={data}
            upstream={upstream}
          />
        </TabsContent>

        <TabsContent value="preview" className="flex min-h-0 flex-1 flex-col">
          <NodeDetailPreviewTab
            nodeId={nodeId}
            data={data}
            upstream={upstream}
            defaultSubTab={previewSubTab}
          />
        </TabsContent>
      </Tabs>

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
