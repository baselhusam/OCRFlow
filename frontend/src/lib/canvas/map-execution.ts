import type { Edge, Node } from "@xyflow/react";

import { SOURCE_NODE_MODELS } from "@/lib/canvas/category-meta";
import {
  sliceOutputByHandle,
  buildItemHandle,
} from "@/lib/canvas/output-slice";
import {
  isPageBranchNode,
  isPageSelectorNode,
} from "@/lib/canvas/page-branch-meta";
import {
  buildPagesOutput,
  extractPageImage,
  extractPages,
  getUpstreamContext,
  type PageArtifactWire,
  type UpstreamContext,
} from "@/lib/canvas/resolve-upstream";
import type {
  MappedPageOutput,
  NodeCachedOutput,
  PipelineNodeData,
} from "@/lib/canvas/types";

/**
 * "Apply to all pages" — map execution.
 *
 * A page model normally runs on the one page it is looking at. Mapping runs
 * it once per page of the upstream document and stores every result under
 * `cachedOutput.mapped`, while `kind`/`raw` keep describing the current page.
 * Downstream nodes ask for a page with `mappedForPage`, and can themselves
 * be mapped, so a whole chain can be applied to a 100-page document.
 */

export function getMappedOutputs(
  output: NodeCachedOutput | null | undefined,
): MappedPageOutput[] {
  return output?.mapped ?? [];
}

export function isMappedOutput(
  output: NodeCachedOutput | null | undefined,
): boolean {
  return (output?.mapped?.length ?? 0) > 0;
}

/** Result for one page of a mapped output (null when that page failed / is absent). */
export function mappedForPage(
  output: NodeCachedOutput | null | undefined,
  pageIndex: number,
): NodeCachedOutput | null {
  const entry = output?.mapped?.find((item) => item.page_index === pageIndex);
  return entry?.output ?? null;
}

/** Pages a mapped output covers, in order. */
export function mappedPageIndexes(
  output: NodeCachedOutput | null | undefined,
): number[] {
  return getMappedOutputs(output).map((entry) => entry.page_index);
}

/**
 * Walk upstream to the document's pages. Returns every page of the loader
 * feeding this node — through Select Page / branches / mapped nodes — or an
 * empty list when there is no multi-page source (single image, LLM chains).
 */
export function collectMapPages(
  nodeId: string,
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
): PageArtifactWire[] {
  const visited = new Set<string>();
  let current: string | null = nodeId;
  while (current && !visited.has(current)) {
    visited.add(current);
    const incoming = edges.find((edge) => edge.target === current);
    if (!incoming) break;
    const source = nodes.find((node) => node.id === incoming.source);
    if (!source) break;
    const output = source.data.cachedOutput ?? null;
    if (output?.kind === "pages") return extractPages(output);
    if (SOURCE_NODE_MODELS.has(source.data.modelId) && output)
      return extractPages(output);
    current = source.id;
  }
  return [];
}

/**
 * True when the node consumes one page at a time and its document has more
 * than one page — i.e. "Apply to all pages" makes sense.
 */
export function canMapNode(
  node: Node<PipelineNodeData>,
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
): boolean {
  if (SOURCE_NODE_MODELS.has(node.data.modelId)) return false;
  if (node.data.modelId.startsWith("loader/")) return false;
  return collectMapPages(node.id, nodes, edges).length > 1;
}

/** The page index a node is currently looking at (its sample). */
export function currentPageIndex(
  node: Node<PipelineNodeData>,
  upstream: UpstreamContext,
): number {
  const own = node.data.params.page_index;
  if (own !== undefined && own !== "") return Number(own);
  const fromOutput = (
    node.data.cachedOutput?.raw as { page_index?: number } | null
  )?.page_index;
  if (fromOutput !== undefined) return fromOutput;
  const upstreamPage =
    extractPageImage(upstream.output ?? null)?.page_index ??
    (upstream.output?.raw as { page_index?: number } | null)?.page_index;
  return upstreamPage ?? 0;
}

/**
 * The upstream context as it would look if the node were sitting on
 * `pageIndex`: mapped upstreams contribute that page's result, page
 * collections are sliced, and the pixel page is attached for models that
 * need it.
 */
export function upstreamForPage(
  nodeId: string,
  pageIndex: number,
  page: PageArtifactWire | undefined,
  nodes: Node<PipelineNodeData>[],
  edges: Edge[],
  requiredInput?: Parameters<typeof getUpstreamContext>[3],
): UpstreamContext {
  const base = getUpstreamContext(nodeId, nodes, edges, requiredInput);
  const sourceNode = base.nodeId
    ? nodes.find((node) => node.id === base.nodeId)
    : null;
  const sourceOutput = sourceNode?.data.cachedOutput ?? null;

  let output: NodeCachedOutput | null = null;
  if (isMappedOutput(sourceOutput)) {
    output = mappedForPage(sourceOutput, pageIndex);
  } else if (
    base.rawOutput?.kind === "pages" ||
    base.output?.kind === "pages"
  ) {
    output = sliceOutputByHandle(
      base.rawOutput?.kind === "pages" ? base.rawOutput : base.output,
      buildItemHandle("page", String(pageIndex)),
    );
  } else if (SOURCE_NODE_MODELS.has(sourceNode?.data.modelId ?? "")) {
    output = sliceOutputByHandle(
      sourceOutput,
      buildItemHandle("page", String(pageIndex)),
    );
  } else if (
    page &&
    sourceNode &&
    (isPageSelectorNode(sourceNode.data.modelId) ||
      isPageBranchNode(sourceNode.data.modelId))
  ) {
    // Select Page / page branch pass one page through: use the requested one.
    output = sliceOutputByHandle(
      buildPagesOutput([page]),
      buildItemHandle("page", String(pageIndex)),
    );
  } else {
    // Single-page upstream: only meaningful for the page it was run on.
    const upstreamPage =
      (base.output?.raw as { page_index?: number } | null)?.page_index ??
      extractPageImage(base.output ?? null)?.page_index;
    output =
      upstreamPage === undefined || upstreamPage === pageIndex
        ? base.output
        : null;
  }

  // Make sure geometry outputs carry the pixel page for this index.
  if (output && page?.page && !extractPageImage(output)?.image_base64) {
    output = {
      ...output,
      preview: { ...(output.preview ?? {}), pageImage: page.page },
    };
  }

  return { ...base, output, rawOutput: output };
}

export type MapRunOptions = {
  pages: PageArtifactWire[];
  /** Run the node on one page; resolve with its output or throw. */
  runPage: (page: PageArtifactWire) => Promise<NodeCachedOutput>;
  onProgress?: (progress: {
    completed: number;
    total: number;
    failed: number;
  }) => void;
  /** Flip to true to stop after the in-flight page. */
  shouldCancel?: () => boolean;
  /** Reuse results for pages already mapped (re-run only the rest). */
  existing?: MappedPageOutput[];
  concurrency?: number;
};

/** Run a page model over every page, sequentially by default (GPU-bound). */
export async function runMapOverPages({
  pages,
  runPage,
  onProgress,
  shouldCancel,
  existing = [],
  concurrency = 1,
}: MapRunOptions): Promise<MappedPageOutput[]> {
  const results = new Map<number, MappedPageOutput>();
  for (const entry of existing) results.set(entry.page_index, entry);

  const queue = pages.filter(
    (page) =>
      !results.get(page.page_index)?.output ||
      results.get(page.page_index)?.error,
  );
  const total = pages.length;
  let completed = pages.length - queue.length;
  let failed = 0;
  onProgress?.({ completed, total, failed });

  const worker = async () => {
    while (queue.length) {
      if (shouldCancel?.()) return;
      const page = queue.shift()!;
      try {
        const output = await runPage(page);
        results.set(page.page_index, { page_index: page.page_index, output });
      } catch (error) {
        failed += 1;
        results.set(page.page_index, {
          page_index: page.page_index,
          output: { kind: "json", raw: null },
          error: error instanceof Error ? error.message : String(error),
        });
      }
      completed += 1;
      onProgress?.({ completed, total, failed });
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return [...results.values()].sort((a, b) => a.page_index - b.page_index);
}

/** Merge per-page results into a node output that still describes `currentPage`. */
export function buildMappedOutput(
  mapped: MappedPageOutput[],
  currentPage: number,
  fallback: NodeCachedOutput | null,
): NodeCachedOutput | null {
  const current =
    mapped.find((entry) => entry.page_index === currentPage && !entry.error)
      ?.output ??
    mapped.find((entry) => !entry.error)?.output ??
    fallback;
  if (!current) return null;
  return { ...current, mapped };
}
