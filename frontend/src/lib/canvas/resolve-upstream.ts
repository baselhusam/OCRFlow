import type { Node, Edge } from "@xyflow/react";

import {
  adaptOutputForInput,
  resolveUpstreamOutput,
} from "@/lib/canvas/artifact-adapters";
import {
  buildItemHandle,
  parseSourceHandle,
  sliceOutputByHandle,
} from "@/lib/canvas/output-slice";
import type { NodeCachedOutput, PipelineNodeData } from "@/lib/canvas/types";
import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import type { WireKind } from "@/lib/canvas/wire-types";
import { getModelWireKinds } from "@/lib/canvas/wire-types";

import {
  getParentSelectPageId,
  isPageAtAnchor,
  isPageBranchNode,
  PAGE_AT_MODEL_ID,
  PAGE_BRANCH_MODEL_ID,
} from "@/lib/canvas/page-branch-meta";
import {
  getParentLayoutNodeId,
  isLayoutAnchor,
  isRegionBranchNode,
  REGION_BRANCH_MODEL_ID,
} from "@/lib/canvas/region-branch-meta";
import {
  CAPTION_BRANCH_MODEL_ID,
  getParentCaptionNodeId,
  isCaptionBranchNode,
  isFigureCaptionTextOutput,
} from "@/lib/canvas/caption-branch-meta";
import {
  DOCUMENT_BRANCH_MODEL_ID,
  getParentDocumentNodeId,
} from "@/lib/canvas/document-branch-meta";

export {
  adaptOutputForInput,
  getItemWireKindFromOutput,
  resolveUpstreamOutput,
} from "@/lib/canvas/artifact-adapters";
export {
  buildItemHandle,
  listOutputItems,
  parseSourceHandle,
  sliceOutputByHandle,
} from "@/lib/canvas/output-slice";

export type UpstreamContext = {
  nodeId: string | null;
  output: NodeCachedOutput | null;
  rawOutput: NodeCachedOutput | null;
  modelId: string | null;
  sourceHandle: string | null;
  edgeId: string | null;
  /** Asset id when upstream is a source file loader (loader/pdf, loader/image). */
  assetId: string | null;
};

/** All upstream node ids for `nodeId`, in run order (sources first). */
export function collectUpstreamChain(
  nodeId: string,
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
): string[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const visited = new Set<string>();
  const chain: string[] = [];

  function walk(currentId: string) {
    for (const edge of edges) {
      if (edge.target !== currentId || !nodeIds.has(edge.source)) continue;
      if (visited.has(edge.source)) continue;
      visited.add(edge.source);
      walk(edge.source);
      chain.push(edge.source);
    }
  }

  walk(nodeId);
  return chain;
}

export function getIncomingEdge(
  nodeId: string,
  edges: Edge[],
): Edge | undefined {
  return edges.find((e) => e.target === nodeId);
}

function upstreamAssetIdFromNode(
  data: PipelineNodeData | undefined,
): string | null {
  if (!data || !SOURCE_NODE_MODELS.has(data.modelId)) return null;
  const assetId = data.params.assetId;
  return typeof assetId === "string" && assetId.length > 0 ? assetId : null;
}

function fileLoaderPagesOutput(
  output: NodeCachedOutput | null,
): NodeCachedOutput | null {
  if (!output) return null;
  if (output.kind === "pages") return output;
  return null;
}

function buildPagesOutput(pages: PageArtifactWire[]): NodeCachedOutput {
  const first = pages[0]?.page;
  return {
    kind: "pages",
    raw: { pages },
    preview: {
      pageCount: pages.length,
      pageImage: first,
      thumbnailBase64: first?.image_base64,
    },
  };
}

/** Resolves what a node actually emits for a given source handle (virtual slices + pass-through). */
export function resolveNodeEffectiveOutput(
  node: Node<PipelineNodeData>,
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
  sourceHandle?: string | null,
): NodeCachedOutput | null {
  const { modelId, cachedOutput, params } = node.data;
  const handle = sourceHandle ?? "output";

  if (modelId === PAGE_AT_MODEL_ID || modelId === PAGE_BRANCH_MODEL_ID) {
    const upstreamCtx = getUpstreamContext(node.id, nodes, edges);
    const pages = extractPages(upstreamCtx.output);
    if (pages.length === 0) return cachedOutput ?? null;

    const pagesOutput = buildPagesOutput(pages);
    const parsed = parseSourceHandle(handle);

    if (parsed.scope === "all") {
      const pageIndex = Number(params.page_index ?? 0);
      return sliceOutputByHandle(
        pagesOutput,
        buildItemHandle("page", String(pageIndex)),
      );
    }

    return sliceOutputByHandle(pagesOutput, handle);
  }

  if (modelId === REGION_BRANCH_MODEL_ID) {
    const parentId = getParentLayoutNodeId(params);
    const parent = parentId ? nodes.find((entry) => entry.id === parentId) : undefined;
    const parentOutput = parent?.data.cachedOutput ?? null;
    if (!parentOutput) return cachedOutput ?? null;
    return sliceOutputByHandle(parentOutput, handle);
  }

  if (modelId === CAPTION_BRANCH_MODEL_ID) {
    const parentId = getParentCaptionNodeId(params);
    const parent = parentId ? nodes.find((entry) => entry.id === parentId) : undefined;
    const parentOutput = parent?.data.cachedOutput ?? null;
    if (!parentOutput) return cachedOutput ?? null;
    return sliceOutputByHandle(parentOutput, handle);
  }

  if (modelId === DOCUMENT_BRANCH_MODEL_ID) {
    const parentId = getParentDocumentNodeId(params);
    const parent = parentId ? nodes.find((entry) => entry.id === parentId) : undefined;
    const parentOutput = parent?.data.cachedOutput ?? null;
    if (!parentOutput) return cachedOutput ?? null;
    return sliceOutputByHandle(parentOutput, handle);
  }

  return cachedOutput ?? null;
}

export function getUpstreamContext(
  nodeId: string,
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
  requiredInput?: WireKind,
): UpstreamContext {
  const incoming = getIncomingEdge(nodeId, edges);
  if (!incoming) {
    return {
      nodeId: null,
      output: null,
      rawOutput: null,
      modelId: null,
      sourceHandle: null,
      edgeId: null,
      assetId: null,
    };
  }
  const source = nodes.find((n) => n.id === incoming.source);
  const target = nodes.find((n) => n.id === nodeId);
  if (!source) {
    return {
      nodeId: null,
      output: null,
      rawOutput: null,
      modelId: null,
      sourceHandle: incoming.sourceHandle ?? "output",
      edgeId: incoming.id,
      assetId: null,
    };
  }
  const sourceHandle = incoming.sourceHandle ?? "output";
  const sourceAssetId = upstreamAssetIdFromNode(source.data);

  if (
    target &&
    isPageBranchNode(target.data.modelId) &&
    isPageAtAnchor(source.data.modelId)
  ) {
    const anchorUpstream = getUpstreamContext(
      source.id,
      nodes,
      edges,
      "page_artifact_array",
    );
    const pages = extractPages(anchorUpstream.output);
    const pagesOutput = pages.length > 0 ? buildPagesOutput(pages) : null;
    return {
      nodeId: source.id,
      output: pagesOutput,
      rawOutput: pagesOutput,
      modelId: source.data.modelId,
      sourceHandle,
      edgeId: incoming.id,
      assetId: anchorUpstream.assetId ?? sourceAssetId,
    };
  }

  if (
    target &&
    isRegionBranchNode(target.data.modelId) &&
    isLayoutAnchor(source.data.modelId, source.data.category)
  ) {
    const regionsOutput = source.data.cachedOutput ?? null;
    return {
      nodeId: source.id,
      output: regionsOutput,
      rawOutput: regionsOutput,
      modelId: source.data.modelId,
      sourceHandle,
      edgeId: incoming.id,
      assetId: sourceAssetId,
    };
  }

  if (
    target &&
    isCaptionBranchNode(target.data.modelId) &&
    isFigureCaptionTextOutput(source.data.modelId)
  ) {
    const linesOutput = source.data.cachedOutput ?? null;
    return {
      nodeId: source.id,
      output: linesOutput,
      rawOutput: linesOutput,
      modelId: source.data.modelId,
      sourceHandle,
      edgeId: incoming.id,
      assetId: sourceAssetId,
    };
  }

  let rawOutput = resolveNodeEffectiveOutput(
    source,
    nodes,
    edges,
    sourceHandle,
  );

  if (
    SOURCE_NODE_MODELS.has(source.data.modelId) &&
    (requiredInput === "page_artifact_array" || requiredInput === "page_artifact")
  ) {
    const pagesOutput = fileLoaderPagesOutput(source.data.cachedOutput ?? null);
    if (pagesOutput) {
      rawOutput = pagesOutput;
    }
  }

  const output = requiredInput
    ? resolveUpstreamOutput(rawOutput, sourceHandle, requiredInput)
    : resolveUpstreamOutput(rawOutput, sourceHandle);

  return {
    nodeId: source.id,
    output,
    rawOutput,
    modelId: source.data.modelId,
    sourceHandle,
    edgeId: incoming.id,
    assetId: sourceAssetId,
  };
}

export type PageArtifactWire = {
  page_index: number;
  page?: {
    page_index: number;
    width: number;
    height: number;
    image_base64?: string;
    image_url?: string;
  };
  regions?: unknown[];
  lines?: unknown[];
  tables?: unknown[];
  formulas?: unknown[];
  figures?: unknown[];
};

export function extractPageImage(
  output: NodeCachedOutput | null,
): PageArtifactWire["page"] | null {
  if (!output) return null;

  if (output.kind === "page") {
    const page = output.raw as { page?: PageArtifactWire };
    return page.page?.page ?? (page as PageArtifactWire).page ?? null;
  }

  if (output.kind === "pages") {
    const pages = (output.raw as { pages?: PageArtifactWire[] }).pages;
    return pages?.[0]?.page ?? null;
  }

  if (output.kind === "regions" || output.kind === "lines") {
    const raw = output.raw as { page_index?: number };
    const preview = output.preview;
    if (preview?.pageImage) return preview.pageImage;
    if (raw && "page" in (output.raw as object)) {
      return (output.raw as { page?: PageArtifactWire["page"] }).page ?? null;
    }
  }

  return output.preview?.pageImage ?? null;
}

/** Walk upstream nodes until a page image with pixel data is found. */
export function findUpstreamPageImage(
  nodeId: string,
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
  visited: Set<string> = new Set(),
): PageArtifactWire["page"] | null {
  if (visited.has(nodeId)) return null;
  visited.add(nodeId);

  const incoming = edges.filter((edge) => edge.target === nodeId);
  for (const edge of incoming) {
    const source = nodes.find((node) => node.id === edge.source);
    if (!source) continue;

    const output = source.data.cachedOutput ?? null;
    const page = extractPageImage(output);
    if (page?.image_base64 || page?.image_url) {
      return page;
    }

    const fromChain = findUpstreamPageImage(source.id, nodes, edges, visited);
    if (fromChain) return fromChain;
  }

  return null;
}

export function extractPages(
  output: NodeCachedOutput | null,
): PageArtifactWire[] {
  if (!output) return [];
  if (output.kind === "pages") {
    return (output.raw as { pages?: PageArtifactWire[] }).pages ?? [];
  }
  if (output.kind === "page") {
    const page = (output.raw as { page?: PageArtifactWire }).page;
    if (page) return [page];
  }
  return [];
}

export function extractRegions(output: NodeCachedOutput | null): unknown[] {
  if (!output) return [];
  if (output.kind === "regions") {
    return (output.raw as { regions?: unknown[] }).regions ?? [];
  }
  if (output.kind === "page") {
    return (output.raw as PageArtifactWire).regions ?? [];
  }
  return [];
}

export function extractLines(output: NodeCachedOutput | null): unknown[] {
  if (!output) return [];
  if (output.kind === "lines") {
    return (output.raw as { lines?: unknown[] }).lines ?? [];
  }
  return [];
}

export function upstreamSatisfiesInput(
  requiredInput: WireKind,
  upstream: NodeCachedOutput | null,
  rawUpstream?: NodeCachedOutput | null,
): boolean {
  if (requiredInput === "file" || requiredInput === "document_input") {
    return false;
  }
  if (!upstream) {
    if (rawUpstream && requiredInput) {
      const adapted = adaptOutputForInput(rawUpstream, requiredInput);
      return adapted !== null;
    }
    return false;
  }

  switch (requiredInput) {
    case "page_artifact_array":
      return upstream.kind === "pages";
    case "page_artifact":
      return upstream.kind === "page" || upstream.kind === "pages";
    case "page_artifact_regions":
      return (
        upstream.kind === "regions" ||
        upstream.kind === "page" ||
        upstream.kind === "pages"
      );
    case "text_line_array":
      return upstream.kind === "lines";
    case "formula_array":
      return upstream.kind === "formulas";
    case "figure_array":
      return upstream.kind === "figures";
    case "table_structure_array":
      return upstream.kind === "tables";
    default:
      return true;
  }
}

export function getRequiredInputKind(
  modelId: string,
  inputType: string,
): WireKind {
  return getModelWireKinds(modelId, inputType, "").input;
}

export type DownstreamConnection = {
  edgeId: string;
  nodeId: string;
  label: string;
  modelId: string;
  category: string;
  sourceHandle: string;
};

export function getDownstreamConnections(
  nodeId: string,
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
): DownstreamConnection[] {
  const connections: DownstreamConnection[] = [];

  for (const edge of edges) {
    if (edge.source !== nodeId) continue;

    const target = nodes.find((n) => n.id === edge.target);
    if (!target) continue;

    connections.push({
      edgeId: edge.id,
      nodeId: target.id,
      label: target.data.label,
      modelId: target.data.modelId,
      category: target.data.category,
      sourceHandle: edge.sourceHandle ?? "output",
    });
  }

  return connections;
}

export function getOutgoingEdgeCount(nodeId: string, edges: Edge[]): number {
  return edges.filter((edge) => edge.source === nodeId).length;
}
