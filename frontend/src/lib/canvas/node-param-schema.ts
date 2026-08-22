export type ParamFieldType =
  | "number"
  | "text"
  | "textarea"
  | "boolean"
  | "select"
  | "multi-select";

export type ParamFieldDef = {
  key: string;
  label: string;
  type: ParamFieldType;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  readOnly?: boolean;
  rows?: number;
  /** UI shows stored value + offset (e.g. page_index uses 1 for stored 0). */
  displayOffset?: number;
};

export const CONVERT_PIPELINE_LAYOUT_MODEL_OPTIONS = [
  { value: "heron", label: "Heron (default)" },
  { value: "heron-101", label: "Heron 101" },
  { value: "egret-medium", label: "Egret Medium" },
  { value: "egret-large", label: "Egret Large" },
  { value: "egret-xlarge", label: "Egret XLarge" },
] as const;

export const CONVERT_PIPELINE_OCR_ENGINE_OPTIONS = [
  { value: "auto", label: "Auto (default)" },
  { value: "easyocr", label: "EasyOCR" },
  { value: "rapidocr", label: "RapidOCR" },
  { value: "tesseract", label: "Tesseract CLI" },
  { value: "tesserocr", label: "Tesseract (tesserocr)" },
  { value: "ocrmac", label: "macOS Vision" },
] as const;

export const CONVERT_PIPELINE_TABLEFORMER_MODE_OPTIONS = [
  { value: "accurate", label: "Accurate (default)" },
  { value: "fast", label: "Fast" },
] as const;

export const CONVERT_PIPELINE_PARAM_DEFAULTS = {
  layout_model: "heron",
  ocr_engine: "auto",
  tableformer_mode: "accurate",
  enrich_pictures: true,
  enrich_formulas: true,
} as const;

/** Surya text recognition — 2-letter ISO 639-1 codes. */
export const SURYA_LANGUAGE_OPTIONS = [
  { value: "en", label: "English (default)" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "ru", label: "Russian" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "pl", label: "Polish" },
  { value: "sv", label: "Swedish" },
  { value: "tr", label: "Turkish" },
  { value: "uk", label: "Ukrainian" },
  { value: "vi", label: "Vietnamese" },
  { value: "cs", label: "Czech" },
  { value: "da", label: "Danish" },
  { value: "fi", label: "Finnish" },
  { value: "el", label: "Greek" },
  { value: "he", label: "Hebrew" },
  { value: "hu", label: "Hungarian" },
  { value: "id", label: "Indonesian" },
  { value: "no", label: "Norwegian" },
  { value: "ro", label: "Romanian" },
  { value: "th", label: "Thai" },
] as const;

/** Docling OCR engines — 3-letter ISO 639-2 / Tesseract codes. */
export const DOCLING_OCR_LANGUAGE_OPTIONS = [
  { value: "eng", label: "English (default)" },
  { value: "deu", label: "German" },
  { value: "fra", label: "French" },
  { value: "spa", label: "Spanish" },
  { value: "ita", label: "Italian" },
  { value: "por", label: "Portuguese" },
  { value: "nld", label: "Dutch" },
  { value: "rus", label: "Russian" },
  { value: "chi_sim", label: "Chinese (Simplified)" },
  { value: "chi_tra", label: "Chinese (Traditional)" },
  { value: "jpn", label: "Japanese" },
  { value: "kor", label: "Korean" },
  { value: "ara", label: "Arabic" },
  { value: "hin", label: "Hindi" },
  { value: "pol", label: "Polish" },
  { value: "swe", label: "Swedish" },
  { value: "tur", label: "Turkish" },
  { value: "ukr", label: "Ukrainian" },
  { value: "vie", label: "Vietnamese" },
  { value: "ces", label: "Czech" },
  { value: "dan", label: "Danish" },
  { value: "fin", label: "Finnish" },
  { value: "ell", label: "Greek" },
  { value: "heb", label: "Hebrew" },
  { value: "hun", label: "Hungarian" },
  { value: "ind", label: "Indonesian" },
  { value: "nor", label: "Norwegian" },
  { value: "ron", label: "Romanian" },
  { value: "tha", label: "Thai" },
] as const;

export const OCR_NODE_PARAM_DEFAULTS = {
  "docling/ocr-auto": { langs: "eng", confidence_threshold: 0.5 },
  "surya/text-recognition": { langs: "en", confidence_threshold: 0.5 },
} as const;

const LANGS_SELECT_FIELD: ParamFieldDef = {
  key: "langs",
  label: "Languages",
  type: "multi-select",
  options: [...SURYA_LANGUAGE_OPTIONS],
};

const DOCLING_LANGS_SELECT_FIELD: ParamFieldDef = {
  key: "langs",
  label: "Languages",
  type: "multi-select",
  options: [...DOCLING_OCR_LANGUAGE_OPTIONS],
};

const CONFIDENCE_FIELD: ParamFieldDef = {
  key: "confidence_threshold",
  label: "Confidence",
  type: "number",
  min: 0,
  max: 1,
  step: 0.05,
};

const OLLAMA_TEXT_MODEL_OPTIONS = [
  { value: "qwen3:0.6b", label: "Qwen 3 · 0.6B (text)" },
  { value: "qwen3.5:0.8b", label: "Qwen 3.5 · 0.8B (multimodal)" },
];

const OLLAMA_BASE_FIELDS: ParamFieldDef[] = [
  { key: "prompt", label: "Instruction", type: "textarea", rows: 5 },
  {
    key: "temperature",
    label: "Temperature",
    type: "number",
    min: 0,
    max: 2,
    step: 0.1,
  },
  {
    key: "max_tokens",
    label: "Max output tokens",
    type: "number",
    min: 1,
    max: 8192,
  },
  { key: "system_prompt", label: "System prompt", type: "textarea", rows: 3 },
];

const MODEL_PARAM_SCHEMA: Record<string, ParamFieldDef[]> = {
  "loader/pdf": [
    { key: "dpi", label: "DPI", type: "number", min: 72, max: 600 },
    { key: "max_pages", label: "Max pages", type: "number", min: 1, max: 500 },
  ],
  "loader/image": [],
  "loader/page-at": [],
  "loader/page-branch": [
    {
      key: "page_index",
      label: "Page number",
      type: "number",
      min: 1,
      displayOffset: 1,
    },
  ],
  "layout/region-branch": [],
  "figure/caption-branch": [],
  "docling/document-branch": [],
  "surya/layout": [
    {
      key: "confidence_threshold",
      label: "Confidence",
      type: "number",
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
  "docling/layout-heron": [
    { key: "keep_empty_clusters", label: "Keep empty clusters", type: "boolean" },
    { key: "skip_cell_assignment", label: "Skip cell assignment", type: "boolean" },
  ],
  "paddle/doclayout-s": [CONFIDENCE_FIELD],
  "paddle/ocr-v6-small": [CONFIDENCE_FIELD],
  "paddle/pp-structure": [],
  "surya/text-recognition": [LANGS_SELECT_FIELD, CONFIDENCE_FIELD],
  "docling/ocr-auto": [DOCLING_LANGS_SELECT_FIELD, CONFIDENCE_FIELD],
  "docling/tableformer-accurate": [
    { key: "do_cell_matching", label: "Cell matching", type: "boolean" },
  ],
  "surya/table-recognition": [
    { key: "detect_boxes", label: "Detect boxes", type: "boolean" },
  ],
  "docling/picture-description-smolvlm": [
    { key: "max_tokens", label: "Max tokens", type: "number", min: 1, max: 2048 },
    { key: "preset", label: "Preset", type: "text", readOnly: true },
  ],
  "docling/vlm-granite-docling": [
    { key: "preset", label: "Preset", type: "text", readOnly: true },
    { key: "engine", label: "Engine", type: "text", readOnly: true },
    { key: "export", label: "Export", type: "text", readOnly: true },
  ],
  "docling/convert-pipeline": [
    {
      key: "layout_model",
      label: "Layout model",
      type: "select",
      options: [...CONVERT_PIPELINE_LAYOUT_MODEL_OPTIONS],
    },
    {
      key: "ocr_engine",
      label: "OCR engine",
      type: "select",
      options: [...CONVERT_PIPELINE_OCR_ENGINE_OPTIONS],
    },
    {
      key: "tableformer_mode",
      label: "TableFormer mode",
      type: "select",
      options: [...CONVERT_PIPELINE_TABLEFORMER_MODE_OPTIONS],
    },
    { key: "enrich_pictures", label: "Enrich pictures", type: "boolean" },
    { key: "enrich_formulas", label: "Enrich formulas", type: "boolean" },
  ],
  "ollama/text-prompt": [
    {
      key: "model",
      label: "Local model",
      type: "select",
      options: OLLAMA_TEXT_MODEL_OPTIONS,
    },
    { key: "text", label: "Input text (optional)", type: "textarea", rows: 6 },
    ...OLLAMA_BASE_FIELDS,
  ],
  "ollama/structured-extract": [
    {
      key: "model",
      label: "Local model",
      type: "select",
      options: OLLAMA_TEXT_MODEL_OPTIONS,
    },
    { key: "text", label: "Input text (optional)", type: "textarea", rows: 6 },
    ...OLLAMA_BASE_FIELDS,
    { key: "json_schema", label: "JSON Schema", type: "textarea", rows: 12 },
  ],
  "ollama/vision-prompt": [
    {
      key: "model",
      label: "Vision model",
      type: "select",
      options: [{ value: "qwen3.5:0.8b", label: "Qwen 3.5 · 0.8B Vision" }],
    },
    ...OLLAMA_BASE_FIELDS,
  ],
  "ollama/vision-structured-extract": [
    {
      key: "model",
      label: "Vision model",
      type: "select",
      options: [{ value: "qwen3.5:0.8b", label: "Qwen 3.5 · 0.8B Vision" }],
    },
    ...OLLAMA_BASE_FIELDS,
    { key: "json_schema", label: "JSON Schema", type: "textarea", rows: 12 },
  ],
};

const CATEGORY_PARAM_SCHEMA: Record<string, ParamFieldDef[]> = {
  layout_detection: [
    {
      key: "confidence_threshold",
      label: "Confidence",
      type: "number",
      min: 0,
      max: 1,
      step: 0.05,
    },
    { key: "device", label: "Device", type: "text", readOnly: true },
  ],
  text_recognition: [
    LANGS_SELECT_FIELD,
    { key: "batch_size", label: "Batch size", type: "number", readOnly: true },
  ],
  figure_captioning: [
    { key: "max_tokens", label: "Max tokens", type: "number", min: 1, max: 2048 },
  ],
  reading_order: [{ key: "device", label: "Device", type: "text", readOnly: true }],
  table_structure: [
    { key: "mode", label: "Mode", type: "text", readOnly: true },
    { key: "do_cell_matching", label: "Cell matching", type: "boolean" },
  ],
  preprocess: [{ key: "enabled", label: "Enabled", type: "boolean" }],
  page_loader: [
    { key: "dpi", label: "DPI", type: "number", min: 72, max: 600 },
    { key: "max_pages", label: "Max pages", type: "number", min: 1, max: 500 },
  ],
  export: [{ key: "pretty", label: "Pretty print", type: "boolean" }],
};

export function getParamSchema(
  modelId: string,
  category: string,
): ParamFieldDef[] {
  if (modelId in MODEL_PARAM_SCHEMA) {
    return MODEL_PARAM_SCHEMA[modelId];
  }
  return CATEGORY_PARAM_SCHEMA[category] ?? [];
}

export function getParamDefaultValue(
  modelId: string,
  key: string,
): string | boolean | number | undefined {
  if (modelId === "docling/convert-pipeline") {
    return CONVERT_PIPELINE_PARAM_DEFAULTS[
      key as keyof typeof CONVERT_PIPELINE_PARAM_DEFAULTS
    ];
  }
  const ocrDefaults =
    OCR_NODE_PARAM_DEFAULTS[modelId as keyof typeof OCR_NODE_PARAM_DEFAULTS];
  if (ocrDefaults && key in ocrDefaults) {
    return ocrDefaults[key as keyof typeof ocrDefaults];
  }
  return undefined;
}

/** Resolves a param value, including legacy aliases and model defaults. */
export function resolveParamValue(
  modelId: string,
  params: Record<string, string | boolean | number>,
  field: ParamFieldDef,
): string | boolean | number | undefined {
  if (field.key in params) return params[field.key];
  if (
    modelId === "docling/ocr-auto" &&
    field.key === "langs" &&
    "languages" in params
  ) {
    return params.languages;
  }
  return getParamDefaultValue(modelId, field.key);
}

export function parseLanguageCodes(
  raw: string | boolean | number | undefined,
  fallback: string,
): string[] {
  const codes = String(raw ?? fallback)
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
  return codes.length ? codes : [fallback];
}

export function joinLanguageCodes(codes: string[]): string {
  return codes.join(",");
}

export function validateLanguageCodes(
  raw: string | boolean | number | undefined,
  options: ReadonlyArray<{ value: string }>,
  fallback: string,
): boolean {
  const allowed = new Set(options.map((opt) => opt.value));
  return parseLanguageCodes(raw, fallback).every((code) => allowed.has(code));
}

export function getEditableParamKeys(modelId: string, category: string): Set<string> {
  return new Set(
    getParamSchema(modelId, category)
      .filter((f) => !f.readOnly)
      .map((f) => f.key),
  );
}

const INLINE_PARAM_KEYS = new Set([
  "confidence_threshold",
  "dpi",
  "max_pages",
  "page_index",
  "max_tokens",
]);

export function getInlineParamSchema(
  modelId: string,
  category: string,
): ParamFieldDef[] {
  if (category === "layout_detection") return [];
  return getParamSchema(modelId, category).filter(
    (field) => !field.readOnly && INLINE_PARAM_KEYS.has(field.key),
  );
}

export function isSliderParam(field: ParamFieldDef): boolean {
  return (
    field.type === "number" &&
    field.min !== undefined &&
    field.max !== undefined &&
    (field.key === "confidence_threshold" || field.key === "dpi")
  );
}
