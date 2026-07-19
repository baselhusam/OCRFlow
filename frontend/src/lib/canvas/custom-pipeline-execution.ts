import type { Edge, Node } from "@xyflow/react";

import {
  buildInferencePayload,
  extractInferenceOutput,
} from "@/lib/canvas/node-inference-registry";
import { derivePipelineBoundaryIO } from "@/lib/canvas/pipeline-boundary";
import { topologicalSortFromRecords } from "@/lib/canvas/pipeline-boundary-sort";
import { parsePipelineGraph } from "@/lib/canvas/graph-utils";
import {
  extractPageImage,
  extractPages,
  getUpstreamContext,
} from "@/lib/canvas/resolve-upstream";
import type {
  NodeCachedOutput,
  PipelineGraph,
  PipelineNodeData,
  ModelCatalogEntry,
  CategoryMeta,
} from "@/lib/canvas/types";
import { PIPELINE_NODE_TYPE } from "@/lib/canvas/types";
import { buildPipelineNodeData } from "@/lib/canvas/model-utils";
import { runModelInference } from "@/lib/api/inference";

export type CustomPipelineRunContext = {
  projectId: string;
  nodeId: string;
  pipelineGraph: PipelineGraph;
  upstreamOutput: NodeCachedOutput | null;
  models: ModelCatalogEntry[];
  categories: CategoryMeta[];
  onProgress?: (completed: number, total: number) => void;
};

function buildInternalFlowNodes(
  graph: PipelineGraph,
  modelMap: Map<string, ModelCatalogEntry>,
  categoryLabels: Map<string, string>,
): Node<PipelineNodeData>[] {
  return graph.nodes.flatMap((record) => {
    const entry = modelMap.get(record.modelId);
    if (!entry) return [];
    const data = buildPipelineNodeData(
      entry,
      categoryLabels.get(entry.category) ?? entry.category,
      record.config,
    );
    return [
      {
        id: record.id,
        type: PIPELINE_NODE_TYPE,
        position: record.position,
        data: {
          ...data,
          params: record.config ?? data.params,
          cachedOutput: record.runtime?.cachedOutput ?? null,
        },
      },
    ];
  });
}

function buildInternalEdges(graph: PipelineGraph): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? "output",
    targetHandle: edge.targetHandle ?? "input",
  }));
}

function enrichOutputPreview(
  output: NodeCachedOutput,
  pageImage?: NonNullable<NodeCachedOutput["preview"]>["pageImage"] | null,
): NodeCachedOutput {
  if (!pageImage || output.preview?.pageImage) return output;
  return {
    ...output,
    preview: {
      ...(output.preview ?? {}),
      pageImage,
      thumbnailBase64: output.preview?.thumbnailBase64 ?? pageImage.image_base64,
    },
  };
}

export async function runCustomPipelineSubgraph(
  ctx: CustomPipelineRunContext,
): Promise<NodeCachedOutput> {
  const modelMap = new Map(ctx.models.map((m) => [m.id, m]));
  const categoryLabels = new Map(
    ctx.categories.map((c) => [c.id, c.display_name]),
  );

  const boundary = derivePipelineBoundaryIO(
    ctx.pipelineGraph.nodes,
    ctx.pipelineGraph.edges,
  );
  if (!boundary.valid || boundary.entryNodeIds.length === 0) {
    throw new Error("Pipeline definition is invalid");
  }

  const entryNodeIds = new Set(boundary.entryNodeIds);
  const orderedIds = topologicalSortFromRecords(
    ctx.pipelineGraph.nodes,
    ctx.pipelineGraph.edges,
  );
  const exitNodeId =
    [...boundary.exitNodeIds]
      .sort(
        (left, right) =>
          orderedIds.indexOf(left) - orderedIds.indexOf(right),
      )
      .at(-1) ?? boundary.exitNodeIds[0];

  let nodes = buildInternalFlowNodes(
    ctx.pipelineGraph,
    modelMap,
    categoryLabels,
  );
  const edges = buildInternalEdges(ctx.pipelineGraph);

  let completed = 0;
  const total = orderedIds.length;

  for (const internalNodeId of orderedIds) {
    const node = nodes.find((n) => n.id === internalNodeId);
    if (!node) continue;

    ctx.onProgress?.(completed, total);

    const upstream = getUpstreamContext(internalNodeId, nodes, edges);
    const upstreamOutput = entryNodeIds.has(internalNodeId)
      ? ctx.upstreamOutput
      : upstream.output;
    const upstreamPages = extractPages(upstreamOutput);

    const payload = buildInferencePayload(node.data.modelId, {
      projectId: ctx.projectId,
      data: node.data,
      upstreamPages,
      upstreamOutput,
    });

    if (!payload) {
      throw new Error(`Internal node "${node.data.label}" is not ready`);
    }

    const response = await runModelInference(node.data.modelId, payload, {
      projectId: ctx.projectId,
      nodeId: `${ctx.nodeId}:${internalNodeId}`,
      runKind: "pipeline_run",
    });

    const pageImage =
      upstreamPages[0]?.page ?? extractPageImage(upstreamOutput);
    const cachedOutput = enrichOutputPreview(
      extractInferenceOutput(node.data.modelId, response),
      pageImage,
    );

    nodes = nodes.map((n) =>
      n.id === internalNodeId
        ? { ...n, data: { ...n.data, cachedOutput } }
        : n,
    );

    completed += 1;
    ctx.onProgress?.(completed, total);
  }

  const exitNode = nodes.find((n) => n.id === exitNodeId);
  const exitOutput = exitNode?.data.cachedOutput;
  if (!exitOutput) {
    throw new Error("Pipeline produced no output");
  }

  return exitOutput;
}

export function parseStoredPipelineGraph(
  raw: Record<string, unknown>,
): PipelineGraph {
  return parsePipelineGraph(raw);
}
