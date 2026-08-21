"use client";

import { autoLayoutNodes } from "@/lib/canvas/auto-layout";
import {
  buildPipelineNodeData,
  filterDoneModels,
} from "@/lib/canvas/model-utils";
import {
  buildInferencePayload,
  extractInferenceOutput,
  getModelInferenceDef,
} from "@/lib/canvas/node-inference-registry";
import { getUpstreamPagesForNode, getNodeTestRunReadiness } from "@/lib/canvas/node-readiness";
import {
  edgeLabelForHandle,
  evaluatePipelineConnection,
  isPipelineGraphConnectionAllowed,
  normalizeSourceHandle,
  normalizeTargetHandle,
} from "@/lib/canvas/connection-validation";
import { pipelineEdgeMarker, PIPELINE_FLOW_EDGE_TYPE } from "@/lib/canvas/edge-styles";
import {
  getPipelineReadiness,
  type PipelineRunState,
} from "@/lib/canvas/pipeline-execution";
import {
  applyMigrationToFlowNodes,
  buildCompanionEdge,
  buildPageBranchNode,
  collectCascadeRemovalIds,
  findPageBranchForAnchor,
  isCompanionEdge,
} from "@/lib/canvas/page-branch-graph";
import {
  buildRegionBranchCompanionEdge,
  buildRegionBranchNode,
  collectRegionBranchCascadeRemovalIds,
  findRegionBranchForAnchor,
} from "@/lib/canvas/region-branch-graph";
import { useRuntimeAvailability } from "@/components/canvas/runtime-availability-context";
import { providerOfflineMessage } from "@/lib/canvas/provider-availability";
import {
  getLinkedPageSelectorPartnerId,
  getParentSelectPageId,
  isPageAtAnchor,
  isPageBranchNode,
  isPageSelectorNode,
  PAGE_AT_MODEL_ID,
  PAGE_BRANCH_MODEL_ID,
  PAGE_BRANCH_PANEL_DEFAULT,
  PAGE_BRANCH_SPAWN_OFFSET,
} from "@/lib/canvas/page-branch-meta";
import {
  buildCaptionBranchCompanionEdge,
  buildCaptionBranchNode,
  collectCaptionBranchCascadeRemovalIds,
  findCaptionBranchForAnchor,
} from "@/lib/canvas/caption-branch-graph";
import {
  buildDocumentBranchCompanionEdge,
  buildDocumentBranchNode,
  collectDocumentBranchCascadeRemovalIds,
  findDocumentBranchForAnchor,
} from "@/lib/canvas/document-branch-graph";
import {
  CAPTION_BRANCH_MODEL_ID,
  CAPTION_BRANCH_PANEL_DEFAULT,
  CAPTION_BRANCH_SPAWN_OFFSET,
  getCaptionBranchCatalogEntry,
  getParentCaptionNodeId,
  isCaptionBranchNode,
  isFigureCaptionTextOutput,
} from "@/lib/canvas/caption-branch-meta";
import {
  DOCUMENT_BRANCH_MODEL_ID,
  DOCUMENT_BRANCH_PANEL_DEFAULT,
  DOCUMENT_BRANCH_SPAWN_OFFSET,
  getDocumentBranchCatalogEntry,
  getParentDocumentNodeId,
  isDocumentBranchAnchor,
  isDocumentBranchNode,
} from "@/lib/canvas/document-branch-meta";
import {
  getParentLayoutNodeId,
  getRegionBranchCatalogEntry,
  isLayoutAnchor,
  isRegionBranchNode,
  REGION_BRANCH_MODEL_ID,
  REGION_BRANCH_PANEL_DEFAULT,
  REGION_BRANCH_SPAWN_OFFSET,
} from "@/lib/canvas/region-branch-meta";
import { getUpstreamContext, extractPages, findUpstreamPageImage, collectUpstreamChain, resolveNodeEffectiveOutput } from "@/lib/canvas/resolve-upstream";
import { getModelWireKinds, type WireKind } from "@/lib/canvas/wire-types";
import { derivePipelineBoundaryIO } from "@/lib/canvas/pipeline-boundary";
import {
  buildCustomPipelineNodeData,
  isCustomPipelineNodeData,
} from "@/lib/canvas/custom-pipeline-node-data";
import { runCustomPipelineSubgraph } from "@/lib/canvas/custom-pipeline-execution";
import { BLOCKED_PIPELINE_MODELS } from "@/lib/canvas/wire-types";
import type { Pipeline } from "@/lib/api/client";
import { getPipeline } from "@/lib/api/pipelines";
import { getProject } from "@/lib/api/projects";
import { getProjectRun, startProjectRun } from "@/lib/api/project-runs";
import { runModelInference } from "@/lib/api/inference";
import { buildRunErrorResult } from "@/lib/canvas/run-errors";
import type { ProjectStatus } from "@/lib/api/client";
import {
  graphToFlowEdges,
  graphToFlowNodes,
  parsePipelineGraph,
  serializePipelineGraph,
} from "@/lib/canvas/graph-utils";
import type {
  CategoryMeta,
  GraphEntityContext,
  ModelCatalogEntry,
  NodeCachedOutput,
  PipelineGraph,
  PipelineNodeData,
  PipelineNodeRecord,
} from "@/lib/canvas/types";
import { CUSTOM_PIPELINE_NODE_TYPE, PIPELINE_NODE_TYPE } from "@/lib/canvas/types";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type UsePipelineGraphOptions = {
  entity: GraphEntityContext;
  initialGraph: Record<string, unknown>;
  initialUpdatedAt?: string;
  models: ModelCatalogEntry[];
  categories: CategoryMeta[];
  readOnly?: boolean;
  userPipelines?: Pipeline[];
};

function createNodeId(modelId: string): string {
  return `${modelId}-${crypto.randomUUID().slice(0, 8)}`;
}

const MAX_NODE_DELETION_UNDO = 50;
const PASTE_OFFSET = 40;
const PROJECT_RUN_POLL_INTERVAL_MS = 1_500;

type NodeDeletionUndoEntry = {
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
};

type NodeClipboard = {
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
};

function cloneNodesWithEdges(
  sourceNodes: Node<PipelineNodeData>[],
  internalEdges: Edge[],
  resolvePosition: (node: Node<PipelineNodeData>) => { x: number; y: number },
): { newNodes: Node<PipelineNodeData>[]; newEdges: Edge[] } {
  const idMap = new Map<string, string>();
  const newNodes = sourceNodes.map((node) => {
    const newId = createNodeId(node.data.modelId);
    idMap.set(node.id, newId);
    const position = resolvePosition(node);
    return {
      ...node,
      id: newId,
      selected: true,
      position,
      data: {
        ...node.data,
        params: { ...node.data.params },
      },
    };
  });

  const newEdges = internalEdges.flatMap((edge) => {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (!source || !target) return [];

    return [
      {
        ...edge,
        id: `edge-${source}-${target}-${crypto.randomUUID().slice(0, 6)}`,
        source,
        target,
        selected: false,
        type: PIPELINE_FLOW_EDGE_TYPE,
      },
    ];
  });

  return { newNodes, newEdges };
}

function snapshotNodesForClipboard(
  nodes: Node<PipelineNodeData>[],
): Node<PipelineNodeData>[] {
  return nodes.map((node) => ({
    ...node,
    selected: false,
    data: {
      ...node.data,
      params: { ...node.data.params },
    },
  }));
}

function pushNodeRemovalUndo(
  stack: NodeDeletionUndoEntry[],
  removedNodes: Node<PipelineNodeData>[],
  connectedEdges: Edge[],
) {
  if (removedNodes.length === 0) return;
  stack.push({ nodes: removedNodes, edges: connectedEdges });
  if (stack.length > MAX_NODE_DELETION_UNDO) {
    stack.shift();
  }
}

function enrichOutputPreview(
  output: NodeCachedOutput,
  pageImage?: { image_base64?: string },
): NodeCachedOutput {
  if (!output.preview?.thumbnailBase64 && pageImage?.image_base64) {
    return {
      ...output,
      preview: {
        ...output.preview,
        pageImage: pageImage as NodeCachedOutput["preview"] extends { pageImage?: infer I } ? I : never,
        thumbnailBase64: pageImage.image_base64,
      },
    };
  }
  return output;
}

export function usePipelineGraph({
  entity,
  initialGraph,
  initialUpdatedAt,
  models,
  categories,
  readOnly = false,
  userPipelines = [],
}: UsePipelineGraphOptions) {
  const { getInternalNode } = useReactFlow();
  const { getModelStatus } = useRuntimeAvailability();
  const isPipelineDefinition = entity.kind === "pipeline";
  const isProjectCanvas = entity.kind === "project";
  const contextId = entity.id;

  const pipelineMap = useMemo(
    () => new Map(userPipelines.map((p) => [p.id, p])),
    [userPipelines],
  );

  const modelMap = useMemo(() => {
    const map = new Map(models.map((m) => [m.id, m]));
    if (!map.has(REGION_BRANCH_MODEL_ID)) {
      map.set(REGION_BRANCH_MODEL_ID, getRegionBranchCatalogEntry());
    }
    if (!map.has(CAPTION_BRANCH_MODEL_ID)) {
      map.set(CAPTION_BRANCH_MODEL_ID, getCaptionBranchCatalogEntry());
    }
    if (!map.has(DOCUMENT_BRANCH_MODEL_ID)) {
      map.set(DOCUMENT_BRANCH_MODEL_ID, getDocumentBranchCatalogEntry());
    }
    return map;
  }, [models]);
  const categoryLabels = useMemo(
    () => new Map(categories.map((c) => [c.id, c.display_name])),
    [categories],
  );

  const resolveNodeData = useCallback(
    (record: PipelineNodeRecord): PipelineNodeData | null => {
      if (record.modelId.startsWith("custom-pipeline/")) {
        const pipelineId =
          typeof record.config?.pipelineId === "string"
            ? record.config.pipelineId
            : record.modelId.replace("custom-pipeline/", "");
        const pipeline = pipelineMap.get(pipelineId);
        if (pipeline) {
          return buildCustomPipelineNodeData(pipeline);
        }
        return null;
      }
      const entry = modelMap.get(record.modelId);
      if (!entry) return null;
      return buildPipelineNodeData(
        entry,
        categoryLabels.get(entry.category) ?? entry.category,
        record.config,
      );
    },
    [modelMap, categoryLabels, pipelineMap],
  );

  const parsedGraph = useMemo(
    () => parsePipelineGraph(initialGraph),
    [initialGraph],
  );

  const migrationCtx = useMemo(
    () => ({ modelMap, categoryLabels }),
    [modelMap, categoryLabels],
  );

  const [nodes, setNodes] = useState<Node<PipelineNodeData>[]>(() => {
    const migrated = applyMigrationToFlowNodes(parsedGraph, migrationCtx);
    return migrated.nodes.length > 0
      ? migrated.nodes
      : graphToFlowNodes(parsedGraph, resolveNodeData);
  });
  const [edges, setEdges] = useState<Edge[]>(() => {
    const migrated = applyMigrationToFlowNodes(parsedGraph, migrationCtx);
    return migrated.nodes.length > 0
      ? migrated.edges
      : graphToFlowEdges(parsedGraph);
  });
  const [viewport, setViewport] = useState<Viewport>(
    () =>
      parsedGraph.viewport ?? {
        x: 0,
        y: 0,
        zoom: 1,
      },
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    initialUpdatedAt ?? null,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [pipelineRunState, setPipelineRunState] = useState<PipelineRunState>({
    status: "idle",
    completedCount: 0,
    totalCount: 0,
  });
  const [saveValidationError, setSaveValidationError] = useState<string | null>(
    null,
  );

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const viewportRef = useRef(viewport);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const nodeDeletionUndoStackRef = useRef<NodeDeletionUndoEntry[]>([]);
  const nodeClipboardRef = useRef<NodeClipboard | null>(null);
  const pasteGenerationRef = useRef(0);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
    };
  }, []);

  const persistGraph = useCallback(
    async (graph: PipelineGraph): Promise<boolean> => {
      setSaveStatus("saving");
      setSaveValidationError(null);
      try {
        const apiPath =
          entity.kind === "pipeline"
            ? `/api/pipelines/${contextId}`
            : `/api/projects/${contextId}`;
        const response = await fetch(apiPath, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ graph }),
        });
        if (!response.ok) {
          if (entity.kind === "pipeline" && response.status === 422) {
            try {
              const body = (await response.json()) as {
                detail?: { errors?: string[]; message?: string };
              };
              const errors = body.detail?.errors ?? [];
              setSaveValidationError(
                errors.length > 0
                  ? errors.join(", ")
                  : (body.detail?.message ?? "Invalid pipeline graph"),
              );
            } catch {
              setSaveValidationError("Invalid pipeline graph");
            }
          } else if (entity.kind === "pipeline") {
            try {
              const body = (await response.json()) as {
                detail?: string | { message?: string; errors?: string[] };
              };
              if (typeof body.detail === "string") {
                setSaveValidationError(body.detail);
              } else if (body.detail?.errors?.length) {
                setSaveValidationError(body.detail.errors.join(", "));
              } else if (body.detail?.message) {
                setSaveValidationError(body.detail.message);
              }
            } catch {
              setSaveValidationError("Failed to save pipeline");
            }
          }
          throw new Error("Failed to save graph");
        }
        if (isMountedRef.current) {
          setSaveStatus("saved");
          setLastSavedAt(new Date().toISOString());
          setHasUnsavedChanges(false);
          setSaveValidationError(null);
        }
        return true;
      } catch {
        if (isMountedRef.current) setSaveStatus("error");
        return false;
      }
    },
    [contextId, entity.kind],
  );

  const persistProjectStatus = useCallback(
    async (status: ProjectStatus) => {
      if (!isProjectCanvas) return;
      try {
        await fetch(`/api/projects/${contextId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      } catch {
        // Non-blocking; graph saves still derive status on the backend.
      }
    },
    [contextId, isProjectCanvas],
  );

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
    if (readOnly) return false;
    const graph = serializePipelineGraph(
      nodesRef.current,
      edgesRef.current,
      viewportRef.current,
    );
    return persistGraph(graph);
  }, [persistGraph, readOnly]);

  const scheduleGraphSave = useCallback(() => {
    if (readOnly) return;
    setHasUnsavedChanges(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const graph = serializePipelineGraph(
        nodesRef.current,
        edgesRef.current,
        viewportRef.current,
      );
      void persistGraph(graph);
    }, 500);
  }, [persistGraph, readOnly]);

  const scheduleViewportSave = useCallback(() => {
    if (readOnly) return;
    setHasUnsavedChanges(true);
    if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
    viewportSaveTimerRef.current = setTimeout(() => {
      const graph = serializePipelineGraph(
        nodesRef.current,
        edgesRef.current,
        viewportRef.current,
      );
      void persistGraph(graph);
    }, 2500);
  }, [persistGraph, readOnly]);

  const evaluateConnection = useCallback(
    (connection: Connection, currentNodes: Node<PipelineNodeData>[]) => {
      const source = currentNodes.find((n) => n.id === connection.source);
      const target = currentNodes.find((n) => n.id === connection.target);
      return evaluatePipelineConnection(
        source,
        target,
        connection.sourceHandle,
        currentNodes,
        edgesRef.current,
      );
    },
    [],
  );

  const decorateEdge = useCallback(
    (
      edge: Edge,
      currentNodes: Node<PipelineNodeData>[],
      currentEdges: Edge[],
      valid: boolean,
    ): Edge => {
      const source = currentNodes.find((n) => n.id === edge.source);
      const effectiveOutput = source
        ? resolveNodeEffectiveOutput(
            source,
            currentNodes,
            currentEdges,
            edge.sourceHandle,
          )
        : null;
      const companion = isCompanionEdge(edge);
      const label =
        companion
          ? undefined
          : (edgeLabelForHandle(effectiveOutput, edge.sourceHandle) ??
            (source?.data.modelId === PAGE_AT_MODEL_ID &&
            (edge.sourceHandle ?? "output") === "output"
              ? `p.${Number(source.data.params.page_index ?? 0) + 1} · selected`
              : undefined));

      return {
        ...edge,
        type: PIPELINE_FLOW_EDGE_TYPE,
        label,
        labelStyle: { fontSize: 9, fill: "var(--foreground)" },
        labelBgStyle: { fill: "var(--card)", fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 2,
        markerEnd: pipelineEdgeMarker(valid),
        data: { ...edge.data, valid, companion },
        className: valid ? "ocrflow-edge-valid" : "ocrflow-edge-invalid",
      };
    },
    [],
  );

  const revalidateEdges = useCallback(
    (currentNodes: Node<PipelineNodeData>[], currentEdges: Edge[]) => {
      return currentEdges.map((edge) => {
        const valid = evaluateConnection(
          {
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle ?? "output",
            targetHandle: edge.targetHandle ?? "input",
          },
          currentNodes,
        );
        return decorateEdge(
          edge,
          currentNodes,
          currentEdges,
          valid,
        );
      });
    },
    [evaluateConnection, decorateEdge],
  );

  const applyPersistedGraph = useCallback(
    (rawGraph: Record<string, unknown>, updatedAt?: string | null) => {
      const nextGraph = parsePipelineGraph(rawGraph);
      const migrated = applyMigrationToFlowNodes(nextGraph, migrationCtx);
      const nextNodes =
        migrated.nodes.length > 0
          ? migrated.nodes
          : graphToFlowNodes(nextGraph, resolveNodeData);
      const baseEdges =
        migrated.nodes.length > 0 ? migrated.edges : graphToFlowEdges(nextGraph);
      const nextEdges = revalidateEdges(nextNodes, baseEdges);

      setNodes(nextNodes);
      setEdges(nextEdges);
      if (nextGraph.viewport) {
        setViewport(nextGraph.viewport);
      }
      setLastSavedAt(updatedAt ?? new Date().toISOString());
      setHasUnsavedChanges(false);
      setSaveStatus("saved");
      return nextNodes;
    },
    [migrationCtx, resolveNodeData, revalidateEdges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<PipelineNodeData>>[]) => {
      if (readOnly) {
        const selectionChanges = changes.filter((change) => change.type === "select");
        if (selectionChanges.length === 0) return;
        setNodes((current) => applyNodeChanges(selectionChanges, current));
        return;
      }

      const removedIds = changes
        .filter((change) => change.type === "remove")
        .map((change) => change.id);

      const cascadeIds = [
        ...new Set([
          ...collectCascadeRemovalIds(removedIds, nodesRef.current),
          ...collectRegionBranchCascadeRemovalIds(removedIds, nodesRef.current),
          ...collectCaptionBranchCascadeRemovalIds(removedIds, nodesRef.current),
          ...collectDocumentBranchCascadeRemovalIds(removedIds, nodesRef.current),
        ]),
      ];
      const allRemovedIds = [...new Set([...removedIds, ...cascadeIds])];

      if (allRemovedIds.length > 0) {
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;
        const removedNodeIdSet = new Set(allRemovedIds);

        const removedNodes = currentNodes
          .filter((node) => removedNodeIdSet.has(node.id))
          .map((node) => ({ ...node, selected: false }));
        const connectedEdges = currentEdges.filter(
          (edge) =>
            removedNodeIdSet.has(edge.source) ||
            removedNodeIdSet.has(edge.target),
        );

        if (removedNodes.length > 0) {
          pushNodeRemovalUndo(
            nodeDeletionUndoStackRef.current,
            removedNodes,
            connectedEdges,
          );
          setEdges((current) =>
            current.filter(
              (edge) =>
                !removedNodeIdSet.has(edge.source) &&
                !removedNodeIdSet.has(edge.target),
            ),
          );
        }
      }

      const expandedChanges =
        cascadeIds.length > 0
          ? [
              ...changes,
              ...cascadeIds.map((id) => ({ type: "remove" as const, id })),
            ]
          : changes;

      setNodes((current) => {
        let next = current;
        for (const removedId of removedIds) {
          const removedNode = nodesRef.current.find((node) => node.id === removedId);
          if (!removedNode) continue;
          const parentId = getParentSelectPageId(removedNode.data.params);
          if (parentId) {
            next = next.map((node) =>
              node.id === parentId
                ? {
                    ...node,
                    data: { ...node.data, pageBranchNodeId: undefined },
                  }
                : node,
            );
          }
          const layoutParentId = getParentLayoutNodeId(removedNode.data.params);
          if (layoutParentId) {
            next = next.map((node) =>
              node.id === layoutParentId
                ? {
                    ...node,
                    data: { ...node.data, regionBranchNodeId: undefined },
                  }
                : node,
            );
          }
          const captionParentId = getParentCaptionNodeId(removedNode.data.params);
          if (captionParentId) {
            next = next.map((node) =>
              node.id === captionParentId
                ? {
                    ...node,
                    data: { ...node.data, captionBranchNodeId: undefined },
                  }
                : node,
            );
          }
          const documentParentId = getParentDocumentNodeId(removedNode.data.params);
          if (documentParentId) {
            next = next.map((node) =>
              node.id === documentParentId
                ? {
                    ...node,
                    data: { ...node.data, documentBranchNodeId: undefined },
                  }
                : node,
            );
          }
        }
        return applyNodeChanges(expandedChanges, next);
      });
      scheduleGraphSave();
    },
    [scheduleGraphSave, readOnly],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) return;
      const filtered = changes.filter((change) => {
        if (change.type !== "remove") return true;
        const edge = edgesRef.current.find((entry) => entry.id === change.id);
        return !edge || !isCompanionEdge(edge);
      });
      if (filtered.length === 0) return;
      setEdges((current) => applyEdgeChanges(filtered, current));
      scheduleGraphSave();
    },
    [scheduleGraphSave, readOnly],
  );

  const onViewportChange = useCallback(
    (nextViewport: Viewport) => {
      setViewport(nextViewport);
      scheduleViewportSave();
    },
    [scheduleViewportSave],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      const normalized: Connection = {
        ...connection,
        sourceHandle: normalizeSourceHandle(connection.sourceHandle),
        targetHandle: normalizeTargetHandle(connection.targetHandle),
      };
      setEdges((current) => {
        const valid = evaluateConnection(normalized, nodesRef.current);
        const baseEdge = {
          ...normalized,
          id: `edge-${normalized.source}-${normalized.target}-${crypto.randomUUID().slice(0, 6)}`,
          type: PIPELINE_FLOW_EDGE_TYPE,
        };
        return addEdge(
          decorateEdge(baseEdge, nodesRef.current, current, valid),
          current,
        );
      });
      scheduleGraphSave();
    },
    [scheduleGraphSave, evaluateConnection, decorateEdge, readOnly],
  );

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      return isPipelineGraphConnectionAllowed(
        connection,
        edgesRef.current,
        nodesRef.current,
      );
    },
    [],
  );

  const addModelNode = useCallback(
    (modelId: string, position: { x: number; y: number }) => {
      if (readOnly) return;
      if (modelId === PAGE_BRANCH_MODEL_ID) return;
      if (modelId === REGION_BRANCH_MODEL_ID) return;
      if (modelId === CAPTION_BRANCH_MODEL_ID) return;
      if (modelId === DOCUMENT_BRANCH_MODEL_ID) return;
      if (isPipelineDefinition && BLOCKED_PIPELINE_MODELS.has(modelId)) return;
      const entry = modelMap.get(modelId);
      if (!entry) return;

      const data = buildPipelineNodeData(
        entry,
        categoryLabels.get(entry.category) ?? entry.category,
      );

      const newNode: Node<PipelineNodeData> = {
        id: createNodeId(modelId),
        type: PIPELINE_NODE_TYPE,
        position,
        data,
      };

      setNodes((current) => [...current, newNode]);
      scheduleGraphSave();
    },
    [modelMap, categoryLabels, scheduleGraphSave, readOnly, isPipelineDefinition],
  );

  const addCustomPipelineNode = useCallback(
    (pipeline: Pipeline, position: { x: number; y: number }) => {
      if (readOnly || isPipelineDefinition) return;
      const data = buildCustomPipelineNodeData(pipeline);
      const newNode: Node<PipelineNodeData> = {
        id: createNodeId(data.modelId),
        type: CUSTOM_PIPELINE_NODE_TYPE,
        position,
        data,
      };
      setNodes((current) => [...current, newNode]);
      scheduleGraphSave();
    },
    [readOnly, isPipelineDefinition, scheduleGraphSave],
  );

  const addModelAtPosition = useCallback(
    (modelId: string, position: { x: number; y: number }) => {
      addModelNode(modelId, position);
    },
    [addModelNode],
  );

  const updateNodeConfig = useCallback(
    (
      nodeId: string,
      partial: Record<string, string | boolean | number>,
    ) => {
      setNodes((current) => {
        const partnerId = getLinkedPageSelectorPartnerId(nodeId, current);
        const syncPageIndex =
          partial.page_index !== undefined &&
          partnerId &&
          current.some(
            (node) =>
              node.id === nodeId && isPageSelectorNode(node.data.modelId),
          );

        return current.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                params: { ...node.data.params, ...partial },
              },
            };
          }
          if (syncPageIndex && node.id === partnerId) {
            return {
              ...node,
              data: {
                ...node.data,
                params: {
                  ...node.data.params,
                  page_index: partial.page_index as number,
                },
              },
            };
          }
          return node;
        });
      });
      scheduleGraphSave();
    },
    [scheduleGraphSave],
  );

  const updateNodeData = useCallback(
    (nodeId: string, partial: Partial<PipelineNodeData>, persist = false) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...partial } }
            : node,
        ),
      );
      if (persist) scheduleGraphSave();
    },
    [scheduleGraphSave],
  );

  const onSelectionChange = useCallback(
    ({
      nodes: selectedNodes,
      edges: selectedEdges,
    }: {
      nodes: Node<PipelineNodeData>[];
      edges: Edge[];
    }) => {
      const selected = selectedNodes.find((n) => n.selected);
      const selectedEdge = selectedEdges.find((e) => e.selected);

      if (selectedEdge) {
        setSelectedEdgeId(selectedEdge.id);
        setSelectedNodeId(null);
        return;
      }

      if (selected) {
        setSelectedNodeId(selected.id);
        setSelectedEdgeId(null);
        return;
      }

      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    },
    [],
  );

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === nodeId,
      })),
    );
    setEdges((current) =>
      current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)),
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setNodes((current) =>
      current.map((node) => (node.selected ? { ...node, selected: false } : node)),
    );
    setEdges((current) =>
      current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)),
    );
  }, []);

  const toggleOutputPanel = useCallback((nodeId: string) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) return node;
        return {
          ...node,
          data: {
            ...node.data,
            outputPanelOpen: !node.data.outputPanelOpen,
          },
        };
      }),
    );
    scheduleGraphSave();
  }, [scheduleGraphSave]);

  const getUpstream = useCallback((nodeId: string, requiredInput?: WireKind) => {
    return getUpstreamContext(
      nodeId,
      nodesRef.current,
      edgesRef.current,
      requiredInput,
    );
  }, []);

  const updateEdgeSourceHandle = useCallback(
    (edgeId: string, sourceHandle: string) => {
      setEdges((current) => {
        const updated = current.map((edge) => {
          if (edge.id !== edgeId) return edge;
          const next = { ...edge, sourceHandle };
          const valid = evaluateConnection(
            {
              source: next.source,
              target: next.target,
              sourceHandle: next.sourceHandle ?? null,
              targetHandle: next.targetHandle ?? null,
            },
            nodesRef.current,
          );
          return decorateEdge(next, nodesRef.current, current, valid);
        });
        return updated;
      });
      scheduleGraphSave();
    },
    [evaluateConnection, decorateEdge, scheduleGraphSave],
  );

  const executeNodeRun = useCallback(
    async (
      nodeId: string,
      runKind: "test_run" | "pipeline_run" = "test_run",
    ): Promise<boolean> => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) return false;

      const catalogEntry = modelMap.get(node.data.modelId);
      if (catalogEntry) {
        const runtimeStatus = getModelStatus(catalogEntry);
        if (runtimeStatus.offline) {
          updateNodeData(
            nodeId,
            {
              runStatus: "error",
              lastRunAt: new Date().toISOString(),
              runResult: {
                error:
                  runtimeStatus.message ??
                  providerOfflineMessage(catalogEntry.provider),
                errorCode: "provider_offline",
                errorContext: {
                  modelId: node.data.modelId,
                  nodeLabel: node.data.label,
                },
              },
            },
            true,
          );
          return false;
        }
      }

      if (isCustomPipelineNodeData(node.data)) {
        if (!isProjectCanvas || !node.data.pipelineId) return false;

        const requiredInput = getModelWireKinds(
          node.data.modelId,
          node.data.inputType,
          node.data.outputType,
          node.data.inputWireKind && node.data.outputWireKind
            ? {
                input: node.data.inputWireKind as WireKind,
                output: node.data.outputWireKind as WireKind,
              }
            : undefined,
        ).input;

        const upstream = getUpstreamContext(
          nodeId,
          nodesRef.current,
          edgesRef.current,
          requiredInput,
        );

        updateNodeData(nodeId, {
          runStatus: "running",
          runResult: undefined,
          subRunProgress: undefined,
        });

        try {
          const pipelineDef =
            pipelineMap.get(node.data.pipelineId) ??
            (await getPipeline(node.data.pipelineId));
          const pipelineGraph = parsePipelineGraph(pipelineDef.graph);

          const cachedOutput = await runCustomPipelineSubgraph({
            projectId: contextId,
            nodeId,
            pipelineGraph,
            upstreamOutput: upstream.output,
            models,
            categories,
            onProgress: (completed, total) => {
              updateNodeData(nodeId, {
                subRunProgress: { completed, total },
              });
            },
          });

          updateNodeData(
            nodeId,
            {
              cachedOutput,
              runStatus: "success",
              lastRunAt: new Date().toISOString(),
              runResult: {
                pageCount:
                  cachedOutput.preview?.pageCount ??
                  cachedOutput.preview?.itemCount,
              },
              subRunProgress: undefined,
            },
            true,
          );
          return true;
        } catch (error) {
          const upstreamNode = upstream.nodeId
            ? nodesRef.current.find((entry) => entry.id === upstream.nodeId)
            : null;
          const upstreamPages = extractPages(upstream.output ?? null);
          updateNodeData(
            nodeId,
            {
              runStatus: "error",
              lastRunAt: new Date().toISOString(),
              runResult: buildRunErrorResult(error, {
                nodeLabel: node.data.label,
                modelId: node.data.modelId,
                upstreamNodeLabel: upstreamNode?.data.label,
                upstreamPagesCount: upstreamPages.length,
                upstreamOutputKind: upstream.output?.kind ?? null,
              }),
              subRunProgress: undefined,
            },
            true,
          );
          return false;
        }
      }

      const def = getModelInferenceDef(node.data.modelId);
      if (!def) return false;

      const requiredInput = getModelWireKinds(
        node.data.modelId,
        node.data.inputType,
        node.data.outputType,
      ).input;

      const upstream = getUpstreamContext(
        nodeId,
        nodesRef.current,
        edgesRef.current,
        requiredInput,
      );

      let upstreamPages = extractPages(upstream.output ?? null);
      if (
        node.data.modelId === PAGE_BRANCH_MODEL_ID &&
        upstreamPages.length === 0
      ) {
        upstreamPages = getUpstreamPagesForNode(node.data, upstream);
      }
      if (upstreamPages.length === 0) {
        const pageImage = findUpstreamPageImage(
          nodeId,
          nodesRef.current,
          edgesRef.current,
        );
        if (pageImage) {
          upstreamPages = [{ page_index: pageImage.page_index ?? 0, page: pageImage }];
        }
      }

      updateNodeData(nodeId, {
        runStatus: "running",
        runResult: undefined,
      });

      try {
        const upstreamNode = upstream.nodeId
          ? nodesRef.current.find((entry) => entry.id === upstream.nodeId)
          : null;
        const payload = buildInferencePayload(node.data.modelId, {
          projectId: contextId,
          data: node.data,
          upstreamPages,
          upstreamOutput: upstream.output,
          upstreamData: upstreamNode?.data ?? null,
          upstreamAssetId: upstream.assetId,
        });

        if (!payload) {
          throw Object.assign(new Error("Node is not ready to run"), {
            explicitCode: "payload_build" as const,
          });
        }

        const response = await runModelInference(node.data.modelId, payload, {
          projectId: contextId,
          nodeId,
          runKind,
        });
        let cachedOutput = extractInferenceOutput(
          node.data.modelId,
          response,
        );

        const pageImg =
          upstreamPages[0]?.page ??
          (upstream.output?.preview?.pageImage as typeof upstreamPages[0]["page"]);

        if (pageImg && !cachedOutput.preview?.thumbnailBase64) {
          cachedOutput = enrichOutputPreview(cachedOutput, pageImg);
        }

        const previewBase64 = cachedOutput.preview?.thumbnailBase64;
        const pageCount =
          cachedOutput.preview?.pageCount ??
          cachedOutput.preview?.itemCount ??
          (cachedOutput.kind === "pages"
            ? extractPages(cachedOutput).length
            : 1);

        setNodes((current) => {
          const updatedNodes = current.map((n) => {
            if (n.id === nodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  cachedOutput,
                  runStatus: "success" as const,
                  lastRunAt: new Date().toISOString(),
                  runResult: {
                    pageCount,
                    previewBase64,
                  },
                },
              };
            }
            return n;
          });
          setEdges(revalidateEdges(updatedNodes, edgesRef.current));
          return updatedNodes;
        });
        scheduleGraphSave();
        return true;
      } catch (error) {
        const upstreamNode = upstream.nodeId
          ? nodesRef.current.find((entry) => entry.id === upstream.nodeId)
          : null;
        const upstreamAssetFilename =
          typeof upstreamNode?.data.params.assetFilename === "string"
            ? upstreamNode.data.params.assetFilename
            : undefined;
        const assetFilename =
          typeof node.data.params.assetFilename === "string"
            ? node.data.params.assetFilename
            : upstreamAssetFilename;
        const usesUpstreamFile = Boolean(upstream.assetId);
        updateNodeData(
          nodeId,
          {
            runStatus: "error",
            lastRunAt: new Date().toISOString(),
            runResult: buildRunErrorResult(error, {
              nodeLabel: node.data.label,
              modelId: node.data.modelId,
              upstreamNodeLabel: upstreamNode?.data.label,
              upstreamPagesCount: usesUpstreamFile ? undefined : upstreamPages.length,
              upstreamOutputKind: upstream.output?.kind ?? null,
              hasAsset: Boolean(node.data.params.assetId || upstream.assetId),
              assetFilename,
              explicitCode:
                typeof error === "object" &&
                error !== null &&
                "explicitCode" in error &&
                typeof (error as { explicitCode?: string }).explicitCode ===
                  "string"
                  ? ((error as { explicitCode: "payload_build" }).explicitCode)
                  : undefined,
            }),
          },
          true,
        );
        return false;
      }
    },
    [
      categories,
      contextId,
      getModelStatus,
      isProjectCanvas,
      modelMap,
      models,
      pipelineMap,
      updateNodeData,
      revalidateEdges,
      scheduleGraphSave,
    ],
  );

  const runNode = useCallback(
    async (
      nodeId: string,
      runKind: "test_run" | "pipeline_run" = "test_run",
    ): Promise<boolean> => {
      if (readOnly) return false;
      const readiness = getNodeTestRunReadiness(
        nodeId,
        nodesRef.current,
        edgesRef.current,
        contextId,
      );
      if (!readiness.ready) {
        const node = nodesRef.current.find((entry) => entry.id === nodeId);
        updateNodeData(
          nodeId,
          {
            runStatus: "error",
            runResult: buildRunErrorResult(
              new Error(readiness.issues[0] ?? "Node is not ready to run"),
              {
                nodeLabel: node?.data.label ?? nodeId,
                modelId: node?.data.modelId ?? "",
                explicitCode: "readiness",
              },
            ),
          },
          true,
        );
        return false;
      }

      const upstreamChain = collectUpstreamChain(
        nodeId,
        nodesRef.current,
        edgesRef.current,
      );

      for (const upstreamId of upstreamChain) {
        const upstreamNode = nodesRef.current.find((n) => n.id === upstreamId);
        if (!upstreamNode) continue;
        if (
          !getModelInferenceDef(upstreamNode.data.modelId) &&
          !isCustomPipelineNodeData(upstreamNode.data)
        ) {
          continue;
        }
        if (upstreamNode.data.cachedOutput) continue;

        const success = await executeNodeRun(upstreamId, runKind);
        if (!success) return false;
      }

      return executeNodeRun(nodeId, runKind);
    },
    [contextId, executeNodeRun, readOnly, updateNodeData],
  );

  const runFullPipeline = useCallback(async () => {
    if (readOnly) return;
    if (!isProjectCanvas) return;
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const readiness = getPipelineReadiness(
      currentNodes,
      currentEdges,
      contextId,
      { forFullRun: true },
    );

    if (!readiness.ready) {
      setPipelineRunState({
        status: "error",
        completedCount: 0,
        totalCount: readiness.steps.length,
        error: readiness.issues[0] ?? "Pipeline is not ready to run",
      });
      return;
    }

    const saved = await saveNow();
    if (!saved) {
      setPipelineRunState({
        status: "error",
        completedCount: 0,
        totalCount: readiness.steps.length,
        error: "Project must be saved before it can run on the backend",
        lastRunAt: new Date().toISOString(),
        lastRunStatus: "error",
      });
      return;
    }

    setPipelineRunState({
      status: "running",
      completedCount: 0,
      totalCount: readiness.steps.length,
    });
    void persistProjectStatus("running");

    try {
      const run = await startProjectRun(contextId);
      setPipelineRunState({
        status: "running",
        currentNodeId: run.current_node_id ?? undefined,
        completedCount: run.completed_count,
        totalCount: run.total_count || readiness.steps.length,
      });

      while (isMountedRef.current) {
        await new Promise((resolve) =>
          setTimeout(resolve, PROJECT_RUN_POLL_INTERVAL_MS),
        );
        const latest = await getProjectRun(contextId, run.id);
        const totalCount = latest.total_count || readiness.steps.length;

        if (latest.status === "queued" || latest.status === "running") {
          setPipelineRunState({
            status: "running",
            currentNodeId: latest.current_node_id ?? undefined,
            completedCount: latest.completed_count,
            totalCount,
          });
          continue;
        }

        const refreshed = await getProject(contextId);
        const refreshedNodes = applyPersistedGraph(
          refreshed.graph,
          refreshed.updated_at,
        );
        const finishedAt =
          latest.finished_at ?? latest.updated_at ?? new Date().toISOString();

        if (latest.status === "succeeded") {
          setPipelineRunState({
            status: "success",
            completedCount: latest.completed_count,
            totalCount,
            lastRunAt: finishedAt,
            lastRunStatus: "success",
          });
          return;
        }

        const failedNode = latest.current_node_id
          ? refreshedNodes.find((entry) => entry.id === latest.current_node_id)
          : refreshedNodes.find((entry) => entry.data.runStatus === "error");
        const failedRunResult = failedNode?.data.runResult;
        setPipelineRunState({
          status: "error",
          currentNodeId: latest.current_node_id ?? undefined,
          completedCount: latest.completed_count,
          totalCount,
          failedNodeId: failedNode?.id ?? latest.current_node_id ?? undefined,
          failedNodeLabel: failedNode?.data.label,
          error:
            latest.status === "cancelled"
              ? "Pipeline run was cancelled"
              : (latest.error ?? failedRunResult?.error ?? "Pipeline run failed"),
          errorCode:
            (latest.error_code as PipelineRunState["errorCode"]) ??
            failedRunResult?.errorCode,
          lastRunAt: finishedAt,
          lastRunStatus: "error",
        });
        if (latest.status === "cancelled") {
          void persistProjectStatus("idle");
        } else {
          void persistProjectStatus("failed");
        }
        return;
      }
    } catch (error) {
      setPipelineRunState({
        status: "error",
        completedCount: 0,
        totalCount: readiness.steps.length,
        error: error instanceof Error ? error.message : "Pipeline run failed",
        lastRunAt: new Date().toISOString(),
        lastRunStatus: "error",
      });
      void persistProjectStatus("failed");
    }
  }, [
    applyPersistedGraph,
    contextId,
    isProjectCanvas,
    persistProjectStatus,
    readOnly,
    saveNow,
  ]);

  const clearNodeRunState = useCallback(
    (nodeId: string) => {
      if (readOnly) return;
      setNodes((current) =>
        current.map((n) =>
          n.id !== nodeId
            ? n
            : {
                ...n,
                data: {
                  ...n.data,
                  runStatus: "idle" as const,
                  runResult: undefined,
                  cachedOutput: null,
                },
              },
        ),
      );
      scheduleGraphSave();
    },
    [readOnly, scheduleGraphSave],
  );

  const clearAllRunState = useCallback(() => {
    if (readOnly) return;
    setNodes((current) =>
      current.map((n) => ({
        ...n,
        data: {
          ...n.data,
          runStatus: "idle" as const,
          runResult: undefined,
          cachedOutput: null,
        },
      })),
    );
    setPipelineRunState({ status: "idle", completedCount: 0, totalCount: 0 });
    scheduleGraphSave();
  }, [readOnly, scheduleGraphSave]);

  const undoNodeDeletion = useCallback(() => {
    const entry = nodeDeletionUndoStackRef.current.pop();
    if (!entry) return false;

    setNodes((currentNodes) => {
      const existingNodeIds = new Set(currentNodes.map((node) => node.id));
      const restoredNodes = entry.nodes.filter(
        (node) => !existingNodeIds.has(node.id),
      );
      const nextNodes = [...currentNodes, ...restoredNodes];

      setEdges((currentEdges) => {
        const existingEdgeIds = new Set(currentEdges.map((edge) => edge.id));
        const restoredEdges = entry.edges.filter(
          (edge) => !existingEdgeIds.has(edge.id),
        );
        return revalidateEdges(nextNodes, [...currentEdges, ...restoredEdges]);
      });

      return nextNodes;
    });
    scheduleGraphSave();
    return true;
  }, [revalidateEdges, scheduleGraphSave]);

  const getSelectedNodes = useCallback((): Node<PipelineNodeData>[] => {
    const selected = nodesRef.current.filter((node) => node.selected);
    if (selected.length > 0) return selected;

    if (selectedNodeId) {
      const node = nodesRef.current.find((entry) => entry.id === selectedNodeId);
      return node ? [node] : [];
    }

    return [];
  }, [selectedNodeId]);

  const getSelectionWithInternalEdges = useCallback(
    (selectedNodes: Node<PipelineNodeData>[]) => {
      const selectedIds = new Set(selectedNodes.map((node) => node.id));
      const internalEdges = edgesRef.current.filter(
        (edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target),
      );
      return { selectedIds, internalEdges };
    },
    [],
  );

  const appendClonedNodes = useCallback(
    (
      sourceNodes: Node<PipelineNodeData>[],
      internalEdges: Edge[],
      resolvePosition: (node: Node<PipelineNodeData>) => { x: number; y: number },
    ) => {
      if (sourceNodes.length === 0) return false;

      const { newNodes, newEdges } = cloneNodesWithEdges(
        sourceNodes,
        internalEdges,
        resolvePosition,
      );

      setSelectedNodeId(newNodes[0]?.id ?? null);
      setSelectedEdgeId(null);

      setNodes((currentNodes) => {
        const nextNodes = [
          ...currentNodes.map((node) =>
            node.selected ? { ...node, selected: false } : node,
          ),
          ...newNodes,
        ];

        setEdges((currentEdges) => {
          const decoratedEdges = newEdges.map((edge) => {
            const valid = evaluateConnection(
              {
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle ?? null,
                targetHandle: edge.targetHandle ?? null,
              },
              nextNodes,
            );
            return decorateEdge(
              edge,
              nextNodes,
              [...currentEdges, ...newEdges],
              valid,
            );
          });
          return revalidateEdges(nextNodes, [...currentEdges, ...decoratedEdges]);
        });

        return nextNodes;
      });
      scheduleGraphSave();
      return true;
    },
    [decorateEdge, evaluateConnection, revalidateEdges, scheduleGraphSave],
  );

  const copySelectedNodes = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length === 0) return false;

    const { internalEdges } = getSelectionWithInternalEdges(selectedNodes);
    nodeClipboardRef.current = {
      nodes: snapshotNodesForClipboard(selectedNodes),
      edges: internalEdges.map((edge) => ({ ...edge, selected: false })),
    };
    pasteGenerationRef.current = 0;
    return true;
  }, [getSelectedNodes, getSelectionWithInternalEdges]);

  const cutSelectedNodes = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length === 0) return false;

    const { selectedIds, internalEdges } =
      getSelectionWithInternalEdges(selectedNodes);
    const connectedEdges = edgesRef.current.filter(
      (edge) =>
        selectedIds.has(edge.source) || selectedIds.has(edge.target),
    );

    nodeClipboardRef.current = {
      nodes: snapshotNodesForClipboard(selectedNodes),
      edges: internalEdges.map((edge) => ({ ...edge, selected: false })),
    };
    pasteGenerationRef.current = 0;

    pushNodeRemovalUndo(
      nodeDeletionUndoStackRef.current,
      selectedNodes.map((node) => ({ ...node, selected: false })),
      connectedEdges,
    );

    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setNodes((current) => current.filter((node) => !selectedIds.has(node.id)));
    setEdges((current) =>
      current.filter(
        (edge) =>
          !selectedIds.has(edge.source) && !selectedIds.has(edge.target),
      ),
    );
    scheduleGraphSave();
    return true;
  }, [getSelectedNodes, getSelectionWithInternalEdges, scheduleGraphSave]);

  const pasteNodes = useCallback(() => {
    const clipboard = nodeClipboardRef.current;
    if (!clipboard || clipboard.nodes.length === 0) return false;

    pasteGenerationRef.current += 1;
    const offset = PASTE_OFFSET * pasteGenerationRef.current;

    return appendClonedNodes(
      clipboard.nodes,
      clipboard.edges,
      (node) => ({
        x: node.position.x + offset,
        y: node.position.y + offset,
      }),
    );
  }, [appendClonedNodes]);

  const duplicateSelectedNodes = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length === 0) return false;

    const { internalEdges } = getSelectionWithInternalEdges(selectedNodes);
    return appendClonedNodes(
      snapshotNodesForClipboard(selectedNodes),
      internalEdges.map((edge) => ({ ...edge, selected: false })),
      (node) => ({
        x: node.position.x + PASTE_OFFSET,
        y: node.position.y + PASTE_OFFSET,
      }),
    );
  }, [appendClonedNodes, getSelectedNodes, getSelectionWithInternalEdges]);

  const duplicateNodesAtDragPositions = useCallback(
    (
      nodeIds: string[],
      startPositions: Map<string, { x: number; y: number }>,
    ) => {
      const idSet = new Set(nodeIds);
      const sourceNodes = nodesRef.current.filter((node) => idSet.has(node.id));
      if (sourceNodes.length === 0) return false;

      const endPositions = new Map(
        sourceNodes.map((node) => [node.id, { ...node.position }]),
      );
      const { internalEdges } = getSelectionWithInternalEdges(sourceNodes);

      const { newNodes, newEdges } = cloneNodesWithEdges(
        snapshotNodesForClipboard(sourceNodes),
        internalEdges.map((edge) => ({ ...edge, selected: false })),
        (node) => endPositions.get(node.id) ?? node.position,
      );

      setSelectedNodeId(newNodes[0]?.id ?? null);
      setSelectedEdgeId(null);

      setNodes((currentNodes) => {
        const nextNodes = [
          ...currentNodes.map((node) => {
            const start = startPositions.get(node.id);
            if (start) {
              return { ...node, position: start, selected: false };
            }
            return node.selected ? { ...node, selected: false } : node;
          }),
          ...newNodes,
        ];

        setEdges((currentEdges) => {
          const decoratedEdges = newEdges.map((edge) => {
            const valid = evaluateConnection(
              {
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle ?? null,
                targetHandle: edge.targetHandle ?? null,
              },
              nextNodes,
            );
            return decorateEdge(
              edge,
              nextNodes,
              [...currentEdges, ...newEdges],
              valid,
            );
          });
          return revalidateEdges(nextNodes, [...currentEdges, ...decoratedEdges]);
        });

        return nextNodes;
      });
      scheduleGraphSave();
      return true;
    },
    [
      decorateEdge,
      evaluateConnection,
      getSelectionWithInternalEdges,
      revalidateEdges,
      scheduleGraphSave,
    ],
  );

  const expandPageBranch = useCallback(
    (anchorNodeId: string): string | null => {
      if (readOnly) return null;

      const anchor = nodesRef.current.find((node) => node.id === anchorNodeId);
      if (!anchor || !isPageAtAnchor(anchor.data.modelId)) return null;

      const linkedId = anchor.data.pageBranchNodeId;
      const existing =
        (linkedId
          ? nodesRef.current.find((node) => node.id === linkedId)
          : undefined) ??
        findPageBranchForAnchor(anchorNodeId, nodesRef.current);

      if (existing) {
        setSelectedNodeId(existing.id);
        setSelectedEdgeId(null);
        setNodes((current) =>
          current.map((node) => ({
            ...node,
            selected: node.id === existing.id,
          })),
        );
        return existing.id;
      }

      const entry = modelMap.get(PAGE_BRANCH_MODEL_ID);
      if (!entry) return null;

      const branch = buildPageBranchNode(
        anchorNodeId,
        {
          x: anchor.position.x + PAGE_BRANCH_SPAWN_OFFSET.x,
          y: anchor.position.y + PAGE_BRANCH_SPAWN_OFFSET.y,
        },
        entry,
        categoryLabels.get(entry.category) ?? entry.category,
        Number(anchor.data.params.page_index ?? 0),
      );

      const companion = buildCompanionEdge(anchorNodeId, branch.id);
      const valid = evaluateConnection(
        {
          source: anchorNodeId,
          target: branch.id,
          sourceHandle: "output",
          targetHandle: "input",
        },
        nodesRef.current,
      );

      setNodes((current) => [
        ...current.map((node) =>
          node.id === anchorNodeId
            ? {
                ...node,
                selected: false,
                data: {
                  ...node.data,
                  pageBranchNodeId: branch.id,
                  outputPanelOpen: false,
                },
              }
            : node,
        ),
        { ...branch, selected: true, data: {
          ...branch.data,
          branchPanelWidth: PAGE_BRANCH_PANEL_DEFAULT.width,
          branchPanelHeight: PAGE_BRANCH_PANEL_DEFAULT.height,
        } },
      ]);

      setEdges((current) =>
        addEdge(
          decorateEdge(
            companion,
            [...nodesRef.current, branch],
            current,
            valid,
          ),
          current,
        ),
      );

      setSelectedNodeId(branch.id);
      setSelectedEdgeId(null);
      scheduleGraphSave();
      return branch.id;
    },
    [
      readOnly,
      modelMap,
      categoryLabels,
      evaluateConnection,
      decorateEdge,
      scheduleGraphSave,
    ],
  );

  const closePageBranch = useCallback(
    (branchNodeId: string) => {
      if (readOnly) return;
      const branch = nodesRef.current.find((node) => node.id === branchNodeId);
      if (!branch || !isPageBranchNode(branch.data.modelId)) return;
      onNodesChange([{ type: "remove", id: branchNodeId }]);
    },
    [onNodesChange, readOnly],
  );

  const expandRegionBranch = useCallback(
    (anchorNodeId: string): string | null => {
      if (readOnly) return null;

      const anchor = nodesRef.current.find((node) => node.id === anchorNodeId);
      if (!anchor || !isLayoutAnchor(anchor.data.modelId, anchor.data.category)) {
        return null;
      }

      const linkedId = anchor.data.regionBranchNodeId;
      const existing =
        (linkedId
          ? nodesRef.current.find((node) => node.id === linkedId)
          : undefined) ??
        findRegionBranchForAnchor(anchorNodeId, nodesRef.current);

      if (existing) {
        setSelectedNodeId(existing.id);
        setSelectedEdgeId(null);
        setNodes((current) =>
          current.map((node) => ({
            ...node,
            selected: node.id === existing.id,
          })),
        );
        return existing.id;
      }

      const entry = getRegionBranchCatalogEntry(modelMap);

      const branch = buildRegionBranchNode(
        anchorNodeId,
        {
          x: anchor.position.x + REGION_BRANCH_SPAWN_OFFSET.x,
          y: anchor.position.y + REGION_BRANCH_SPAWN_OFFSET.y,
        },
        entry,
        categoryLabels.get(entry.category) ?? entry.category,
      );

      const nodesWithBranch = [...nodesRef.current, branch];
      const companion = buildRegionBranchCompanionEdge(anchorNodeId, branch.id);
      const valid = evaluateConnection(
        {
          source: anchorNodeId,
          target: branch.id,
          sourceHandle: "output",
          targetHandle: "input",
        },
        nodesWithBranch,
      );

      setNodes((current) => [
        ...current.map((node) =>
          node.id === anchorNodeId
            ? {
                ...node,
                selected: false,
                data: {
                  ...node.data,
                  regionBranchNodeId: branch.id,
                  outputPanelOpen: false,
                },
              }
            : node,
        ),
        {
          ...branch,
          selected: true,
          data: {
            ...branch.data,
            branchPanelWidth: REGION_BRANCH_PANEL_DEFAULT.width,
            branchPanelHeight: REGION_BRANCH_PANEL_DEFAULT.height,
          },
        },
      ]);

      setEdges((current) =>
        addEdge(
          decorateEdge(companion, nodesWithBranch, current, valid),
          current,
        ),
      );

      setSelectedNodeId(branch.id);
      setSelectedEdgeId(null);
      scheduleGraphSave();
      return branch.id;
    },
    [
      readOnly,
      modelMap,
      categoryLabels,
      evaluateConnection,
      decorateEdge,
      scheduleGraphSave,
    ],
  );

  const closeRegionBranch = useCallback(
    (branchNodeId: string) => {
      if (readOnly) return;
      const branch = nodesRef.current.find((node) => node.id === branchNodeId);
      if (!branch || !isRegionBranchNode(branch.data.modelId)) return;
      onNodesChange([{ type: "remove", id: branchNodeId }]);
    },
    [onNodesChange, readOnly],
  );

  const expandCaptionBranch = useCallback(
    (anchorNodeId: string): string | null => {
      if (readOnly) return null;

      const anchor = nodesRef.current.find((node) => node.id === anchorNodeId);
      if (!anchor || !isFigureCaptionTextOutput(anchor.data.modelId)) {
        return null;
      }

      const linkedId = anchor.data.captionBranchNodeId;
      const existing =
        (linkedId
          ? nodesRef.current.find((node) => node.id === linkedId)
          : undefined) ?? findCaptionBranchForAnchor(anchorNodeId, nodesRef.current);

      if (existing) {
        setSelectedNodeId(existing.id);
        setSelectedEdgeId(null);
        setNodes((current) =>
          current.map((node) => ({
            ...node,
            selected: node.id === existing.id,
          })),
        );
        return existing.id;
      }

      const entry = getCaptionBranchCatalogEntry(modelMap);

      const branch = buildCaptionBranchNode(
        anchorNodeId,
        {
          x: anchor.position.x + CAPTION_BRANCH_SPAWN_OFFSET.x,
          y: anchor.position.y + CAPTION_BRANCH_SPAWN_OFFSET.y,
        },
        entry,
        categoryLabels.get(entry.category) ?? entry.category,
      );

      const nodesWithBranch = [...nodesRef.current, branch];
      const companion = buildCaptionBranchCompanionEdge(anchorNodeId, branch.id);
      const valid = evaluateConnection(
        {
          source: anchorNodeId,
          target: branch.id,
          sourceHandle: "output",
          targetHandle: "input",
        },
        nodesWithBranch,
      );

      setNodes((current) => [
        ...current.map((node) =>
          node.id === anchorNodeId
            ? {
                ...node,
                selected: false,
                data: {
                  ...node.data,
                  captionBranchNodeId: branch.id,
                  outputPanelOpen: false,
                },
              }
            : node,
        ),
        {
          ...branch,
          selected: true,
          data: {
            ...branch.data,
            branchPanelWidth: CAPTION_BRANCH_PANEL_DEFAULT.width,
            branchPanelHeight: CAPTION_BRANCH_PANEL_DEFAULT.height,
          },
        },
      ]);

      setEdges((current) =>
        addEdge(
          decorateEdge(companion, nodesWithBranch, current, valid),
          current,
        ),
      );

      setSelectedNodeId(branch.id);
      setSelectedEdgeId(null);
      scheduleGraphSave();
      return branch.id;
    },
    [
      readOnly,
      modelMap,
      categoryLabels,
      evaluateConnection,
      decorateEdge,
      scheduleGraphSave,
    ],
  );

  const closeCaptionBranch = useCallback(
    (branchNodeId: string) => {
      if (readOnly) return;
      const branch = nodesRef.current.find((node) => node.id === branchNodeId);
      if (!branch || !isCaptionBranchNode(branch.data.modelId)) return;
      onNodesChange([{ type: "remove", id: branchNodeId }]);
    },
    [onNodesChange, readOnly],
  );

  const expandDocumentBranch = useCallback(
    (anchorNodeId: string): string | null => {
      if (readOnly) return null;

      const anchor = nodesRef.current.find((node) => node.id === anchorNodeId);
      if (!anchor || !isDocumentBranchAnchor(anchor.data.modelId)) {
        return null;
      }

      const linkedId = anchor.data.documentBranchNodeId;
      const existing =
        (linkedId
          ? nodesRef.current.find((node) => node.id === linkedId)
          : undefined) ??
        findDocumentBranchForAnchor(anchorNodeId, nodesRef.current);

      if (existing) {
        setSelectedNodeId(existing.id);
        setSelectedEdgeId(null);
        setNodes((current) =>
          current.map((node) => ({
            ...node,
            selected: node.id === existing.id,
          })),
        );
        return existing.id;
      }

      const entry = getDocumentBranchCatalogEntry(modelMap);

      const branch = buildDocumentBranchNode(
        anchorNodeId,
        {
          x: anchor.position.x + DOCUMENT_BRANCH_SPAWN_OFFSET.x,
          y: anchor.position.y + DOCUMENT_BRANCH_SPAWN_OFFSET.y,
        },
        entry,
        categoryLabels.get(entry.category) ?? entry.category,
      );

      const nodesWithBranch = [...nodesRef.current, branch];
      const companion = buildDocumentBranchCompanionEdge(anchorNodeId, branch.id);
      const valid = evaluateConnection(
        {
          source: anchorNodeId,
          target: branch.id,
          sourceHandle: "output",
          targetHandle: "input",
        },
        nodesWithBranch,
      );

      setNodes((current) => [
        ...current.map((node) =>
          node.id === anchorNodeId
            ? {
                ...node,
                selected: false,
                data: {
                  ...node.data,
                  documentBranchNodeId: branch.id,
                  outputPanelOpen: false,
                },
              }
            : node,
        ),
        {
          ...branch,
          selected: true,
          data: {
            ...branch.data,
            branchPanelWidth: DOCUMENT_BRANCH_PANEL_DEFAULT.width,
            branchPanelHeight: DOCUMENT_BRANCH_PANEL_DEFAULT.height,
          },
        },
      ]);

      setEdges((current) =>
        addEdge(
          decorateEdge(companion, nodesWithBranch, current, valid),
          current,
        ),
      );

      setSelectedNodeId(branch.id);
      setSelectedEdgeId(null);
      scheduleGraphSave();
      return branch.id;
    },
    [
      readOnly,
      modelMap,
      categoryLabels,
      evaluateConnection,
      decorateEdge,
      scheduleGraphSave,
    ],
  );

  const closeDocumentBranch = useCallback(
    (branchNodeId: string) => {
      if (readOnly) return;
      const branch = nodesRef.current.find((node) => node.id === branchNodeId);
      if (!branch || !isDocumentBranchNode(branch.data.modelId)) return;
      onNodesChange([{ type: "remove", id: branchNodeId }]);
    },
    [onNodesChange, readOnly],
  );

  const autoLayout = useCallback(() => {
    setNodes((current) => {
      const measuredMainHeights = new Map<string, number>();
      for (const node of current) {
        if (node.data.outputPanelOpen === true) continue;

        const internal = getInternalNode(node.id);
        const height =
          internal?.measured?.height ?? internal?.height ?? undefined;
        if (!height || height <= 0) continue;

        measuredMainHeights.set(node.id, height);
      }
      return autoLayoutNodes(current, edgesRef.current, measuredMainHeights);
    });
    scheduleGraphSave();
  }, [getInternalNode, scheduleGraphSave]);

  const modelCatalog = useMemo(
    () =>
      filterDoneModels(models).filter((model) => {
        if (model.id === PAGE_BRANCH_MODEL_ID) return false;
        if (model.id === REGION_BRANCH_MODEL_ID) return false;
        if (model.id === CAPTION_BRANCH_MODEL_ID) return false;
        if (model.id === DOCUMENT_BRANCH_MODEL_ID) return false;
        if (isPipelineDefinition && BLOCKED_PIPELINE_MODELS.has(model.id)) {
          return false;
        }
        return true;
      }),
    [models, isPipelineDefinition],
  );

  const boundaryValidation = useMemo(() => {
    if (!isPipelineDefinition) return null;
    const graph = serializePipelineGraph(nodes, edges, viewport);
    return derivePipelineBoundaryIO(graph.nodes, graph.edges, modelMap);
  }, [nodes, edges, viewport, isPipelineDefinition, modelMap]);

  const pipelineSteps = useMemo(
    () =>
      getPipelineReadiness(nodes, edges, contextId, { forFullRun: true }).steps,
    [nodes, edges, contextId],
  );

  return {
    nodes,
    edges,
    viewport,
    saveStatus,
    lastSavedAt,
    hasUnsavedChanges,
    saveNow,
    saveValidationError,
    boundaryValidation,
    modelCatalog,
    entity,
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
    evaluateConnection,
    parsedGraph,
    selectedNodeId,
    selectedEdgeId,
    selectNode,
    onSelectionChange,
    clearSelection,
    updateEdgeSourceHandle,
    autoLayout,
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
  };
}
