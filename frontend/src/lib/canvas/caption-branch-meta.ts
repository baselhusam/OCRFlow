import type { ModelCatalogEntry } from "@/lib/canvas/types";

export const FIGURE_CAPTION_TEXT_OUTPUT_MODEL_ID =
  "docling/picture-description-smolvlm";

/** Nodes that emit caption/description text and show a right-side text output panel. */
export function isFigureCaptionTextOutput(modelId: string): boolean {
  return modelId === FIGURE_CAPTION_TEXT_OUTPUT_MODEL_ID;
}

export const CAPTION_BRANCH_MODEL_ID = "figure/caption-branch";

export const PARENT_CAPTION_NODE_PARAM = "parentCaptionNodeId";
export const CAPTION_BRANCH_RUNTIME_KEY = "captionBranchNodeId";

/** Spawn-only models — hidden from the node palette. */
export const CAPTION_SPAWN_ONLY_MODELS = new Set([CAPTION_BRANCH_MODEL_ID]);

/** Client-side fallback when the API catalog has not yet picked up the spawn-only model. */
export const CAPTION_BRANCH_CATALOG_ENTRY: ModelCatalogEntry = {
  id: CAPTION_BRANCH_MODEL_ID,
  category: "figure_captioning",
  provider: "figure",
  status: "done",
  compute: "cpu",
  license: "mit",
  python_extra: null,
  display_name: "Caption Branch",
  notes: null,
};

export function getCaptionBranchCatalogEntry(
  modelMap?: Map<string, ModelCatalogEntry>,
): ModelCatalogEntry {
  return modelMap?.get(CAPTION_BRANCH_MODEL_ID) ?? CAPTION_BRANCH_CATALOG_ENTRY;
}

export const CAPTION_BRANCH_SPAWN_OFFSET = { x: 340, y: 0 };

export const CAPTION_BRANCH_PANEL_DEFAULT = { width: 224, height: 360 };
export const CAPTION_BRANCH_PANEL_MIN = { width: 168, height: 200 };
export const CAPTION_BRANCH_PANEL_MAX = { width: 480, height: 720 };

export function isCaptionBranchNode(modelId: string): boolean {
  return modelId === CAPTION_BRANCH_MODEL_ID;
}

export function isCaptionSelectorNode(modelId: string): boolean {
  return isFigureCaptionTextOutput(modelId) || isCaptionBranchNode(modelId);
}

export function getParentCaptionNodeId(
  params: Record<string, string | boolean | number>,
): string | undefined {
  const value = params[PARENT_CAPTION_NODE_PARAM];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getLinkedCaptionBranchPartnerId(
  nodeId: string,
  nodes: Array<{
    id: string;
    data: {
      modelId: string;
      params: Record<string, string | boolean | number>;
      captionBranchNodeId?: string;
    };
  }>,
): string | undefined {
  const node = nodes.find((entry) => entry.id === nodeId);
  if (!node) return undefined;

  if (isFigureCaptionTextOutput(node.data.modelId) && node.data.captionBranchNodeId) {
    return node.data.captionBranchNodeId;
  }

  if (isCaptionBranchNode(node.data.modelId)) {
    return getParentCaptionNodeId(node.data.params);
  }

  return undefined;
}
