"""Factory registry for lazy-loaded model runners."""

from __future__ import annotations

from collections.abc import Callable

from app.core.config import get_settings
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.cache import get_runner_cache
from app.models.timeout_policy import resolve_inference_timeout
from app.models.docling.code_formula_v2 import DoclingCodeFormulaV2Runner
from app.models.docling.convert_pipeline import DoclingConvertPipelineRunner
from app.models.docling.layout_heron import DoclingLayoutHeronRunner
from app.models.docling.ocr_auto import DoclingOcrAutoRunner
from app.models.docling.picture_classifier import DoclingPictureClassifierRunner
from app.models.docling.picture_description import DoclingPictureDescriptionRunner
from app.models.docling.tableformer_accurate import DoclingTableformerAccurateRunner
from app.models.docling.vlm_granite_docling import DoclingVlmGraniteDoclingRunner
from app.models.loader.image import ImageLoaderRunner
from app.models.loader.page_at import PageAtRunner
from app.models.loader.pdf import PdfLoaderRunner
from app.models.registry import ModelNotFoundError
from app.models.surya.latex_ocr import SuryaLatexOcrRunner
from app.models.surya.layout import SuryaLayoutRunner
from app.models.surya.reading_order import SuryaReadingOrderRunner
from app.models.surya.table_recognition import SuryaTableRecognitionRunner
from app.models.surya.text_detection import SuryaTextDetectionRunner
from app.models.surya.text_recognition import SuryaTextRecognitionRunner

RUNNER_FACTORIES: dict[str, Callable[[], BaseRunner]] = {
    "docling/layout-heron": DoclingLayoutHeronRunner,
    "docling/ocr-auto": DoclingOcrAutoRunner,
    "docling/tableformer-accurate": DoclingTableformerAccurateRunner,
    "docling/picture-classifier-v2.5": DoclingPictureClassifierRunner,
    "docling/vlm-granite-docling": DoclingVlmGraniteDoclingRunner,
    "docling/picture-description-smolvlm": DoclingPictureDescriptionRunner,
    "docling/code-formula-v2": DoclingCodeFormulaV2Runner,
    "docling/convert-pipeline": DoclingConvertPipelineRunner,
    "surya/layout": SuryaLayoutRunner,
    "surya/reading-order": SuryaReadingOrderRunner,
    "surya/text-detection": SuryaTextDetectionRunner,
    "surya/text-recognition": SuryaTextRecognitionRunner,
    "surya/table-recognition": SuryaTableRecognitionRunner,
    "surya/latex-ocr": SuryaLatexOcrRunner,
    "loader/pdf": PdfLoaderRunner,
    "loader/image": ImageLoaderRunner,
    "loader/page-at": PageAtRunner,
}


async def get_cached_runner(model_id: str, config: ModelConfig) -> BaseRunner:
    factory = RUNNER_FACTORIES.get(model_id)
    if factory is None:
        raise ModelNotFoundError(f"No runner registered for model id: {model_id}")

    settings = get_settings()
    timeout_seconds = resolve_inference_timeout(model_id, settings)
    effective_config = config.model_copy(update={"timeout_seconds": timeout_seconds})

    runner = await get_runner_cache().get_or_load(model_id, factory, effective_config)
    if runner.config is not None and runner.config.timeout_seconds != timeout_seconds:
        runner._config = runner.config.model_copy(update={"timeout_seconds": timeout_seconds})
    return runner
