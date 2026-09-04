import { CATEGORY_WIRE_TYPES } from "@/lib/canvas/category-meta";

/** Structured wire kinds aligned with backend pipeline artifacts. */

export type WireKind =
  | "none"
  | "file"
  | "document_input"
  | "page_artifact"
  | "page_artifact_array"
  | "page_artifact_regions"
  | "text_line_array"
  | "reading_order"
  | "table_structure_array"
  | "formula_array"
  | "figure_array"
  | "document_artifact"
  | "text"
  | "json"
  | "file_export";

/** Maps display wire type strings (from category-meta) to WireKind. */
export function wireKindFromLabel(label: string): WireKind {
  const lower = label.toLowerCase();
  if (lower === "file") return "file";
  if (lower === "documentinput") return "document_input";
  if (lower.includes("pageartifact[]")) return "page_artifact_array";
  if (lower.includes("pageartifact + regions") || lower.includes("pageartifact+regions")) {
    return "page_artifact_regions";
  }
  if (lower.includes("pageartifact")) return "page_artifact";
  if (lower.includes("textline[]")) return "text_line_array";
  if (lower.includes("reading_order") || lower.includes("readingorder")) {
    return "reading_order";
  }
  if (lower.includes("tablestructure[]")) return "table_structure_array";
  if (lower.includes("formula[]")) return "formula_array";
  if (lower.includes("figure[]")) return "figure_array";
  if (lower.includes("documentartifact")) return "document_artifact";
  if (lower === "text") return "text";
  if (lower === "json") return "json";
  if (lower === "file") return "file_export";
  return "none";
}

/** Explicit producer → consumer compatibility (from MODEL_CATALOG). */
const WIRE_COMPATIBILITY: Record<WireKind, WireKind[]> = {
  none: [],
  file: ["document_input", "page_artifact_array", "page_artifact"],
  document_input: ["document_input", "file"],
  page_artifact_array: [
    "page_artifact_array",
    "page_artifact",
    "document_artifact",
  ],
  page_artifact: [
    "page_artifact",
    "page_artifact_regions",
    "page_artifact_array",
  ],
  page_artifact_regions: [
    "page_artifact_regions",
    "reading_order",
  ],
  text_line_array: ["text_line_array", "text", "document_artifact"],
  reading_order: ["document_artifact"],
  table_structure_array: ["table_structure_array", "text", "document_artifact"],
  formula_array: ["formula_array", "document_artifact"],
  figure_array: ["figure_array", "document_artifact"],
  document_artifact: ["document_artifact", "text", "json", "file_export"],
  text: ["text", "json"],
  json: ["json"],
  file_export: [],
};

export function areWireKindsCompatible(
  source: WireKind,
  target: WireKind,
): boolean {
  if (source === "none" || target === "none") return false;
  if (source === target) return true;
  return WIRE_COMPATIBILITY[source]?.includes(target) ?? false;
}

export function areWireLabelsCompatible(
  sourceOutput: string,
  targetInput: string,
): boolean {
  const source = wireKindFromLabel(sourceOutput);
  const target = wireKindFromLabel(targetInput);
  return areWireKindsCompatible(source, target);
}

export const WIRE_KIND_DISPLAY_LABELS: Record<WireKind, string> = {
  none: "unknown",
  file: "File",
  document_input: "DocumentInput",
  page_artifact: "PageArtifact",
  page_artifact_array: "PageArtifact[]",
  page_artifact_regions: "PageArtifact + regions",
  text_line_array: "TextLine[]",
  reading_order: "reading_order",
  table_structure_array: "TableStructure[]",
  formula_array: "Formula[]",
  figure_array: "Figure[]",
  document_artifact: "DocumentArtifact",
  text: "Text",
  json: "JSON",
  file_export: "File",
};

/** Richer output labels for models whose wire kind alone is ambiguous in UI. */
export const MODEL_OUTPUT_DISPLAY_OVERRIDES: Record<string, string> = {
  "docling/ocr-auto": "TextLine[] (with text)",
  "surya/text-recognition": "TextLine[] (with text)",
  "paddle/ocr-v6-small": "TextLine[] (with text)",
  "paddle/pp-structure": "PageArtifact + regions/lines/tables",
  "docling/picture-description-smolvlm": "TextLine[] (with text)",
  "docling/code-formula-v2": "Formula[] (with LaTeX)",
  "surya/latex-ocr": "Formula[] (with LaTeX)",
  "docling/vlm-granite-docling": "DocumentArtifact + markdown",
};

export function wireKindToDisplayLabel(
  kind: WireKind,
  modelId?: string,
  direction: "input" | "output" = "input",
): string {
  if (
    direction === "output" &&
    modelId &&
    MODEL_OUTPUT_DISPLAY_OVERRIDES[modelId]
  ) {
    return MODEL_OUTPUT_DISPLAY_OVERRIDES[modelId];
  }
  return WIRE_KIND_DISPLAY_LABELS[kind] ?? "unknown";
}

export function getCanonicalModelWireLabels(
  modelId: string,
  category: string,
): { input: string; output: string } {
  const kinds = MODEL_WIRE_KINDS[modelId];
  if (kinds) {
    return {
      input: wireKindToDisplayLabel(kinds.input, modelId, "input"),
      output: wireKindToDisplayLabel(kinds.output, modelId, "output"),
    };
  }
  return (
    CATEGORY_WIRE_TYPES[category] ?? {
      input: "unknown",
      output: "unknown",
    }
  );
}

export const MODEL_WIRE_KINDS: Record<
  string,
  { input: WireKind; output: WireKind }
> = {
  "loader/pdf": { input: "file", output: "file" },
  "loader/image": { input: "file", output: "file" },
  "loader/page-at": { input: "page_artifact_array", output: "page_artifact" },
  "loader/page-branch": { input: "page_artifact_array", output: "page_artifact" },
  "surya/layout": { input: "page_artifact", output: "page_artifact_regions" },
  "docling/layout-heron": { input: "page_artifact", output: "page_artifact_regions" },
  "paddle/doclayout-s": { input: "page_artifact", output: "page_artifact_regions" },
  "paddle/ocr-v6-small": { input: "page_artifact", output: "text_line_array" },
  "paddle/pp-structure": { input: "page_artifact", output: "page_artifact_regions" },
  "layout/region-branch": {
    input: "page_artifact_regions",
    output: "page_artifact_regions",
  },
  "figure/caption-branch": {
    input: "text_line_array",
    output: "text_line_array",
  },
  "surya/text-detection": { input: "page_artifact_regions", output: "text_line_array" },
  "surya/text-recognition": { input: "text_line_array", output: "text_line_array" },
  "surya/reading-order": { input: "page_artifact_regions", output: "reading_order" },
  "surya/table-recognition": { input: "page_artifact_regions", output: "table_structure_array" },
  "surya/latex-ocr": { input: "page_artifact_regions", output: "formula_array" },
  "docling/ocr-auto": { input: "page_artifact", output: "text_line_array" },
  "docling/tableformer-accurate": { input: "page_artifact_regions", output: "table_structure_array" },
  "docling/picture-classifier-v2.5": { input: "page_artifact_regions", output: "figure_array" },
  "docling/picture-description-smolvlm": { input: "figure_array", output: "text_line_array" },
  "docling/code-formula-v2": { input: "page_artifact_regions", output: "formula_array" },
  "docling/vlm-granite-docling": { input: "document_input", output: "document_artifact" },
  "docling/convert-pipeline": { input: "document_input", output: "document_artifact" },
  "docling/document-branch": {
    input: "document_artifact",
    output: "document_artifact",
  },
  "ollama/text-prompt": { input: "text", output: "text" },
  "ollama/structured-extract": { input: "text", output: "json" },
  "ollama/vision-prompt": { input: "page_artifact", output: "text" },
  "ollama/vision-structured-extract": {
    input: "page_artifact",
    output: "json",
  },
  "liquid/vision-prompt": { input: "page_artifact", output: "text" },
  "liquid/vision-structured-extract": {
    input: "page_artifact",
    output: "json",
  },
};

export const BLOCKED_PIPELINE_MODELS = new Set([
  "loader/page-at",
  "loader/page-branch",
  "layout/region-branch",
  "figure/caption-branch",
  "docling/document-branch",
  "loader/pdf",
  "loader/image",
]);

export const CUSTOM_PIPELINE_MODEL_PREFIX = "custom-pipeline/";

export function isCustomPipelineModelId(modelId: string): boolean {
  return modelId.startsWith(CUSTOM_PIPELINE_MODEL_PREFIX);
}

export function customPipelineModelId(pipelineId: string): string {
  return `${CUSTOM_PIPELINE_MODEL_PREFIX}${pipelineId}`;
}

export function parseCustomPipelineId(modelId: string): string | null {
  if (!isCustomPipelineModelId(modelId)) return null;
  return modelId.slice(CUSTOM_PIPELINE_MODEL_PREFIX.length);
}

const MODEL_CATEGORIES: Record<string, string> = {
  "loader/pdf": "page_loader",
  "loader/image": "page_loader",
  "loader/page-at": "page_loader",
  "loader/page-branch": "page_loader",
  "surya/layout": "layout_detection",
  "docling/layout-heron": "layout_detection",
  "paddle/doclayout-s": "layout_detection",
  "paddle/ocr-v6-small": "text_recognition",
  "paddle/pp-structure": "table_structure",
  "layout/region-branch": "layout_detection",
  "figure/caption-branch": "figure_captioning",
  "surya/text-detection": "text_detection",
  "surya/text-recognition": "text_recognition",
  "surya/reading-order": "reading_order",
  "surya/table-recognition": "table_structure",
  "surya/latex-ocr": "formula_recognition",
  "docling/ocr-auto": "text_recognition",
  "docling/tableformer-accurate": "table_structure",
  "docling/picture-classifier-v2.5": "figure_classification",
  "docling/picture-description-smolvlm": "figure_captioning",
  "docling/code-formula-v2": "formula_recognition",
  "docling/vlm-granite-docling": "vlm_convert",
  "docling/convert-pipeline": "vlm_convert",
  "docling/document-branch": "vlm_convert",
  "ollama/text-prompt": "text_generation",
  "ollama/structured-extract": "llm_extract",
  "ollama/vision-prompt": "vision_language",
  "ollama/vision-structured-extract": "vision_language",
  "liquid/vision-prompt": "vision_language",
  "liquid/vision-structured-extract": "vision_language",
};

export function getModelWireLabels(
  modelId: string,
  fallbackInput: string,
  fallbackOutput: string,
  category?: string,
): { input: string; output: string } {
  if (isCustomPipelineModelId(modelId)) {
    return {
      input: fallbackInput || "unknown",
      output: fallbackOutput || "unknown",
    };
  }

  const resolvedCategory = category ?? MODEL_CATEGORIES[modelId];
  if (resolvedCategory) {
    return getCanonicalModelWireLabels(modelId, resolvedCategory);
  }

  return {
    input: fallbackInput || "unknown",
    output: fallbackOutput || "unknown",
  };
}

export function getModelWireKinds(
  modelId: string,
  fallbackInput: string,
  fallbackOutput: string,
  customWireKinds?: { input: WireKind; output: WireKind },
): { input: WireKind; output: WireKind } {
  if (isCustomPipelineModelId(modelId) && customWireKinds) {
    return customWireKinds;
  }
  const known = MODEL_WIRE_KINDS[modelId];
  if (known) return known;
  return {
    input: wireKindFromLabel(fallbackInput),
    output: wireKindFromLabel(fallbackOutput),
  };
}

export const PRIMARY_EXIT_KIND_RANK: Record<WireKind, number> = {
  json: 0,
  text: 1,
  text_line_array: 2,
  document_artifact: 3,
  table_structure_array: 4,
  formula_array: 5,
  figure_array: 6,
  reading_order: 7,
  page_artifact_regions: 8,
  page_artifact: 9,
  none: 99,
  file: 99,
  document_input: 99,
  page_artifact_array: 99,
  file_export: 99,
};

export function primaryExitRank(outputKind: WireKind): number {
  return PRIMARY_EXIT_KIND_RANK[outputKind] ?? 99;
}

export function selectPrimaryExitId(
  exitNodeIds: string[],
  modelById: Map<string, string>,
): string | undefined {
  if (exitNodeIds.length === 0) return undefined;
  return [...exitNodeIds].sort((a, b) => {
    const aKind = getModelWireKinds(modelById.get(a) ?? "", "", "").output;
    const bKind = getModelWireKinds(modelById.get(b) ?? "", "", "").output;
    const rankDiff = primaryExitRank(aKind) - primaryExitRank(bKind);
    if (rankDiff !== 0) return rankDiff;
    return exitNodeIds.indexOf(a) - exitNodeIds.indexOf(b);
  })[0];
}

export function composeExitOutputLabel(
  exitNodeIds: string[],
  modelById: Map<string, string>,
  primaryId: string,
  modelMap?: Map<string, { category?: string }>,
): string {
  const ordered = [primaryId, ...exitNodeIds.filter((id) => id !== primaryId)];
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const id of ordered) {
    const modelId = modelById.get(id) ?? "";
    const category = modelMap?.get(modelId)?.category;
    const label = getModelWireLabels(modelId, "", "", category).output;
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels.join(" + ");
}

export function getNodeWireKinds(data: {
  modelId: string;
  inputType: string;
  outputType: string;
  inputWireKind?: string;
  outputWireKind?: string;
}): { input: WireKind; output: WireKind } {
  const customKinds =
    data.inputWireKind && data.outputWireKind
      ? {
          input: data.inputWireKind as WireKind,
          output: data.outputWireKind as WireKind,
        }
      : undefined;
  return getModelWireKinds(
    data.modelId,
    data.inputType,
    data.outputType,
    customKinds,
  );
}
