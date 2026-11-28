"use client";

import {
  Background,
  BackgroundVariant,
  MiniMap,
  PanOnScrollMode,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  type Connection,
  type Node,
  type NodeProps,
  type OnConnectEnd,
} from "@xyflow/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { SessionKeepAlive } from "@/components/app/session-keep-alive";
import { CanvasToastProvider, useCanvasToast } from "@/components/canvas/canvas-toast-context";
import { CaptionBranchPipelineNode } from "@/components/canvas/nodes/caption-branch-pipeline-node";
import { CollectionItemsNode } from "@/components/canvas/nodes/collection-items-node";
import { DocumentBranchPipelineNode } from "@/components/canvas/nodes/document-branch-pipeline-node";
import { PipelineGraphProvider } from "@/components/canvas/pipeline-graph-context";
import { RuntimeAvailabilityProvider } from "@/components/canvas/runtime-availability-context";
import { Dock } from "@/components/flow-editor/dock";
import { TypedEdge } from "@/components/flow-editor/edges/typed-edge";
import {
  EditorUiProvider,
  type EditorUi,
  type FullRunNodeState,
  type InspectorTab,
  type QuickAddRequest,
} from "@/components/flow-editor/editor-ui-context";
import { EmptyState, type Recipe } from "@/components/flow-editor/empty-state";
import { Inspector, INSPECTOR_WIDTH } from "@/components/flow-editor/inspector/inspector";
import { LibraryPanel } from "@/components/flow-editor/library/library-panel";
import { FLOW_NODE_WIDTH, FlowNode } from "@/components/flow-editor/nodes/flow-node";
import { isRunCancelled } from "@/components/flow-editor/node-status";
import { getQuickParamSchema } from "@/components/flow-editor/nodes/quick-param-schema";
import { QuickAdd } from "@/components/flow-editor/quick-add";
import { TopBar } from "@/components/flow-editor/top-bar";
import { wireColor, wireKindLabel } from "@/components/flow-editor/wire-colors";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePipelineGraph } from "@/hooks/use-pipeline-graph";
import type { Pipeline } from "@/lib/api/client";
import { uploadPipelineAsset, uploadProjectAsset } from "@/lib/api/assets";
import { isPipelineReady } from "@/lib/api/pipelines";
import { isCaptionBranchNode } from "@/lib/canvas/caption-branch-meta";
import {
  getCanvasInteractionModeServerSnapshot,
  readCanvasInteractionMode,
  subscribeCanvasInteractionMode,
  writeCanvasInteractionMode,
  type CanvasInteractionMode,
} from "@/lib/canvas/canvas-interaction-prefs";
import { isDocumentBranchNode } from "@/lib/canvas/document-branch-meta";
import { filterDoneModels } from "@/lib/canvas/model-utils";
import { isPageBranchNode } from "@/lib/canvas/page-branch-meta";
import { readPaletteCollapsed, writePaletteCollapsed } from "@/lib/canvas/palette-prefs";
import {
  registerPaletteAddHandler,
  registerPaletteAddPipelineHandler,
} from "@/lib/canvas/palette-add-bridge";
import { isRegionBranchNode } from "@/lib/canvas/region-branch-meta";
import {
  CUSTOM_PIPELINE_NODE_TYPE,
  DRAG_MODEL_MIME,
  DRAG_PIPELINE_MIME,
  PIPELINE_NODE_TYPE,
  type CategoryMeta,
  type GraphEntityContext,
  type ModelCatalogEntry,
  type PipelineNodeData,
  type RuntimeAvailability,
} from "@/lib/canvas/types";
import { PIPELINE_FLOW_EDGE_TYPE } from "@/lib/canvas/edge-styles";
import { BLOCKED_PIPELINE_MODELS, getNodeWireKinds } from "@/lib/canvas/wire-types";
import {
  CANVAS_COMMAND_EVENT,
  isEditableKeyboardTarget,
  type CanvasCommand,
} from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";

import "@xyflow/react/dist/style.css";

const COLUMN_GAP = 96;
const ROW_GAP = 150;
const MINIMAP_KEY = "ocrflow.editor.minimap";

/** Branch satellites keep their bespoke fan-out UI; everything else is a FlowNode. */
function PipelineNodeSwitch(props: NodeProps) {
  const data = props.data as PipelineNodeData;
  if (isPageBranchNode(data.modelId) || isRegionBranchNode(data.modelId)) {
    return <CollectionItemsNode {...props} />;
  }
  if (isCaptionBranchNode(data.modelId)) return <CaptionBranchPipelineNode {...props} />;
  if (isDocumentBranchNode(data.modelId)) return <DocumentBranchPipelineNode {...props} />;
  return <FlowNode {...props} />;
}

const nodeTypes = {
  [PIPELINE_NODE_TYPE]: PipelineNodeSwitch,
  [CUSTOM_PIPELINE_NODE_TYPE]: FlowNode,
};
const edgeTypes = { [PIPELINE_FLOW_EDGE_TYPE]: TypedEdge };
const SNAP_GRID: [number, number] = [8, 8];

// Library (288) + inspector (400) + a usable canvas needs ~1200px.
const WIDE_QUERY = "(min-width: 1200px)";

function subscribeWide(callback: () => void) {
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

/** Wide: the inspector docks beside the canvas; narrower, it overlays the canvas. */
function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

function readMinimapPref(): boolean {
  try {
    return window.localStorage.getItem(MINIMAP_KEY) === "1";
  } catch {
    return false;
  }
}

export type FlowEditorProps = {
  entity: GraphEntityContext;
  entityName: string;
  entityUpdatedAt: string;
  initialGraph: Record<string, unknown>;
  models: ModelCatalogEntry[];
  categories: CategoryMeta[];
  runtime?: RuntimeAvailability | null;
  readOnly?: boolean;
  userPipelines?: Pipeline[];
  preferredModelId?: string | null;
};

function FlowEditorInner({
  entity,
  entityName,
  entityUpdatedAt,
  initialGraph,
  models,
  categories,
  readOnly = false,
  userPipelines = [],
  preferredModelId = null,
}: FlowEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialFitDone = useRef(false);
  const {
    screenToFlowPosition,
    fitView,
    setCenter,
    getViewport,
    setViewport,
    getInternalNode,
    deleteElements,
    zoomIn,
    zoomOut,
  } = useReactFlow();
  const { showCanvasToast } = useCanvasToast();

  const paletteModels = useMemo(() => {
    const done = filterDoneModels(models);
    return entity.kind === "pipeline"
      ? done.filter((model) => !BLOCKED_PIPELINE_MODELS.has(model.id))
      : done;
  }, [models, entity.kind]);

  const graph = usePipelineGraph({
    entity,
    initialGraph,
    initialUpdatedAt: entityUpdatedAt,
    models: paletteModels,
    categories,
    readOnly,
    userPipelines,
  });

  // ---- UI state -----------------------------------------------------------
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("parameters");
  const [quickAdd, setQuickAdd] = useState<QuickAddRequest | null>(null);
  const [quickSettingsNodeId, setQuickSettingsNodeId] = useState<string | null>(null);
  const [minimap, setMinimap] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const isWide = useIsWide();
  const interactionMode = useSyncExternalStore(
    subscribeCanvasInteractionMode,
    readCanvasInteractionMode,
    getCanvasInteractionModeServerSnapshot,
  );
  const setInteractionMode = useCallback((mode: CanvasInteractionMode) => {
    writeCanvasInteractionMode(mode);
  }, []);

  useEffect(() => {
    setLibraryCollapsed(readPaletteCollapsed());
    setMinimap(readMinimapPref());
  }, []);

  const toggleLibrary = useCallback((collapsed: boolean) => {
    setLibraryCollapsed(collapsed);
    writePaletteCollapsed(collapsed);
  }, []);

  const toggleMinimap = useCallback(() => {
    setMinimap((value) => {
      try {
        window.localStorage.setItem(MINIMAP_KEY, value ? "0" : "1");
      } catch {
        // ignore
      }
      return !value;
    });
  }, []);

  const {
    nodes,
    edges,
    viewport,
    selectedNodeId,
    pipelineRunState,
    pipelineSteps,
  } = graph;

  // ---- Focus / selection helpers -----------------------------------------
  const [focusPulseNodeId, setFocusPulseNodeId] = useState<string | null>(null);
  const focusNode = useCallback(
    (nodeId: string) => {
      const node = graph.nodes.find((entry) => entry.id === nodeId);
      if (!node) return;
      graph.selectNode(nodeId);
      setFocusPulseNodeId(nodeId);
      window.setTimeout(() => setFocusPulseNodeId((current) => (current === nodeId ? null : current)), 2000);
      void setCenter(node.position.x + FLOW_NODE_WIDTH / 2, node.position.y + 60, {
        zoom: Math.max(getViewport().zoom, 0.8),
        duration: 320,
      });
    },
    [graph, setCenter, getViewport],
  );

  const openInspector = useCallback(
    (nodeId: string, tab: InspectorTab = "parameters") => {
      if (graph.selectedNodeId !== nodeId) graph.selectNode(nodeId);
      setInspectorTab(tab);
      setInspectorOpen(true);
      // The inspector shows the same fields; don't leave the popover over it.
      setQuickSettingsNodeId(null);
    },
    [graph],
  );

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
  }, []);

  /** Pan just enough that a node (and room for its hover toolbar) is on screen. */
  const revealNode = useCallback(
    (nodeId: string) => {
      const node = getInternalNode(nodeId);
      const wrapper = wrapperRef.current;
      if (!node || !wrapper) return;
      const { x: vx, y: vy, zoom } = getViewport();
      const bounds = wrapper.getBoundingClientRect();
      // On narrow windows the inspector floats over the canvas instead of narrowing it.
      const width =
        inspectorOpen && !isWide ? Math.max(bounds.width - INSPECTOR_WIDTH, 160) : bounds.width;
      const height = bounds.height;
      const w = (node.measured.width ?? FLOW_NODE_WIDTH) * zoom;
      const h = (node.measured.height ?? 110) * zoom;
      const sx = node.internals.positionAbsolute.x * zoom + vx;
      const sy = node.internals.positionAbsolute.y * zoom + vy;
      const margin = 40;
      // Leave room for the floating dock at the bottom and the toolbar above.
      const bottomInset = 84;
      let dx = 0;
      let dy = 0;
      if (sx + w > width - margin) dx = width - margin - (sx + w);
      if (sx + dx < margin) dx = margin - sx;
      if (sy + h > height - bottomInset) dy = height - bottomInset - (sy + h);
      if (sy + dy < margin + 40) dy = margin + 40 - sy;
      if (dx || dy) void setViewport({ x: vx + dx, y: vy + dy, zoom }, { duration: 260 });
    },
    [getInternalNode, getViewport, setViewport, inspectorOpen, isWide],
  );

  // Keep a freshly selected node visible when the inspector narrows the canvas.
  useEffect(() => {
    if (!selectedNodeId || !inspectorOpen) return;
    const frame = window.setTimeout(() => revealNode(selectedNodeId), 240);
    return () => window.clearTimeout(frame);
  }, [selectedNodeId, inspectorOpen, revealNode]);

  // ---- Positions ------------------------------------------------------------
  const viewportCenterFlow = useCallback(() => {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 200, y: 200 };
    return screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
  }, [screenToFlowPosition]);

  /** First free slot right of `from`, stepping down past occupied rows. */
  const slotRightOf = useCallback(
    (fromNodeId: string) => {
      const from = graph.nodes.find((node) => node.id === fromNodeId);
      if (!from) return null;
      const x = from.position.x + (from.measured?.width ?? FLOW_NODE_WIDTH) + COLUMN_GAP;
      let y = from.position.y;
      for (let i = 0; i < 12; i += 1) {
        const taken = graph.nodes.some(
          (node) => Math.abs(node.position.x - x) < FLOW_NODE_WIDTH && Math.abs(node.position.y - y) < ROW_GAP - 20,
        );
        if (!taken) break;
        y += ROW_GAP;
      }
      return { x, y };
    },
    [graph.nodes],
  );

  /** Right of the selected (or rightmost) node, so the graph grows left → right. */
  const nextFreePosition = useCallback(() => {
    if (!graph.nodes.length) {
      const c = viewportCenterFlow();
      return { x: c.x - FLOW_NODE_WIDTH / 2, y: c.y - 52 };
    }
    const anchor =
      (selectedNodeId && graph.nodes.find((node) => node.id === selectedNodeId)) ||
      graph.nodes.reduce((best, node) => (node.position.x > best.position.x ? node : best));
    return (
      slotRightOf(anchor.id) ?? {
        x: anchor.position.x + FLOW_NODE_WIDTH + COLUMN_GAP,
        y: anchor.position.y,
      }
    );
  }, [graph.nodes, selectedNodeId, slotRightOf, viewportCenterFlow]);

  // ---- Adding nodes -----------------------------------------------------------
  const addAndFocus = useCallback(
    (
      modelId: string,
      position: { x: number; y: number },
      options?: Parameters<typeof graph.addModelNode>[2],
    ) => {
      const id = graph.addModelNode(modelId, position, options);
      if (!id) return null;
      window.setTimeout(() => {
        graph.selectNode(id);
        window.setTimeout(() => revealNode(id), 60);
        const node = graph.modelCatalog.find((entry) => entry.id === modelId);
        if (node) {
          const quick = getQuickParamSchema({
            modelId,
            category: node.category,
          } as PipelineNodeData);
          if (quick.length) setQuickSettingsNodeId(id);
        }
      }, 30);
      return id;
    },
    [graph, revealNode],
  );

  const addConnectedNode = useCallback(
    (modelId: string, fromNodeId: string, fromHandleId?: string | null) => {
      addAndFocus(modelId, slotRightOf(fromNodeId) ?? nextFreePosition(), {
        connectFrom: { nodeId: fromNodeId, handleId: fromHandleId },
      });
    },
    [addAndFocus, nextFreePosition, slotRightOf],
  );

  useEffect(() => {
    registerPaletteAddHandler((modelId, params) => {
      addAndFocus(modelId, nextFreePosition(), params ? { params } : undefined);
    });
    return () => registerPaletteAddHandler(null);
  }, [addAndFocus, nextFreePosition]);

  useEffect(() => {
    registerPaletteAddPipelineHandler((pipelineId) => {
      const pipeline = userPipelines.find((entry) => entry.id === pipelineId);
      if (!pipeline || !isPipelineReady(pipeline)) return;
      graph.addCustomPipelineNode(pipeline, nextFreePosition());
    });
    return () => registerPaletteAddPipelineHandler(null);
  }, [graph, nextFreePosition, userPipelines]);

  const applyRecipe = useCallback(
    (recipe: Recipe) => {
      const c = viewportCenterFlow();
      const totalWidth = recipe.steps.length * FLOW_NODE_WIDTH + (recipe.steps.length - 1) * COLUMN_GAP;
      let previous: string | null = null;
      recipe.steps.forEach((modelId, index) => {
        const position = {
          x: c.x - totalWidth / 2 + index * (FLOW_NODE_WIDTH + COLUMN_GAP),
          y: c.y - 52,
        };
        const id: string | null = graph.addModelNode(modelId, position, previous
          ? { connectFrom: { nodeId: previous } }
          : { autoConnect: false });
        previous = id ?? previous;
      });
      window.setTimeout(() => void fitView({ padding: 0.25, maxZoom: 1, duration: 300 }), 60);
      showCanvasToast({
        variant: "info",
        title: recipe.title,
        message: "Drop a document on the first node, then press Run.",
      });
    },
    [graph, viewportCenterFlow, fitView, showCanvasToast],
  );

  /** Drop a file on empty canvas → the right loader, uploaded and loaded. */
  const addDocument = useCallback(
    async (file: File, position?: { x: number; y: number }) => {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const isImage = /^image\/(png|jpeg|webp)$/.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
      if (!isPdf && !isImage) {
        showCanvasToast({ variant: "error", message: "Only PDF, PNG, JPEG or WebP files can be loaded." });
        return;
      }
      const modelId = isPdf ? "loader/pdf" : "loader/image";
      // A recipe (or a blank loader) is waiting for its document: fill that
      // loader instead of adding a second, disconnected one.
      const emptyLoaders = graph.nodes.filter(
        (node) => node.data.modelId === modelId && !node.data.params.assetId,
      );
      const id =
        emptyLoaders.length === 1
          ? emptyLoaders[0].id
          : graph.addModelNode(modelId, position ?? nextFreePosition(), { autoConnect: false });
      if (!id) return;
      try {
        const result =
          entity.kind === "pipeline"
            ? await uploadPipelineAsset(entity.id, file)
            : await uploadProjectAsset(entity.id, file);
        graph.updateNodeConfig(id, {
          assetId: result.asset_id,
          assetFilename: result.filename,
          format: result.format,
        });
        window.setTimeout(() => void graph.runNode(id), 80);
        graph.selectNode(id);
      } catch (error) {
        showCanvasToast({
          variant: "error",
          message: error instanceof Error ? error.message : "Upload failed",
        });
      }
    },
    [entity, graph, nextFreePosition, showCanvasToast],
  );

  // ---- Delete / duplicate -------------------------------------------------------
  const deleteNodes = useCallback(
    (nodeIds: string[]) => {
      if (readOnly || !nodeIds.length) return;
      const labels = graph.nodes.filter((node) => nodeIds.includes(node.id)).map((node) => node.data.label);
      graph.onNodesChange(nodeIds.map((id) => ({ type: "remove" as const, id })));
      setQuickSettingsNodeId(null);
      showCanvasToast({
        variant: "info",
        title: "Deleted",
        message: labels.length === 1 ? labels[0] : `${labels.length} nodes`,
        action: { label: "Undo", onClick: () => graph.undo() },
      });
    },
    [graph, readOnly, showCanvasToast],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const node = graph.nodes.find((entry) => entry.id === nodeId);
      if (!node) return;
      const position = { x: node.position.x + 32, y: node.position.y + ROW_GAP };
      if (node.type === CUSTOM_PIPELINE_NODE_TYPE) {
        const pipeline = userPipelines.find((entry) => entry.id === node.data.pipelineId);
        if (pipeline) graph.addCustomPipelineNode(pipeline, position);
        return;
      }
      const id = graph.addModelNode(node.data.modelId, position, { autoConnect: false });
      if (id) {
        const { assetId: _a, assetFilename: _b, format: _c, ...params } = node.data.params;
        void _a;
        void _b;
        void _c;
        graph.updateNodeConfig(id, params);
        window.setTimeout(() => graph.selectNode(id), 20);
      }
    },
    [graph, userPipelines],
  );

  // ---- Run tracking ------------------------------------------------------------
  useEffect(() => {
    if (pipelineRunState.status === "running") {
      setRunStartedAt((value) => value ?? Date.now());
    } else {
      setRunStartedAt(null);
    }
  }, [pipelineRunState.status]);

  const prevRunStatus = useRef(pipelineRunState.status);
  useEffect(() => {
    const was = prevRunStatus.current;
    prevRunStatus.current = pipelineRunState.status;
    if (was !== "running") return;
    if (pipelineRunState.status === "success") {
      showCanvasToast({
        variant: "success",
        title: "Run finished",
        message: `${pipelineRunState.totalCount} steps completed.`,
      });
    } else if (isRunCancelled(pipelineRunState)) {
      showCanvasToast({
        variant: "info",
        title: "Run stopped",
        message: `${pipelineRunState.completedCount} of ${pipelineRunState.totalCount} steps finished.`,
      });
    } else if (pipelineRunState.status === "error") {
      const failedId = pipelineRunState.failedNodeId;
      showCanvasToast({
        variant: "error",
        title: pipelineRunState.failedNodeLabel ? `Failed at ${pipelineRunState.failedNodeLabel}` : "Run failed",
        message: pipelineRunState.error ?? "The pipeline did not finish.",
        action: failedId
          ? {
              label: "Show node",
              onClick: () => {
                focusNode(failedId);
                openInspector(failedId, "preview");
              },
            }
          : undefined,
      });
    }
  }, [pipelineRunState, showCanvasToast, focusNode, openInspector]);

  const fullRunNodeStates = useMemo(() => {
    const map = new Map<string, FullRunNodeState>();
    if (pipelineRunState.status !== "running") return map;
    const ordered = [...pipelineSteps].sort((a, b) => a.order - b.order);
    const currentIndex = pipelineRunState.currentNodeId
      ? ordered.findIndex((step) => step.nodeId === pipelineRunState.currentNodeId)
      : pipelineRunState.completedCount;
    ordered.forEach((step, index) => {
      map.set(
        step.nodeId,
        index < currentIndex ? "done" : index === currentIndex ? "running" : "queued",
      );
    });
    return map;
  }, [pipelineRunState, pipelineSteps]);

  const runStatusRef = useRef(pipelineRunState.status);
  useEffect(() => {
    runStatusRef.current = pipelineRunState.status;
  }, [pipelineRunState.status]);
  const stopRun = useCallback(async () => {
    // The server only hands out a run id once it has started (the loader step
    // can take a few seconds), so keep asking until the stop lands.
    showCanvasToast({ variant: "info", message: "Stopping after the current step…" });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (await graph.stopFullPipeline()) return;
      if (runStatusRef.current !== "running") return;
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
    showCanvasToast({ variant: "error", message: "Couldn't stop the run." });
  }, [graph, showCanvasToast]);

  // ---- Connections -------------------------------------------------------------------
  const isValidConnection = useCallback(
    (connection: Connection | { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) =>
      graph.isValidConnection(connection as Connection),
    [graph],
  );

  const onConnectEnd = useCallback<OnConnectEnd>(
    (event, state) => {
      if (state.isValid === true || !state.fromNode || state.fromHandle?.type !== "source") return;
      const point = "changedTouches" in event ? event.changedTouches[0] : event;
      if (!point) return;
      // Find what's under the pointer (the connection line sits on top).
      let droppedOnId: string | null = null;
      let onPane = false;
      for (const element of document.elementsFromPoint(point.clientX, point.clientY)) {
        const nodeEl = element.closest<HTMLElement>(".react-flow__node");
        if (nodeEl?.dataset.id) {
          droppedOnId = nodeEl.dataset.id;
          break;
        }
        if (element.classList.contains("react-flow__pane")) {
          onPane = true;
          break;
        }
      }
      const fromNode = state.fromNode;
      const fromHandleId = state.fromHandle?.id ?? "output";
      if (droppedOnId && droppedOnId !== fromNode.id) {
        const connection = {
          source: fromNode.id,
          sourceHandle: fromHandleId,
          target: droppedOnId,
          targetHandle: "input",
        };
        if (graph.isValidConnection(connection)) {
          // Dropping on a node body connects, not just the pin.
          graph.onConnect(connection);
          return;
        }
        const from = fromNode.data as PipelineNodeData;
        const to = graph.nodes.find((node) => node.id === droppedOnId)?.data;
        if (to) {
          showCanvasToast({
            variant: "error",
            title: "Can't connect",
            message: to.modelId.startsWith("loader/")
              ? `${to.label} reads a file and takes no input.`
              : `${to.label} needs ${wireKindLabel(getNodeWireKinds(to).input)}, but ${from.label} gives ${wireKindLabel(getNodeWireKinds(from).output)}.`,
          });
        }
        return;
      }
      if (onPane && !readOnly) {
        setQuickAdd({
          screen: { x: point.clientX, y: point.clientY },
          flow: screenToFlowPosition({ x: point.clientX, y: point.clientY - 52 }),
          fromNodeId: fromNode.id,
          fromHandleId,
        });
      }
    },
    [graph, readOnly, screenToFlowPosition, showCanvasToast],
  );

  // ---- Drag & drop ---------------------------------------------------------------
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const hasFiles = event.dataTransfer.types.includes("Files");
    event.dataTransfer.dropEffect = hasFiles ? "copy" : "move";
    if (hasFiles) setDropActive(true);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDropActive(false);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const placed = { x: position.x - FLOW_NODE_WIDTH / 2, y: position.y - 40 };
      if (event.dataTransfer.files.length) {
        void addDocument(event.dataTransfer.files[0], placed);
        return;
      }
      const pipelineRaw = event.dataTransfer.getData(DRAG_PIPELINE_MIME);
      if (pipelineRaw) {
        try {
          const { pipelineId } = JSON.parse(pipelineRaw) as { pipelineId?: string };
          const pipeline = userPipelines.find((entry) => entry.id === pipelineId);
          if (pipeline && isPipelineReady(pipeline)) graph.addCustomPipelineNode(pipeline, placed);
        } catch {
          // ignore malformed payloads
        }
        return;
      }
      const raw = event.dataTransfer.getData(DRAG_MODEL_MIME);
      if (!raw) return;
      try {
        const { modelId, params } = JSON.parse(raw) as {
          modelId?: string;
          params?: Record<string, string | boolean | number>;
        };
        if (modelId) addAndFocus(modelId, placed, { autoConnect: false, ...(params ? { params } : {}) });
      } catch {
        // ignore
      }
    },
    [addAndFocus, addDocument, graph, screenToFlowPosition, userPipelines],
  );

  // ---- Initial fit ----------------------------------------------------------------
  useEffect(() => {
    if (initialFitDone.current || nodes.length === 0) return;
    initialFitDone.current = true;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => void fitView({ padding: 0.25, maxZoom: 1 })),
    );
  }, [nodes.length, fitView]);

  const tidy = useCallback(() => {
    graph.autoLayout();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => void fitView({ padding: 0.22, maxZoom: 1, duration: 320 })),
    );
  }, [graph, fitView]);

  // ---- Keyboard ------------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (quickAdd) setQuickAdd(null);
        else if (quickSettingsNodeId) setQuickSettingsNodeId(null);
        else if (inspectorOpen) setInspectorOpen(false);
        else graph.clearSelection();
        return;
      }
      if (isEditableKeyboardTarget(event.target)) return;
      if (document.querySelector("[role=dialog][data-open], [role=dialog]:not([hidden])") && quickAdd === null) {
        // Let open dialogs (command palette etc.) own the keyboard.
        const dialog = document.querySelector("[data-slot=dialog-content]");
        if (dialog) return;
      }
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "enter") {
        event.preventDefault();
        if (event.shiftKey && graph.selectedNodeId) void graph.runNode(graph.selectedNodeId);
        else if (!readOnly) void graph.runFullPipeline();
        return;
      }
      if (readOnly) return;
      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) graph.redo();
        else graph.undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        graph.redo();
        return;
      }
      if (mod && key === "c") {
        if (graph.copySelectedNodes()) event.preventDefault();
        return;
      }
      if (mod && key === "x") {
        if (graph.cutSelectedNodes()) event.preventDefault();
        return;
      }
      if (mod && key === "v") {
        if (graph.pasteNodes()) event.preventDefault();
        return;
      }
      if (mod && key === "d") {
        event.preventDefault();
        graph.duplicateSelectedNodes();
        return;
      }
      if (mod || event.altKey) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        const selectedNodes = graph.nodes.filter((node) => node.selected).map((node) => node.id);
        if (selectedNodes.length) {
          event.preventDefault();
          deleteNodes(selectedNodes);
          return;
        }
        const selectedEdges = graph.edges.filter((edge) => edge.selected).map((edge) => ({ id: edge.id }));
        if (selectedEdges.length) {
          event.preventDefault();
          void deleteElements({ edges: selectedEdges });
        }
        return;
      }
      if (event.key === "Enter" && graph.selectedNodeId) {
        event.preventDefault();
        openInspector(graph.selectedNodeId);
        return;
      }
      if (key === "a" && !event.shiftKey) {
        event.preventDefault();
        const bounds = wrapperRef.current?.getBoundingClientRect();
        if (!bounds) return;
        const screen = { x: bounds.left + bounds.width / 2 - 170, y: bounds.top + bounds.height / 3 };
        setQuickAdd({
          screen,
          flow: nextFreePosition(),
          fromNodeId: graph.selectedNodeId ?? undefined,
        });
        return;
      }
      if (event.shiftKey && key === "l") {
        event.preventDefault();
        tidy();
        return;
      }
      if (event.shiftKey && event.key === "!") {
        event.preventDefault();
        void fitView({ padding: 0.2, maxZoom: 1, duration: 260 });
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        void zoomIn({ duration: 160 });
        return;
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        void zoomOut({ duration: 160 });
        return;
      }
      if (key === "m") {
        toggleMinimap();
        return;
      }
      if (key === "v") setInteractionMode("select");
      if (key === "h") setInteractionMode("pan");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    deleteElements,
    deleteNodes,
    fitView,
    graph,
    inspectorOpen,
    nextFreePosition,
    openInspector,
    quickAdd,
    quickSettingsNodeId,
    readOnly,
    setInteractionMode,
    tidy,
    toggleMinimap,
    zoomIn,
    zoomOut,
  ]);

  useEffect(() => {
    const onCommand = (event: Event) => {
      const command = (event as CustomEvent<CanvasCommand>).detail;
      if (command === "toggle-library") toggleLibrary(!libraryCollapsed);
      if (readOnly) return;
      if (command === "run") void graph.runFullPipeline();
      else if (command === "save") void graph.saveNow();
      else if (command === "auto-layout") tidy();
    };
    window.addEventListener(CANVAS_COMMAND_EVENT, onCommand);
    return () => window.removeEventListener(CANVAS_COMMAND_EVENT, onCommand);
  }, [graph, libraryCollapsed, readOnly, tidy, toggleLibrary]);

  // ---- Contexts --------------------------------------------------------------------------
  const graphState = useMemo(
    () => ({
      projectId: entity.id,
      entity,
      nodes: graph.nodes,
      edges: graph.edges,
      selectedNodeId: graph.selectedNodeId,
      selectedEdgeId: graph.selectedEdgeId,
      saveStatus: graph.saveStatus,
      lastSavedAt: graph.lastSavedAt,
      hasUnsavedChanges: graph.hasUnsavedChanges,
      pipelineRunState: graph.pipelineRunState,
      pipelineSteps: graph.pipelineSteps,
      focusPulseNodeId,
      modelCatalog: graph.modelCatalog,
      categories,
    }),
    [entity, graph, focusPulseNodeId, categories],
  );

  const graphActions = useMemo(
    () => ({
      saveNow: graph.saveNow,
      updateNodeConfig: graph.updateNodeConfig,
      updateNodeData: graph.updateNodeData,
      toggleOutputPanel: graph.toggleOutputPanel,
      getUpstream: graph.getUpstream,
      runNode: (nodeId: string) => graph.runNode(nodeId),
      runNodeAllPages: graph.runNodeAllPages,
      cancelMapRun: graph.cancelMapRun,
      runFullPipeline: graph.runFullPipeline,
      clearNodeRunState: graph.clearNodeRunState,
      clearAllRunState: graph.clearAllRunState,
      clearSelection: graph.clearSelection,
      selectNode: graph.selectNode,
      updateEdgeSourceHandle: graph.updateEdgeSourceHandle,
      addModelNode: (modelId: string, position: { x: number; y: number }) => {
        graph.addModelNode(modelId, position);
      },
      addModelAtPosition: graph.addModelAtPosition,
      expandPageBranch: graph.expandPageBranch,
      closePageBranch: graph.closePageBranch,
      expandRegionBranch: graph.expandRegionBranch,
      closeRegionBranch: graph.closeRegionBranch,
      expandCaptionBranch: graph.expandCaptionBranch,
      closeCaptionBranch: graph.closeCaptionBranch,
      expandDocumentBranch: graph.expandDocumentBranch,
      closeDocumentBranch: graph.closeDocumentBranch,
      focusNode,
      autoLayout: tidy,
    }),
    [graph, focusNode, tidy],
  );

  const editorUi = useMemo<EditorUi>(
    () => ({
      readOnly,
      inspectorOpen,
      inspectorTab,
      setInspectorTab,
      openInspector,
      closeInspector,
      quickAdd,
      openQuickAdd: setQuickAdd,
      closeQuickAdd: () => setQuickAdd(null),
      quickSettingsNodeId,
      setQuickSettingsNodeId,
      deleteNodes,
      duplicateNode,
      addConnectedNode,
      isValidConnection,
      fullRunNodeStates,
      runStartedAt,
    }),
    [
      readOnly,
      inspectorOpen,
      inspectorTab,
      openInspector,
      closeInspector,
      quickAdd,
      quickSettingsNodeId,
      deleteNodes,
      duplicateNode,
      addConnectedNode,
      isValidConnection,
      fullRunNodeStates,
      runStartedAt,
    ],
  );

  const flowInteraction =
    interactionMode === "select"
      ? {
          panOnDrag: [1, 2] as number[],
          selectionOnDrag: true,
          selectionKeyCode: null,
          selectionMode: SelectionMode.Partial,
        }
      : {
          panOnDrag: true,
          selectionOnDrag: false,
          selectionKeyCode: "Shift" as const,
          selectionMode: SelectionMode.Full,
        };

  const isRunning = pipelineRunState.status === "running";
  const selectedExists = selectedNodeId ? nodes.some((node) => node.id === selectedNodeId) : false;
  // On narrow windows there's no room for library + canvas + inspector, so the
  // library steps aside while the inspector is open (the saved pref is untouched).
  const libraryYields = !isWide && inspectorOpen && selectedExists;

  return (
    <PipelineGraphProvider state={graphState} actions={graphActions}>
      <EditorUiProvider value={editorUi}>
        <div className="flex h-full min-h-0 flex-col bg-background">
          <TopBar
            projectName={entityName}
            onStopRun={() => void stopRun()}
            backHref={entity.kind === "pipeline" ? "/app/pipelines" : "/app/projects"}
            backLabel={entity.kind === "pipeline" ? "Pipelines" : "Projects"}
            boundary={graph.boundaryValidation}
            saveValidationError={graph.saveValidationError}
          />
          <div className="relative flex min-h-0 flex-1">
            {!readOnly ? (
              <div className="relative hidden shrink-0 md:flex">
                <LibraryPanel
                  models={paletteModels}
                  categories={categories}
                  paletteMode={entity.kind === "pipeline" ? "pipeline" : "project"}
                  userPipelines={entity.kind === "project" ? userPipelines : undefined}
                  preferredModelId={preferredModelId}
                  collapsed={libraryCollapsed || libraryYields}
                  onCollapsedChange={(collapsed) => {
                    if (libraryYields && !collapsed) {
                      setInspectorOpen(false);
                      if (libraryCollapsed) toggleLibrary(false);
                      return;
                    }
                    toggleLibrary(collapsed);
                  }}
                />
              </div>
            ) : null}
            <div
              ref={wrapperRef}
              className={cn("relative min-h-0 min-w-0 flex-1", dropActive && "flow-drop-active")}
              onDragLeave={(event) => {
                if (event.currentTarget === event.target) setDropActive(false);
              }}
              onDoubleClick={(event) => {
                if (readOnly) return;
                const target = event.target as HTMLElement;
                if (!target.classList.contains("react-flow__pane")) return;
                setQuickAdd({
                  screen: { x: event.clientX, y: event.clientY },
                  flow: screenToFlowPosition({ x: event.clientX - FLOW_NODE_WIDTH / 2, y: event.clientY - 40 }),
                });
              }}
            >
              <ReactFlow<Node<PipelineNodeData>>
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={{ type: PIPELINE_FLOW_EDGE_TYPE }}
                connectionLineStyle={{ stroke: "var(--primary)", strokeWidth: 2, strokeDasharray: "6 6" }}
                onNodesChange={graph.onNodesChange}
                onEdgesChange={graph.onEdgesChange}
                onConnect={graph.onConnect}
                onConnectEnd={readOnly ? undefined : onConnectEnd}
                isValidConnection={graph.isValidConnection}
                onSelectionChange={graph.onSelectionChange}
                onNodeClick={(_, node: Node) => {
                  setInspectorOpen(true);
                  setQuickSettingsNodeId(null);
                  if (graph.selectedNodeId !== node.id) graph.selectNode(node.id);
                }}
                onPaneClick={() => {
                  graph.clearSelection();
                  setQuickSettingsNodeId(null);
                }}
                onDragOver={readOnly ? undefined : onDragOver}
                onDrop={readOnly ? undefined : onDrop}
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
                deleteKeyCode={null}
                defaultViewport={viewport}
                onViewportChange={graph.onViewportChange}
                minZoom={0.15}
                maxZoom={2}
                zoomOnDoubleClick={false}
                snapToGrid
                snapGrid={SNAP_GRID}
                panOnScroll
                panOnScrollMode={PanOnScrollMode.Free}
                zoomOnPinch
                {...flowInteraction}
                proOptions={{ hideAttribution: true }}
                className={cn(
                  "ocrflow-canvas flow-editor-canvas",
                  interactionMode === "select" ? "ocrflow-canvas--select-mode" : "ocrflow-canvas--pan-mode",
                  isRunning && "is-running",
                )}
              >
                <Background variant={BackgroundVariant.Dots} gap={22} size={1.3} className="!bg-background" />
                {minimap && nodes.length > 0 ? (
                  <MiniMap
                    pannable
                    zoomable
                    position="bottom-right"
                    className="!rounded-xl !border !border-border !bg-card/90 !shadow-lg"
                    maskColor="color-mix(in srgb, var(--background) 70%, transparent)"
                    nodeColor={(node) =>
                      wireColor(getNodeWireKinds(node.data as PipelineNodeData).output)
                    }
                    nodeBorderRadius={6}
                  />
                ) : null}
              </ReactFlow>

              {nodes.length === 0 ? (
                <EmptyState
                  readOnly={readOnly}
                  onRecipe={applyRecipe}
                  onChooseFile={() => fileInputRef.current?.click()}
                  onOpenQuickAdd={() => {
                    const bounds = wrapperRef.current?.getBoundingClientRect();
                    if (!bounds) return;
                    setQuickAdd({
                      screen: { x: bounds.left + bounds.width / 2 - 170, y: bounds.top + bounds.height / 3 },
                      flow: nextFreePosition(),
                    });
                  }}
                />
              ) : null}

              {dropActive ? (
                <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/60 bg-primary/[0.04]">
                  <p className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-lg">
                    Drop to load this document
                  </p>
                </div>
              ) : null}

              <Dock
                canUndo={graph.canUndo}
                canRedo={graph.canRedo}
                onUndo={() => graph.undo()}
                onRedo={() => graph.redo()}
                onTidy={tidy}
                mode={interactionMode}
                onModeChange={setInteractionMode}
                minimap={minimap}
                onToggleMinimap={toggleMinimap}
                readOnly={readOnly}
                hasNodes={nodes.length > 0}
                rightInset={!isWide && inspectorOpen && selectedExists ? INSPECTOR_WIDTH : 0}
              />

              {/* Inspector edge handle (reopen when a node is selected but the panel is closed) */}
              {selectedExists && !inspectorOpen ? (
                <button
                  type="button"
                  onClick={() => setInspectorOpen(true)}
                  aria-label="Open inspector"
                  className="absolute top-1/2 right-0 z-10 flex h-[52px] w-4 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-border bg-card text-muted-foreground opacity-60 transition-opacity hover:opacity-100"
                >
                  <ChevronLeft className="size-3" />
                </button>
              ) : null}
              {inspectorOpen && selectedExists ? (
                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  aria-label="Collapse inspector"
                  style={isWide ? undefined : { right: INSPECTOR_WIDTH }}
                  className="absolute top-1/2 right-0 z-30 flex h-[52px] w-4 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-border bg-card text-muted-foreground opacity-60 transition-opacity hover:opacity-100"
                >
                  <ChevronRight className="size-3" />
                </button>
              ) : null}
            </div>
            <Inspector overlay={!isWide} />
          </div>
          <QuickAdd
            onAdd={(modelId, flow, from) =>
              addAndFocus(modelId, flow, from ? { connectFrom: from } : { autoConnect: false })
            }
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void addDocument(file);
              event.target.value = "";
            }}
          />
        </div>
      </EditorUiProvider>
    </PipelineGraphProvider>
  );
}

export function FlowEditor({ runtime = null, ...props }: FlowEditorProps) {
  return (
    <TooltipProvider delay={350}>
      <RuntimeAvailabilityProvider runtime={runtime}>
        <SessionKeepAlive />
        <ReactFlowProvider>
          <CanvasToastProvider>
            <FlowEditorInner {...props} />
          </CanvasToastProvider>
        </ReactFlowProvider>
      </RuntimeAvailabilityProvider>
    </TooltipProvider>
  );
}
