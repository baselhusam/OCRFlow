import type { Connection, Edge, Node } from "@xyflow/react";

import { areWireTypesCompatible } from "@/lib/canvas/category-meta";
import { getItemWireKindFromOutput } from "@/lib/canvas/artifact-adapters";
import { listOutputItems, parseSourceHandle } from "@/lib/canvas/output-slice";
import {
  getParentSelectPageId,
  isPageAtAnchor,
  isPageBranchNode,
} from "@/lib/canvas/page-branch-meta";
import {
  getParentLayoutNodeId,
  isLayoutAnchor,
  isRegionBranchNode,
} from "@/lib/canvas/region-branch-meta";
import {
  getParentCaptionNodeId,
  isCaptionBranchNode,
  isFigureCaptionTextOutput,
} from "@/lib/canvas/caption-branch-meta";
import {
  getParentDocumentNodeId,
  isDocumentBranchAnchor,
  isDocumentBranchNode,
} from "@/lib/canvas/document-branch-meta";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import { resolveNodeEffectiveOutput } from "@/lib/canvas/resolve-upstream";
import type { NodeCachedOutput, PipelineNodeData } from "@/lib/canvas/types";
import {
  areWireKindsCompatible,
  getNodeWireKinds,
} from "@/lib/canvas/wire-types";

export function normalizeSourceHandle(
  handle: string | null | undefined,
): string {
  return handle && handle.length > 0 ? handle : "output";
}

export function normalizeTargetHandle(
  handle: string | null | undefined,
): string {
  return handle && handle.length > 0 ? handle : "input";
}

export function isDuplicatePipelineConnection(
  connection: Connection | Edge,
  edges: Edge[],
): boolean {
  const sourceHandle = normalizeSourceHandle(connection.sourceHandle);
  const targetHandle = normalizeTargetHandle(connection.targetHandle);

  return edges.some((edge) => {
    if (edge.source !== connection.source || edge.target !== connection.target) {
      return false;
    }
    return (
      normalizeSourceHandle(edge.sourceHandle) === sourceHandle &&
      normalizeTargetHandle(edge.targetHandle) === targetHandle
    );
  });
}

export function isPipelineGraphConnectionAllowed(
  connection: Connection | Edge,
  edges: Edge[],
  nodes: Node<PipelineNodeData>[],
): boolean {
  if (connection.source === connection.target) return false;
  if (isDuplicatePipelineConnection(connection, edges)) return false;

  const source = nodes.find((node) => node.id === connection.source);
  const target = nodes.find((node) => node.id === connection.target);
  if (
    !evaluatePipelineConnection(
      source,
      target,
      connection.sourceHandle,
      nodes,
      edges,
    )
  ) {
    return false;
  }
  return true;
}

export function evaluatePipelineConnection(
  source: Node<PipelineNodeData> | undefined,
  target: Node<PipelineNodeData> | undefined,
  sourceHandle: string | null | undefined,
  nodes?: Node<PipelineNodeData>[],
  edges?: Edge[],
): boolean {
  if (!source || !target) return false;

  if (SOURCE_NODE_MODELS.has(target.data.modelId)) {
    return false;
  }

  if (isPageAtAnchor(source.data.modelId)) {
    const linkedBranchId = source.data.pageBranchNodeId;
    if (
      linkedBranchId &&
      isPageBranchNode(target.data.modelId) &&
      target.id !== linkedBranchId
    ) {
      return false;
    }
  }

  if (isLayoutAnchor(source.data.modelId, source.data.category)) {
    const linkedBranchId = source.data.regionBranchNodeId;
    if (
      linkedBranchId &&
      isRegionBranchNode(target.data.modelId) &&
      target.id !== linkedBranchId
    ) {
      return false;
    }
  }

  if (isFigureCaptionTextOutput(source.data.modelId)) {
    const linkedBranchId = source.data.captionBranchNodeId;
    if (
      linkedBranchId &&
      isCaptionBranchNode(target.data.modelId) &&
      target.id !== linkedBranchId
    ) {
      return false;
    }
  }

  if (isDocumentBranchAnchor(source.data.modelId)) {
    const linkedBranchId = source.data.documentBranchNodeId;
    if (
      linkedBranchId &&
      isDocumentBranchNode(target.data.modelId) &&
      target.id !== linkedBranchId
    ) {
      return false;
    }
  }

  if (isPageBranchNode(target.data.modelId)) {
    const parentId = getParentSelectPageId(target.data.params);
    if (parentId && source.id !== parentId) return false;
    if (!parentId && !isPageAtAnchor(source.data.modelId)) return false;
  }

  if (isRegionBranchNode(target.data.modelId)) {
    const parentId = getParentLayoutNodeId(target.data.params);
    if (parentId && source.id !== parentId) return false;
    if (!parentId && !isLayoutAnchor(source.data.modelId, source.data.category)) {
      return false;
    }
  }

  if (isCaptionBranchNode(target.data.modelId)) {
    const parentId = getParentCaptionNodeId(target.data.params);
    if (parentId && source.id !== parentId) return false;
    if (!parentId && !isFigureCaptionTextOutput(source.data.modelId)) return false;
  }

  if (isDocumentBranchNode(target.data.modelId)) {
    const parentId = getParentDocumentNodeId(target.data.params);
    if (parentId && source.id !== parentId) return false;
    if (!parentId && !isDocumentBranchAnchor(source.data.modelId)) return false;
  }

  const targetWire = getNodeWireKinds(target.data).input;

  const parsed = parseSourceHandle(sourceHandle);

  if (
    isPageBranchNode(source.data.modelId) &&
    parsed.scope === "all"
  ) {
    return false;
  }

  if (
    isRegionBranchNode(source.data.modelId) &&
    parsed.scope === "all"
  ) {
    return false;
  }

  if (
    isCaptionBranchNode(source.data.modelId) &&
    parsed.scope === "all"
  ) {
    return false;
  }

  if (
    isDocumentBranchNode(source.data.modelId) &&
    parsed.scope === "all"
  ) {
    return false;
  }

  const sourceOutput = nodes
    ? resolveNodeEffectiveOutput(source, nodes, edges ?? [], sourceHandle)
    : (source.data.cachedOutput ?? null);

  if (parsed.scope === "item") {
    if (
      parsed.itemKind === "page" &&
      (isPageBranchNode(source.data.modelId) || isPageAtAnchor(source.data.modelId))
    ) {
      return areWireKindsCompatible("page_artifact", targetWire);
    }

    if (sourceOutput) {
      const itemWireKind = getItemWireKindFromOutput(sourceOutput, sourceHandle);
      if (itemWireKind) {
        return areWireKindsCompatible(itemWireKind, targetWire);
      }
      return false;
    }

    if (
      parsed.itemKind === "region" &&
      (isRegionBranchNode(source.data.modelId) ||
        isLayoutAnchor(source.data.modelId, source.data.category))
    ) {
      return areWireKindsCompatible("page_artifact_regions", targetWire);
    }

    if (
      parsed.itemKind === "line" &&
      (isCaptionBranchNode(source.data.modelId) ||
        isFigureCaptionTextOutput(source.data.modelId))
    ) {
      return areWireKindsCompatible("text_line_array", targetWire);
    }

    return areWireTypesCompatible(
      source.data.outputType,
      target.data.inputType,
    );
  }

  const sourceWire = getNodeWireKinds(source.data).output;
  return areWireKindsCompatible(sourceWire, targetWire);
}

export function edgeLabelForHandle(
  sourceOutput: NodeCachedOutput | null,
  sourceHandle: string | null | undefined,
): string | undefined {
  const parsed = parseSourceHandle(sourceHandle);
  if (parsed.scope === "all") return undefined;

  if (parsed.scope === "item" && parsed.itemKind === "page") {
    const pageNum = Number(parsed.itemId);
    if (!Number.isNaN(pageNum)) {
      return `p.${pageNum + 1}`;
    }
  }

  if (!sourceOutput) {
    return parsed.scope === "item" ? parsed.itemId : undefined;
  }

  const items = listOutputItems(sourceOutput);
  const match = items.find((item) => item.handle === sourceHandle);
  if (match) {
    return `${match.id} · ${match.label}`;
  }
  return parsed.scope === "item" ? parsed.itemId : undefined;
}
