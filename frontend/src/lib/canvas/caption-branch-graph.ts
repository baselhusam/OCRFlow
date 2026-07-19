import type { Edge, Node } from "@xyflow/react";

import { PIPELINE_FLOW_EDGE_TYPE } from "@/lib/canvas/edge-styles";
import { buildPipelineNodeData } from "@/lib/canvas/model-utils";
import {
  createCompanionEdgeId,
  createNodeId,
  isCompanionEdge,
} from "@/lib/canvas/page-branch-graph";
import {
  CAPTION_BRANCH_MODEL_ID,
  CAPTION_BRANCH_SPAWN_OFFSET,
  getParentCaptionNodeId,
  isCaptionBranchNode,
  isFigureCaptionTextOutput,
  PARENT_CAPTION_NODE_PARAM,
} from "@/lib/canvas/caption-branch-meta";
import type { ModelCatalogEntry, PipelineNodeData } from "@/lib/canvas/types";
import { PIPELINE_NODE_TYPE } from "@/lib/canvas/types";

export { isCompanionEdge, createNodeId, createCompanionEdgeId, CAPTION_BRANCH_SPAWN_OFFSET };

export function buildCaptionBranchCompanionEdge(
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

export function buildCaptionBranchNode(
  anchorId: string,
  position: { x: number; y: number },
  entry: ModelCatalogEntry,
  categoryLabel: string,
): Node<PipelineNodeData> {
  const data = buildPipelineNodeData(entry, categoryLabel, {
    [PARENT_CAPTION_NODE_PARAM]: anchorId,
  });

  return {
    id: createNodeId(CAPTION_BRANCH_MODEL_ID),
    type: PIPELINE_NODE_TYPE,
    position,
    data,
  };
}

export function findCaptionBranchForAnchor(
  anchorId: string,
  nodes: Node<PipelineNodeData>[],
): Node<PipelineNodeData> | undefined {
  return nodes.find(
    (node) =>
      isCaptionBranchNode(node.data.modelId) &&
      getParentCaptionNodeId(node.data.params) === anchorId,
  );
}

export function collectCaptionBranchCascadeRemovalIds(
  removedIds: string[],
  nodes: Node<PipelineNodeData>[],
): string[] {
  const cascade = new Set<string>();
  const removedSet = new Set(removedIds);

  for (const id of removedIds) {
    const node = nodes.find((entry) => entry.id === id);
    if (!node) continue;

    if (isFigureCaptionTextOutput(node.data.modelId) && node.data.captionBranchNodeId) {
      const branchId = node.data.captionBranchNodeId;
      if (!removedSet.has(branchId)) cascade.add(branchId);
    }
  }

  return [...cascade];
}
