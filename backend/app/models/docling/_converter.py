"""DocumentConverter helpers for full-pipeline Docling tasks."""

from __future__ import annotations

import base64
import tempfile
from pathlib import Path
from typing import Any

from docling.datamodel.base_models import InputFormat
from docling.datamodel.layout_model_specs import (
    DOCLING_LAYOUT_EGRET_LARGE,
    DOCLING_LAYOUT_EGRET_MEDIUM,
    DOCLING_LAYOUT_EGRET_XLARGE,
    DOCLING_LAYOUT_HERON,
    DOCLING_LAYOUT_HERON_101,
)
from docling.datamodel.pipeline_options import (
    EasyOcrOptions,
    LayoutOptions,
    OcrAutoOptions,
    OcrMacOptions,
    PdfPipelineOptions,
    RapidOcrOptions,
    TableFormerMode,
    TableStructureOptions,
    TesseractCliOcrOptions,
    TesseractOcrOptions,
    VlmConvertOptions,
    VlmPipelineOptions,
)
from docling.document_converter import DocumentConverter, ImageFormatOption, PdfFormatOption
from docling.pipeline.vlm_pipeline import VlmPipeline

from app.core.config import get_settings
from app.models.base import ModelConfig
from app.models.docling._accelerator import artifacts_path, build_accelerator_options
from app.models.docling._common import run_sync
from app.models.errors import ModelInferenceError
from app.models.loader._rasterize import document_source_to_bytes
from app.schemas.artifacts import DocumentInput, PageArtifact


LAYOUT_MODEL_MAP = {
    "heron": DOCLING_LAYOUT_HERON,
    "heron-101": DOCLING_LAYOUT_HERON_101,
    "egret-medium": DOCLING_LAYOUT_EGRET_MEDIUM,
    "egret-large": DOCLING_LAYOUT_EGRET_LARGE,
    "egret-xlarge": DOCLING_LAYOUT_EGRET_XLARGE,
}

OCR_ENGINE_MAP = {
    "auto": OcrAutoOptions,
    "easyocr": EasyOcrOptions,
    "rapidocr": RapidOcrOptions,
    "tesseract": TesseractCliOcrOptions,
    "tesserocr": TesseractOcrOptions,
    "ocrmac": OcrMacOptions,
}


def build_ocr_options(ocr_engine: str = "auto"):
    factory = OCR_ENGINE_MAP.get(ocr_engine, OcrAutoOptions)
    return factory()


def _source_to_path(
    document: DocumentInput,
    *,
    project_id: str | None = None,
) -> Path:
    source = document.source
    settings = get_settings()

    if source.startswith("asset:"):
        if not project_id:
            raise ModelInferenceError(
                "project_id is required when document.source uses asset:{id}"
            )
        raw = document_source_to_bytes(
            document,
            upload_dir=settings.upload_dir,
            project_id=project_id,
        )
    elif source.startswith("http://") or source.startswith("https://"):
        raise ModelInferenceError("URL document sources not yet supported; use base64 or path")
    elif Path(source).is_file():
        return Path(source)
    else:
        try:
            raw = base64.b64decode(source, validate=True)
        except Exception as exc:
            raise ModelInferenceError(
                "document.source must be asset:{id}, a filesystem path, or base64 payload"
            ) from exc

    suffix = ".pdf" if document.format == "pdf" else ".png"
    handle = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    path = Path(handle.name)
    handle.write(raw)
    handle.close()
    return path


def build_pipeline_options(
    *,
    layout_model: str = "heron",
    ocr_engine: str = "auto",
    tableformer_mode: str = "accurate",
    do_ocr: bool = True,
    do_table_structure: bool = True,
    do_picture_classification: bool = False,
    do_picture_description: bool = False,
    do_code_formula: bool = False,
) -> PdfPipelineOptions:
    layout_spec = LAYOUT_MODEL_MAP.get(layout_model, DOCLING_LAYOUT_HERON)
    mode = (
        TableFormerMode.ACCURATE
        if tableformer_mode == "accurate"
        else TableFormerMode.FAST
    )
    options = PdfPipelineOptions()
    options.do_ocr = do_ocr
    options.do_table_structure = do_table_structure
    options.ocr_options = build_ocr_options(ocr_engine)
    options.layout_options = LayoutOptions(model_spec=layout_spec)
    options.table_structure_options = TableStructureOptions(
        mode=mode,
        do_cell_matching=True,
    )
    options.do_picture_classification = do_picture_classification
    options.do_picture_description = do_picture_description
    options.do_code_enrichment = do_code_formula
    options.do_formula_enrichment = do_code_formula
    return options


def build_vlm_options(preset: str = "granite_docling") -> VlmConvertOptions:
    return VlmConvertOptions.from_preset(preset)


def convert_document(
    document: DocumentInput,
    config: ModelConfig,
    pipeline_options: PdfPipelineOptions | None = None,
    vlm_options: VlmConvertOptions | None = None,
    *,
    project_id: str | None = None,
) -> Any:
    path = _source_to_path(document, project_id=project_id)
    artifacts = artifacts_path(config)
    accel = build_accelerator_options(config)

    if vlm_options is not None:
        vlm_pipeline_options = VlmPipelineOptions()
        vlm_pipeline_options.vlm_options = vlm_options
        vlm_pipeline_options.accelerator_options = accel
        vlm_pipeline_options.artifacts_path = artifacts
        format_option = PdfFormatOption(
            pipeline_cls=VlmPipeline,
            pipeline_options=vlm_pipeline_options,
        )
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: format_option,
                InputFormat.IMAGE: format_option,
            }
        )
    else:
        pipeline_options = pipeline_options or build_pipeline_options()
        pipeline_options.accelerator_options = accel
        pipeline_options.artifacts_path = artifacts
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options),
                InputFormat.IMAGE: ImageFormatOption(pipeline_options=pipeline_options),
            }
        )

    return converter.convert(path, raises_on_error=True)


async def convert_document_async(
    document: DocumentInput,
    config: ModelConfig,
    pipeline_options: PdfPipelineOptions | None = None,
    vlm_options: VlmConvertOptions | None = None,
    *,
    project_id: str | None = None,
) -> Any:
    return await run_sync(
        convert_document,
        document,
        config,
        pipeline_options,
        vlm_options,
        project_id=project_id,
    )


def docling_result_to_page_artifacts(result: Any) -> list[PageArtifact]:
    pages: list[PageArtifact] = []
    doc = result.document
    for page_no, _ in enumerate(getattr(doc, "pages", {}) or {}):
        pages.append(PageArtifact(page_index=page_no))
    if not pages:
        pages.append(PageArtifact(page_index=0))
    return pages
