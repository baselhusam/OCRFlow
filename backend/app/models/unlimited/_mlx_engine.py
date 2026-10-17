"""Shared MLX (Apple Silicon) engine for Baidu Unlimited-OCR.

Both Unlimited-OCR runners share one loaded model: the weights are ~4 GB and
the per-page and multi-page nodes only differ in prompt and image settings.
MLX streams belong to the thread that created them, so loading and every
generation run on one dedicated worker thread, which also serializes access to
the GPU.
"""

from __future__ import annotations

import asyncio
import platform
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image

from app.models.errors import ModelInferenceError, ModelLoadError
from app.schemas.models.unlimited.document_parse import (
    MAX_CONTEXT_TOKENS,
    TOKENS_PER_MULTI_PAGE,
)

#: Upstream's sliding-window no-repeat n-gram guard (35-gram).
_NO_REPEAT_NGRAM = 35
_SINGLE_PAGE_NGRAM_WINDOW = 128
_MULTI_PAGE_NGRAM_WINDOW = 1024
#: Prompt text + BOS on top of the page tokens, plus a safety margin.
_PROMPT_OVERHEAD_TOKENS = 64

SINGLE_PAGE_PROMPT = "<image>document parsing."
MULTI_PAGE_PROMPT = "<image>Multi page parsing."

#: (cropping, base_size, image_size) per single-page mode.
_PAGE_VIEWS: dict[str, tuple[bool, int, int]] = {
    "detail": (True, 1024, 640),  # upstream "gundam": global view + 640px tiles
    "fast": (False, 1024, 1024),  # upstream "base": one 1024px view
}


@dataclass(frozen=True)
class GenerationResult:
    text: str
    prompt_tokens: int
    generation_tokens: int
    generation_tps: float | None
    peak_memory_gb: float | None


def is_apple_silicon() -> bool:
    return platform.system() == "Darwin" and platform.machine().lower() in {"arm64", "aarch64"}


def multi_page_token_budget(page_count: int) -> int:
    """Tokens left for generation after ``page_count`` pages fill the prompt."""
    used = page_count * TOKENS_PER_MULTI_PAGE + _PROMPT_OVERHEAD_TOKENS
    return max(0, MAX_CONTEXT_TOKENS - used)


def _no_repeat_ngram_processor(ngram: int, window: int):
    """MLX port of upstream ``SlidingWindowNoRepeatNgramProcessor``."""
    import mlx.core as mx

    def process(tokens: Any, logits: Any) -> Any:
        # Only the trailing window can contain a repeat; avoid copying history.
        seq = tokens.reshape(-1)[-window:].tolist()
        if len(seq) < ngram:
            return logits
        prefix = tuple(seq[-(ngram - 1) :])
        banned = {
            seq[i + ngram - 1]
            for i in range(len(seq) - ngram + 1)
            if tuple(seq[i : i + ngram - 1]) == prefix
        }
        if banned:
            logits[..., mx.array(sorted(banned))] = -mx.inf
        return logits

    return process


class UnlimitedMlxEngine:
    def __init__(self, repo: str, cache_dir: Path) -> None:
        self.repo = repo
        self.cache_dir = cache_dir
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="unlimited-mlx")
        self._model: Any | None = None
        self._processor: Any | None = None

    async def _call(self, fn, *args, **kwargs):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self._executor, lambda: fn(*args, **kwargs))

    async def load(self) -> None:
        if not is_apple_silicon():
            raise ModelLoadError(
                "Unlimited-OCR runs on Apple Silicon through MLX; this host is "
                f"{platform.system()} {platform.machine()}."
            )
        try:
            from huggingface_hub import snapshot_download
            from mlx_vlm import load as mlx_load
        except ImportError as exc:
            raise ModelLoadError(
                "Unlimited-OCR requires requirements-unlimited.txt (mlx-vlm) in "
                "backend/.venv-unlimited."
            ) from exc

        def load_model() -> tuple[Any, Any]:
            path = snapshot_download(self.repo, cache_dir=str(self.cache_dir))
            return mlx_load(path)

        try:
            self._model, self._processor = await self._call(load_model)
        except Exception as exc:
            raise ModelLoadError(f"Failed to load {self.repo}: {exc}") from exc

    async def unload(self) -> None:
        self._model = None
        self._processor = None

        def clear() -> None:
            import mlx.core as mx

            mx.clear_cache()

        await self._call(clear)

    async def generate(
        self,
        images: list[Image.Image],
        *,
        multi_page: bool,
        mode: str = "detail",
        max_tokens: int,
    ) -> GenerationResult:
        if self._model is None or self._processor is None:
            raise ModelInferenceError("Unlimited-OCR model is not loaded")
        if not images:
            raise ModelInferenceError("Unlimited-OCR needs at least one page image")

        if multi_page:
            prompt = MULTI_PAGE_PROMPT
            cropping, base_size, image_size = False, 1024, 1024
            window = _MULTI_PAGE_NGRAM_WINDOW
        else:
            prompt = SINGLE_PAGE_PROMPT
            cropping, base_size, image_size = _PAGE_VIEWS.get(mode, _PAGE_VIEWS["detail"])
            window = _SINGLE_PAGE_NGRAM_WINDOW

        def run() -> GenerationResult:
            from mlx_vlm.generate import stream_generate

            chunks: list[str] = []
            last: Any = None
            for result in stream_generate(
                self._model,
                self._processor,
                prompt,
                image=list(images),
                max_tokens=max_tokens,
                temperature=0.0,
                cropping=cropping,
                base_size=base_size,
                image_size=image_size,
                logits_processors=[_no_repeat_ngram_processor(_NO_REPEAT_NGRAM, window)],
            ):
                chunks.append(result.text)
                last = result
            return GenerationResult(
                text="".join(chunks),
                prompt_tokens=int(getattr(last, "prompt_tokens", 0) or 0),
                generation_tokens=int(getattr(last, "generation_tokens", 0) or 0),
                generation_tps=_rounded(getattr(last, "generation_tps", None)),
                peak_memory_gb=_rounded(getattr(last, "peak_memory", None), 2),
            )

        try:
            return await self._call(run)
        except Exception as exc:
            raise ModelInferenceError(f"Unlimited-OCR inference failed: {exc}") from exc


def _rounded(value: Any, digits: int = 1) -> float | None:
    try:
        return round(float(value), digits)
    except (TypeError, ValueError):
        return None


_engines: dict[tuple[str, str], tuple[UnlimitedMlxEngine, int]] = {}
_engines_lock = threading.Lock()
_load_locks: dict[tuple[str, str], asyncio.Lock] = {}


async def acquire_engine(repo: str, cache_dir: Path) -> UnlimitedMlxEngine:
    """Return the shared engine for ``repo``, loading it on first use."""
    key = (repo, str(cache_dir))
    with _engines_lock:
        lock = _load_locks.setdefault(key, asyncio.Lock())
    async with lock:
        with _engines_lock:
            existing = _engines.get(key)
            if existing is not None:
                engine, refs = existing
                _engines[key] = (engine, refs + 1)
                return engine
        engine = UnlimitedMlxEngine(repo, cache_dir)
        await engine.load()
        with _engines_lock:
            _engines[key] = (engine, 1)
        return engine


async def release_engine(engine: UnlimitedMlxEngine) -> None:
    key = (engine.repo, str(engine.cache_dir))
    with _engines_lock:
        existing = _engines.get(key)
        if existing is None or existing[0] is not engine:
            return
        refs = existing[1] - 1
        if refs > 0:
            _engines[key] = (engine, refs)
            return
        del _engines[key]
    await engine.unload()
