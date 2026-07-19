import type { Edge, Node } from "@xyflow/react";

import { getInlineParamSchema } from "@/lib/canvas/node-param-schema";
import {
  getParentSelectPageId,
  isPageAtAnchor,
  isPageBranchNode,
  PAGE_BRANCH_PANEL_DEFAULT,
} from "@/lib/canvas/page-branch-meta";
import {
  getParentLayoutNodeId,
  isLayoutAnchor,
  isRegionBranchNode,
  REGION_BRANCH_PANEL_DEFAULT,
} from "@/lib/canvas/region-branch-meta";
import {
  CAPTION_BRANCH_PANEL_DEFAULT,
  getParentCaptionNodeId,
  isCaptionBranchNode,
  isFigureCaptionTextOutput,
} from "@/lib/canvas/caption-branch-meta";
import {
  DOCUMENT_BRANCH_PANEL_DEFAULT,
  getParentDocumentNodeId,
  isDocumentBranchNode,
} from "@/lib/canvas/document-branch-meta";
import { isDocumentConverterNode } from "@/lib/canvas/document-converter-meta";
import { topologicalSort } from "@/lib/canvas/pipeline-execution";
import type { PipelineNodeData } from "@/lib/canvas/types";

export type NodeBounds = {
  width: number;
  height: number;
};

const MAIN_WIDTH = 260;

const OUTPUT_PANEL_GAP = 16;
const OUTPUT_PANEL_WIDTH = 148;
const OUTPUT_PANEL_WIDTH_REGIONS = 192;
const OUTPUT_PANEL_WIDTH_LAYOUT = 224;
const OUTPUT_PANEL_WIDTH_DOCUMENT = 280;
const OUTPUT_PANEL_MAX_HEIGHT = 360;

const H_GAP = 64;
const V_GAP = 56;
const ORIGIN_X = 80;
const ORIGIN_Y = 80;
const LAYOUT_REFINEMENT_PASSES = 3;

const COLLAPSED_BASE_HEIGHT = 156;

export function isOutputPanelVisible(data: PipelineNodeData): boolean {
  if (data.outputPanelOpen !== true) return false;
  if (isPageAtAnchor(data.modelId) && data.pageBranchNodeId) return false;
  if (isLayoutAnchor(data.modelId, data.category) && data.regionBranchNodeId) {
    return false;
  }
  if (isFigureCaptionTextOutput(data.modelId) && data.captionBranchNodeId) {
    return false;
  }
  if (isDocumentConverterNode(data.modelId) && data.documentBranchNodeId) {
    return false;
  }
  return Boolean(data.cachedOutput) || Boolean(data.runResult?.previewBase64);
}

export function estimateOutputPanelWidth(data: PipelineNodeData): number {
  const output = data.cachedOutput;
  if (!output) return OUTPUT_PANEL_WIDTH;

  const regions =
    output.kind === "regions"
      ? ((output.raw as { regions?: unknown[] } | undefined)?.regions ?? [])
      : [];
  const isLayoutDetection =
    data.category === "layout_detection" &&
    output.kind === "regions" &&
    regions.length > 0;

  if (isLayoutDetection) return OUTPUT_PANEL_WIDTH_LAYOUT;
  if (isDocumentConverterNode(data.modelId) && output.kind === "document") {
    return OUTPUT_PANEL_WIDTH_DOCUMENT;
  }
  if (output.kind === "regions" && regions.length > 0) {
    return OUTPUT_PANEL_WIDTH_REGIONS;
  }
  return OUTPUT_PANEL_WIDTH;
}

function estimateMainWidth(data: PipelineNodeData): number {
  if (isPageBranchNode(data.modelId)) {
    return data.branchPanelWidth ?? PAGE_BRANCH_PANEL_DEFAULT.width;
  }
  if (isRegionBranchNode(data.modelId)) {
    return data.branchPanelWidth ?? REGION_BRANCH_PANEL_DEFAULT.width;
  }
  if (isCaptionBranchNode(data.modelId)) {
    return data.branchPanelWidth ?? CAPTION_BRANCH_PANEL_DEFAULT.width;
  }
  if (isDocumentBranchNode(data.modelId)) {
    return data.branchPanelWidth ?? DOCUMENT_BRANCH_PANEL_DEFAULT.width;
  }
  return MAIN_WIDTH;
}

function estimateMainHeight(data: PipelineNodeData): number {
  if (isPageBranchNode(data.modelId)) {
    return data.branchPanelHeight ?? PAGE_BRANCH_PANEL_DEFAULT.height;
  }
  if (isRegionBranchNode(data.modelId)) {
    return data.branchPanelHeight ?? REGION_BRANCH_PANEL_DEFAULT.height;
  }
  if (isCaptionBranchNode(data.modelId)) {
    return data.branchPanelHeight ?? CAPTION_BRANCH_PANEL_DEFAULT.height;
  }
  if (isDocumentBranchNode(data.modelId)) {
    return data.branchPanelHeight ?? DOCUMENT_BRANCH_PANEL_DEFAULT.height;
  }
  if (data.category === "page_loader") {
    const isSource = data.modelId === "loader/pdf" || data.modelId === "loader/image";
    return isSource ? 228 : 188;
  }

  const editable = getInlineParamSchema(data.modelId, data.category);
  const paramRows = Math.max(editable.length, 1);
  return 108 + paramRows * 44 + 40;
}

export function estimateMainBounds(node: Node<PipelineNodeData>): NodeBounds {
  return { width: estimateMainWidth(node.data), height: estimateMainHeight(node.data) };
}

/** @deprecated Use estimateMainBounds — kept for existing tests/callers. */
export function estimateNodeBounds(node: Node<PipelineNodeData>): NodeBounds {
  return estimateMainBounds(node);
}

export function resolveMainBounds(
  node: Node<PipelineNodeData>,
  measuredHeight?: number,
): NodeBounds {
  const estimated = estimateMainBounds(node);

  if (measuredHeight && measuredHeight > 0) {
    return {
      width: estimateMainWidth(node.data),
      height: Math.max(measuredHeight, estimated.height),
    };
  }

  return estimated;
}

export function resolveFootprintBounds(
  node: Node<PipelineNodeData>,
  mainBounds: NodeBounds,
): NodeBounds {
  if (isPageBranchNode(node.data.modelId)) {
    return mainBounds;
  }
  if (isRegionBranchNode(node.data.modelId)) {
    return mainBounds;
  }
  if (isCaptionBranchNode(node.data.modelId)) {
    return mainBounds;
  }

  if (!isOutputPanelVisible(node.data)) {
    return mainBounds;
  }

  const panelWidth = estimateOutputPanelWidth(node.data);
  return {
    width: mainBounds.width + OUTPUT_PANEL_GAP + panelWidth,
    height: Math.max(mainBounds.height, OUTPUT_PANEL_MAX_HEIGHT),
  };
}

function computeDepth(
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
): Map<string, number> {
  const order = topologicalSort(nodes, edges);
  const depth = new Map<string, number>();

  for (const nodeId of order) {
    const incoming = edges.filter((edge) => edge.target === nodeId);
    if (incoming.length === 0) {
      depth.set(nodeId, 0);
      continue;
    }
    const maxParent = Math.max(
      ...incoming.map((edge) => depth.get(edge.source) ?? 0),
    );
    depth.set(nodeId, maxParent + 1);
  }

  for (const node of nodes) {
    if (!depth.has(node.id)) depth.set(node.id, 0);
  }

  return depth;
}

function groupByDepth(
  nodes: Node<PipelineNodeData>[],
  depth: Map<string, number>,
  orderIndex: Map<string, number>,
): Map<number, string[]> {
  const layers = new Map<number, string[]>();

  for (const node of nodes) {
    const layer = depth.get(node.id) ?? 0;
    const ids = layers.get(layer) ?? [];
    ids.push(node.id);
    layers.set(layer, ids);
  }

  for (const [layer, ids] of layers) {
    ids.sort(
      (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0),
    );
    layers.set(layer, ids);
  }

  return layers;
}

function isSatelliteBranchNode(modelId: string): boolean {
  return (
    isPageBranchNode(modelId) ||
    isRegionBranchNode(modelId) ||
    isCaptionBranchNode(modelId) ||
    isDocumentBranchNode(modelId)
  );
}

function getSatelliteAnchorId(data: PipelineNodeData): string | undefined {
  if (isPageBranchNode(data.modelId)) {
    return getParentSelectPageId(data.params);
  }
  if (isRegionBranchNode(data.modelId)) {
    return getParentLayoutNodeId(data.params);
  }
  if (isCaptionBranchNode(data.modelId)) {
    return getParentCaptionNodeId(data.params);
  }
  if (isDocumentBranchNode(data.modelId)) {
    return getParentDocumentNodeId(data.params);
  }
  return undefined;
}

function packLayerNodes(
  ids: string[],
  x: number,
  positions: Map<string, { x: number; y: number }>,
  bounds: Map<string, NodeBounds>,
  preferredY: Map<string, number>,
): void {
  const sorted = [...ids].sort(
    (a, b) =>
      (preferredY.get(a) ?? positions.get(a)?.y ?? 0) -
      (preferredY.get(b) ?? positions.get(b)?.y ?? 0),
  );

  let cursorY = ORIGIN_Y;
  for (const id of sorted) {
    const height = bounds.get(id)?.height ?? COLLAPSED_BASE_HEIGHT;
    const y = Math.max(cursorY, preferredY.get(id) ?? ORIGIN_Y);
    positions.set(id, { x, y });
    cursorY = y + height + V_GAP;
  }
}

function applyParentBarycenters(
  order: string[],
  children: Map<string, string[]>,
  positions: Map<string, { x: number; y: number }>,
  footprintBounds: Map<string, NodeBounds>,
  preferredY: Map<string, number>,
): void {
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const kids = children.get(id) ?? [];
    if (kids.length === 0) continue;

    const childCenters = kids
      .map((childId) => {
        const pos = positions.get(childId);
        const childBounds = footprintBounds.get(childId);
        if (!pos || !childBounds) return null;
        return pos.y + childBounds.height / 2;
      })
      .filter((value): value is number => value !== null);

    if (childCenters.length === 0) continue;

    const centerY =
      childCenters.reduce((sum, value) => sum + value, 0) / childCenters.length;
    const nodeBounds = footprintBounds.get(id);
    if (!nodeBounds) continue;

    preferredY.set(id, centerY - nodeBounds.height / 2);
  }
}

function positionSatelliteBranches(
  nodes: Node<PipelineNodeData>[],
  positions: Map<string, { x: number; y: number }>,
  footprintBounds: Map<string, NodeBounds>,
): void {
  for (const node of nodes) {
    const anchorId = getSatelliteAnchorId(node.data);
    if (!anchorId) continue;

    const anchorPos = positions.get(anchorId);
    const anchorBounds = footprintBounds.get(anchorId);
    const branchBounds = footprintBounds.get(node.id);
    if (!anchorPos || !anchorBounds || !branchBounds) continue;

    positions.set(node.id, {
      x: anchorPos.x + anchorBounds.width + OUTPUT_PANEL_GAP,
      y: anchorPos.y + anchorBounds.height / 2 - branchBounds.height / 2,
    });
  }
}

function resolveLayerColumnWidth(
  ids: string[],
  nodesById: Map<string, Node<PipelineNodeData>>,
  footprintBounds: Map<string, NodeBounds>,
): number {
  let maxWidth = MAIN_WIDTH;

  for (const id of ids) {
    const nodeWidth = footprintBounds.get(id)?.width ?? MAIN_WIDTH;
    maxWidth = Math.max(maxWidth, nodeWidth);

    const anchorNode = nodesById.get(id);
    if (!anchorNode) continue;

    for (const node of nodesById.values()) {
      if (getSatelliteAnchorId(node.data) !== id) continue;
      const branchWidth = footprintBounds.get(node.id)?.width ?? MAIN_WIDTH;
      maxWidth = Math.max(
        maxWidth,
        nodeWidth + OUTPUT_PANEL_GAP + branchWidth,
      );
    }
  }

  return maxWidth;
}

export function autoLayoutNodes(
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
  measuredMainHeights?: Map<string, number>,
): Node<PipelineNodeData>[] {
  if (nodes.length === 0) return nodes;

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const order = topologicalSort(nodes, edges);
  const orderIndex = new Map(order.map((id, index) => [id, index]));
  const depth = computeDepth(nodes, edges);
  const layers = groupByDepth(nodes, depth, orderIndex);

  const mainBounds = new Map(
    nodes.map((node) => [
      node.id,
      resolveMainBounds(node, measuredMainHeights?.get(node.id)),
    ]),
  );
  const footprintBounds = new Map(
    nodes.map((node) => [
      node.id,
      resolveFootprintBounds(node, mainBounds.get(node.id)!),
    ]),
  );

  const children = new Map<string, string[]>();
  const nodeIds = new Set(nodes.map((node) => node.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const list = children.get(edge.source) ?? [];
    list.push(edge.target);
    children.set(edge.source, list);
  }
  for (const [id, list] of children) {
    list.sort(
      (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0),
    );
    children.set(id, list);
  }

  const maxDepth = Math.max(...depth.values(), 0);
  const columnWidth = new Map<number, number>();
  for (let layer = 0; layer <= maxDepth; layer++) {
    const ids = layers.get(layer) ?? [];
    columnWidth.set(
      layer,
      ids.length > 0
        ? resolveLayerColumnWidth(ids, nodesById, footprintBounds)
        : MAIN_WIDTH,
    );
  }

  const columnX = new Map<number, number>();
  let x = ORIGIN_X;
  for (let layer = 0; layer <= maxDepth; layer++) {
    columnX.set(layer, x);
    x += (columnWidth.get(layer) ?? MAIN_WIDTH) + H_GAP;
  }

  const positions = new Map<string, { x: number; y: number }>();
  const preferredY = new Map<string, number>();

  for (let layer = 0; layer <= maxDepth; layer++) {
    const ids = (layers.get(layer) ?? []).filter(
      (id) => !isSatelliteBranchNode(nodesById.get(id)?.data.modelId ?? ""),
    );
    let y = ORIGIN_Y;
    for (const id of ids) {
      preferredY.set(id, y);
      y +=
        (footprintBounds.get(id)?.height ?? COLLAPSED_BASE_HEIGHT) + V_GAP;
    }
  }

  for (let pass = 0; pass < LAYOUT_REFINEMENT_PASSES; pass++) {
    applyParentBarycenters(
      order,
      children,
      positions,
      footprintBounds,
      preferredY,
    );

    for (let layer = 0; layer <= maxDepth; layer++) {
      const ids = (layers.get(layer) ?? []).filter(
        (id) => !isSatelliteBranchNode(nodesById.get(id)?.data.modelId ?? ""),
      );
      if (ids.length === 0) continue;
      packLayerNodes(
        ids,
        columnX.get(layer) ?? ORIGIN_X,
        positions,
        footprintBounds,
        preferredY,
      );
    }
  }

  positionSatelliteBranches(nodes, positions, footprintBounds);

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }));
}
