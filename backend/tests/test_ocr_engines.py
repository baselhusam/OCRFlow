"""Remote engine validation is protocol-aware, not just a port check."""

from __future__ import annotations

import httpx

from app.models.servable import models_for_provider
from app.schemas.ocr_engine import EngineValidationRequest
from app.services import ocr_engines


def _mock_client(handler):
    real_client = httpx.AsyncClient

    def factory(*_args, **_kwargs):
        return real_client(transport=httpx.MockTransport(handler))

    return factory


async def test_engine_validation_reports_partial_capabilities(monkeypatch):
    supported = models_for_provider("surya")
    available = supported[0].model_id

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/internal/health":
            return httpx.Response(
                200,
                json={
                    "status": "ok",
                    "provider": "surya",
                    "api_version": "1",
                    "engine_version": "0.1.0",
                },
            )
        if request.url.path == "/internal/capabilities":
            return httpx.Response(200, json={"models": [available]})
        if request.url.path == f"/internal/models/{available}/health":
            return httpx.Response(200, json={"model_id": available, "loaded": True})
        return httpx.Response(404)

    monkeypatch.setattr(ocr_engines.httpx, "AsyncClient", _mock_client(handler))
    result = await ocr_engines.validate_engine(
        EngineValidationRequest(provider="surya", base_url="http://engine:8101")
    )

    assert result.status == "partial"
    assert result.api_version == "1"
    assert [check.model_id for check in result.model_checks if check.available] == [available]
    assert any(not check.available for check in result.model_checks)


async def test_engine_validation_detects_required_credentials(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/internal/health"
        return httpx.Response(401, json={"detail": "API key required"})

    monkeypatch.setattr(ocr_engines.httpx, "AsyncClient", _mock_client(handler))
    result = await ocr_engines.validate_engine(
        EngineValidationRequest(provider="paddle", base_url="http://engine:8103")
    )

    assert result.status == "authentication_required"
    assert result.authentication_required is True


async def test_engine_validation_explains_protocol_version_mismatch(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "status": "ok",
                "provider": "docling",
                "api_version": "0",
                "engine_version": "0.9.0",
            },
        )

    monkeypatch.setattr(ocr_engines.httpx, "AsyncClient", _mock_client(handler))
    result = await ocr_engines.validate_engine(
        EngineValidationRequest(provider="docling", base_url="http://engine:8102")
    )

    assert result.status == "incompatible"
    assert "protocol v0" in result.detail
    assert "protocol v1" in result.detail
