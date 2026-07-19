"""In-code model metadata registry mirroring MODEL_CATALOG.md."""

from __future__ import annotations

from pydantic import BaseModel

from app.models.base import ComputeTier


class ModelStatus:
    planned = "planned"
    in_progress = "in_progress"
    done = "done"
    deferred = "deferred"


class CategoryMeta(BaseModel):
    id: str
    display_name: str
    status: str = ModelStatus.planned


class ModelRegistryEntry(BaseModel):
    id: str
    category: str
    provider: str
    status: str
    compute: ComputeTier
    license: str
    python_extra: str | None = None
    display_name: str | None = None
    notes: str | None = None


CATEGORIES: dict[str, CategoryMeta] = {
    "preprocess": CategoryMeta(id="preprocess", display_name="Preprocess"),
    "page_loader": CategoryMeta(id="page_loader", display_name="Page Loader"),
    "layout_detection": CategoryMeta(id="layout_detection", display_name="Layout Detection"),
    "text_detection": CategoryMeta(id="text_detection", display_name="Text Detection"),
    "text_recognition": CategoryMeta(id="text_recognition", display_name="Text Recognition"),
    "reading_order": CategoryMeta(id="reading_order", display_name="Reading Order"),
    "table_detection": CategoryMeta(id="table_detection", display_name="Table Detection"),
    "table_structure": CategoryMeta(id="table_structure", display_name="Table Structure"),
    "table_cell_ocr": CategoryMeta(id="table_cell_ocr", display_name="Table Cell OCR"),
    "formula_detection": CategoryMeta(id="formula_detection", display_name="Formula Detection"),
    "formula_recognition": CategoryMeta(
        id="formula_recognition", display_name="Formula Recognition"
    ),
    "figure_classification": CategoryMeta(
        id="figure_classification", display_name="Figure Classification"
    ),
    "figure_captioning": CategoryMeta(id="figure_captioning", display_name="Figure Captioning"),
    "vlm_convert": CategoryMeta(id="vlm_convert", display_name="VLM Convert (end-to-end)"),
    "assembler": CategoryMeta(id="assembler", display_name="Document Assembler"),
    "llm_extract": CategoryMeta(id="llm_extract", display_name="LLM Structured Extract"),
    "export": CategoryMeta(id="export", display_name="Export"),
}


def _entry(
    model_id: str,
    *,
    category: str,
    provider: str,
    status: str = ModelStatus.planned,
    compute: ComputeTier = ComputeTier.cpu,
    license: str = "apache-2.0",
    python_extra: str | None = None,
    display_name: str | None = None,
    notes: str | None = None,
) -> ModelRegistryEntry:
    return ModelRegistryEntry(
        id=model_id,
        category=category,
        provider=provider,
        status=status,
        compute=compute,
        license=license,
        python_extra=python_extra,
        display_name=display_name,
        notes=notes,
    )


_REGISTRY_ENTRIES: list[ModelRegistryEntry] = [
    # Docling — layout_detection
    _entry(
        "docling/layout-heron",
        category="layout_detection",
        provider="docling",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        python_extra="docling",
        display_name="Docling Layout Heron",
    ),
    _entry(
        "docling/layout-heron-101",
        category="layout_detection",
        provider="docling",
        compute=ComputeTier.gpu_low,
        python_extra="docling",
        notes="Higher accuracy (~77M params); slower",
    ),
    _entry(
        "docling/layout-egret-medium",
        category="layout_detection",
        provider="docling",
        compute=ComputeTier.gpu_low,
        python_extra="docling",
        notes="Efficiency tier",
    ),
    _entry(
        "docling/layout-egret-large",
        category="layout_detection",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
        python_extra="docling",
    ),
    _entry(
        "docling/layout-egret-xlarge",
        category="layout_detection",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
        python_extra="docling",
    ),
    # Docling — text_recognition (OCR engines)
    _entry(
        "docling/ocr-auto",
        category="text_recognition",
        provider="docling",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        python_extra="docling",
        display_name="Docling OCR Auto",
    ),
    _entry(
        "docling/ocr-tesseract",
        category="text_recognition",
        provider="docling",
        compute=ComputeTier.cpu,
        python_extra="docling",
    ),
    _entry(
        "docling/ocr-easyocr",
        category="text_recognition",
        provider="docling",
        compute=ComputeTier.gpu_low,
        python_extra="docling",
    ),
    _entry(
        "docling/ocr-rapidocr",
        category="text_recognition",
        provider="docling",
        compute=ComputeTier.cpu,
        python_extra="docling",
    ),
    _entry(
        "docling/ocr-surya",
        category="text_recognition",
        provider="docling",
        compute=ComputeTier.gpu_low,
        python_extra="docling",
    ),
    _entry(
        "docling/ocr-macos-vision",
        category="text_recognition",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.cpu,
        python_extra="docling",
        notes="macOS only",
    ),
    # Docling — table_structure
    _entry(
        "docling/tableformer-fast",
        category="table_structure",
        provider="docling",
        compute=ComputeTier.gpu_low,
        python_extra="docling",
    ),
    _entry(
        "docling/tableformer-accurate",
        category="table_structure",
        provider="docling",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        python_extra="docling",
        display_name="Docling TableFormer Accurate",
    ),
    _entry(
        "docling/tablestructure-granite-vision",
        category="table_structure",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
        python_extra="docling",
    ),
    # Docling — figure_classification
    _entry(
        "docling/picture-classifier-v2.5",
        category="figure_classification",
        provider="docling",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        python_extra="docling",
    ),
    # Docling — vlm_convert
    _entry(
        "docling/vlm-granite-docling",
        category="vlm_convert",
        provider="docling",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_mid,
        python_extra="docling",
        display_name="Granite-Docling VLM",
    ),
    _entry(
        "docling/vlm-smoldocling",
        category="vlm_convert",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_low,
        python_extra="docling",
    ),
    _entry(
        "docling/vlm-qwen2.5-vl-3b",
        category="vlm_convert",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
        python_extra="docling",
    ),
    _entry(
        "docling/vlm-deepseek-ocr",
        category="vlm_convert",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.api,
        python_extra="docling",
    ),
    # Docling — figure_captioning
    _entry(
        "docling/picture-description-smolvlm",
        category="figure_captioning",
        provider="docling",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        python_extra="docling",
    ),
    _entry(
        "docling/picture-description-granite-vision",
        category="figure_captioning",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
        python_extra="docling",
    ),
    # Docling — formula_recognition
    _entry(
        "docling/code-formula-v2",
        category="formula_recognition",
        provider="docling",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        python_extra="docling",
    ),
    # Docling — assembler preset
    _entry(
        "docling/convert-pipeline",
        category="assembler",
        provider="docling",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        python_extra="docling",
        display_name="Docling DocumentConverter Preset",
    ),
    # Surya
    _entry(
        "surya/layout",
        category="layout_detection",
        provider="surya",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="gpl-3.0",
        python_extra="surya",
        notes="Model weights: Open Rail-M",
    ),
    _entry(
        "surya/reading-order",
        category="reading_order",
        provider="surya",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="gpl-3.0",
        python_extra="surya",
    ),
    _entry(
        "surya/text-detection",
        category="text_detection",
        provider="surya",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="gpl-3.0",
        python_extra="surya",
    ),
    _entry(
        "surya/text-recognition",
        category="text_recognition",
        provider="surya",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="gpl-3.0",
        python_extra="surya",
    ),
    _entry(
        "surya/table-recognition",
        category="table_structure",
        provider="surya",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="gpl-3.0",
        python_extra="surya",
    ),
    _entry(
        "surya/latex-ocr",
        category="formula_recognition",
        provider="surya",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="gpl-3.0",
        python_extra="surya",
    ),
    # Phase 3+ — layout
    _entry(
        "paddle/doclayout-s",
        category="layout_detection",
        provider="paddle",
        compute=ComputeTier.gpu_low,
    ),
    _entry(
        "paddle/doclayout-m",
        category="layout_detection",
        provider="paddle",
        compute=ComputeTier.gpu_low,
    ),
    # Phase 3+ — text
    _entry(
        "paddle/ocr-v6-small",
        category="text_recognition",
        provider="paddle",
        compute=ComputeTier.gpu_low,
    ),
    _entry("tesseract/default", category="text_recognition", provider="tesseract", compute=ComputeTier.cpu),
    _entry("rapidocr/default", category="text_recognition", provider="rapidocr", compute=ComputeTier.cpu),
    _entry(
        "easyocr/default",
        category="text_recognition",
        provider="easyocr",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_low,
    ),
    _entry(
        "doctr/default",
        category="text_recognition",
        provider="doctr",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
    ),
    _entry(
        "trocr/base",
        category="text_recognition",
        provider="trocr",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
        notes="Handwriting",
    ),
    # Phase 3+ — tables
    _entry(
        "microsoft/tatr-detection",
        category="table_detection",
        provider="microsoft",
        compute=ComputeTier.gpu_low,
    ),
    _entry(
        "microsoft/tatr-structure",
        category="table_structure",
        provider="microsoft",
        compute=ComputeTier.gpu_low,
    ),
    _entry(
        "paddle/pp-structure",
        category="table_structure",
        provider="paddle",
        compute=ComputeTier.gpu_low,
    ),
    # Phase 3+ — formula
    _entry(
        "rapidai/latex-ocr",
        category="formula_recognition",
        provider="rapidai",
        compute=ComputeTier.cpu,
    ),
    _entry("texo/default", category="formula_recognition", provider="texo", compute=ComputeTier.gpu_low),
    _entry(
        "pix2text/default",
        category="formula_recognition",
        provider="pix2text",
        compute=ComputeTier.gpu_low,
    ),
    # Phase 3+ — figure captioning
    _entry(
        "salesforce/blip-base",
        category="figure_captioning",
        provider="salesforce",
        compute=ComputeTier.gpu_low,
    ),
    _entry(
        "microsoft/florence-2-base",
        category="figure_captioning",
        provider="microsoft",
        compute=ComputeTier.gpu_low,
    ),
    _entry(
        "qwen/qwen2.5-vl-3b-caption",
        category="figure_captioning",
        provider="qwen",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
    ),
    # Phase 3+ — VLM convert
    _entry(
        "ibm/granite-docling-258m",
        category="vlm_convert",
        provider="ibm",
        compute=ComputeTier.gpu_mid,
    ),
    _entry(
        "paddle/paddleocr-vl-0.9b",
        category="vlm_convert",
        provider="paddle",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_low,
    ),
    # Phase 4 — LLM tasks
    _entry(
        "llm/structured-extract",
        category="llm_extract",
        provider="llm",
        compute=ComputeTier.api,
        license="varies",
    ),
    _entry("llm/summarize", category="llm_extract", provider="llm", compute=ComputeTier.api, license="varies"),
    _entry("llm/qa", category="llm_extract", provider="llm", compute=ComputeTier.api, license="varies"),
    _entry(
        "vlm/qa",
        category="figure_captioning",
        provider="vlm",
        compute=ComputeTier.api,
        license="varies",
    ),
    # Transforms (non-ML)
    _entry("transform/deskew", category="preprocess", provider="transform", compute=ComputeTier.cpu),
    _entry("transform/binarize", category="preprocess", provider="transform", compute=ComputeTier.cpu),
    _entry("loader/pdf", category="page_loader", provider="loader", compute=ComputeTier.cpu, status=ModelStatus.done, display_name="PDF Loader"),
    _entry("loader/image", category="page_loader", provider="loader", compute=ComputeTier.cpu, status=ModelStatus.done, display_name="Image Loader"),
    _entry("loader/page-at", category="page_loader", provider="loader", compute=ComputeTier.cpu, status=ModelStatus.done, display_name="Select Page"),
    _entry("loader/page-branch", category="page_loader", provider="loader", compute=ComputeTier.cpu, status=ModelStatus.done, display_name="Page Branch"),
    _entry("layout/region-branch", category="layout_detection", provider="layout", compute=ComputeTier.cpu, status=ModelStatus.done, display_name="Region Branch"),
    _entry("assembler/document", category="assembler", provider="assembler", compute=ComputeTier.cpu),
    _entry("export/markdown", category="export", provider="export", compute=ComputeTier.cpu),
    _entry("export/json", category="export", provider="export", compute=ComputeTier.cpu),
]

REGISTRY: dict[str, ModelRegistryEntry] = {entry.id: entry for entry in _REGISTRY_ENTRIES}


class ModelNotFoundError(KeyError):
    """Raised when a model id is not in the registry."""


def get_model(model_id: str) -> ModelRegistryEntry:
    try:
        return REGISTRY[model_id]
    except KeyError as exc:
        raise ModelNotFoundError(f"Unknown model id: {model_id}") from exc


def list_models(
    *,
    category: str | None = None,
    provider: str | None = None,
    status: str | None = None,
) -> list[ModelRegistryEntry]:
    entries = list(REGISTRY.values())
    if category is not None:
        entries = [entry for entry in entries if entry.category == category]
    if provider is not None:
        entries = [entry for entry in entries if entry.provider == provider]
    if status is not None:
        entries = [entry for entry in entries if entry.status == status]
    return sorted(entries, key=lambda entry: entry.id)


def list_categories() -> list[CategoryMeta]:
    return sorted(CATEGORIES.values(), key=lambda category: category.id)
