"""NVIDIA engines for Baidu Unlimited-OCR.

``UnlimitedTransformersEngine`` runs the official ``baidu/Unlimited-OCR``
checkpoint through its ``trust_remote_code`` model (``infer`` / ``infer_multi``)
on CUDA, pinned to the upstream-tested torch 2.10 / transformers 4.57.1. The
upstream code hard-codes ``.cuda()``, so it needs an NVIDIA GPU.

``UnlimitedVllmEngine`` talks to an OpenAI-compatible vLLM server started from
the official ``vllm/vllm-openai:unlimited-ocr`` image with upstream's
``NGramPerReqLogitsProcessor`` registered.

Both send upstream's prompts, views and no-repeat n-gram guard (see
``_engine.generation_recipe``).
"""

from __future__ import annotations

import asyncio
import base64
import io
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import httpx
from PIL import Image

from app.models.errors import ModelInferenceError, ModelLoadError
from app.models.unlimited._engine import (
    NO_REPEAT_NGRAM,
    GenerationResult,
    generation_recipe,
    rounded,
)
from app.schemas.models.unlimited.document_parse import MAX_CONTEXT_TOKENS

_VLLM_TIMEOUT_SECONDS = 3600.0
#: The upstream repo ships the same 6.7 GB weights twice (``model.safetensors``
#: and a one-shard index), plus an SGLang wheel and the paper. Transformers
#: loads ``model.safetensors`` first, so skip the rest.
_SNAPSHOT_IGNORE = [
    "model-*-of-*.safetensors",
    "model.safetensors.index.json",
    "wheel/*",
    "assets/*",
    "*.pdf",
]


def _cap_generate(model: Any, max_new_tokens: int, usage: dict[str, int]):
    """Wrap ``model.generate`` for one upstream ``infer`` call.

    Upstream only takes ``max_length`` (prompt + output); the runners budget
    output tokens, so this swaps in ``max_new_tokens``, drops the stdout
    streamer and records the prompt / output token counts.
    """
    original = model.generate

    def generate(*args: Any, **kwargs: Any) -> Any:
        kwargs.pop("streamer", None)
        kwargs.pop("max_length", None)
        kwargs["max_new_tokens"] = max_new_tokens
        output_ids = original(*args, **kwargs)
        prompt = int(kwargs["input_ids"].shape[-1])
        usage["prompt_tokens"] = prompt
        usage["generation_tokens"] = max(0, int(output_ids.shape[-1]) - prompt)
        return output_ids

    return generate


class UnlimitedTransformersEngine:
    kind = "transformers"

    def __init__(self, repo: str, cache_dir: Path) -> None:
        self.repo = repo
        self.cache_dir = cache_dir
        # One worker serializes GPU access, like the MLX engine.
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="unlimited-cuda")
        self._model: Any | None = None
        self._tokenizer: Any | None = None

    async def _call(self, fn, *args, **kwargs):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self._executor, lambda: fn(*args, **kwargs))

    async def load(self) -> None:
        try:
            import torch
            from huggingface_hub import snapshot_download
            from transformers import AutoModel, AutoTokenizer
        except ImportError as exc:
            raise ModelLoadError(
                "Unlimited-OCR on NVIDIA requires requirements-unlimited.txt "
                "(torch 2.10, transformers 4.57.1) in backend/.venv-unlimited or the "
                "Docker `unlimited` image."
            ) from exc
        if not torch.cuda.is_available():
            raise ModelLoadError(
                "Unlimited-OCR's transformers engine needs an NVIDIA GPU (CUDA). "
                "Point OCRFLOW_UNLIMITED_VLLM_URL at a vLLM server, or run on Apple Silicon."
            )

        def load_model() -> tuple[Any, Any]:
            path = snapshot_download(
                self.repo,
                cache_dir=str(self.cache_dir),
                ignore_patterns=_SNAPSHOT_IGNORE,
            )
            tokenizer = AutoTokenizer.from_pretrained(path, trust_remote_code=True)
            model = AutoModel.from_pretrained(
                path,
                trust_remote_code=True,
                use_safetensors=True,
                torch_dtype=torch.bfloat16,
            )
            return model.eval().cuda(), tokenizer

        try:
            self._model, self._tokenizer = await self._call(load_model)
        except Exception as exc:
            raise ModelLoadError(f"Failed to load {self.repo}: {exc}") from exc

    async def unload(self) -> None:
        self._model = None
        self._tokenizer = None

        def clear() -> None:
            try:
                import torch
            except ImportError:
                return
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

        await self._call(clear)

    async def generate(
        self,
        images: list[Image.Image],
        *,
        multi_page: bool,
        mode: str = "detail",
        max_tokens: int,
    ) -> GenerationResult:
        if self._model is None or self._tokenizer is None:
            raise ModelInferenceError("Unlimited-OCR model is not loaded")
        if not images:
            raise ModelInferenceError("Unlimited-OCR needs at least one page image")

        recipe = generation_recipe(multi_page=multi_page, mode=mode)
        model, tokenizer = self._model, self._tokenizer

        def run() -> GenerationResult:
            usage = {"prompt_tokens": 0, "generation_tokens": 0}
            _reset_peak_memory()
            start = time.perf_counter()
            # Upstream infer reads page images from paths and wants an output dir.
            with tempfile.TemporaryDirectory(prefix="unlimited-ocr-") as tmp:
                paths = []
                for index, image in enumerate(images):
                    path = Path(tmp) / f"page_{index:04d}.png"
                    image.convert("RGB").save(path)
                    paths.append(str(path))
                model.generate = _cap_generate(model, max_tokens, usage)
                try:
                    if multi_page:
                        text, _ = model.infer_multi(
                            tokenizer,
                            prompt=recipe.prompt,
                            image_files=paths,
                            output_path=tmp,
                            image_size=recipe.image_size,
                            save_results=False,
                            max_length=MAX_CONTEXT_TOKENS,
                            no_repeat_ngram_size=NO_REPEAT_NGRAM,
                            ngram_window=recipe.ngram_window,
                            temperature=0.0,
                        )
                    else:
                        text = model.infer(
                            tokenizer,
                            prompt=recipe.prompt,
                            image_file=paths[0],
                            output_path=tmp,
                            base_size=recipe.base_size,
                            image_size=recipe.image_size,
                            crop_mode=recipe.cropping,
                            eval_mode=True,
                            max_length=MAX_CONTEXT_TOKENS,
                            no_repeat_ngram_size=NO_REPEAT_NGRAM,
                            ngram_window=recipe.ngram_window,
                            temperature=0.0,
                        )
                finally:
                    del model.generate
            elapsed = time.perf_counter() - start
            generated = usage["generation_tokens"]
            return GenerationResult(
                text=text or "",
                prompt_tokens=usage["prompt_tokens"],
                generation_tokens=generated,
                generation_tps=rounded(generated / elapsed) if elapsed > 0 and generated else None,
                peak_memory_gb=_peak_memory_gb(),
            )

        try:
            return await self._call(run)
        except Exception as exc:
            raise ModelInferenceError(f"Unlimited-OCR inference failed: {exc}") from exc


def _reset_peak_memory() -> None:
    try:
        import torch
    except ImportError:
        return
    if torch.cuda.is_available():
        torch.cuda.reset_peak_memory_stats()


def _peak_memory_gb() -> float | None:
    try:
        import torch
    except ImportError:
        return None
    if not torch.cuda.is_available():
        return None
    return rounded(torch.cuda.max_memory_allocated() / 1e9, 2)


def _image_data_url(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


class UnlimitedVllmEngine:
    """Client for the official vLLM Unlimited-OCR server (OpenAI-compatible API)."""

    kind = "vllm"

    def __init__(self, repo: str, cache_dir: Path, *, base_url: str) -> None:
        self.repo = repo
        self.cache_dir = cache_dir
        self.base_url = base_url.rstrip("/").removesuffix("/v1")
        self._client: httpx.AsyncClient | None = None

    async def load(self) -> None:
        if not self.base_url:
            raise ModelLoadError(
                "Unlimited-OCR's vLLM engine needs OCRFLOW_UNLIMITED_VLLM_URL "
                "(for example http://unlimited-vllm:8000)."
            )
        client = httpx.AsyncClient(base_url=self.base_url, timeout=_VLLM_TIMEOUT_SECONDS)
        try:
            response = await client.get("/v1/models", timeout=10.0)
            response.raise_for_status()
            served = {item.get("id") for item in response.json().get("data", [])}
        except Exception as exc:
            await client.aclose()
            raise ModelLoadError(f"vLLM server at {self.base_url} is not reachable: {exc}") from exc
        if served and self.repo not in served:
            await client.aclose()
            raise ModelLoadError(
                f"vLLM at {self.base_url} serves {sorted(served)}, not {self.repo}; "
                "set OCRFLOW_UNLIMITED_MODEL to the served model name."
            )
        self._client = client

    async def unload(self) -> None:
        if self._client is not None:
            await self._client.aclose()
        self._client = None

    def request_body(
        self, images: list[Image.Image], *, multi_page: bool, mode: str, max_tokens: int
    ) -> dict[str, Any]:
        recipe = generation_recipe(multi_page=multi_page, mode=mode)
        content: list[dict[str, Any]] = [{"type": "text", "text": recipe.prompt}]
        content.extend(
            {"type": "image_url", "image_url": {"url": _image_data_url(image)}}
            for image in images
        )
        body: dict[str, Any] = {
            "model": self.repo,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": max_tokens,
            "temperature": 0.0,
            "skip_special_tokens": False,
            "vllm_xargs": {"ngram_size": NO_REPEAT_NGRAM, "window_size": recipe.ngram_window},
        }
        # The server crops single pages (gundam) and never crops multi-image
        # requests; "fast" asks the DeepSeek-OCR processor for the base view.
        if not multi_page and not recipe.cropping:
            body["mm_processor_kwargs"] = {"crop_mode": False}
        return body

    async def generate(
        self,
        images: list[Image.Image],
        *,
        multi_page: bool,
        mode: str = "detail",
        max_tokens: int,
    ) -> GenerationResult:
        if self._client is None:
            raise ModelInferenceError("Unlimited-OCR vLLM client is not connected")
        if not images:
            raise ModelInferenceError("Unlimited-OCR needs at least one page image")
        body = self.request_body(images, multi_page=multi_page, mode=mode, max_tokens=max_tokens)
        start = time.perf_counter()
        try:
            response = await self._client.post("/v1/chat/completions", json=body)
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPStatusError as exc:
            raise ModelInferenceError(
                f"Unlimited-OCR vLLM request failed ({exc.response.status_code}): "
                f"{exc.response.text[:500]}"
            ) from exc
        except Exception as exc:
            raise ModelInferenceError(f"Unlimited-OCR vLLM request failed: {exc}") from exc
        elapsed = time.perf_counter() - start
        usage = payload.get("usage") or {}
        generated = int(usage.get("completion_tokens") or 0)
        choices = payload.get("choices") or [{}]
        return GenerationResult(
            text=(choices[0].get("message") or {}).get("content") or "",
            prompt_tokens=int(usage.get("prompt_tokens") or 0),
            generation_tokens=generated,
            generation_tps=rounded(generated / elapsed) if elapsed > 0 and generated else None,
            peak_memory_gb=None,
        )
