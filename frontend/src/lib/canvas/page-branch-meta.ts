export const PAGE_AT_MODEL_ID = "loader/page-at";
export const PAGE_BRANCH_MODEL_ID = "loader/page-branch";

export const PARENT_SELECT_PAGE_PARAM = "parentSelectPageId";
export const PAGE_BRANCH_RUNTIME_KEY = "pageBranchNodeId";

/** Spawn-only models — hidden from the node palette. */
export const SPAWN_ONLY_MODELS = new Set([PAGE_BRANCH_MODEL_ID]);

export const PAGE_BRANCH_SPAWN_OFFSET = { x: 340, y: 0 };

export const PAGE_BRANCH_PANEL_DEFAULT = { width: 216, height: 360 };
export const PAGE_BRANCH_PANEL_MIN = { width: 200, height: 200 };
export const PAGE_BRANCH_PANEL_MAX = { width: 480, height: 720 };

export function isPageAtAnchor(modelId: string): boolean {
  return modelId === PAGE_AT_MODEL_ID;
}

export function isPageBranchNode(modelId: string): boolean {
  return modelId === PAGE_BRANCH_MODEL_ID;
}

export function isPageSelectorNode(modelId: string): boolean {
  return isPageAtAnchor(modelId) || isPageBranchNode(modelId);
}

export function getParentSelectPageId(
  params: Record<string, string | boolean | number>,
): string | undefined {
  const value = params[PARENT_SELECT_PAGE_PARAM];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getLinkedPageSelectorPartnerId(
  nodeId: string,
  nodes: Array<{ id: string; data: { modelId: string; params: Record<string, string | boolean | number>; pageBranchNodeId?: string } }>,
): string | undefined {
  const node = nodes.find((entry) => entry.id === nodeId);
  if (!node) return undefined;

  if (isPageAtAnchor(node.data.modelId) && node.data.pageBranchNodeId) {
    return node.data.pageBranchNodeId;
  }

  if (isPageBranchNode(node.data.modelId)) {
    return getParentSelectPageId(node.data.params);
  }

  return undefined;
}
