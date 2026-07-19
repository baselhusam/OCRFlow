import type { NodeGuideDefinition } from "@/lib/canvas/node-guide-types";
import { DOCLING_CONVERT_PIPELINE_NODE_GUIDE } from "@/components/canvas/node-guide/guides/docling-convert-pipeline-node-guide";
import { DOCLING_LAYOUT_HERON_NODE_GUIDE } from "@/components/canvas/node-guide/guides/docling-layout-heron-node-guide";
import { DOCLING_OCR_AUTO_NODE_GUIDE } from "@/components/canvas/node-guide/guides/docling-ocr-auto-node-guide";
import { DOCLING_PICTURE_DESCRIPTION_SMOLVLM_NODE_GUIDE } from "@/components/canvas/node-guide/guides/docling-picture-description-smolvlm-node-guide";
import { PDF_LOADER_NODE_GUIDE } from "@/components/canvas/node-guide/guides/pdf-loader-node-guide";
import { SELECT_PAGE_NODE_GUIDE } from "@/components/canvas/node-guide/guides/select-page-node-guide";
import { SURYA_LAYOUT_NODE_GUIDE } from "@/components/canvas/node-guide/guides/surya-layout-node-guide";

export const NODE_GUIDE_REGISTRY: Record<string, NodeGuideDefinition> = {
  [PDF_LOADER_NODE_GUIDE.modelId]: PDF_LOADER_NODE_GUIDE,
  [SELECT_PAGE_NODE_GUIDE.modelId]: SELECT_PAGE_NODE_GUIDE,
  [DOCLING_LAYOUT_HERON_NODE_GUIDE.modelId]: DOCLING_LAYOUT_HERON_NODE_GUIDE,
  [SURYA_LAYOUT_NODE_GUIDE.modelId]: SURYA_LAYOUT_NODE_GUIDE,
  [DOCLING_OCR_AUTO_NODE_GUIDE.modelId]: DOCLING_OCR_AUTO_NODE_GUIDE,
  [DOCLING_PICTURE_DESCRIPTION_SMOLVLM_NODE_GUIDE.modelId]:
    DOCLING_PICTURE_DESCRIPTION_SMOLVLM_NODE_GUIDE,
  [DOCLING_CONVERT_PIPELINE_NODE_GUIDE.modelId]: DOCLING_CONVERT_PIPELINE_NODE_GUIDE,
};

export function hasNodeGuide(modelId: string): boolean {
  return modelId in NODE_GUIDE_REGISTRY;
}

export function getNodeGuide(modelId: string): NodeGuideDefinition | null {
  return NODE_GUIDE_REGISTRY[modelId] ?? null;
}
