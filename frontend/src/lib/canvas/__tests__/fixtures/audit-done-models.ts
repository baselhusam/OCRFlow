/**
 * Full done-model catalog mirrored from backend/app/models/registry.py (status=done).
 * Used to audit wire compatibility across the pipeline graph UI.
 */
import type { CategoryMeta, ModelCatalogEntry } from "@/lib/canvas/types";

export const AUDIT_CATEGORIES: CategoryMeta[] = [
  { id: "page_loader", display_name: "Page Loader", status: "done" },
  { id: "layout_detection", display_name: "Layout Detection", status: "done" },
  { id: "text_detection", display_name: "Text Detection", status: "done" },
  { id: "text_recognition", display_name: "Text Recognition", status: "done" },
  { id: "reading_order", display_name: "Reading Order", status: "done" },
  { id: "table_structure", display_name: "Table Structure", status: "done" },
  { id: "formula_recognition", display_name: "Formula Recognition", status: "done" },
  { id: "figure_classification", display_name: "Figure Classification", status: "done" },
  { id: "figure_captioning", display_name: "Figure Captioning", status: "done" },
  { id: "vlm_convert", display_name: "VLM Convert", status: "done" },
  { id: "assembler", display_name: "Document Assembler", status: "done" },
];

function model(
  id: string,
  category: string,
  provider: string,
  display_name: string,
): ModelCatalogEntry {
  return {
    id,
    category,
    provider,
    status: "done",
    compute: "cpu",
    license: "mit",
    python_extra: null,
    display_name,
    notes: null,
  };
}

export const AUDIT_DONE_MODELS: ModelCatalogEntry[] = [
  model("loader/pdf", "page_loader", "loader", "PDF Loader"),
  model("loader/image", "page_loader", "loader", "Image Loader"),
  model("loader/page-at", "page_loader", "loader", "Select Page"),
  model("loader/page-branch", "page_loader", "loader", "Page Branch"),
  model("docling/layout-heron", "layout_detection", "docling", "Docling Layout Heron"),
  model("surya/layout", "layout_detection", "surya", "Surya Layout"),
  model("docling/ocr-auto", "text_recognition", "docling", "Docling OCR Auto"),
  model("surya/text-detection", "text_detection", "surya", "Surya Text Detection"),
  model("surya/text-recognition", "text_recognition", "surya", "Surya Text Recognition"),
  model("surya/reading-order", "reading_order", "surya", "Surya Reading Order"),
  model("docling/tableformer-accurate", "table_structure", "docling", "Docling TableFormer"),
  model("surya/table-recognition", "table_structure", "surya", "Surya Table Recognition"),
  model("docling/code-formula-v2", "formula_recognition", "docling", "Docling Code & Formula"),
  model("surya/latex-ocr", "formula_recognition", "surya", "Surya LaTeX OCR"),
  model("docling/picture-classifier-v2.5", "figure_classification", "docling", "Docling Picture Classifier"),
  model("docling/picture-description-smolvlm", "figure_captioning", "docling", "Docling Picture Description"),
  model("docling/vlm-granite-docling", "vlm_convert", "docling", "Granite-Docling VLM"),
  model("docling/convert-pipeline", "assembler", "docling", "Docling DocumentConverter"),
  model("paddle/doclayout-s", "layout_detection", "paddle", "PaddleOCR PP-DocLayout-S"),
  model("paddle/ocr-v6-small", "text_recognition", "paddle", "PaddleOCR PP-OCR small"),
  model("paddle/pp-structure", "table_structure", "paddle", "PaddleOCR PP-StructureV3"),
];

const REGION_CONSUMERS = [
  "surya/text-detection",
  "surya/reading-order",
  "docling/tableformer-accurate",
  "surya/table-recognition",
  "docling/code-formula-v2",
  "surya/latex-ocr",
  "docling/picture-classifier-v2.5",
];

// All region producers (input PageArtifact → output PageArtifact + regions).
// paddle/doclayout-s and paddle/pp-structure are wire-identical to the layout nodes.
const LAYOUT_NODES = [
  "docling/layout-heron",
  "surya/layout",
  "paddle/doclayout-s",
  "paddle/pp-structure",
];

// Page-OCR nodes: input PageArtifact → output TextLine[].
const PAGE_OCR_NODES = ["docling/ocr-auto", "paddle/ocr-v6-small"];

// Everything that consumes a raw PageArtifact (layout + page-OCR nodes).
const PAGE_CONSUMERS = [...LAYOUT_NODES, ...PAGE_OCR_NODES];

const PAGE_SOURCES = ["loader/pdf", "loader/image", "loader/page-at"];

/** Expected main-port upstream model ids (output → input via "output" handle). */
export const EXPECTED_UPSTREAM: Record<string, string[]> = {
  "loader/pdf": [],
  "loader/image": [],
  "loader/page-at": ["loader/pdf", "loader/image"],
  "loader/page-branch": ["loader/page-at"],
  "docling/layout-heron": PAGE_SOURCES,
  "surya/layout": PAGE_SOURCES,
  "docling/ocr-auto": PAGE_SOURCES,
  "paddle/doclayout-s": PAGE_SOURCES,
  "paddle/ocr-v6-small": PAGE_SOURCES,
  "paddle/pp-structure": PAGE_SOURCES,
  "surya/text-detection": [...LAYOUT_NODES, "loader/page-at"],
  "surya/text-recognition": [
    "docling/ocr-auto",
    "surya/text-detection",
    "docling/picture-description-smolvlm",
    "paddle/ocr-v6-small",
  ],
  "surya/reading-order": [...LAYOUT_NODES, "loader/page-at"],
  "docling/tableformer-accurate": [...LAYOUT_NODES, "loader/page-at"],
  "surya/table-recognition": [...LAYOUT_NODES, "loader/page-at"],
  "docling/code-formula-v2": [...LAYOUT_NODES, "loader/page-at"],
  "surya/latex-ocr": [...LAYOUT_NODES, "loader/page-at"],
  "docling/picture-classifier-v2.5": [...LAYOUT_NODES, "loader/page-at"],
  "docling/picture-description-smolvlm": ["docling/picture-classifier-v2.5"],
  "docling/vlm-granite-docling": ["loader/pdf", "loader/image"],
  "docling/convert-pipeline": ["loader/pdf", "loader/image"],
};

/** Expected main-port downstream model ids. */
export const EXPECTED_DOWNSTREAM: Record<string, string[]> = {
  "loader/pdf": [
    "loader/page-at",
    "docling/convert-pipeline",
    "docling/vlm-granite-docling",
    ...PAGE_CONSUMERS,
  ],
  "loader/image": [
    "loader/page-at",
    "docling/convert-pipeline",
    "docling/vlm-granite-docling",
    ...PAGE_CONSUMERS,
  ],
  "loader/page-at": ["loader/page-branch", ...PAGE_CONSUMERS, ...REGION_CONSUMERS],
  "loader/page-branch": ["loader/page-at", ...PAGE_CONSUMERS, ...REGION_CONSUMERS],
  "docling/layout-heron": REGION_CONSUMERS,
  "surya/layout": REGION_CONSUMERS,
  "paddle/doclayout-s": REGION_CONSUMERS,
  "paddle/pp-structure": REGION_CONSUMERS,
  "docling/ocr-auto": ["surya/text-recognition"],
  "paddle/ocr-v6-small": ["surya/text-recognition"],
  "surya/text-detection": ["surya/text-recognition"],
  "surya/text-recognition": [],
  "surya/reading-order": [],
  "docling/tableformer-accurate": [],
  "surya/table-recognition": [],
  "docling/code-formula-v2": [],
  "surya/latex-ocr": [],
  "docling/picture-classifier-v2.5": ["docling/picture-description-smolvlm"],
  "docling/picture-description-smolvlm": ["surya/text-recognition"],
  "docling/vlm-granite-docling": [],
  "docling/convert-pipeline": [],
};

/** Spawn-only nodes are valid on canvas but omitted from palette recommendations. */
export const SPAWN_ONLY_UPSTREAM_SOURCES = new Set(["loader/page-branch"]);
