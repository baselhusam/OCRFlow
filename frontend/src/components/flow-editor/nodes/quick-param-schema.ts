import { isOpenRouterOcrModel } from "@/lib/canvas/connected-node-meta";
import { getParamSchema, type ParamFieldDef } from "@/lib/canvas/node-param-schema";
import type { PipelineNodeData } from "@/lib/canvas/types";

/** Fields that never belong in a 300px popover. */
const HEAVY_TYPES = new Set<ParamFieldDef["type"]>(["json-schema"]);
const HIDDEN_KEYS = new Set(["device", "batch_size", "preset", "engine", "export", "connection_id"]);

/**
 * The 2–3 settings people actually change, shown in the node's quick-settings
 * popover. The full form (schema builder, connection pickers…) lives in the
 * inspector's Parameters tab.
 */
export function getQuickParamSchema(data: PipelineNodeData): ParamFieldDef[] {
  return getParamSchema(data.modelId, data.category)
    .filter(
      (field) =>
        !field.readOnly &&
        !HEAVY_TYPES.has(field.type) &&
        !HIDDEN_KEYS.has(field.key) &&
        // OpenRouter models are picked from a searchable list in the inspector.
        !(isOpenRouterOcrModel(data.modelId) && field.key === "model"),
    )
    .slice(0, 3);
}
