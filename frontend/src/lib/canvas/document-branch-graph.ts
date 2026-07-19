import type { Edge, Node } from "@xyflow/react";

import {
  DOCUMENT_BRANCH_MODEL_ID,
  DOCUMENT_BRANCH_SPAWN_OFFSET,
  getParentDocumentNodeId,
  isDocumentBranchAnchor,
  isDocumentBranchNode,
  PARENT_DOCUMENT_NODE_PARAM,
} from "@/lib/canvas/document-branch-meta";
import { PIPELINE_FLOW_EDGE_TYPE } from "@/lib/canvas/edge-styles";
import { buildPipelineNodeData } from "@/lib/canvas/model-utils";
import {
  createCompanionEdgeId,
  createNodeId,
  isCompanionEdge,
} from "@/lib/canvas/page-branch-graph";
import type { ModelCatalogEntry, PipelineNodeData } from "@/lib/canvas/types";
import { PIPELINE_NODE_TYPE } from "@/lib/canvas/types";

export { isCompanionEdge, createNodeId, createCompanionEdgeId, DOCUMENT_BRANCH_SPAWN_OFFSET };

export function buildDocumentBranchCompanionEdge(
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

export function buildDocumentBranchNode(
  anchorId: string,
  position: { x: number; y: number },
  entry: ModelCatalogEntry,
  categoryLabel: string,
): Node<PipelineNodeData> {
  const data = buildPipelineNodeData(entry, categoryLabel, {
    [PARENT_DOCUMENT_NODE_PARAM]: anchorId,
  });

  return {
    id: createNodeId(DOCUMENT_BRANCH_MODEL_ID),
    type: PIPELINE_NODE_TYPE,
    position,
    data,
  };
}

export function findDocumentBranchForAnchor(
  anchorId: string,
  nodes: Node<PipelineNodeData>[],
): Node<PipelineNodeData> | undefined {
  return nodes.find(
    (node) =>
      isDocumentBranchNode(node.data.modelId) &&
      getParentDocumentNodeId(node.data.params) === anchorId,
  );
}

export function collectDocumentBranchCascadeRemovalIds(
  removedIds: string[],
  nodes: Node<PipelineNodeData>[],
): string[] {
  const cascade = new Set<string>();
  const removedSet = new Set(removedIds);

  for (const id of removedIds) {
    const node = nodes.find((entry) => entry.id === id);
    if (!node) continue;

    if (isDocumentBranchAnchor(node.data.modelId) && node.data.documentBranchNodeId) {
      const branchId = node.data.documentBranchNodeId;
      if (!removedSet.has(branchId)) cascade.add(branchId);
    }
  }

  return [...cascade];
}
