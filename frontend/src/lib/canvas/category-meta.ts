import type { CategoryWireTypes } from "@/lib/canvas/types";
import { areWireLabelsCompatible } from "@/lib/canvas/wire-types";

/** Maps category id → CSS custom property for accent color */
export const CATEGORY_COLOR_VARS: Record<string, string> = {
  preprocess: "var(--node-preprocess)",
  page_loader: "var(--node-page-loader)",
  layout_detection: "var(--node-layout-detection)",
  text_detection: "var(--node-text-detection)",
  text_recognition: "var(--node-text-recognition)",
  reading_order: "var(--node-reading-order)",
  table_detection: "var(--node-table-detection)",
  table_structure: "var(--node-table-structure)",
  table_cell_ocr: "var(--node-table-cell-ocr)",
  formula_detection: "var(--node-formula-detection)",
  formula_recognition: "var(--node-formula-recognition)",
  figure_classification: "var(--node-figure-classification)",
  figure_captioning: "var(--node-figure-captioning)",
  vlm_convert: "var(--node-vlm-convert)",
  assembler: "var(--node-assembler)",
  text_generation: "var(--node-llm-extract)",
  llm_extract: "var(--node-llm-extract)",
  vision_language: "var(--node-vlm-convert)",
  export: "var(--node-export)",
};

export const CATEGORY_WIRE_TYPES: Record<string, CategoryWireTypes> = {
  preprocess: { input: "PageArtifact", output: "PageArtifact" },
  page_loader: { input: "DocumentInput", output: "PageArtifact[]" },
  layout_detection: { input: "PageArtifact", output: "PageArtifact + regions" },
  text_detection: { input: "PageArtifact + regions", output: "TextLine[]" },
  text_recognition: { input: "TextLine[]", output: "TextLine[] (with text)" },
  reading_order: { input: "PageArtifact + regions", output: "reading_order" },
  table_detection: { input: "PageArtifact + regions", output: "TableStructure[]" },
  table_structure: { input: "PageArtifact + regions", output: "TableStructure[]" },
  table_cell_ocr: { input: "TableStructure[]", output: "TableStructure[]" },
  formula_detection: { input: "PageArtifact + regions", output: "Formula[]" },
  formula_recognition: { input: "Formula[]", output: "Formula[] (with LaTeX)" },
  figure_classification: { input: "PageArtifact (± regions)", output: "Figure[]" },
  figure_captioning: { input: "Figure[]", output: "TextLine[] (with text)" },
  vlm_convert: { input: "DocumentInput", output: "DocumentArtifact + markdown" },
  assembler: { input: "PageArtifact[]", output: "DocumentArtifact" },
  text_generation: { input: "Text", output: "Text" },
  llm_extract: { input: "DocumentArtifact", output: "JSON" },
  vision_language: { input: "PageArtifact", output: "Text or JSON" },
  export: { input: "DocumentArtifact", output: "File" },
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  preprocess: "Image preprocessing transforms before OCR stages",
  page_loader: "Load PDF or image documents into page artifacts",
  layout_detection: "Detect layout regions, blocks, and structure on a page",
  text_detection: "Locate text line bounding boxes on a page",
  text_recognition: "Recognize text content from detected lines",
  reading_order: "Determine reading order of layout regions",
  table_detection: "Detect tabular regions on a page",
  table_structure: "Extract row, column, and cell structure from tables",
  table_cell_ocr: "OCR text within individual table cells",
  formula_detection: "Detect mathematical formula regions",
  formula_recognition: "Convert formula images to LaTeX",
  figure_classification: "Classify a page image or detected figure regions",
  figure_captioning: "Generate captions or descriptions for figures",
  vlm_convert: "End-to-end document conversion with a vision-language model",
  assembler: "Merge page artifacts into a unified document",
  text_generation: "Prompt-driven local text transformation and summarization",
  llm_extract: "Structured field extraction using an LLM",
  vision_language: "Prompt-driven understanding of pages, charts, and tables",
  export: "Export document artifacts to JSON, Markdown, or files",
};

/** Default read-only params shown on canvas nodes (phase 1) */
export const DEFAULT_NODE_PARAMS: Record<
  string,
  Record<string, string | boolean | number>
> = {
  layout_detection: { device: "cuda", confidence_threshold: 0.5 },
  text_detection: { device: "cuda" },
  text_recognition: { langs: "en", batch_size: 8, confidence_threshold: 0.5 },
  reading_order: { device: "cuda" },
  table_structure: { mode: "accurate", do_cell_matching: true },
  formula_recognition: { device: "cuda" },
  figure_classification: { device: "cuda" },
  figure_captioning: { max_tokens: 256 },
  vlm_convert: { device: "cuda" },
  preprocess: { enabled: true },
  page_loader: { dpi: 200, max_pages: 50 },
  "loader/page-at": { page_index: 0 },
  "loader/page-branch": { page_index: 0 },
  "docling/convert-pipeline": {
    layout_model: "heron",
    ocr_engine: "auto",
    tableformer_mode: "accurate",
    enrich_pictures: true,
    enrich_formulas: true,
  },
  "docling/ocr-auto": { langs: "eng", confidence_threshold: 0.5 },
  "surya/text-recognition": { langs: "en", confidence_threshold: 0.5 },
  "paddle/doclayout-s": { device: "cuda", confidence_threshold: 0.5 },
  "paddle/ocr-v6-small": { confidence_threshold: 0.5 },
  "paddle/pp-structure": {},
  "ollama/text-prompt": {
    model: "qwen3:0.6b",
    prompt: "Summarize the input accurately and concisely.",
    temperature: 0,
    max_tokens: 1024,
  },
  "ollama/structured-extract": {
    model: "qwen3:0.6b",
    prompt: "Extract the requested fields from the input.",
    temperature: 0,
    max_tokens: 1024,
    json_schema:
      '{"type":"object","properties":{"summary":{"type":"string"}},"required":["summary"]}',
  },
  "ollama/vision-prompt": {
    model: "qwen3.5:0.8b",
    prompt: "Describe this document page, including charts and tables.",
    temperature: 0,
    max_tokens: 1024,
  },
  "ollama/vision-structured-extract": {
    model: "qwen3.5:0.8b",
    prompt: "Extract the requested fields from this document page.",
    temperature: 0,
    max_tokens: 1024,
    json_schema:
      '{"type":"object","properties":{"summary":{"type":"string"}},"required":["summary"]}',
  },
  "liquid/vision-prompt": {
    model: "LiquidAI/LFM2.5-VL-1.6B",
    prompt: "Read this document page accurately, preserving meaningful structure.",
    temperature: 0.1,
    max_tokens: 1024,
  },
  "liquid/vision-structured-extract": {
    model: "LiquidAI/LFM2.5-VL-1.6B",
    prompt: "Extract the requested fields from this document page.",
    temperature: 0.1,
    max_tokens: 1024,
    json_schema:
      '{"type":"object","properties":{"summary":{"type":"string"}},"required":["summary"]}',
  },
  export: { pretty: true },
};

/** Pipeline source nodes — no upstream input handle */
export const SOURCE_NODE_CATEGORIES = new Set(["page_loader"]);

export const SOURCE_NODE_MODELS = new Set([
  "loader/pdf",
  "loader/image",
]);

export function getCategoryColor(category: string): string {
  return CATEGORY_COLOR_VARS[category] ?? "var(--node-default)";
}

export function getCategoryWireTypes(category: string): CategoryWireTypes {
  return (
    CATEGORY_WIRE_TYPES[category] ?? {
      input: "unknown",
      output: "unknown",
    }
  );
}

export function getCategoryDescription(category: string): string {
  return CATEGORY_DESCRIPTIONS[category] ?? "Pipeline model task";
}

export function getDefaultParams(
  category: string,
  modelId?: string,
): Record<string, string | boolean | number> {
  if (modelId && modelId in DEFAULT_NODE_PARAMS) {
    return { ...DEFAULT_NODE_PARAMS[modelId] };
  }
  return { ...(DEFAULT_NODE_PARAMS[category] ?? { device: "cuda" }) };
}

/** Soft type compatibility — delegates to structured wire kinds. */
export function areWireTypesCompatible(
  sourceOutput: string,
  targetInput: string,
): boolean {
  if (areWireLabelsCompatible(sourceOutput, targetInput)) return true;
  // Legacy fallback for free-form labels
  const source = sourceOutput.toLowerCase();
  const target = targetInput.toLowerCase();
  if (source === target) return true;
  if (target.includes(source.replace("[]", ""))) return true;
  if (source.includes("pageartifact") && target.includes("pageartifact")) {
    return true;
  }
  if (source.includes("textline") && target.includes("textline")) return true;
  if (source.includes("documentartifact") && target.includes("documentartifact")) {
    return true;
  }
  if (source.includes("tablestructure") && target.includes("tablestructure")) {
    return true;
  }
  if (source.includes("formula") && target.includes("formula")) return true;
  if (source.includes("figure") && target.includes("figure")) return true;
  return false;
}
