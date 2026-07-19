import type { Pipeline } from "@/lib/api/client";
import { getPipelineLogoUrl } from "@/lib/api/pipelines";
import { parsePipelineGraph } from "@/lib/canvas/graph-utils";
import { topologicalSortFromRecords } from "@/lib/canvas/pipeline-boundary-sort";
import type { PipelineNodeData } from "@/lib/canvas/types";
import {
  customPipelineModelId,
  isCustomPipelineModelId,
  type WireKind,
} from "@/lib/canvas/wire-types";

export function buildCustomPipelineNodeData(
  pipeline: Pipeline,
): PipelineNodeData {
  const graph = parsePipelineGraph(pipeline.graph);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const modelIds = [
    ...new Set(
      topologicalSortFromRecords(graph.nodes, graph.edges).flatMap((nodeId) => {
        const modelId = nodeById.get(nodeId)?.modelId;
        return modelId ? [modelId] : [];
      }),
    ),
  ];

  return {
    modelId: customPipelineModelId(pipeline.id),
    label: pipeline.name,
    category: "custom_pipeline",
    categoryLabel: "Custom Pipeline",
    provider: "ocrflow",
    inputType: pipeline.input_type_label ?? "unknown",
    outputType: pipeline.output_type_label ?? "unknown",
    params: { pipelineId: pipeline.id },
    categoryColor: "var(--node-assembler)",
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    pipelineDescription: pipeline.description,
    pipelineLogoUrl: pipeline.has_logo
      ? getPipelineLogoUrl(pipeline.id)
      : null,
    pipelineAccentColor: pipeline.accent_color,
    internalNodeCount: graph.nodes.length,
    internalModelIds: modelIds,
    inputWireKind: pipeline.input_wire_kind ?? undefined,
    outputWireKind: pipeline.output_wire_kind ?? undefined,
  };
}

export function isCustomPipelineNodeData(
  data: PipelineNodeData,
): boolean {
  return isCustomPipelineModelId(data.modelId) || Boolean(data.pipelineId);
}

export function getCustomPipelineWireKinds(
  data: PipelineNodeData,
): { input: WireKind; output: WireKind } | null {
  if (!data.inputWireKind || !data.outputWireKind) return null;
  return {
    input: data.inputWireKind as WireKind,
    output: data.outputWireKind as WireKind,
  };
}

export function hydrateCustomPipelineNodeData(
  record: { modelId: string; config?: Record<string, string | boolean | number> },
  pipeline: Pipeline | undefined,
  fallback?: Partial<PipelineNodeData>,
): PipelineNodeData | null {
  const pipelineId =
    (typeof record.config?.pipelineId === "string"
      ? record.config.pipelineId
      : null) ??
    (isCustomPipelineModelId(record.modelId)
      ? record.modelId.replace("custom-pipeline/", "")
      : null);

  if (!pipelineId) return null;

  if (pipeline) {
    const data = buildCustomPipelineNodeData(pipeline);
    return {
      ...data,
      params: record.config ?? data.params,
      ...(fallback ?? {}),
    };
  }

  if (!fallback) return null;

  return {
    modelId: customPipelineModelId(pipelineId),
    label: fallback.pipelineName ?? "Pipeline",
    category: "custom_pipeline",
    categoryLabel: "Custom Pipeline",
    provider: "ocrflow",
    inputType: fallback.inputType ?? "unknown",
    outputType: fallback.outputType ?? "unknown",
    params: record.config ?? { pipelineId },
    categoryColor: "var(--node-assembler)",
    pipelineId,
    ...fallback,
  } as PipelineNodeData;
}
