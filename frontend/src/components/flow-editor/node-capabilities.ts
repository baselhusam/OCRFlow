import type { Edge, Node } from "@xyflow/react";

import type { PipelineGraphActions } from "@/components/canvas/pipeline-graph-context";
import {
  CAPTION_SPAWN_ONLY_MODELS,
  isFigureCaptionTextOutput,
} from "@/lib/canvas/caption-branch-meta";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { isDocumentBranchAnchor } from "@/lib/canvas/document-branch-meta";
import { isDocumentConverterNode } from "@/lib/canvas/document-converter-meta";
import { collectMapPages } from "@/lib/canvas/map-execution";
import { isPageAtAnchor, SPAWN_ONLY_MODELS } from "@/lib/canvas/page-branch-meta";
import { isLayoutAnchor, REGION_SPAWN_ONLY_MODELS } from "@/lib/canvas/region-branch-meta";
import type { PipelineNodeData } from "@/lib/canvas/types";

/**
 * Satellite nodes (Items, caption/region branches) are spawned from their
 * anchor's fan-out action; they never appear in add menus.
 */
export function isSpawnOnlyModel(modelId: string): boolean {
  return (
    SPAWN_ONLY_MODELS.has(modelId) ||
    REGION_SPAWN_ONLY_MODELS.has(modelId) ||
    CAPTION_SPAWN_ONLY_MODELS.has(modelId)
  );
}

/**
 * How many pages "Apply to all pages" would cover (0 = not applicable).
 * Loaders, Select Page and whole-document converters are not per-page.
 */
export function mapPageCount(
  nodeId: string,
  data: PipelineNodeData,
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
): number {
  if (SOURCE_NODE_MODELS.has(data.modelId)) return 0;
  if (data.modelId.startsWith("loader/")) return 0;
  if (isDocumentConverterNode(data.modelId)) return 0;
  return collectMapPages(nodeId, nodes, edges).length;
}

export type FanOut = {
  /** Existing Items node for this anchor, if already spawned. */
  existingId: string | null;
  label: string;
  expand: () => string | null;
};

/**
 * Nodes whose output is a collection worth fanning out (pages, regions,
 * caption lines, document parts) can spawn an Items node with one pin per item.
 */
export function getFanOut(
  nodeId: string,
  data: PipelineNodeData,
  actions: Pick<
    PipelineGraphActions,
    "expandPageBranch" | "expandRegionBranch" | "expandCaptionBranch" | "expandDocumentBranch"
  >,
): FanOut | null {
  if (!data.cachedOutput) return null;
  if (isPageAtAnchor(data.modelId)) {
    return {
      existingId: data.pageBranchNodeId ?? null,
      label: "Fan out pages",
      expand: () => actions.expandPageBranch(nodeId),
    };
  }
  if (isLayoutAnchor(data.modelId, data.category)) {
    return {
      existingId: data.regionBranchNodeId ?? null,
      label: "Fan out regions",
      expand: () => actions.expandRegionBranch(nodeId),
    };
  }
  if (isFigureCaptionTextOutput(data.modelId)) {
    return {
      existingId: data.captionBranchNodeId ?? null,
      label: "Fan out captions",
      expand: () => actions.expandCaptionBranch(nodeId),
    };
  }
  if (isDocumentBranchAnchor(data.modelId)) {
    return {
      existingId: data.documentBranchNodeId ?? null,
      label: "Fan out document parts",
      expand: () => actions.expandDocumentBranch(nodeId),
    };
  }
  return null;
}
