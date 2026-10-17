"""MLX (Apple Silicon) engine for Baidu Unlimited-OCR.

Prompts, views and engine sharing live in ``_engine``. MLX streams belong to
the thread that created them, so loading and every generation run on one
dedicated worker thread, which also serializes access to the GPU.
"""

from __future__ import annotations

import asyncio
import platform
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from PIL import Image

from app.models.errors import ModelInferenceError, ModelLoadError
from app.models.unlimited._engine import (
    NO_REPEAT_NGRAM,
    GenerationResult,
    generation_recipe,
    is_apple_silicon,
    rounded,
)


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
    kind = "mlx"

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

        recipe = generation_recipe(multi_page=multi_page, mode=mode)

        def run() -> GenerationResult:
            from mlx_vlm.generate import stream_generate

            chunks: list[str] = []
            last: Any = None
            for result in stream_generate(
                self._model,
                self._processor,
                recipe.prompt,
                image=list(images),
                max_tokens=max_tokens,
                temperature=0.0,
                cropping=recipe.cropping,
                base_size=recipe.base_size,
                image_size=recipe.image_size,
                logits_processors=[
                    _no_repeat_ngram_processor(NO_REPEAT_NGRAM, recipe.ngram_window)
                ],
            ):
                chunks.append(result.text)
                last = result
            return GenerationResult(
                text="".join(chunks),
                prompt_tokens=int(getattr(last, "prompt_tokens", 0) or 0),
                generation_tokens=int(getattr(last, "generation_tokens", 0) or 0),
                generation_tps=rounded(getattr(last, "generation_tps", None)),
                peak_memory_gb=rounded(getattr(last, "peak_memory", None), 2),
            )

        try:
            return await self._call(run)
        except Exception as exc:
            raise ModelInferenceError(f"Unlimited-OCR inference failed: {exc}") from exc
