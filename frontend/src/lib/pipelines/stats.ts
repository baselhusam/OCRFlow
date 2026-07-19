import type { Pipeline } from "@/lib/api/client";
import { parsePipelineGraph } from "@/lib/canvas/graph-utils";

export type PipelineStats = {
  nodeCount: number;
  edgeCount: number;
  modelCount: number;
};

export function getPipelineStats(pipeline: Pipeline): PipelineStats {
  const graph = parsePipelineGraph(pipeline.graph);
  const modelIds = new Set<string>();

  for (const node of graph.nodes) {
    modelIds.add(node.modelId);
  }

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    modelCount: modelIds.size,
  };
}

export function formatPipelineMeta(stats: PipelineStats): {
  nodes: string;
  models: string;
} {
  return {
    nodes: `${stats.nodeCount} node${stats.nodeCount === 1 ? "" : "s"}`,
    models: `${stats.modelCount} model${stats.modelCount === 1 ? "" : "s"}`,
  };
}

export function formatPipelineIO(pipeline: Pipeline): string | null {
  if (!pipeline.input_type_label || !pipeline.output_type_label) {
    return null;
  }
  return `${pipeline.input_type_label} → ${pipeline.output_type_label}`;
}
