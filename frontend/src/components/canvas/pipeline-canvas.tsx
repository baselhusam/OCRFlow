"use client";

import {
  Background,
  BackgroundVariant,
  PanOnScrollMode,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { CanvasBottomLeftControls } from "@/components/canvas/canvas-bottom-left-controls";
import { CanvasToastProvider } from "@/components/canvas/canvas-toast-context";
import { PipelineGraphProvider } from "@/components/canvas/pipeline-graph-context";
import { CustomPipelineNode } from "@/components/canvas/nodes/custom-pipeline-node";
import { PipelineDefinitionHeader } from "@/components/pipelines/pipeline-definition-header";
import { NodeDetailPanel } from "@/components/canvas/node-detail/node-detail-panel";
import { EdgeDetailPanel } from "@/components/canvas/edge-detail/edge-detail-panel";
import { PipelineNode } from "@/components/canvas/nodes/pipeline-node";
import {
  PipelineFlowEdge,
} from "@/components/canvas/edges/pipeline-flow-edge";
import {
  registerPaletteAddHandler,
  registerPaletteAddPipelineHandler,
} from "@/lib/canvas/palette-add-bridge";
import {
  PIPELINE_EDGE_PULSE,
  PIPELINE_FLOW_EDGE_TYPE,
  pipelineEdgeMarker,
} from "@/lib/canvas/edge-styles";
import { usePipelineGraph } from "@/hooks/use-pipeline-graph";
import {
  getCanvasInteractionModeServerSnapshot,
  readCanvasInteractionMode,
  subscribeCanvasInteractionMode,
  writeCanvasInteractionMode,
  type CanvasInteractionMode,
} from "@/lib/canvas/canvas-interaction-prefs";
import type { CategoryMeta, GraphEntityContext, ModelCatalogEntry, PipelineNodeData } from "@/lib/canvas/types";
import { CanvasProjectHeader } from "@/components/canvas/canvas-project-header";
import { isPipelineReady } from "@/lib/api/pipelines";
import type { Pipeline } from "@/lib/api/client";
import {
  CUSTOM_PIPELINE_NODE_TYPE,
  DRAG_MODEL_MIME,
  DRAG_PIPELINE_MIME,
  PIPELINE_NODE_TYPE,
} from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

import "@xyflow/react/dist/style.css";

const nodeTypes = {
  [PIPELINE_NODE_TYPE]: PipelineNode,
  [CUSTOM_PIPELINE_NODE_TYPE]: CustomPipelineNode,
};

const edgeTypes = {
  [PIPELINE_FLOW_EDGE_TYPE]: PipelineFlowEdge,
};

const SNAP_GRID: [number, number] = [8, 8];

type PipelineCanvasInnerProps = {
  entity: GraphEntityContext;
  entityName: string;
  entityUpdatedAt: string;
  initialGraph: Record<string, unknown>;
  models: ModelCatalogEntry[];
  categories: CategoryMeta[];
  readOnly?: boolean;
  userPipelines?: Pipeline[];
};

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  return Boolean(
    (target as HTMLElement | null)?.closest(
      "input, textarea, select, [contenteditable=true]",
    ),
  );
}

function PipelineCanvasInner({
  entity,
  entityName,
  entityUpdatedAt,
  initialGraph,
  models,
  categories,
  readOnly = false,
  userPipelines = [],
}: PipelineCanvasInnerProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const focusPulseTimerRef = useRef<number | null>(null);
  const dragDuplicateRef = useRef<{
    nodeIds: string[];
    startPositions: Map<string, { x: number; y: number }>;
    duplicateOnStop: boolean;
  } | null>(null);
  const { screenToFlowPosition, fitView, setCenter, getViewport } = useReactFlow();
  const initialFitDone = useRef(false);
  const [focusPulseNodeId, setFocusPulseNodeId] = useState<string | null>(null);
  const interactionMode = useSyncExternalStore(
    subscribeCanvasInteractionMode,
    readCanvasInteractionMode,
    getCanvasInteractionModeServerSnapshot,
  );

  const handleInteractionModeChange = useCallback(
    (mode: CanvasInteractionMode) => {
      writeCanvasInteractionMode(mode);
    },
    [],
  );

  const interactionFlowProps = useMemo(() => {
    if (interactionMode === "select") {
      return {
        panOnDrag: [1, 2] as [number, number],
        selectionOnDrag: true,
        selectionKeyCode: null,
        selectionMode: SelectionMode.Partial,
      };
    }

    return {
      panOnDrag: true,
      selectionOnDrag: false,
      selectionKeyCode: "Shift" as const,
      selectionMode: SelectionMode.Full,
    };
  }, [interactionMode]);

  const graph = usePipelineGraph({
    entity,
    initialGraph,
    initialUpdatedAt: entityUpdatedAt,
    models,
    categories,
    readOnly,
    userPipelines,
  });

  const {
    nodes,
    edges,
    viewport,
    saveStatus,
    lastSavedAt,
    hasUnsavedChanges,
    saveNow,
    onNodesChange,
    onEdgesChange,
    onViewportChange,
    onConnect,
    isValidConnection,
    addModelNode,
    addCustomPipelineNode,
    addModelAtPosition,
    updateNodeConfig,
    updateNodeData,
    toggleOutputPanel,
    getUpstream,
    runNode,
    runFullPipeline,
    clearNodeRunState,
    clearAllRunState,
    pipelineRunState,
    pipelineSteps,
    modelCatalog,
    parsedGraph,
    selectedNodeId,
    selectedEdgeId,
    selectNode,
    onSelectionChange,
    clearSelection,
    updateEdgeSourceHandle,
    autoLayout: autoLayoutFromGraph,
    expandPageBranch,
    closePageBranch,
    expandRegionBranch,
    closeRegionBranch,
    expandCaptionBranch,
    closeCaptionBranch,
    expandDocumentBranch,
    closeDocumentBranch,
    undoNodeDeletion,
    copySelectedNodes,
    cutSelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,
    duplicateNodesAtDragPositions,
    boundaryValidation,
    saveValidationError,
  } = graph;

  const contextId = entity.id;

  const autoLayout = useCallback(() => {
    autoLayoutFromGraph();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void fitView({ padding: 0.2 });
      });
    });
  }, [autoLayoutFromGraph, fitView]);

  const focusNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((entry) => entry.id === nodeId);
      if (!node) return;
      selectNode(nodeId);
      setFocusPulseNodeId(nodeId);
      if (focusPulseTimerRef.current !== null) {
        window.clearTimeout(focusPulseTimerRef.current);
      }
      focusPulseTimerRef.current = window.setTimeout(() => {
        setFocusPulseNodeId((current) => (current === nodeId ? null : current));
        focusPulseTimerRef.current = null;
      }, 2400);
      void setCenter(node.position.x + 140, node.position.y + 80, {
        zoom: getViewport().zoom,
        duration: 300,
      });
    },
    [nodes, selectNode, setCenter, getViewport],
  );

  useEffect(
    () => () => {
      if (focusPulseTimerRef.current !== null) {
        window.clearTimeout(focusPulseTimerRef.current);
      }
    },
    [],
  );

  const graphState = useMemo(
    () => ({
      projectId: contextId,
      entity,
      nodes,
      edges,
      selectedNodeId,
      selectedEdgeId,
      saveStatus,
      lastSavedAt,
      hasUnsavedChanges,
      pipelineRunState,
      pipelineSteps,
      focusPulseNodeId,
      modelCatalog,
      categories,
    }),
    [
      contextId,
      entity,
      nodes,
      edges,
      selectedNodeId,
      selectedEdgeId,
      saveStatus,
      lastSavedAt,
      hasUnsavedChanges,
      pipelineRunState,
      pipelineSteps,
      focusPulseNodeId,
      modelCatalog,
      categories,
    ],
  );

  const graphActions = useMemo(
    () => ({
      saveNow,
      updateNodeConfig,
      updateNodeData,
      toggleOutputPanel,
      getUpstream,
      runNode,
      runFullPipeline,
      clearNodeRunState,
      clearAllRunState,
      clearSelection,
      selectNode,
      updateEdgeSourceHandle,
      addModelNode,
      addModelAtPosition,
      expandPageBranch,
      closePageBranch,
      expandRegionBranch,
      closeRegionBranch,
      expandCaptionBranch,
      closeCaptionBranch,
      expandDocumentBranch,
      closeDocumentBranch,
      focusNode,
      autoLayout,
    }),
    [
      saveNow,
      updateNodeConfig,
      updateNodeData,
      toggleOutputPanel,
      getUpstream,
      runNode,
      runFullPipeline,
      clearNodeRunState,
      clearAllRunState,
      clearSelection,
      selectNode,
      updateEdgeSourceHandle,
      addModelNode,
      addModelAtPosition,
      expandPageBranch,
      closePageBranch,
      expandRegionBranch,
      closeRegionBranch,
      expandCaptionBranch,
      closeCaptionBranch,
      expandDocumentBranch,
      closeDocumentBranch,
      focusNode,
      autoLayout,
    ],
  );

  useEffect(() => {
    registerPaletteAddHandler((modelId) => {
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const center = bounds
        ? screenToFlowPosition({
            x: bounds.left + bounds.width / 2,
            y: bounds.top + bounds.height / 2,
          })
        : { x: 200, y: 200 };
      const offset = nodes.length * 24;
      addModelNode(modelId, {
        x: center.x + offset,
        y: center.y + offset,
      });
    });
    return () => registerPaletteAddHandler(null);
  }, [addModelNode, screenToFlowPosition, nodes.length]);

  useEffect(() => {
    registerPaletteAddPipelineHandler((pipelineId) => {
      const pipeline = userPipelines.find((entry) => entry.id === pipelineId);
      if (!pipeline || !isPipelineReady(pipeline)) return;
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const center = bounds
        ? screenToFlowPosition({
            x: bounds.left + bounds.width / 2,
            y: bounds.top + bounds.height / 2,
          })
        : { x: 200, y: 200 };
      const offset = nodes.length * 24;
      addCustomPipelineNode(pipeline, {
        x: center.x + offset,
        y: center.y + offset,
      });
    });
    return () => registerPaletteAddPipelineHandler(null);
  }, [
    addCustomPipelineNode,
    screenToFlowPosition,
    nodes.length,
    userPipelines,
  ]);

  useEffect(() => {
    if (initialFitDone.current || nodes.length === 0) return;
    if (parsedGraph.viewport || parsedGraph.nodes.length > 0) {
      initialFitDone.current = true;
      return;
    }
    initialFitDone.current = true;
    void fitView({ padding: 0.2 });
  }, [nodes.length, parsedGraph.viewport, parsedGraph.nodes.length, fitView]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const pipelineRaw = event.dataTransfer.getData(DRAG_PIPELINE_MIME);
      if (pipelineRaw) {
        try {
          const payload = JSON.parse(pipelineRaw) as { pipelineId?: string };
          const pipeline = userPipelines.find(
            (entry) => entry.id === payload.pipelineId,
          );
          if (pipeline && isPipelineReady(pipeline)) {
            const position = screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            });
            addCustomPipelineNode(pipeline, position);
          }
        } catch {
          // ignore
        }
        return;
      }

      const raw = event.dataTransfer.getData(DRAG_MODEL_MIME);
      if (!raw) return;

      let modelId: string | undefined;
      try {
        const payload = JSON.parse(raw) as { modelId?: string };
        modelId = payload.modelId;
      } catch {
        return;
      }

      if (!modelId) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addModelNode(modelId, position);
    },
    [addCustomPipelineNode, addModelNode, screenToFlowPosition, userPipelines],
  );

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node<PipelineNodeData>) => {
      if (readOnly) return;

      const isDuplicateDrag = _event.metaKey || _event.ctrlKey;
      const selected = nodes.filter((entry) => entry.selected);
      const draggedNodes = selected.length > 0 ? selected : [node];
      const startPositions = new Map(
        draggedNodes.map((entry) => [entry.id, { ...entry.position }]),
      );

      dragDuplicateRef.current = {
        nodeIds: draggedNodes.map((entry) => entry.id),
        startPositions,
        duplicateOnStop: isDuplicateDrag,
      };
    },
    [nodes, readOnly],
  );

  const onNodeDragStop = useCallback(() => {
    const state = dragDuplicateRef.current;
    dragDuplicateRef.current = null;
    if (!state?.duplicateOnStop) return;

    duplicateNodesAtDragPositions(state.nodeIds, state.startPositions);
  }, [duplicateNodesAtDragPositions]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;
      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      if (isEditableKeyboardTarget(e.target)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoNodeDeletion();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "c" && !e.shiftKey) {
        e.preventDefault();
        copySelectedNodes();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "x") {
        e.preventDefault();
        cutSelectedNodes();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        e.preventDefault();
        pasteNodes();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelectedNodes();
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key === "v") {
        e.preventDefault();
        handleInteractionModeChange("select");
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key === "h") {
        e.preventDefault();
        handleInteractionModeChange("pan");
        return;
      }

      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "Enter" &&
        !e.shiftKey
      ) {
        e.preventDefault();
        void runFullPipeline();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    clearSelection,
    runFullPipeline,
    undoNodeDeletion,
    copySelectedNodes,
    cutSelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,
    handleInteractionModeChange,
    readOnly,
  ]);

  return (
    <CanvasToastProvider>
      <PipelineGraphProvider state={graphState} actions={graphActions}>
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        {entity.kind === "pipeline" ? (
          <PipelineDefinitionHeader
            pipelineName={entityName}
            boundaryValidation={boundaryValidation}
            saveValidationError={saveValidationError}
          />
        ) : (
          <CanvasProjectHeader
            projectName={entityName}
            models={models}
            categories={categories}
          />
        )}
        <div className="relative flex min-h-0 flex-1">
          <div ref={reactFlowWrapper} className="min-h-0 min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{
              type: PIPELINE_FLOW_EDGE_TYPE,
              markerEnd: pipelineEdgeMarker(true),
            }}
            connectionLineStyle={{
              stroke: PIPELINE_EDGE_PULSE,
              strokeWidth: 2,
              strokeDasharray: "5 7",
            }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeDragStart={readOnly ? undefined : onNodeDragStart}
            onNodeDragStop={readOnly ? undefined : onNodeDragStop}
            onSelectionChange={onSelectionChange}
            onPaneClick={clearSelection}
            onDragOver={readOnly ? undefined : onDragOver}
            onDrop={readOnly ? undefined : onDrop}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
            defaultViewport={viewport}
            onViewportChange={onViewportChange}
            minZoom={0.1}
            maxZoom={2}
            snapToGrid
            snapGrid={SNAP_GRID}
            panOnScroll
            panOnScrollMode={PanOnScrollMode.Free}
            zoomOnScroll
            zoomOnPinch
            {...interactionFlowProps}
            proOptions={{ hideAttribution: true }}
            className={cn(
              "ocrflow-canvas",
              interactionMode === "select"
                ? "ocrflow-canvas--select-mode"
                : "ocrflow-canvas--pan-mode",
              pipelineRunState.status === "running" && "is-running",
            )}
          >
        <Background
          variant={BackgroundVariant.Dots}
          gap={26}
          size={1.2}
          className="!bg-background"
        />
        <CanvasBottomLeftControls
          mode={interactionMode}
          onModeChange={handleInteractionModeChange}
        />
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="max-w-sm rounded-sm border border-dashed border-border bg-card/80 px-6 py-5 text-center backdrop-blur-sm">
              <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {entity.kind === "pipeline" ? "Pipeline canvas" : "Empty canvas"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {entity.kind === "pipeline"
                  ? "Add models from the palette, connect them into one flow, then save when the pipeline has a single input and output."
                  : "Drag a model from the palette, click to add, or drop it here to start building your pipeline."}
              </p>
            </div>
          </div>
        )}
          </ReactFlow>
          </div>
          <NodeDetailPanel />
          <EdgeDetailPanel />
        </div>
      </div>
      </PipelineGraphProvider>
    </CanvasToastProvider>
  );
}

type PipelineCanvasProps = {
  entity: GraphEntityContext;
  entityName: string;
  entityUpdatedAt: string;
  initialGraph: Record<string, unknown>;
  models: ModelCatalogEntry[];
  categories: CategoryMeta[];
  readOnly?: boolean;
  userPipelines?: Pipeline[];
};

export function PipelineCanvas(props: PipelineCanvasProps) {
  return (
    <ReactFlowProvider>
      <PipelineCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
