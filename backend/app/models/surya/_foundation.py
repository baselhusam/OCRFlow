"""Process-wide shared FoundationPredictor for Surya layout and recognition."""

from __future__ import annotations

import asyncio
import os
from typing import TYPE_CHECKING

from app.models._image_utils import artifacts_path, device_to_torch, run_sync
from app.models.base import ModelConfig
from app.models.errors import ModelLoadError

if TYPE_CHECKING:
    from surya.foundation import FoundationPredictor
    from surya.layout import LayoutPredictor

_lock = asyncio.Lock()
_foundation: FoundationPredictor | None = None
_loaded_config_key: tuple[str, str] | None = None
_layout_lock = asyncio.Lock()
_layout: LayoutPredictor | None = None
_layout_config_key: tuple[str, str] | None = None


def _configure_surya_env(config: ModelConfig) -> None:
    os.environ["TORCH_DEVICE"] = device_to_torch(config.device)
    cache_dir = artifacts_path(config.model_cache_dir)
    os.environ.setdefault("HF_HOME", str(cache_dir / "huggingface"))
    os.environ.setdefault("MODEL_CACHE_DIR", str(cache_dir / "surya"))


def _check_transformers_compat() -> None:
    try:
        import transformers
    except ImportError:
        return

    major = int(transformers.__version__.split(".", maxsplit=1)[0])
    if major >= 5:
        raise ModelLoadError(
            "surya-ocr 0.17.x requires transformers<5 "
            f"(installed {transformers.__version__}). "
            "Reinstall with: pip install -r requirements-surya.txt"
        )


def _load_foundation(config: ModelConfig) -> FoundationPredictor:
    try:
        from surya.foundation import FoundationPredictor
    except ImportError as exc:
        raise ModelLoadError(
            "surya-ocr is not installed. Install with: pip install -r requirements-surya.txt"
        ) from exc

    _check_transformers_compat()
    _configure_surya_env(config)
    os.environ.setdefault("RECOGNITION_BATCH_SIZE", "8")
    os.environ.setdefault("LAYOUT_BATCH_SIZE", "4")
    return FoundationPredictor()


async def get_foundation_predictor(config: ModelConfig) -> FoundationPredictor:
    global _foundation, _loaded_config_key
    config_key = (device_to_torch(config.device), str(config.model_cache_dir))
    if _foundation is not None and _loaded_config_key == config_key:
        return _foundation

    async with _lock:
        if _foundation is not None and _loaded_config_key == config_key:
            return _foundation
        _foundation = await run_sync(_load_foundation, config)
        _loaded_config_key = config_key
        return _foundation


async def get_layout_predictor(config: ModelConfig) -> LayoutPredictor:
    """Share one LayoutPredictor across surya/layout and surya/reading-order."""
    global _layout, _layout_config_key
    foundation = await get_foundation_predictor(config)
    config_key = (device_to_torch(config.device), str(config.model_cache_dir))
    if _layout is not None and _layout_config_key == config_key:
        return _layout

    async with _layout_lock:
        if _layout is not None and _layout_config_key == config_key:
            return _layout

        def _load_layout() -> LayoutPredictor:
            from surya.layout import LayoutPredictor

            return LayoutPredictor(foundation)

        _layout = await run_sync(_load_layout)
        _layout_config_key = config_key
        return _layout
