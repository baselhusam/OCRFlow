import type { Node } from "@xyflow/react";

import { evaluatePipelineConnection } from "@/lib/canvas/connection-validation";
import { SPAWN_ONLY_MODELS } from "@/lib/canvas/page-branch-meta";
import { REGION_SPAWN_ONLY_MODELS } from "@/lib/canvas/region-branch-meta";
import { CAPTION_SPAWN_ONLY_MODELS } from "@/lib/canvas/caption-branch-meta";
import { DOCUMENT_SPAWN_ONLY_MODELS } from "@/lib/canvas/document-branch-meta";
import { buildPipelineNodeData, getModelLabel } from "@/lib/canvas/model-utils";
import type {
  CategoryMeta,
  ModelCatalogEntry,
  PipelineNodeData,
} from "@/lib/canvas/types";

export type CompatibleUpstreamModel = {
  model: ModelCatalogEntry;
  categoryLabel: string;
  outputType: string;
};

export function getCompatibleUpstreamModels(
  targetData: PipelineNodeData,
  models: ModelCatalogEntry[],
  categories: CategoryMeta[],
): CompatibleUpstreamModel[] {
  const categoryLabels = new Map(
    categories.map((category) => [category.id, category.display_name]),
  );

  const targetNode: Node<PipelineNodeData> = {
    id: "__compatible_target__",
    type: "pipelineNode",
    position: { x: 0, y: 0 },
    data: targetData,
  };

  const compatible: CompatibleUpstreamModel[] = [];

  for (const model of models) {
    if (model.id === targetData.modelId) continue;
    if (SPAWN_ONLY_MODELS.has(model.id)) continue;
    if (REGION_SPAWN_ONLY_MODELS.has(model.id)) continue;
    if (CAPTION_SPAWN_ONLY_MODELS.has(model.id)) continue;
    if (DOCUMENT_SPAWN_ONLY_MODELS.has(model.id)) continue;

    const categoryLabel =
      categoryLabels.get(model.category) ?? model.category;
    const sourceData = buildPipelineNodeData(model, categoryLabel);
    const sourceNode: Node<PipelineNodeData> = {
      id: `__compatible_source_${model.id}__`,
      type: "pipelineNode",
      position: { x: 0, y: 0 },
      data: sourceData,
    };

    if (!evaluatePipelineConnection(sourceNode, targetNode, "output")) {
      continue;
    }

    compatible.push({
      model,
      categoryLabel,
      outputType: sourceData.outputType,
    });
  }

  return compatible.sort((left, right) =>
    getModelLabel(left.model).localeCompare(getModelLabel(right.model)),
  );
}
