"""Tests for RemoteModelRunner forwarding behavior (no network / no Docker)."""

from __future__ import annotations

import httpx
import pytest

from app.models.base import ModelConfig
from app.models.errors import (
    ModelInferenceError,
    ModelLoadError,
    ModelValidationError,
)
from app.models.registry import ModelNotFoundError
from app.models.remote_runner import RemoteModelRunner
from app.services.ocr_engines import EngineTarget
from app.models.servable import get_servable_model
from app.schemas.artifacts import LayoutLabel, Region
from app.schemas.models.paddle._meta import InferenceMeta
from app.schemas.models.paddle.doclayout import DocLayoutInput, DocLayoutOutput

SERVICE_URL = "http://paddle:8000"


def _make_runner(handler) -> RemoteModelRunner:
    servable = get_servable_model("paddle/doclayout-s")
    assert servable is not None
    runner = RemoteModelRunner(servable, SERVICE_URL)
    # Inject a mock transport through the overridable client factory.
    runner._new_client = lambda: httpx.AsyncClient(  # type: ignore[method-assign]
        transport=httpx.MockTransport(handler)
    )
    return runner


def _sample_input(sample_page_image) -> DocLayoutInput:
    return DocLayoutInput(page=sample_page_image)


def _valid_output_dict() -> dict:
    return DocLayoutOutput(
        page_index=0,
        regions=[
            Region(
                id="r1",
                label=LayoutLabel.paragraph,
                bbox=[0.1, 0.2, 0.9, 0.8],
                confidence=0.9,
            )
        ],
        meta=InferenceMeta(model_id="paddle/doclayout-s", latency_ms=1.0),
    ).model_dump(mode="json", by_alias=True)


async def _load(runner: RemoteModelRunner) -> None:
    await runner.load(ModelConfig(timeout_seconds=30))


async def test_forwards_and_parses_typed_output(sample_page_image):
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["method"] = request.method
        return httpx.Response(200, json=_valid_output_dict())

    runner = _make_runner(handler)
    await _load(runner)
    result = await runner.run(_sample_input(sample_page_image))

    assert isinstance(result, DocLayoutOutput)
    assert result.regions[0].id == "r1"
    assert captured["method"] == "POST"
    assert captured["url"] == f"{SERVICE_URL}/internal/models/paddle/doclayout-s"


async def test_configured_engine_is_used_for_a_validated_model(monkeypatch, sample_page_image):
    captured = {}

    async def configured_target(_provider: str, _model_id: str):
        return EngineTarget(
            base_url="http://lan-paddle:9103", headers={"X-API-Key": "secret"}
        )

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["api_key"] = request.headers.get("x-api-key")
        return httpx.Response(200, json=_valid_output_dict())

    monkeypatch.setattr("app.models.remote_runner.resolve_engine_target", configured_target)
    runner = _make_runner(handler)
    await _load(runner)
    await runner.run(_sample_input(sample_page_image))

    assert captured == {
        "url": "http://lan-paddle:9103/internal/models/paddle/doclayout-s",
        "api_key": "secret",
    }


async def test_service_inference_error_maps_to_inference_error(sample_page_image):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            503, json={"detail": "boom", "error_code": "model_inference"}
        )

    runner = _make_runner(handler)
    await _load(runner)
    with pytest.raises(ModelInferenceError):
        await runner.run(_sample_input(sample_page_image))


async def test_service_load_error_maps_to_load_error(sample_page_image):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            503, json={"detail": "no deps", "error_code": "model_load"}
        )

    runner = _make_runner(handler)
    await _load(runner)
    with pytest.raises(ModelLoadError):
        await runner.run(_sample_input(sample_page_image))


async def test_service_not_found_maps_to_not_found(sample_page_image):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"detail": "nope", "error_code": "model_not_found"})

    runner = _make_runner(handler)
    await _load(runner)
    with pytest.raises(ModelNotFoundError):
        await runner.run(_sample_input(sample_page_image))


async def test_invalid_output_maps_to_validation_error(sample_page_image):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"unexpected": "shape"})

    runner = _make_runner(handler)
    await _load(runner)
    with pytest.raises(ModelValidationError):
        await runner.run(_sample_input(sample_page_image))


async def test_unreachable_service_maps_to_load_error(sample_page_image):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    runner = _make_runner(handler)
    await _load(runner)
    with pytest.raises(ModelLoadError):
        await runner.run(_sample_input(sample_page_image))


async def test_health_reports_service_model_health(sample_page_image):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/internal/models/paddle/doclayout-s/health"
        return httpx.Response(
            200,
            json={"model_id": "paddle/doclayout-s", "loaded": True, "device": "cpu"},
        )

    runner = _make_runner(handler)
    await _load(runner)
    health = await runner.health()
    assert health.loaded is True
    assert health.model_id == "paddle/doclayout-s"


async def test_health_unreachable_reports_not_loaded(sample_page_image):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down")

    runner = _make_runner(handler)
    await _load(runner)
    health = await runner.health()
    assert health.loaded is False
    assert "unreachable" in (health.message or "")
