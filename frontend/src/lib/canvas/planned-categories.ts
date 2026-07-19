import { getModelInferenceDef } from "@/lib/canvas/node-inference-registry";
import { isCustomPipelineModelId } from "@/lib/canvas/wire-types";

/** Categories with no runnable models yet. */
export const PLANNED_CATEGORIES = new Set([
  "preprocess",
  "table_detection",
  "table_cell_ocr",
  "formula_detection",
  "llm_extract",
  "export",
]);

export function isPlannedNode(modelId: string, category: string): boolean {
  if (isCustomPipelineModelId(modelId) || category === "custom_pipeline") {
    return false;
  }
  if (PLANNED_CATEGORIES.has(category)) return true;
  return getModelInferenceDef(modelId) === null;
}
