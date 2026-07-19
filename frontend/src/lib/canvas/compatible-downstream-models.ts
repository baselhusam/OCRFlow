import type { Node } from "@xyflow/react";

import { evaluatePipelineConnection } from "@/lib/canvas/connection-validation";
import { buildPipelineNodeData, getModelLabel } from "@/lib/canvas/model-utils";
import { isPageBranchNode } from "@/lib/canvas/page-branch-meta";
import { buildItemHandle } from "@/lib/canvas/output-slice";
import type {
  CategoryMeta,
  ModelCatalogEntry,
  PipelineNodeData,
} from "@/lib/canvas/types";

export type CompatibleDownstreamModel = {
  model: ModelCatalogEntry;
  categoryLabel: string;
  inputType: string;
};

function defaultSourceHandleForNode(data: PipelineNodeData): string {
  if (isPageBranchNode(data.modelId)) {
    const pageIndex = Number(data.params.page_index ?? 0);
    return buildItemHandle("page", String(pageIndex));
  }
  return "output";
}

export function getCompatibleDownstreamModels(
  sourceData: PipelineNodeData,
  models: ModelCatalogEntry[],
  categories: CategoryMeta[],
): CompatibleDownstreamModel[] {
  const categoryLabels = new Map(
    categories.map((category) => [category.id, category.display_name]),
  );

  const sourceNode: Node<PipelineNodeData> = {
    id: "__compatible_source__",
    type: "pipelineNode",
    position: { x: 0, y: 0 },
    data: sourceData,
  };

  const compatible: CompatibleDownstreamModel[] = [];

  for (const model of models) {
    if (model.id === sourceData.modelId) continue;

    const categoryLabel =
      categoryLabels.get(model.category) ?? model.category;
    const targetData = buildPipelineNodeData(model, categoryLabel);
    const targetNode: Node<PipelineNodeData> = {
      id: `__compatible_target_${model.id}__`,
      type: "pipelineNode",
      position: { x: 0, y: 0 },
      data: targetData,
    };

    if (
      !evaluatePipelineConnection(
        sourceNode,
        targetNode,
        defaultSourceHandleForNode(sourceData),
      )
    ) {
      continue;
    }

    compatible.push({
      model,
      categoryLabel,
      inputType: targetData.inputType,
    });
  }

  return compatible.sort((left, right) =>
    getModelLabel(left.model).localeCompare(getModelLabel(right.model)),
  );
}
