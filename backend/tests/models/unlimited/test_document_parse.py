"""Unlimited-OCR contracts, remote wiring, pipeline payloads, and runners."""

from __future__ import annotations

import base64
import io

import pytest
from PIL import Image
from pydantic import ValidationError

import app.internal_service.app as internal_app
import app.models.unlimited.document_parse as document_parse
from app.core.config import get_settings
from app.models.base import ModelConfig
from app.models.remote_runner import RemoteModelRunner
from app.models.runner_factory import build_runner
from app.models.servable import models_for_provider
from app.models.timeout_policy import resolve_inference_timeout
from app.models.unlimited._mlx_engine import GenerationResult, multi_page_token_budget
from app.schemas.models.unlimited.document_parse import (
    UnlimitedDocumentParseInput,
    UnlimitedMultiPageParseInput,
)
from app.services.pipeline_execution.registry import build_model_input, extract_model_output
from app.services.pipeline_execution.schemas import NodeCachedOutput, PipelineNodeRecord
from app.services.pipeline_execution.upstream import UpstreamContext
from app.services.pipeline_wire_kinds import are_wire_kinds_compatible, get_model_wire_kinds

MODELS = {"unlimited/document-parse", "unlimited/multi-page-parse"}


def test_page_options_default_to_detail_mode(sample_page_image):
    payload = UnlimitedDocumentParseInput(page=sample_page_image)

    assert payload.options.mode == "detail"
    assert payload.options.max_tokens == 8192
    assert payload.options.include_furniture is False


def test_page_options_reject_unknown_modes_and_oversized_passes(sample_page_image):
    with pytest.raises(ValidationError):
        UnlimitedDocumentParseInput(page=sample_page_image, options={"mode": "gundam"})
    with pytest.raises(ValidationError):
        UnlimitedMultiPageParseInput(
            document={"source": "asset:abc", "format": "pdf"},
            options={"pages_per_pass": 17},
        )


def test_multi_page_budget_leaves_room_after_page_tokens():
    assert multi_page_token_budget(8) == 32_768 - 8 * 273 - 64
    assert multi_page_token_budget(16) > 27_000


def test_unlimited_models_are_servable_remotely(monkeypatch):
    monkeypatch.setenv("OCRFLOW_RUNNER_MODE", "remote")
    monkeypatch.setenv("OCRFLOW_UNLIMITED_SERVICE_URL", "http://127.0.0.1:8105")
    get_settings.cache_clear()
    try:
        runner = build_runner("unlimited/multi-page-parse")
    finally:
        get_settings.cache_clear()

    assert isinstance(runner, RemoteModelRunner)
    assert runner._service_url == "http://127.0.0.1:8105"
    assert {model.model_id for model in models_for_provider("unlimited")} == MODELS


async def test_unlimited_service_advertises_its_models(monkeypatch):
    monkeypatch.setenv("OCRFLOW_SERVICE_PROVIDER", "unlimited")
    get_settings.cache_clear()
    try:
        app = internal_app.create_internal_app()
        route = next(
            route for route in app.routes if getattr(route, "path", None) == "/internal/capabilities"
        )
        payload = await route.endpoint()
    finally:
        get_settings.cache_clear()

    assert payload["provider"] == "unlimited"
    assert set(payload["models"]) == MODELS


def test_wire_kinds_and_timeouts():
    assert get_model_wire_kinds("unlimited/document-parse") == {
        "input": "page_artifact",
        "output": "document_artifact",
    }
    assert get_model_wire_kinds("unlimited/multi-page-parse")["input"] == "document_input"
    assert are_wire_kinds_compatible("document_artifact", "text")
    settings = get_settings()
    assert resolve_inference_timeout("unlimited/multi-page-parse", settings) == (
        settings.document_conversion_timeout_seconds
    )


def test_page_payload_uses_upstream_page_and_node_options(sample_page_image):
    node = PipelineNodeRecord(
        id="parse",
        modelId="unlimited/document-parse",
        config={"mode": "fast", "max_tokens": 4096, "include_furniture": True},
    )
    upstream = UpstreamContext(
        node_id="page",
        output=NodeCachedOutput(kind="page", raw={"page": {"page": sample_page_image.model_dump()}}),
        source_handle="output",
        edge=None,
    )

    model_input = build_model_input(project_id="p1", node=node, upstream=upstream)

    assert isinstance(model_input, UnlimitedDocumentParseInput)
    assert model_input.options.mode == "fast"
    assert model_input.options.max_tokens == 4096
    assert model_input.options.include_furniture is True


def test_document_payload_reads_the_upstream_loader_asset():
    loader = PipelineNodeRecord(id="pdf", modelId="loader/pdf", config={"assetId": "a1", "format": "pdf"})
    node = PipelineNodeRecord(
        id="parse",
        modelId="unlimited/multi-page-parse",
        config={"pages_per_pass": 4, "dpi": 150},
    )
    upstream = UpstreamContext(
        node_id="pdf",
        output=None,
        source_handle="output",
        edge=None,
        node=loader,
    )

    model_input = build_model_input(project_id="p1", node=node, upstream=upstream)

    assert isinstance(model_input, UnlimitedMultiPageParseInput)
    assert model_input.document.source == "asset:a1"
    assert model_input.options.project_id == "p1"
    assert (model_input.options.pages_per_pass, model_input.options.dpi) == (4, 150)


class FakeEngine:
    repo = "mlx-community/Unlimited-OCR-8bit"

    def __init__(self) -> None:
        self.calls: list[tuple[int, bool, str, int]] = []

    async def generate(self, images, *, multi_page, mode="detail", max_tokens):
        self.calls.append((len(images), multi_page, mode, max_tokens))
        if not multi_page:
            text = "<|det|>title [0, 0, 999, 100]<|/det|>Hello\n<|det|>text [0, 200, 999, 300]<|/det|>World"
        else:
            text = "".join(
                f"<PAGE><|det|>text [0, 0, 999, 100]<|/det|>page {len(self.calls)}.{index}"
                for index in range(len(images))
            )
        return GenerationResult(
            text=text,
            prompt_tokens=273 * len(images),
            generation_tokens=12,
            generation_tps=250.0,
            peak_memory_gb=6.0,
        )


@pytest.fixture
def fake_engine(monkeypatch):
    engine = FakeEngine()

    async def acquire(_repo, _cache_dir):
        return engine

    async def release(_engine):
        return None

    monkeypatch.setattr(document_parse, "acquire_engine", acquire)
    monkeypatch.setattr(document_parse, "release_engine", release)
    return engine


async def test_page_runner_returns_document_markdown_and_meta(fake_engine, sample_page_image):
    runner = document_parse.UnlimitedDocumentParseRunner()
    await runner.load(ModelConfig())

    result = await runner.run(
        UnlimitedDocumentParseInput(page=sample_page_image, options={"mode": "fast"})
    )

    assert fake_engine.calls == [(1, False, "fast", 8192)]
    assert result.markdown == "## Hello\n\nWorld"
    assert len(result.document.pages[0].regions) == 2
    assert result.meta.page_count == 1 and result.meta.generation_tps == 250.0
    cached = extract_model_output("unlimited/document-parse", result)
    assert cached.kind == "document"
    assert cached.preview["markdownPreview"] == "## Hello\n\nWorld"


def _pdf_base64(pages: int) -> str:
    images = [Image.new("RGB", (200, 260), "white") for _ in range(pages)]
    buffer = io.BytesIO()
    images[0].save(buffer, format="PDF", save_all=True, append_images=images[1:])
    return base64.b64encode(buffer.getvalue()).decode("ascii")


async def test_multi_page_runner_reads_in_chunks_and_caps_pages(fake_engine):
    runner = document_parse.UnlimitedMultiPageParseRunner()
    await runner.load(ModelConfig())

    result = await runner.run(
        UnlimitedMultiPageParseInput(
            document={"source": _pdf_base64(5), "format": "pdf"},
            options={"pages_per_pass": 2, "max_pages": 4, "dpi": 72},
        )
    )

    assert [call[:2] for call in fake_engine.calls] == [(2, True), (2, True)]
    assert fake_engine.calls[0][3] == multi_page_token_budget(2)
    assert [page.page_index for page in result.document.pages] == [0, 1, 2, 3]
    assert result.meta.passes == 2 and result.meta.page_count == 4
    assert result.meta.truncated_pages == 1
    assert result.markdown.count("\n\n---\n\n") == 3
    assert result.markdown.endswith("page 2.1")
    assert any("max_pages" in warning for warning in result.meta.warnings)
