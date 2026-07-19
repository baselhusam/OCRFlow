import type { ModelCatalogEntry } from "@/lib/canvas/types";

export const REGION_BRANCH_MODEL_ID = "layout/region-branch";

export const PARENT_LAYOUT_NODE_PARAM = "parentLayoutNodeId";
export const REGION_BRANCH_RUNTIME_KEY = "regionBranchNodeId";

/** Spawn-only models — hidden from the node palette. */
export const REGION_SPAWN_ONLY_MODELS = new Set([REGION_BRANCH_MODEL_ID]);

/** Client-side fallback when the API catalog has not yet picked up the spawn-only model. */
export const REGION_BRANCH_CATALOG_ENTRY: ModelCatalogEntry = {
  id: REGION_BRANCH_MODEL_ID,
  category: "layout_detection",
  provider: "layout",
  status: "done",
  compute: "cpu",
  license: "mit",
  python_extra: null,
  display_name: "Region Branch",
  notes: null,
};

export function getRegionBranchCatalogEntry(
  modelMap?: Map<string, ModelCatalogEntry>,
): ModelCatalogEntry {
  return modelMap?.get(REGION_BRANCH_MODEL_ID) ?? REGION_BRANCH_CATALOG_ENTRY;
}

export const REGION_BRANCH_SPAWN_OFFSET = { x: 340, y: 0 };

export const REGION_BRANCH_PANEL_DEFAULT = { width: 208, height: 360 };
export const REGION_BRANCH_PANEL_MIN = { width: 160, height: 200 };
export const REGION_BRANCH_PANEL_MAX = { width: 480, height: 720 };

const LAYOUT_ANCHOR_MODELS = new Set([
  "surya/layout",
  "docling/layout-heron",
]);

export function isLayoutAnchor(modelId: string, category?: string): boolean {
  if (LAYOUT_ANCHOR_MODELS.has(modelId)) return true;
  return category === "layout_detection" && !isRegionBranchNode(modelId);
}

export function isRegionBranchNode(modelId: string): boolean {
  return modelId === REGION_BRANCH_MODEL_ID;
}

export function isLayoutSelectorNode(modelId: string, category?: string): boolean {
  return isLayoutAnchor(modelId, category) || isRegionBranchNode(modelId);
}

export function getParentLayoutNodeId(
  params: Record<string, string | boolean | number>,
): string | undefined {
  const value = params[PARENT_LAYOUT_NODE_PARAM];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getLinkedRegionBranchPartnerId(
  nodeId: string,
  nodes: Array<{
    id: string;
    data: {
      modelId: string;
      category?: string;
      params: Record<string, string | boolean | number>;
      regionBranchNodeId?: string;
    };
  }>,
): string | undefined {
  const node = nodes.find((entry) => entry.id === nodeId);
  if (!node) return undefined;

  if (isLayoutAnchor(node.data.modelId, node.data.category) && node.data.regionBranchNodeId) {
    return node.data.regionBranchNodeId;
  }

  if (isRegionBranchNode(node.data.modelId)) {
    return getParentLayoutNodeId(node.data.params);
  }

  return undefined;
}
