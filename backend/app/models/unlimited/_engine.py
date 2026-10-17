"""Engine-independent pieces of the Unlimited-OCR runtime.

Unlimited-OCR runs through one of three engines, all with the same interface
(``load`` / ``unload`` / ``generate`` -> :class:`GenerationResult`):

* ``mlx`` — mlx-vlm on Apple Silicon (``_mlx_engine``).
* ``transformers`` — the official ``baidu/Unlimited-OCR`` checkpoint with its
  remote code on an NVIDIA GPU (``_cuda_engine``).
* ``vllm`` — an OpenAI-compatible server started from the official
  ``vllm/vllm-openai:unlimited-ocr`` image (``_cuda_engine``).

``auto`` picks MLX on Apple Silicon, vLLM when ``OCRFLOW_UNLIMITED_VLLM_URL`` is
set, and transformers on CUDA otherwise. Prompts, views and the no-repeat
n-gram guard follow upstream and are shared here so every engine sends the same
recipe. Both runners share one loaded engine per (engine, checkpoint, cache).
"""

from __future__ import annotations

import asyncio
import platform
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Protocol

from PIL import Image

from app.core.config import Settings, get_settings
from app.schemas.models.unlimited.document_parse import (
    MAX_CONTEXT_TOKENS,
    TOKENS_PER_MULTI_PAGE,
)

EngineKind = Literal["mlx", "transformers", "vllm"]

#: Upstream's sliding-window no-repeat n-gram guard (35-gram).
NO_REPEAT_NGRAM = 35
SINGLE_PAGE_NGRAM_WINDOW = 128
MULTI_PAGE_NGRAM_WINDOW = 1024
#: Prompt text + BOS on top of the page tokens, plus a safety margin.
_PROMPT_OVERHEAD_TOKENS = 64

SINGLE_PAGE_PROMPT = "<image>document parsing."
MULTI_PAGE_PROMPT = "<image>Multi page parsing."

#: (cropping, base_size, image_size) per single-page mode.
PAGE_VIEWS: dict[str, tuple[bool, int, int]] = {
    "detail": (True, 1024, 640),  # upstream "gundam": global view + 640px tiles
    "fast": (False, 1024, 1024),  # upstream "base": one 1024px view
}
#: Multi-page parsing only supports the base view, without crops.
MULTI_PAGE_VIEW: tuple[bool, int, int] = (False, 1024, 1024)

#: Checkpoint each engine loads when ``OCRFLOW_UNLIMITED_MODEL`` is unset. The
#: 8-bit MLX conversion matches upstream quality; 4-bit diverges on long pages.
DEFAULT_REPOS: dict[EngineKind, str] = {
    "mlx": "mlx-community/Unlimited-OCR-8bit",
    "transformers": "baidu/Unlimited-OCR",
    "vllm": "baidu/Unlimited-OCR",
}


@dataclass(frozen=True)
class GenerationResult:
    text: str
    prompt_tokens: int
    generation_tokens: int
    generation_tps: float | None
    peak_memory_gb: float | None


@dataclass(frozen=True)
class GenerationRecipe:
    """Upstream prompt, image views and n-gram window for one generation."""

    prompt: str
    cropping: bool
    base_size: int
    image_size: int
    ngram_window: int


def generation_recipe(*, multi_page: bool, mode: str = "detail") -> GenerationRecipe:
    if multi_page:
        cropping, base_size, image_size = MULTI_PAGE_VIEW
        return GenerationRecipe(
            MULTI_PAGE_PROMPT, cropping, base_size, image_size, MULTI_PAGE_NGRAM_WINDOW
        )
    cropping, base_size, image_size = PAGE_VIEWS.get(mode, PAGE_VIEWS["detail"])
    return GenerationRecipe(
        SINGLE_PAGE_PROMPT, cropping, base_size, image_size, SINGLE_PAGE_NGRAM_WINDOW
    )


def multi_page_token_budget(page_count: int) -> int:
    """Tokens left for generation after ``page_count`` pages fill the prompt."""
    used = page_count * TOKENS_PER_MULTI_PAGE + _PROMPT_OVERHEAD_TOKENS
    return max(0, MAX_CONTEXT_TOKENS - used)


def is_apple_silicon() -> bool:
    return platform.system() == "Darwin" and platform.machine().lower() in {"arm64", "aarch64"}


def resolve_engine_kind(settings: Settings | None = None) -> EngineKind:
    settings = settings or get_settings()
    requested = settings.unlimited_engine
    if requested != "auto":
        return requested
    if is_apple_silicon():
        return "mlx"
    if settings.unlimited_vllm_url:
        return "vllm"
    return "transformers"


def resolve_model_repo(settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    return settings.unlimited_model_repo or DEFAULT_REPOS[resolve_engine_kind(settings)]


def local_runtime_modules(settings: Settings | None = None) -> tuple[str, ...]:
    """Packages the selected engine needs in-process (for local-mode availability)."""
    return {
        "mlx": ("mlx_vlm",),
        "transformers": ("torch", "transformers"),
        "vllm": (),
    }[resolve_engine_kind(settings)]


class UnlimitedEngine(Protocol):
    kind: EngineKind
    repo: str
    cache_dir: Path

    async def load(self) -> None: ...

    async def unload(self) -> None: ...

    async def generate(
        self,
        images: list[Image.Image],
        *,
        multi_page: bool,
        mode: str = "detail",
        max_tokens: int,
    ) -> GenerationResult: ...


def build_engine(kind: EngineKind, repo: str, cache_dir: Path) -> UnlimitedEngine:
    # Engine modules import their heavy deps lazily; importing them is cheap.
    if kind == "mlx":
        from app.models.unlimited._mlx_engine import UnlimitedMlxEngine

        return UnlimitedMlxEngine(repo, cache_dir)
    if kind == "transformers":
        from app.models.unlimited._cuda_engine import UnlimitedTransformersEngine

        return UnlimitedTransformersEngine(repo, cache_dir)
    from app.models.unlimited._cuda_engine import UnlimitedVllmEngine

    return UnlimitedVllmEngine(repo, cache_dir, base_url=get_settings().unlimited_vllm_url)


def rounded(value: object, digits: int = 1) -> float | None:
    try:
        return round(float(value), digits)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


_EngineKey = tuple[str, str, str]
_engines: dict[_EngineKey, tuple[UnlimitedEngine, int]] = {}
_engines_lock = threading.Lock()
_load_locks: dict[_EngineKey, asyncio.Lock] = {}


async def acquire_engine(repo: str, cache_dir: Path) -> UnlimitedEngine:
    """Return the shared engine for ``repo`` on this host, loading it on first use."""
    kind = resolve_engine_kind()
    key = (kind, repo, str(cache_dir))
    with _engines_lock:
        lock = _load_locks.setdefault(key, asyncio.Lock())
    async with lock:
        with _engines_lock:
            existing = _engines.get(key)
            if existing is not None:
                engine, refs = existing
                _engines[key] = (engine, refs + 1)
                return engine
        engine = build_engine(kind, repo, cache_dir)
        await engine.load()
        with _engines_lock:
            _engines[key] = (engine, 1)
        return engine


async def release_engine(engine: UnlimitedEngine) -> None:
    with _engines_lock:
        key = next((k for k, (e, _) in _engines.items() if e is engine), None)
        if key is None:
            return
        refs = _engines[key][1] - 1
        if refs > 0:
            _engines[key] = (engine, refs)
            return
        del _engines[key]
    await engine.unload()
