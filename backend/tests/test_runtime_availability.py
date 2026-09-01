"""Runtime availability probing (local vs remote), no Docker required."""

from __future__ import annotations

import httpx
import pytest

from app.core.config import Settings
from app.services import runtime_availability
from app.services.runtime_availability import get_runtime_availability


async def _no_configured_engines():
    return {}


async def test_local_mode_reports_importable_providers(monkeypatch):
    settings = Settings(runner_mode="local")

    def fake_find_spec(name: str):
        if name in {"docling", "surya"}:
            return object()
        return None

    monkeypatch.setattr(
        runtime_availability.importlib.util, "find_spec", fake_find_spec
    )
    real_client = httpx.AsyncClient

    def fake_client(*_args, **_kwargs):
        return real_client(
            transport=httpx.MockTransport(
                lambda request: httpx.Response(200, json={"models": []})
            )
        )

    monkeypatch.setattr(runtime_availability.httpx, "AsyncClient", fake_client)
    monkeypatch.setattr(
        runtime_availability, "get_live_engine_capabilities", _no_configured_engines
    )

    result = await get_runtime_availability(settings)

    assert result.mode == "local"
    running = {p.provider: p.running for p in result.providers}
    assert running == {
        "docling": True,
        "surya": True,
        "paddle": False,
        "ollama": True,
    }
    paddle = next(p for p in result.providers if p.provider == "paddle")
    assert paddle.detail and "paddleocr" in paddle.detail


async def test_remote_mode_reports_reachable_providers(monkeypatch):
    settings = Settings(
        runner_mode="remote",
        docling_service_url="http://docling:8000",
        surya_service_url="http://surya:8000",
        paddle_service_url="http://paddle:8000",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        # Only paddle is "up"; others refuse the connection.
        if request.url.host == "paddle":
            return httpx.Response(200, json={"status": "ok", "provider": "paddle"})
        raise httpx.ConnectError("down")

    real_client = httpx.AsyncClient

    def fake_client(*_args, **_kwargs):
        return real_client(transport=httpx.MockTransport(handler))

    monkeypatch.setattr(runtime_availability.httpx, "AsyncClient", fake_client)
    monkeypatch.setattr(
        runtime_availability, "get_live_engine_capabilities", _no_configured_engines
    )

    result = await get_runtime_availability(settings)
    assert result.mode == "remote"
    running = {p.provider: p.running for p in result.providers}
    assert running == {
        "paddle": True,
        "docling": False,
        "surya": False,
        "ollama": False,
    }


async def test_remote_mode_missing_url_marks_provider_offline(monkeypatch):
    settings = Settings(
        runner_mode="remote",
        docling_service_url="",
        surya_service_url="http://surya:8000",
        paddle_service_url="http://paddle:8000",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"status": "ok"})

    real_client = httpx.AsyncClient

    def fake_client(*_args, **_kwargs):
        return real_client(transport=httpx.MockTransport(handler))

    monkeypatch.setattr(runtime_availability.httpx, "AsyncClient", fake_client)
    monkeypatch.setattr(
        runtime_availability, "get_live_engine_capabilities", _no_configured_engines
    )

    result = await get_runtime_availability(settings)
    running = {p.provider: p.running for p in result.providers}
    assert running["docling"] is False
    assert running["surya"] is True
    assert running["paddle"] is True


async def test_configured_engine_overrides_offline_default_provider(monkeypatch):
    settings = Settings(
        runner_mode="remote",
        docling_service_url="http://docling:8000",
        surya_service_url="http://surya:8000",
        paddle_service_url="http://paddle:8000",
    )

    def handler(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down")

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        runtime_availability.httpx,
        "AsyncClient",
        lambda *_args, **_kwargs: real_client(transport=httpx.MockTransport(handler)),
    )

    from app.schemas.ocr_engine import EngineModelCheck, EngineValidation

    async def configured():
        return {
            "surya": (
                "LAN Surya",
                EngineValidation(
                    status="partial",
                    detail="One model passed.",
                    provider="surya",
                    api_version="1",
                    model_checks=[EngineModelCheck(model_id="surya/layout", available=True)],
                ),
            )
        }

    monkeypatch.setattr(runtime_availability, "get_live_engine_capabilities", configured)
    result = await get_runtime_availability(settings)
    surya = next(provider for provider in result.providers if provider.provider == "surya")
    assert surya.running is True
    assert surya.mode == "configured"
    assert surya.models == ["surya/layout"]
