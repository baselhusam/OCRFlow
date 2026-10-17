"""Unlimited-OCR engine selection, upstream recipes, and the NVIDIA engines (no GPU)."""

from __future__ import annotations

import base64
import io
from functools import partial
from pathlib import Path

import httpx
import pytest
from PIL import Image

import app.models.unlimited._cuda_engine as cuda_engine
import app.models.unlimited._engine as engine_module
from app.core.config import Settings, get_settings
from app.models.errors import ModelLoadError
from app.models.unlimited._cuda_engine import UnlimitedTransformersEngine, UnlimitedVllmEngine
from app.models.unlimited._engine import (
    MULTI_PAGE_PROMPT,
    SINGLE_PAGE_PROMPT,
    build_engine,
    generation_recipe,
    local_runtime_modules,
    resolve_engine_kind,
    resolve_model_repo,
)
from app.models.unlimited._mlx_engine import UnlimitedMlxEngine
from app.schemas.models.unlimited.document_parse import MAX_CONTEXT_TOKENS


@pytest.fixture
def host(monkeypatch):
    """Pretend to run on a given OS / CPU."""

    def set_host(system: str, machine: str) -> None:
        monkeypatch.setattr(engine_module.platform, "system", lambda: system)
        monkeypatch.setattr(engine_module.platform, "machine", lambda: machine)

    return set_host


@pytest.fixture
def settings(monkeypatch):
    for name in ("OCRFLOW_UNLIMITED_ENGINE", "OCRFLOW_UNLIMITED_MODEL", "OCRFLOW_UNLIMITED_VLLM_URL"):
        monkeypatch.delenv(name, raising=False)

    def make(**env: str) -> Settings:
        for name, value in env.items():
            monkeypatch.setenv(name, value)
        get_settings.cache_clear()
        return Settings()

    yield make
    get_settings.cache_clear()


# --- engine selection ------------------------------------------------------ #


@pytest.mark.parametrize(
    ("system", "machine", "env", "expected"),
    [
        ("Darwin", "arm64", {}, "mlx"),
        ("Linux", "x86_64", {}, "transformers"),
        ("Linux", "aarch64", {}, "transformers"),
        ("Windows", "AMD64", {}, "transformers"),
        ("Linux", "x86_64", {"OCRFLOW_UNLIMITED_VLLM_URL": "http://vllm:8000"}, "vllm"),
        # Apple Silicon keeps MLX even if a vLLM URL is configured.
        ("Darwin", "arm64", {"OCRFLOW_UNLIMITED_VLLM_URL": "http://vllm:8000"}, "mlx"),
        # An explicit engine wins over detection.
        ("Darwin", "arm64", {"OCRFLOW_UNLIMITED_ENGINE": "vllm"}, "vllm"),
        ("Linux", "x86_64", {"OCRFLOW_UNLIMITED_ENGINE": "transformers"}, "transformers"),
    ],
)
def test_engine_follows_the_host(host, settings, system, machine, env, expected):
    host(system, machine)
    assert resolve_engine_kind(settings(**env)) == expected


def test_model_repo_defaults_per_engine(host, settings):
    host("Darwin", "arm64")
    assert resolve_model_repo(settings()) == "mlx-community/Unlimited-OCR-8bit"
    host("Linux", "x86_64")
    assert resolve_model_repo(settings()) == "baidu/Unlimited-OCR"
    assert resolve_model_repo(settings(OCRFLOW_UNLIMITED_MODEL="me/custom")) == "me/custom"


def test_local_runtime_modules_follow_the_engine(host, settings):
    host("Darwin", "arm64")
    assert local_runtime_modules(settings()) == ("mlx_vlm",)
    host("Linux", "x86_64")
    assert local_runtime_modules(settings()) == ("torch", "transformers")
    assert local_runtime_modules(settings(OCRFLOW_UNLIMITED_VLLM_URL="http://vllm:8000")) == ()


def test_build_engine_returns_the_engine_class(tmp_path):
    assert isinstance(build_engine("mlx", "r", tmp_path), UnlimitedMlxEngine)
    assert isinstance(build_engine("transformers", "r", tmp_path), UnlimitedTransformersEngine)
    assert isinstance(build_engine("vllm", "r", tmp_path), UnlimitedVllmEngine)


class _CountingEngine:
    def __init__(self, kind, repo, cache_dir):
        self.kind, self.repo, self.cache_dir = kind, repo, cache_dir
        self.loads = self.unloads = 0

    async def load(self):
        self.loads += 1

    async def unload(self):
        self.unloads += 1


async def test_runners_share_one_engine_until_the_last_release(host, settings, monkeypatch, tmp_path):
    host("Linux", "x86_64")
    settings()
    built: list[_CountingEngine] = []

    def build(kind, repo, cache_dir):
        built.append(_CountingEngine(kind, repo, cache_dir))
        return built[-1]

    monkeypatch.setattr(engine_module, "build_engine", build)
    first = await engine_module.acquire_engine("baidu/Unlimited-OCR", tmp_path)
    second = await engine_module.acquire_engine("baidu/Unlimited-OCR", tmp_path)

    assert first is second and len(built) == 1
    assert first.kind == "transformers" and first.loads == 1
    await engine_module.release_engine(first)
    assert first.unloads == 0
    await engine_module.release_engine(second)
    assert first.unloads == 1


# --- upstream recipe ------------------------------------------------------- #


def test_recipes_match_upstream():
    detail = generation_recipe(multi_page=False, mode="detail")
    fast = generation_recipe(multi_page=False, mode="fast")
    multi = generation_recipe(multi_page=True, mode="detail")

    assert (detail.prompt, detail.cropping, detail.base_size, detail.image_size) == (
        SINGLE_PAGE_PROMPT, True, 1024, 640,
    )
    assert (fast.cropping, fast.base_size, fast.image_size) == (False, 1024, 1024)
    assert (multi.prompt, multi.cropping, multi.image_size) == (MULTI_PAGE_PROMPT, False, 1024)
    assert (detail.ngram_window, fast.ngram_window, multi.ngram_window) == (128, 128, 1024)
    assert SINGLE_PAGE_PROMPT == "<image>document parsing."
    assert MULTI_PAGE_PROMPT == "<image>Multi page parsing."


# --- transformers engine with a fake upstream model ------------------------ #


class _Ids:
    def __init__(self, length: int) -> None:
        self.shape = (1, length)


class _FakeUpstreamModel:
    """Mimics the remote-code ``infer`` / ``infer_multi`` calling ``self.generate``."""

    PROMPT_TOKENS = 300
    OUTPUT_TOKENS = 42

    def __init__(self) -> None:
        self.calls: list[tuple[str, dict]] = []
        self.generate_kwargs: dict = {}

    def generate(self, **kwargs):
        self.generate_kwargs = kwargs
        return _Ids(self.PROMPT_TOKENS + self.OUTPUT_TOKENS)

    def _generate_like_upstream(self, max_length):
        self.generate(
            input_ids=_Ids(self.PROMPT_TOKENS),
            max_length=max_length,
            streamer=object(),
            eos_token_id=1,
        )

    def infer(self, tokenizer, **kwargs):
        assert Path(kwargs["image_file"]).is_file()
        self.calls.append(("infer", kwargs))
        self._generate_like_upstream(kwargs["max_length"])
        return "<|det|>text [0, 0, 999, 100]<|/det|>Hello"

    def infer_multi(self, tokenizer, **kwargs):
        assert all(Path(path).is_file() for path in kwargs["image_files"])
        self.calls.append(("infer_multi", kwargs))
        self._generate_like_upstream(kwargs["max_length"])
        return "<PAGE>one<PAGE>two", 7


def _loaded_transformers_engine(tmp_path) -> tuple[UnlimitedTransformersEngine, _FakeUpstreamModel]:
    engine = UnlimitedTransformersEngine("baidu/Unlimited-OCR", tmp_path)
    model = _FakeUpstreamModel()
    engine._model, engine._tokenizer = model, object()
    return engine, model


def _page() -> Image.Image:
    return Image.new("RGB", (120, 160), "white")


@pytest.mark.parametrize(
    ("mode", "crop_mode", "image_size"), [("detail", True, 640), ("fast", False, 1024)]
)
async def test_transformers_single_page_uses_upstream_views(tmp_path, mode, crop_mode, image_size):
    engine, model = _loaded_transformers_engine(tmp_path)

    result = await engine.generate([_page()], multi_page=False, mode=mode, max_tokens=512)

    name, kwargs = model.calls[0]
    assert name == "infer"
    assert kwargs["prompt"] == "<image>document parsing."
    assert (kwargs["crop_mode"], kwargs["base_size"], kwargs["image_size"]) == (crop_mode, 1024, image_size)
    assert (kwargs["no_repeat_ngram_size"], kwargs["ngram_window"]) == (35, 128)
    assert kwargs["eval_mode"] is True and kwargs["temperature"] == 0.0
    assert kwargs["max_length"] == MAX_CONTEXT_TOKENS
    # The runner's output budget replaces upstream's total max_length; no stdout streamer.
    assert model.generate_kwargs["max_new_tokens"] == 512
    assert "max_length" not in model.generate_kwargs and "streamer" not in model.generate_kwargs
    assert result.text.endswith("Hello")
    assert (result.prompt_tokens, result.generation_tokens) == (300, 42)
    # The per-call generate wrapper is removed again.
    assert "generate" not in vars(model)


async def test_transformers_multi_page_uses_base_view_and_wide_window(tmp_path):
    engine, model = _loaded_transformers_engine(tmp_path)

    result = await engine.generate([_page(), _page()], multi_page=True, max_tokens=4096)

    name, kwargs = model.calls[0]
    assert name == "infer_multi"
    assert kwargs["prompt"] == "<image>Multi page parsing."
    assert len(kwargs["image_files"]) == 2 and kwargs["image_size"] == 1024
    assert (kwargs["no_repeat_ngram_size"], kwargs["ngram_window"]) == (35, 1024)
    assert kwargs["save_results"] is False
    assert model.generate_kwargs["max_new_tokens"] == 4096
    assert result.text == "<PAGE>one<PAGE>two" and result.generation_tokens == 42


async def test_transformers_engine_refuses_hosts_without_cuda(tmp_path, monkeypatch):
    torch = pytest.importorskip("torch")
    pytest.importorskip("transformers")
    monkeypatch.setattr(torch.cuda, "is_available", lambda: False)

    with pytest.raises(ModelLoadError, match="NVIDIA GPU"):
        await UnlimitedTransformersEngine("baidu/Unlimited-OCR", tmp_path).load()


# --- vLLM engine against a mock OpenAI server ------------------------------ #


@pytest.fixture
def vllm_server(monkeypatch):
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/v1/models":
            return httpx.Response(200, json={"data": [{"id": "baidu/Unlimited-OCR"}]})
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "<|det|>text [0, 0, 999, 100]<|/det|>Hi"}}],
                "usage": {"prompt_tokens": 900, "completion_tokens": 30},
            },
        )

    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(cuda_engine.httpx, "AsyncClient", partial(httpx.AsyncClient, transport=transport))
    return requests


async def test_vllm_engine_sends_upstream_recipe(tmp_path, vllm_server):
    import json

    engine = UnlimitedVllmEngine("baidu/Unlimited-OCR", tmp_path, base_url="http://vllm:8000/v1")
    await engine.load()
    result = await engine.generate([_page()], multi_page=False, mode="detail", max_tokens=2048)
    await engine.generate([_page()], multi_page=False, mode="fast", max_tokens=2048)
    await engine.generate([_page(), _page(), _page()], multi_page=True, max_tokens=8000)
    await engine.unload()

    detail, fast, multi = (json.loads(request.content) for request in vllm_server[1:])
    content = detail["messages"][0]["content"]
    assert content[0] == {"type": "text", "text": "<image>document parsing."}
    assert content[1]["image_url"]["url"].startswith("data:image/png;base64,")
    image = Image.open(io.BytesIO(base64.b64decode(content[1]["image_url"]["url"].split(",", 1)[1])))
    assert image.size == (120, 160)
    assert detail["model"] == "baidu/Unlimited-OCR" and detail["max_tokens"] == 2048
    assert detail["temperature"] == 0.0 and detail["skip_special_tokens"] is False
    assert detail["vllm_xargs"] == {"ngram_size": 35, "window_size": 128}
    assert "mm_processor_kwargs" not in detail
    assert fast["mm_processor_kwargs"] == {"crop_mode": False}
    assert multi["messages"][0]["content"][0]["text"] == "<image>Multi page parsing."
    assert len(multi["messages"][0]["content"]) == 4
    assert multi["vllm_xargs"]["window_size"] == 1024 and "mm_processor_kwargs" not in multi
    assert result.text.endswith("Hi")
    assert (result.prompt_tokens, result.generation_tokens) == (900, 30)


async def test_vllm_engine_rejects_a_server_serving_another_model(tmp_path, vllm_server):
    engine = UnlimitedVllmEngine("someone/else", tmp_path, base_url="http://vllm:8000")
    with pytest.raises(ModelLoadError, match="OCRFLOW_UNLIMITED_MODEL"):
        await engine.load()


async def test_vllm_engine_needs_a_url(tmp_path):
    with pytest.raises(ModelLoadError, match="OCRFLOW_UNLIMITED_VLLM_URL"):
        await UnlimitedVllmEngine("baidu/Unlimited-OCR", tmp_path, base_url="").load()
