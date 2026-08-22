"""Factory registry for lazy-loaded model runners.

Runner classes are imported lazily (inside each factory) rather than at module
top-level. This is essential for the containerized split: every image imports
this module, but each provider image only installs its own provider's heavy
dependencies. A docling runner module imports ``docling`` at import time, so
eagerly importing all runner classes here would crash the gateway and the other
provider images. Lazy factories keep this module importable everywhere; the
heavy import only happens when a runner is actually constructed (which only
occurs in the image that has the deps, or in single-image local mode).
"""

from __future__ import annotations

import importlib
from collections.abc import Callable

from app.core.config import RunnerMode, get_settings
from app.models.base import ModelConfig, ModelHealth
from app.models.base_runner import BaseRunner
from app.models.cache import get_runner_cache
from app.models.errors import ModelLoadError
from app.models.remote_runner import RemoteModelRunner
from app.models.registry import ModelNotFoundError
from app.models.servable import get_servable_model, is_remote_provider
from app.models.timeout_policy import resolve_inference_timeout


def _lazy(module_path: str, class_name: str) -> Callable[[], BaseRunner]:
    """Build a factory that imports and constructs a runner on first call."""

    def factory() -> BaseRunner:
        try:
            module = importlib.import_module(module_path)
            runner_cls = getattr(module, class_name)
            return runner_cls()
        except ImportError as exc:
            raise ModelLoadError(
                f"Optional dependency missing while loading {module_path}: {exc}"
            ) from exc

    return factory


RUNNER_FACTORIES: dict[str, Callable[[], BaseRunner]] = {
    "docling/layout-heron": _lazy("app.models.docling.layout_heron", "DoclingLayoutHeronRunner"),
    "docling/ocr-auto": _lazy("app.models.docling.ocr_auto", "DoclingOcrAutoRunner"),
    "docling/tableformer-accurate": _lazy(
        "app.models.docling.tableformer_accurate", "DoclingTableformerAccurateRunner"
    ),
    "docling/picture-classifier-v2.5": _lazy(
        "app.models.docling.picture_classifier", "DoclingPictureClassifierRunner"
    ),
    "docling/vlm-granite-docling": _lazy(
        "app.models.docling.vlm_granite_docling", "DoclingVlmGraniteDoclingRunner"
    ),
    "docling/picture-description-smolvlm": _lazy(
        "app.models.docling.picture_description", "DoclingPictureDescriptionRunner"
    ),
    "docling/code-formula-v2": _lazy(
        "app.models.docling.code_formula_v2", "DoclingCodeFormulaV2Runner"
    ),
    "docling/convert-pipeline": _lazy(
        "app.models.docling.convert_pipeline", "DoclingConvertPipelineRunner"
    ),
    "surya/layout": _lazy("app.models.surya.layout", "SuryaLayoutRunner"),
    "surya/reading-order": _lazy("app.models.surya.reading_order", "SuryaReadingOrderRunner"),
    "surya/text-detection": _lazy("app.models.surya.text_detection", "SuryaTextDetectionRunner"),
    "surya/text-recognition": _lazy(
        "app.models.surya.text_recognition", "SuryaTextRecognitionRunner"
    ),
    "surya/table-recognition": _lazy(
        "app.models.surya.table_recognition", "SuryaTableRecognitionRunner"
    ),
    "surya/latex-ocr": _lazy("app.models.surya.latex_ocr", "SuryaLatexOcrRunner"),
    "paddle/doclayout-s": _lazy("app.models.paddle.doclayout_s", "PaddleDocLayoutSRunner"),
    "paddle/ocr-v6-small": _lazy("app.models.paddle.ocr_v6_small", "PaddleOcrV6SmallRunner"),
    "paddle/pp-structure": _lazy("app.models.paddle.pp_structure", "PaddlePpStructureRunner"),
    "ollama/text-prompt": _lazy(
        "app.models.ollama.generation",
        "OllamaTextRunner",
    ),
    "ollama/structured-extract": _lazy(
        "app.models.ollama.generation",
        "OllamaStructuredRunner",
    ),
    "ollama/vision-prompt": _lazy(
        "app.models.ollama.generation",
        "OllamaVisionRunner",
    ),
    "ollama/vision-structured-extract": _lazy(
        "app.models.ollama.generation",
        "OllamaVisionStructuredRunner",
    ),
    "loader/pdf": _lazy("app.models.loader.pdf", "PdfLoaderRunner"),
    "loader/image": _lazy("app.models.loader.image", "ImageLoaderRunner"),
    "loader/page-at": _lazy("app.models.loader.page_at", "PageAtRunner"),
}


def _use_remote_runner(model_id: str) -> bool:
    """True when this process should forward the model to a provider service."""
    settings = get_settings()
    if settings.runner_mode != RunnerMode.remote:
        return False
    # Provider microservices must execute locally even when they inherit the
    # gateway .env (OCRFLOW_RUNNER_MODE=remote). Forwarding from 8101 back to
    # 8101 produces an unhandled 500 instead of inference.
    if settings.service_provider:
        return False
    servable = get_servable_model(model_id)
    if servable is None or not is_remote_provider(servable.provider):
        return False
    # Remote mode is strict: the gateway must never import provider ML stacks.
    # A missing URL is a configuration error handled in ``_resolve_factory``.
    return True


class ProviderServiceUnavailableError(RuntimeError):
    """Raised when remote mode has no service URL for a required provider."""

    def __init__(self, provider: str, model_id: str) -> None:
        self.provider = provider
        self.model_id = model_id
        super().__init__(
            f"Provider '{provider}' has no service URL configured for model '{model_id}'. "
            "Set OCRFLOW_*_SERVICE_URL or start the provider microservice."
        )


def _resolve_factory(model_id: str) -> Callable[[], BaseRunner]:
    """Return the runner factory for a model, honoring the runner mode."""
    if _use_remote_runner(model_id):
        settings = get_settings()
        servable = get_servable_model(model_id)
        assert servable is not None  # guaranteed by _use_remote_runner
        service_url = settings.provider_service_url(servable.provider)
        if not service_url:
            raise ProviderServiceUnavailableError(servable.provider, model_id)
        return lambda: RemoteModelRunner(servable, service_url)

    factory = RUNNER_FACTORIES.get(model_id)
    if factory is None:
        raise ModelNotFoundError(f"No runner registered for model id: {model_id}")
    return factory


def build_runner(model_id: str) -> BaseRunner:
    """Build a fresh, unloaded runner appropriate to the current runner mode.

    Used by the health endpoint, which reports on a runner without forcing a
    full load. Respects remote mode so the gateway never tries to import a
    provider's heavy local runner.
    """
    return _resolve_factory(model_id)()


async def probe_runner_health(model_id: str) -> ModelHealth:
    """Report health without crashing when an optional provider is absent.

    Construction of some runners (notably Docling) imports the provider package
    at module load time. CI and lightweight installs omit those extras, so
    health must return ``loaded=False`` instead of raising ``ImportError``.
    """
    cached = await get_runner_cache().get(model_id)
    if cached is not None:
        return await cached.health()
    try:
        runner = build_runner(model_id)
    except (ModelLoadError, ProviderServiceUnavailableError) as exc:
        return ModelHealth(
            model_id=model_id,
            loaded=False,
            device=None,
            message=str(exc),
        )
    return await runner.health()


async def get_cached_runner(model_id: str, config: ModelConfig) -> BaseRunner:
    factory = _resolve_factory(model_id)

    settings = get_settings()
    timeout_seconds = resolve_inference_timeout(model_id, settings)
    effective_config = config.model_copy(update={"timeout_seconds": timeout_seconds})

    runner = await get_runner_cache().get_or_load(model_id, factory, effective_config)
    if runner.config is not None and runner.config.timeout_seconds != timeout_seconds:
        runner._config = runner.config.model_copy(update={"timeout_seconds": timeout_seconds})
    return runner
