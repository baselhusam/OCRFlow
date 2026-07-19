import type { Edge, Node, Viewport } from "@xyflow/react";

import { pipelineEdgeMarker, PIPELINE_FLOW_EDGE_TYPE } from "@/lib/canvas/edge-styles";
import { runtimeFromNodeData, stripRuntimeForPersist } from "@/lib/canvas/runtime-utils";
import type {
  PipelineEdgeRecord,
  PipelineGraph,
  PipelineNodeData,
  PipelineNodeRecord,
  PipelineNodeRuntime,
  PipelineViewport,
} from "@/lib/canvas/types";
import { PIPELINE_NODE_TYPE, CUSTOM_PIPELINE_NODE_TYPE } from "@/lib/canvas/types";
import { isCustomPipelineModelId } from "@/lib/canvas/wire-types";

export function parsePipelineGraph(raw: Record<string, unknown>): PipelineGraph {
  const nodes = Array.isArray(raw.nodes)
    ? (raw.nodes as PipelineNodeRecord[])
    : [];
  const edges = Array.isArray(raw.edges)
    ? (raw.edges as PipelineEdgeRecord[])
    : [];
  const viewport =
    raw.viewport && typeof raw.viewport === "object"
      ? (raw.viewport as PipelineViewport)
      : undefined;

  return { nodes, edges, viewport };
}

export function serializePipelineGraph(
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
  viewport: Viewport,
): PipelineGraph {
  return {
    nodes: nodes.map((node) => {
      const runtime = runtimeFromNodeData(node.data);
      return {
        id: node.id,
        modelId: node.data.modelId,
        position: node.position,
        config: node.data.params,
        ...(runtime ? { runtime } : {}),
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      valid: edge.data?.valid !== false,
      companion: edge.data?.companion === true,
    })),
    viewport: {
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom,
    },
  };
}

export function isEmptyGraph(graph: PipelineGraph): boolean {
  return graph.nodes.length === 0 && graph.edges.length === 0;
}

function applyRuntimeToNodeData(
  data: PipelineNodeData,
  runtime?: PipelineNodeRuntime,
): PipelineNodeData {
  if (!runtime) return data;
  return {
    ...data,
    runStatus: runtime.runStatus ?? data.runStatus,
    lastRunAt: runtime.lastRunAt,
    runResult: runtime.runResult,
    outputPanelOpen: runtime.outputPanelOpen,
    pageBranchNodeId: runtime.pageBranchNodeId,
    regionBranchNodeId: runtime.regionBranchNodeId,
    captionBranchNodeId: runtime.captionBranchNodeId,
    documentBranchNodeId: runtime.documentBranchNodeId,
    branchPanelWidth: runtime.branchPanelWidth,
    branchPanelHeight: runtime.branchPanelHeight,
    captionMarkdownPreview: runtime.captionMarkdownPreview,
    cachedOutput: runtime.cachedOutput ?? data.cachedOutput,
  };
}

export function graphToFlowNodes(
  graph: PipelineGraph,
  resolveNodeData: (record: PipelineNodeRecord) => PipelineNodeData | null,
): Node<PipelineNodeData>[] {
  return graph.nodes.flatMap((record) => {
    const data = resolveNodeData(record);
    if (!data) return [];
    const runtime = stripRuntimeForPersist(record.runtime);
    return [
      {
        id: record.id,
        type: isCustomPipelineModelId(record.modelId)
          ? CUSTOM_PIPELINE_NODE_TYPE
          : PIPELINE_NODE_TYPE,
        position: record.position,
        data: applyRuntimeToNodeData(
          {
            ...data,
            params: record.config ?? data.params,
          },
          runtime,
        ),
      },
    ];
  });
}

export function graphToFlowEdges(graph: PipelineGraph): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    type: PIPELINE_FLOW_EDGE_TYPE,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? "output",
    targetHandle: edge.targetHandle ?? "input",
    data: {
      valid: edge.valid !== false,
      companion: edge.companion === true,
    },
    className: edge.valid === false ? "ocrflow-edge-invalid" : "ocrflow-edge-valid",
    markerEnd: pipelineEdgeMarker(edge.valid !== false),
  }));
}
