import type { Edge, Node } from "@xyflow/react";

import { PIPELINE_FLOW_EDGE_TYPE } from "@/lib/canvas/edge-styles";
import { buildPipelineNodeData } from "@/lib/canvas/model-utils";
import {
  createCompanionEdgeId,
  createNodeId,
  isCompanionEdge,
} from "@/lib/canvas/page-branch-graph";
import {
  getParentLayoutNodeId,
  isLayoutAnchor,
  isRegionBranchNode,
  PARENT_LAYOUT_NODE_PARAM,
  REGION_BRANCH_MODEL_ID,
  REGION_BRANCH_SPAWN_OFFSET,
} from "@/lib/canvas/region-branch-meta";
import type { ModelCatalogEntry, PipelineNodeData } from "@/lib/canvas/types";
import { PIPELINE_NODE_TYPE } from "@/lib/canvas/types";

export { isCompanionEdge, createNodeId, createCompanionEdgeId };

export function buildRegionBranchCompanionEdge(
  sourceId: string,
  targetId: string,
  valid = true,
): Edge {
  return {
    id: createCompanionEdgeId(sourceId, targetId),
    type: PIPELINE_FLOW_EDGE_TYPE,
    source: sourceId,
    target: targetId,
    sourceHandle: "output",
    targetHandle: "input",
    data: { valid, companion: true },
    className: valid ? "ocrflow-edge-valid" : "ocrflow-edge-invalid",
  };
}

export function buildRegionBranchNode(
  anchorId: string,
  position: { x: number; y: number },
  entry: ModelCatalogEntry,
  categoryLabel: string,
): Node<PipelineNodeData> {
  const data = buildPipelineNodeData(entry, categoryLabel, {
    [PARENT_LAYOUT_NODE_PARAM]: anchorId,
  });

  return {
    id: createNodeId(REGION_BRANCH_MODEL_ID),
    type: PIPELINE_NODE_TYPE,
    position,
    data,
  };
}

export function findRegionBranchForAnchor(
  anchorId: string,
  nodes: Node<PipelineNodeData>[],
): Node<PipelineNodeData> | undefined {
  return nodes.find(
    (node) =>
      isRegionBranchNode(node.data.modelId) &&
      getParentLayoutNodeId(node.data.params) === anchorId,
  );
}

export function collectRegionBranchCascadeRemovalIds(
  removedIds: string[],
  nodes: Node<PipelineNodeData>[],
): string[] {
  const cascade = new Set<string>();
  const removedSet = new Set(removedIds);

  for (const id of removedIds) {
    const node = nodes.find((entry) => entry.id === id);
    if (!node) continue;

    if (
      isLayoutAnchor(node.data.modelId, node.data.category) &&
      node.data.regionBranchNodeId
    ) {
      const branchId = node.data.regionBranchNodeId;
      if (!removedSet.has(branchId)) cascade.add(branchId);
    }
  }

  return [...cascade];
}
