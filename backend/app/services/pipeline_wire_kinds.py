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
    "paddle/doclayout-s": {"input": "page_artifact", "output": "page_artifact_regions"},
    "paddle/ocr-v6-small": {"input": "page_artifact", "output": "text_line_array"},
    "paddle/pp-structure": {
        "input": "page_artifact",
        "output": "page_artifact_regions",
    },
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
    "ollama/text-prompt": {"input": "text", "output": "text"},
    "ollama/structured-extract": {"input": "text", "output": "json"},
    "ollama/vision-prompt": {"input": "page_artifact", "output": "text"},
    "ollama/vision-structured-extract": {
        "input": "page_artifact",
        "output": "json",
    },
    "liquid/vision-prompt": {"input": "page_artifact", "output": "text"},
    "liquid/vision-structured-extract": {"input": "page_artifact", "output": "json"},
    "llm/text-prompt": {"input": "text", "output": "text"},
    "llm/structured-extract": {"input": "text", "output": "json"},
    "vlm/vision-prompt": {"input": "page_artifact", "output": "text"},
    "vlm/vision-structured-extract": {"input": "page_artifact", "output": "json"},
}

for _protocol in ("openai", "anthropic", "openai-compatible", "anthropic-compatible"):
    MODEL_WIRE_KINDS.update({
        f"{_protocol}/text-prompt": {"input": "text", "output": "text"},
        f"{_protocol}/structured-extract": {"input": "text", "output": "json"},
        f"{_protocol}/vision-prompt": {"input": "page_artifact", "output": "text"},
        f"{_protocol}/vision-structured-extract": {"input": "page_artifact", "output": "json"},
    })

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
    "text_generation": {"input": "Text", "output": "Text"},
    "llm_extract": {"input": "DocumentArtifact", "output": "JSON"},
    "vision_language": {"input": "PageArtifact", "output": "Text or JSON"},
    "export": {"input": "DocumentArtifact", "output": "File"},
}

WIRE_KIND_DISPLAY_LABELS: dict[WireKind, str] = {
    "none": "unknown",
    "file": "File",
    "document_input": "DocumentInput",
    "page_artifact": "PageArtifact",
    "page_artifact_array": "PageArtifact[]",
    "page_artifact_regions": "PageArtifact + regions",
    "text_line_array": "TextLine[]",
    "reading_order": "reading_order",
    "table_structure_array": "TableStructure[]",
    "formula_array": "Formula[]",
    "figure_array": "Figure[]",
    "document_artifact": "DocumentArtifact",
    "text": "Text",
    "json": "JSON",
    "file_export": "File",
}

MODEL_OUTPUT_DISPLAY_OVERRIDES: dict[str, str] = {
    "docling/ocr-auto": "TextLine[] (with text)",
    "surya/text-recognition": "TextLine[] (with text)",
    "paddle/ocr-v6-small": "TextLine[] (with text)",
    "paddle/pp-structure": "PageArtifact + regions/lines/tables",
    "docling/picture-description-smolvlm": "TextLine[] (with text)",
    "docling/code-formula-v2": "Formula[] (with LaTeX)",
    "surya/latex-ocr": "Formula[] (with LaTeX)",
    "docling/vlm-granite-docling": "DocumentArtifact + markdown",
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
    "text_line_array": ["text_line_array", "text"],
    "reading_order": ["reading_order"],
    "table_structure_array": ["table_structure_array", "text"],
    "formula_array": ["formula_array"],
    "figure_array": ["figure_array"],
    "document_artifact": ["document_artifact", "text", "json", "file_export"],
    "text": ["text", "json"],
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
    if lower == "text":
        return "text"
    if lower == "json":
        return "json"
    return "none"


def get_model_category(model_id: str) -> str | None:
    entry = REGISTRY.get(model_id)
    return entry.category if entry else None


# Prefer structured job results when a reusable pipeline fans out to mixed sinks.
PRIMARY_EXIT_KIND_RANK: dict[str, int] = {
    "json": 0,
    "text": 1,
    "text_line_array": 2,
    "document_artifact": 3,
    "table_structure_array": 4,
    "formula_array": 5,
    "figure_array": 6,
    "reading_order": 7,
    "page_artifact_regions": 8,
    "page_artifact": 9,
}


def primary_exit_rank(output_kind: WireKind) -> int:
    return PRIMARY_EXIT_KIND_RANK.get(output_kind, 99)


def select_primary_exit_id(
    exit_node_ids: list[str],
    model_by_id: dict[str, str],
) -> str | None:
    if not exit_node_ids:
        return None
    return min(
        exit_node_ids,
        key=lambda nid: (
            primary_exit_rank(
                get_model_wire_kinds(model_by_id.get(nid, "")).get("output", "none")
            ),
            exit_node_ids.index(nid),
        ),
    )


def compose_exit_output_label(
    exit_node_ids: list[str],
    model_by_id: dict[str, str],
    primary_id: str,
) -> str:
    ordered = [primary_id, *[nid for nid in exit_node_ids if nid != primary_id]]
    labels: list[str] = []
    seen: set[str] = set()
    for nid in ordered:
        label = get_model_wire_labels(model_by_id.get(nid, "")).get("output", "")
        if label and label not in seen:
            seen.add(label)
            labels.append(label)
    return " + ".join(labels)


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
    known_wires = MODEL_WIRE_KINDS.get(model_id)
    if known_wires:
        return {
            "input": WIRE_KIND_DISPLAY_LABELS.get(
                known_wires["input"],
                "unknown",
            ),
            "output": MODEL_OUTPUT_DISPLAY_OVERRIDES.get(
                model_id,
                WIRE_KIND_DISPLAY_LABELS.get(known_wires["output"], "unknown"),
            ),
        }

    known_category = get_model_category(model_id)
    if known_category:
        wires = CATEGORY_WIRE_TYPES.get(known_category, {})
        return {
            "input": wires.get("input", "unknown"),
            "output": wires.get("output", "unknown"),
        }
    return {"input": "unknown", "output": "unknown"}
