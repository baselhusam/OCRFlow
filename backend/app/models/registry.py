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
    "text_generation": CategoryMeta(
        id="text_generation",
        display_name="Text & Prompt",
    ),
    "llm_extract": CategoryMeta(id="llm_extract", display_name="LLM Structured Extract"),
    "vision_language": CategoryMeta(
        id="vision_language",
        display_name="Vision Language",
    ),
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


def _connected_provider_entries() -> list[ModelRegistryEntry]:
    """Branded canvas nodes for cloud and compatible LLM/VLM connections."""
    entries: list[ModelRegistryEntry] = []
    providers = (
        ("openai", "OpenAI", "Official OpenAI API"),
        ("anthropic", "Anthropic", "Official Claude API"),
        ("openai-compatible", "OpenAI-compatible", "vLLM, LiteLLM, LM Studio, or an on-prem gateway"),
        ("anthropic-compatible", "Anthropic-compatible", "An Anthropic-compatible on-prem gateway"),
    )
    operations = (
        ("text-prompt", "Text Prompt", "text_generation", "Prompt text and return text."),
        ("structured-extract", "Structured Extract", "llm_extract", "Extract schema-validated JSON from text."),
        ("vision-prompt", "Vision Prompt", "vision_language", "Prompt a page image and return text."),
        ("vision-structured-extract", "Vision Extract", "vision_language", "Extract schema-validated JSON from a page image."),
    )
    for protocol, label, provider_note in providers:
        for operation, operation_label, category, note in operations:
            entries.append(_entry(
                f"{protocol}/{operation}", category=category, provider=protocol,
                status=ModelStatus.done, compute=ComputeTier.api, license="varies",
                display_name=f"{label} {operation_label}", notes=f"{note} {provider_note}",
            ))
    return entries


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
        "docling/layout-heron-101", display_name="Docling Layout Heron 101",
        category="layout_detection",
        provider="docling",
        compute=ComputeTier.gpu_low,
        python_extra="docling",
        notes="Higher accuracy (~77M params); slower",
    ),
    _entry(
        "docling/layout-egret-medium", display_name="Docling Layout Egret Medium",
        category="layout_detection",
        provider="docling",
        compute=ComputeTier.gpu_low,
        python_extra="docling",
        notes="Efficiency tier",
    ),
    _entry(
        "docling/layout-egret-large", display_name="Docling Layout Egret Large",
        category="layout_detection",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
        python_extra="docling",
    ),
    _entry(
        "docling/layout-egret-xlarge", display_name="Docling Layout Egret XLarge",
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
        "docling/ocr-tesseract", display_name="Docling OCR Tesseract",
        category="text_recognition",
        provider="docling",
        compute=ComputeTier.cpu,
        python_extra="docling",
    ),
    _entry(
        "docling/ocr-easyocr", display_name="Docling OCR EasyOCR",
        category="text_recognition",
        provider="docling",
        compute=ComputeTier.gpu_low,
        python_extra="docling",
    ),
    _entry(
        "docling/ocr-rapidocr", display_name="Docling OCR RapidOCR",
        category="text_recognition",
        provider="docling",
        compute=ComputeTier.cpu,
        python_extra="docling",
    ),
    _entry(
        "docling/ocr-surya", display_name="Docling OCR Surya",
        category="text_recognition",
        provider="docling",
        compute=ComputeTier.gpu_low,
        python_extra="docling",
    ),
    _entry(
        "docling/ocr-macos-vision", display_name="Docling OCR macOS Vision",
        category="text_recognition",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.cpu,
        python_extra="docling",
        notes="macOS only",
    ),
    # Docling — table_structure
    _entry(
        "docling/tableformer-fast", display_name="Docling TableFormer Fast",
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
        "docling/tablestructure-granite-vision", display_name="Docling Table Structure Granite Vision",
        category="table_structure",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
        python_extra="docling",
    ),
    # Docling — figure_classification
    _entry(
        "docling/picture-classifier-v2.5", display_name="Docling Picture Classifier v2.5",
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
        "docling/vlm-smoldocling", display_name="SmolDocling VLM",
        category="vlm_convert",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_low,
        python_extra="docling",
    ),
    _entry(
        "docling/vlm-qwen2.5-vl-3b", display_name="Qwen2.5-VL 3B (Docling)",
        category="vlm_convert",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
        python_extra="docling",
    ),
    _entry(
        "docling/vlm-deepseek-ocr", display_name="DeepSeek-OCR (Docling)",
        category="vlm_convert",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.api,
        python_extra="docling",
    ),
    # Docling — figure_captioning
    _entry(
        "docling/picture-description-smolvlm", display_name="Docling Picture Description SmolVLM",
        category="figure_captioning",
        provider="docling",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        python_extra="docling",
    ),
    _entry(
        "docling/picture-description-granite-vision", display_name="Docling Picture Description Granite Vision",
        category="figure_captioning",
        provider="docling",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
        python_extra="docling",
    ),
    # Docling — formula_recognition
    _entry(
        "docling/code-formula-v2", display_name="Docling Code & Formula v2",
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
        "surya/layout", display_name="Surya Layout",
        category="layout_detection",
        provider="surya",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="gpl-3.0",
        python_extra="surya",
        notes="Model weights: Open Rail-M",
    ),
    _entry(
        "surya/reading-order", display_name="Surya Reading Order",
        category="reading_order",
        provider="surya",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="gpl-3.0",
        python_extra="surya",
    ),
    _entry(
        "surya/text-detection", display_name="Surya Text Detection",
        category="text_detection",
        provider="surya",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="gpl-3.0",
        python_extra="surya",
    ),
    _entry(
        "surya/text-recognition", display_name="Surya Text Recognition",
        category="text_recognition",
        provider="surya",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="gpl-3.0",
        python_extra="surya",
    ),
    _entry(
        "surya/table-recognition", display_name="Surya Table Recognition",
        category="table_structure",
        provider="surya",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="gpl-3.0",
        python_extra="surya",
    ),
    _entry(
        "surya/latex-ocr", display_name="Surya LaTeX OCR",
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
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        python_extra="paddle",
        display_name="PaddleOCR PP-DocLayout-S",
    ),
    _entry(
        "paddle/doclayout-m", display_name="PaddleOCR PP-DocLayout-M",
        category="layout_detection",
        provider="paddle",
        compute=ComputeTier.gpu_low,
    ),
    # Phase 3+ — text
    _entry(
        "paddle/ocr-v6-small",
        category="text_recognition",
        provider="paddle",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        python_extra="paddle",
        display_name="PaddleOCR PP-OCR small",
        notes="Bound to PaddleOCR's current small/mobile det+rec pipeline (PP-OCRv5 mobile).",
    ),
    _entry("tesseract/default", display_name="Tesseract OCR", category="text_recognition", provider="tesseract", compute=ComputeTier.cpu),
    _entry("rapidocr/default", display_name="RapidOCR", category="text_recognition", provider="rapidocr", compute=ComputeTier.cpu),
    _entry(
        "easyocr/default", display_name="EasyOCR",
        category="text_recognition",
        provider="easyocr",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_low,
    ),
    _entry(
        "doctr/default", display_name="docTR",
        category="text_recognition",
        provider="doctr",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
    ),
    _entry(
        "trocr/base", display_name="TrOCR Base",
        category="text_recognition",
        provider="trocr",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
        notes="Handwriting",
    ),
    # Phase 3+ — tables
    _entry(
        "microsoft/tatr-detection", display_name="Table Transformer Detection",
        category="table_detection",
        provider="microsoft",
        compute=ComputeTier.gpu_low,
    ),
    _entry(
        "microsoft/tatr-structure", display_name="Table Transformer Structure",
        category="table_structure",
        provider="microsoft",
        compute=ComputeTier.gpu_low,
    ),
    _entry(
        "paddle/pp-structure",
        category="table_structure",
        provider="paddle",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        python_extra="paddle",
        display_name="PaddleOCR PP-StructureV3",
        notes="Full document-parsing pipeline; returns a flattened page artifact.",
    ),
    # Phase 3+ — formula
    _entry(
        "rapidai/latex-ocr", display_name="RapidAI LaTeX OCR",
        category="formula_recognition",
        provider="rapidai",
        compute=ComputeTier.cpu,
    ),
    _entry("texo/default", display_name="Texo", category="formula_recognition", provider="texo", compute=ComputeTier.gpu_low),
    _entry(
        "pix2text/default", display_name="Pix2Text",
        category="formula_recognition",
        provider="pix2text",
        compute=ComputeTier.gpu_low,
    ),
    # Phase 3+ — figure captioning
    _entry(
        "salesforce/blip-base", display_name="BLIP Base Captioning",
        category="figure_captioning",
        provider="salesforce",
        compute=ComputeTier.gpu_low,
    ),
    _entry(
        "microsoft/florence-2-base", display_name="Florence-2 Base",
        category="figure_captioning",
        provider="microsoft",
        compute=ComputeTier.gpu_low,
    ),
    _entry(
        "qwen/qwen2.5-vl-3b-caption", display_name="Qwen2.5-VL 3B Captioning",
        category="figure_captioning",
        provider="qwen",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_mid,
    ),
    # Phase 3+ — VLM convert
    _entry(
        "ibm/granite-docling-258m", display_name="Granite-Docling 258M",
        category="vlm_convert",
        provider="ibm",
        compute=ComputeTier.gpu_mid,
    ),
    _entry(
        "paddle/paddleocr-vl-0.9b", display_name="PaddleOCR-VL 0.9B",
        category="vlm_convert",
        provider="paddle",
        status=ModelStatus.deferred,
        compute=ComputeTier.gpu_low,
    ),
    # Local Ollama text and vision tasks (Qwen <= 0.8B defaults)
    _entry(
        "ollama/text-prompt",
        category="text_generation",
        provider="ollama",
        status=ModelStatus.done,
        compute=ComputeTier.cpu,
        display_name="Local Text Prompt",
        notes="Qwen3 0.6B default; Qwen3.5 0.8B optional.",
    ),
    _entry(
        "ollama/structured-extract",
        category="llm_extract",
        provider="ollama",
        status=ModelStatus.done,
        compute=ComputeTier.cpu,
        display_name="Local Structured Extract",
        notes="JSON Schema-constrained output through Ollama.",
    ),
    _entry(
        "ollama/vision-prompt",
        category="vision_language",
        provider="ollama",
        status=ModelStatus.done,
        compute=ComputeTier.cpu,
        display_name="Local Vision Prompt",
        notes="Qwen3.5 0.8B text+image model.",
    ),
    _entry(
        "ollama/vision-structured-extract",
        category="vision_language",
        provider="ollama",
        status=ModelStatus.done,
        compute=ComputeTier.cpu,
        display_name="Local Vision Structured Extract",
        notes="Qwen3.5 0.8B vision with JSON Schema output.",
    ),
    # Liquid AI — local, multilingual document vision (LFM2.5-VL-1.6B)
    _entry(
        "liquid/vision-prompt",
        category="vision_language",
        provider="liquid",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="lfm-open-license-v1.0",
        python_extra="liquid",
        display_name="Liquid Vision Prompt",
        notes="LFM2.5-VL-1.6B; multilingual document understanding and OCR.",
    ),
    _entry(
        "liquid/vision-structured-extract",
        category="vision_language",
        provider="liquid",
        status=ModelStatus.done,
        compute=ComputeTier.gpu_low,
        license="lfm-open-license-v1.0",
        python_extra="liquid",
        display_name="Liquid Vision Structured Extract",
        notes="LFM2.5-VL-1.6B with schema-validated JSON output.",
    ),
    # Branded cloud and on-prem-compatible LLM/VLM tasks. The old generic
    # connection ids remain executable for saved pipelines, but are no longer
    # offered in the palette because they cannot communicate provider choice.
    *_connected_provider_entries(),
    _entry(
        "vlm/qa", display_name="Visual Q&A",
        category="figure_captioning",
        provider="vlm",
        compute=ComputeTier.api,
        license="varies",
    ),
    # Transforms (non-ML)
    _entry("transform/deskew", display_name="Deskew", category="preprocess", provider="transform", compute=ComputeTier.cpu),
    _entry("transform/binarize", display_name="Binarize", category="preprocess", provider="transform", compute=ComputeTier.cpu),
    _entry("loader/pdf", category="page_loader", provider="loader", compute=ComputeTier.cpu, status=ModelStatus.done, display_name="PDF Loader"),
    _entry("loader/image", category="page_loader", provider="loader", compute=ComputeTier.cpu, status=ModelStatus.done, display_name="Image Loader"),
    _entry("loader/page-at", category="page_loader", provider="loader", compute=ComputeTier.cpu, status=ModelStatus.done, display_name="Select Page"),
    _entry("loader/page-branch", category="page_loader", provider="loader", compute=ComputeTier.cpu, status=ModelStatus.done, display_name="Page Branch"),
    _entry("layout/region-branch", category="layout_detection", provider="layout", compute=ComputeTier.cpu, status=ModelStatus.done, display_name="Region Branch"),
    _entry("assembler/document", display_name="Document Assembler", category="assembler", provider="assembler", compute=ComputeTier.cpu),
    _entry("export/markdown", display_name="Markdown Export", category="export", provider="export", compute=ComputeTier.cpu),
    _entry("export/json", display_name="JSON Export", category="export", provider="export", compute=ComputeTier.cpu),
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
