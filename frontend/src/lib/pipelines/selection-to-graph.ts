import type { Edge, Node } from "@xyflow/react";

import { derivePipelineBoundaryIO } from "@/lib/canvas/pipeline-boundary";
import { serializePipelineGraph } from "@/lib/canvas/graph-utils";
import type {
  PipelineGraph,
  PipelineNodeData,
  PipelineNodeRecord,
} from "@/lib/canvas/types";
import { BLOCKED_PIPELINE_MODELS } from "@/lib/canvas/wire-types";

const FILE_LOADERS = new Set(["loader/pdf", "loader/image"]);

export type SelectionPipelineDraft = {
  graph: PipelineGraph;
  selectedCount: number;
  strippedLoaderCount: number;
  usedFullCanvas: boolean;
  boundary: ReturnType<typeof derivePipelineBoundaryIO>;
};

function isPipelineEligibleNode(node: Node<PipelineNodeData>): boolean {
  return !FILE_LOADERS.has(node.data.modelId);
}

export function graphFromCanvasSelection(
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
): SelectionPipelineDraft {
  const selected = nodes.filter((node) => node.selected);
  const usedFullCanvas = selected.length === 0;
  const source = usedFullCanvas ? nodes : selected;
  const strippedLoaderCount = source.filter((node) =>
    FILE_LOADERS.has(node.data.modelId),
  ).length;
  const eligible = source.filter(isPipelineEligibleNode);
  const eligibleIds = new Set(eligible.map((node) => node.id));
  const internalEdges = edges.filter(
    (edge) => eligibleIds.has(edge.source) && eligibleIds.has(edge.target),
  );

  const graph = serializePipelineGraph(
    eligible.map((node) => ({ ...node, selected: false })),
    internalEdges.map((edge) => ({ ...edge, selected: false })),
    { x: 0, y: 0, zoom: 1 },
  );
  graph.nodes = graph.nodes.map((node) => {
    const { runtime: _runtime, ...rest } = node as PipelineNodeRecord & {
      runtime?: unknown;
    };
    return rest;
  });

  return {
    graph,
    selectedCount: source.length,
    strippedLoaderCount,
    usedFullCanvas,
    boundary: derivePipelineBoundaryIO(graph.nodes, graph.edges),
  };
}

export function selectionHasBlockedBranch(
  nodes: Node<PipelineNodeData>[],
): boolean {
  return nodes.some(
    (node) =>
      BLOCKED_PIPELINE_MODELS.has(node.data.modelId) &&
      !FILE_LOADERS.has(node.data.modelId),
  );
}
