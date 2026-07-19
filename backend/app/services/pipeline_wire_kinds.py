"""Wire kind resolution mirroring frontend wire-types.ts."""

from __future__ import annotations

from app.models.registry import REGISTRY

WireKind = str

MODEL_WIRE_KINDS: dict[str, dict[str, WireKind]] = {
    "loader/pdf": {"input": "file", "output": "file"},
    "loader/image": {"input": "file", "output": "file"},
    "loader/page-at": {"input": "page_artifact_array", "output": "page_artifact"},
    "loader/page-branch": {"input": "page_artifact_array", "output": "page_artifact"},
    "surya/layout": {"input": "page_artifact", "output": "page_artifact_regions"},
    "docling/layout-heron": {"input": "page_artifact", "output": "page_artifact_regions"},
    "layout/region-branch": {
        "input": "page_artifact_regions",
        "output": "page_artifact_regions",
    },
    "surya/text-detection": {
        "input": "page_artifact_regions",
        "output": "text_line_array",
    },
    "surya/text-recognition": {"input": "text_line_array", "output": "text_line_array"},
    "surya/reading-order": {"input": "page_artifact_regions", "output": "reading_order"},
    "surya/table-recognition": {
        "input": "page_artifact_regions",
        "output": "table_structure_array",
    },
    "surya/latex-ocr": {"input": "page_artifact_regions", "output": "formula_array"},
    "docling/ocr-auto": {"input": "page_artifact", "output": "text_line_array"},
    "docling/tableformer-accurate": {
        "input": "page_artifact_regions",
        "output": "table_structure_array",
    },
    "docling/picture-classifier-v2.5": {
        "input": "page_artifact_regions",
        "output": "figure_array",
    },
    "docling/picture-description-smolvlm": {
        "input": "figure_array",
        "output": "text_line_array",
    },
    "docling/code-formula-v2": {
        "input": "page_artifact_regions",
        "output": "formula_array",
    },
    "docling/vlm-granite-docling": {
        "input": "document_input",
        "output": "document_artifact",
    },
    "docling/convert-pipeline": {
        "input": "document_input",
        "output": "document_artifact",
    },
}

CATEGORY_WIRE_TYPES: dict[str, dict[str, str]] = {
    "preprocess": {"input": "PageArtifact", "output": "PageArtifact"},
    "page_loader": {"input": "DocumentInput", "output": "PageArtifact[]"},
    "layout_detection": {"input": "PageArtifact", "output": "PageArtifact + regions"},
    "text_detection": {"input": "PageArtifact + regions", "output": "TextLine[]"},
    "text_recognition": {"input": "TextLine[]", "output": "TextLine[] (with text)"},
    "reading_order": {"input": "PageArtifact + regions", "output": "reading_order"},
    "table_detection": {"input": "PageArtifact + regions", "output": "TableStructure[]"},
    "table_structure": {"input": "PageArtifact + regions", "output": "TableStructure[]"},
    "table_cell_ocr": {"input": "TableStructure[]", "output": "TableStructure[]"},
    "formula_detection": {"input": "PageArtifact + regions", "output": "Formula[]"},
    "formula_recognition": {"input": "Formula[]", "output": "Formula[] (with LaTeX)"},
    "figure_classification": {"input": "PageArtifact (± regions)", "output": "Figure[]"},
    "figure_captioning": {"input": "Figure[]", "output": "TextLine[] (with text)"},
    "vlm_convert": {"input": "DocumentInput", "output": "DocumentArtifact + markdown"},
    "assembler": {"input": "PageArtifact[]", "output": "DocumentArtifact"},
    "llm_extract": {"input": "DocumentArtifact", "output": "JSON"},
    "export": {"input": "DocumentArtifact", "output": "File"},
}

FILE_LOADER_MODELS = frozenset({"loader/pdf", "loader/image"})
BLOCKED_PIPELINE_MODELS = frozenset(
    {"loader/page-at", "loader/page-branch", "loader/pdf", "loader/image"}
)

WIRE_COMPATIBILITY: dict[str, list[str]] = {
    "file": ["document_input", "page_artifact_array", "page_artifact"],
    "document_input": ["document_input", "file"],
    "page_artifact_array": ["page_artifact_array", "page_artifact"],
    "page_artifact": ["page_artifact", "page_artifact_regions"],
    "page_artifact_regions": [
        "page_artifact_regions",
        "text_line_array",
        "reading_order",
        "table_structure_array",
        "formula_array",
        "figure_array",
    ],
    "text_line_array": ["text_line_array"],
    "reading_order": ["reading_order"],
    "table_structure_array": ["table_structure_array"],
    "formula_array": ["formula_array"],
    "figure_array": ["figure_array"],
    "document_artifact": ["document_artifact", "json", "file_export"],
    "json": ["json"],
    "file_export": [],
}


def are_wire_kinds_compatible(source: WireKind, target: WireKind) -> bool:
    if source in ("none", "") or target in ("none", ""):
        return False
    if source == target:
        return True
    return target in WIRE_COMPATIBILITY.get(source, [])


def wire_kind_from_label(label: str) -> WireKind:
    lower = label.lower()
    if lower == "file":
        return "file"
    if lower == "documentinput":
        return "document_input"
    if "pageartifact[]" in lower:
        return "page_artifact_array"
    if "pageartifact + regions" in lower or "pageartifact+regions" in lower:
        return "page_artifact_regions"
    if "pageartifact" in lower:
        return "page_artifact"
    if "textline[]" in lower:
        return "text_line_array"
    if "reading_order" in lower or "readingorder" in lower:
        return "reading_order"
    if "tablestructure[]" in lower:
        return "table_structure_array"
    if "formula[]" in lower:
        return "formula_array"
    if "figure[]" in lower:
        return "figure_array"
    if "documentartifact" in lower:
        return "document_artifact"
    if lower == "json":
        return "json"
    return "none"


def get_model_category(model_id: str) -> str | None:
    entry = REGISTRY.get(model_id)
    return entry.category if entry else None


def get_model_wire_kinds(model_id: str) -> dict[str, WireKind]:
    known = MODEL_WIRE_KINDS.get(model_id)
    if known:
        return known

    category = get_model_category(model_id)
    if category:
        wires = CATEGORY_WIRE_TYPES.get(category, {})
        return {
            "input": wire_kind_from_label(wires.get("input", "")),
            "output": wire_kind_from_label(wires.get("output", "")),
        }

    return {"input": "none", "output": "none"}


def get_model_wire_labels(model_id: str) -> dict[str, str]:
    known_category = get_model_category(model_id)
    if known_category:
        wires = CATEGORY_WIRE_TYPES.get(known_category, {})
        return {
            "input": wires.get("input", "unknown"),
            "output": wires.get("output", "unknown"),
        }
    return {"input": "unknown", "output": "unknown"}
