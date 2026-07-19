import { isDocumentConverterNode } from "@/lib/canvas/document-converter-meta";
import type { ModelCatalogEntry } from "@/lib/canvas/types";

export const DOCUMENT_BRANCH_MODEL_ID = "docling/document-branch";

export const PARENT_DOCUMENT_NODE_PARAM = "parentDocumentNodeId";
export const DOCUMENT_BRANCH_RUNTIME_KEY = "documentBranchNodeId";

/** Spawn-only models — hidden from the node palette. */
export const DOCUMENT_SPAWN_ONLY_MODELS = new Set([DOCUMENT_BRANCH_MODEL_ID]);

/** Client-side fallback when the API catalog has not yet picked up the spawn-only model. */
export const DOCUMENT_BRANCH_CATALOG_ENTRY: ModelCatalogEntry = {
  id: DOCUMENT_BRANCH_MODEL_ID,
  category: "vlm_convert",
  provider: "docling",
  status: "done",
  compute: "cpu",
  license: "mit",
  python_extra: null,
  display_name: "Document Branch",
  notes: null,
};

export function getDocumentBranchCatalogEntry(
  modelMap?: Map<string, ModelCatalogEntry>,
): ModelCatalogEntry {
  return modelMap?.get(DOCUMENT_BRANCH_MODEL_ID) ?? DOCUMENT_BRANCH_CATALOG_ENTRY;
}

export const DOCUMENT_BRANCH_SPAWN_OFFSET = { x: 340, y: 0 };

export const DOCUMENT_BRANCH_PANEL_DEFAULT = { width: 280, height: 420 };
export const DOCUMENT_BRANCH_PANEL_MIN = { width: 200, height: 240 };
export const DOCUMENT_BRANCH_PANEL_MAX = { width: 560, height: 800 };

export function isDocumentBranchNode(modelId: string): boolean {
  return modelId === DOCUMENT_BRANCH_MODEL_ID;
}

export function isDocumentBranchAnchor(modelId: string): boolean {
  return isDocumentConverterNode(modelId);
}

export function getParentDocumentNodeId(
  params: Record<string, string | boolean | number>,
): string | undefined {
  const value = params[PARENT_DOCUMENT_NODE_PARAM];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getLinkedDocumentBranchPartnerId(
  nodeId: string,
  nodes: Array<{
    id: string;
    data: {
      modelId: string;
      params: Record<string, string | boolean | number>;
      documentBranchNodeId?: string;
    };
  }>,
): string | undefined {
  const node = nodes.find((entry) => entry.id === nodeId);
  if (!node) return undefined;

  if (isDocumentBranchAnchor(node.data.modelId) && node.data.documentBranchNodeId) {
    return node.data.documentBranchNodeId;
  }

  if (isDocumentBranchNode(node.data.modelId)) {
    return getParentDocumentNodeId(node.data.params);
  }

  return undefined;
}
