"""Remote engine validation is protocol-aware, not just a port check."""

from __future__ import annotations

import ipaddress
from types import SimpleNamespace

import httpx
import pytest
from pydantic import ValidationError

from app.core import engine_url
from app.core.engine_url import EngineUrlSafetyError, assert_safe_engine_url, normalise_engine_url
from app.models.servable import models_for_provider
from app.schemas.ocr_engine import EngineConnectionCreate, EngineValidationRequest
from app.services import ocr_engines


def _mock_client(handler):
    real_client = httpx.AsyncClient

    def factory(*_args, **_kwargs):
        return real_client(transport=httpx.MockTransport(handler))

    return factory


async def _allow_engine_url(value: str) -> str:
    """Keep protocol tests independent of local DNS."""
    return value.rstrip("/")


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
    monkeypatch.setattr(ocr_engines, "assert_safe_engine_url", _allow_engine_url)
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
    monkeypatch.setattr(ocr_engines, "assert_safe_engine_url", _allow_engine_url)
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
    monkeypatch.setattr(ocr_engines, "assert_safe_engine_url", _allow_engine_url)
    result = await ocr_engines.validate_engine(
        EngineValidationRequest(provider="docling", base_url="http://engine:8102")
    )

    assert result.status == "incompatible"
    assert "protocol v0" in result.detail
    assert "protocol v1" in result.detail


@pytest.mark.parametrize(
    "url, message",
    [
        ("http://169.254.169.254", "Link-local addresses"),
        ("http://169.254.170.2", "Link-local addresses"),
        ("http://[::ffff:169.254.169.254]", "Link-local addresses"),
        ("http://100.100.100.200", "Cloud metadata"),
        ("http://[fd00:ec2::254]", "Cloud metadata"),
        ("http://metadata.google.internal", "Cloud metadata"),
        ("http://key@engine.local", "must not include credentials"),
    ],
)
def test_engine_url_schema_rejects_metadata_and_ambiguous_targets(url, message):
    with pytest.raises(ValidationError, match=message):
        EngineValidationRequest(provider="surya", base_url=url)


def test_engine_url_schema_keeps_lan_and_localhost_origins_usable():
    assert normalise_engine_url(" http://10.42.0.8:8101/ ") == "http://10.42.0.8:8101"
    assert normalise_engine_url("http://127.0.0.1:8101") == "http://127.0.0.1:8101"
    assert normalise_engine_url("http://[::1]:8101") == "http://[::1]:8101"
    assert normalise_engine_url("https://ocr-engine.office.lan/ocr/") == (
        "https://ocr-engine.office.lan/ocr"
    )
    assert normalise_engine_url("https://ocr-engine.office.lan") == "https://ocr-engine.office.lan"


async def test_engine_validation_blocks_hostname_resolving_to_cloud_metadata(monkeypatch):
    def metadata_dns(*_args, **_kwargs):
        return {ipaddress.ip_address("169.254.169.254")}

    monkeypatch.setattr(engine_url, "_resolve_host_addresses", metadata_dns)
    result = await ocr_engines.validate_engine(
        EngineValidationRequest(provider="surya", base_url="http://ocr-engine.office.lan:8101")
    )

    assert result.status == "blocked"
    assert "Link-local addresses" in result.detail


async def test_engine_url_dns_check_allows_private_lan_and_loopback(monkeypatch):
    def lan_dns(*_args, **_kwargs):
        return {ipaddress.ip_address("10.42.0.8"), ipaddress.ip_address("127.0.0.1")}

    monkeypatch.setattr(engine_url, "_resolve_host_addresses", lan_dns)
    assert await assert_safe_engine_url("http://ocr-engine.office.lan:8101") == (
        "http://ocr-engine.office.lan:8101"
    )


async def test_create_engine_does_not_persist_a_dns_blocked_url(monkeypatch):
    class RecordingSession:
        added = False
        committed = False

        def add(self, _engine):
            self.added = True

        async def commit(self):
            self.committed = True

    async def blocked_dns(_url: str) -> str:
        raise EngineUrlSafetyError("Link-local addresses are not allowed.")

    db = RecordingSession()
    monkeypatch.setattr(ocr_engines, "assert_safe_engine_url", blocked_dns)
    payload = EngineConnectionCreate(
        name="Office Surya", provider="surya", base_url="http://ocr-engine.office.lan:8101"
    )

    with pytest.raises(EngineUrlSafetyError, match="Link-local"):
        await ocr_engines.create_engine(db, payload)

    assert db.added is False
    assert db.committed is False


async def test_runtime_routing_skips_unsafe_legacy_engine_rows(monkeypatch):
    model_id = models_for_provider("surya")[0].model_id
    legacy_engine = SimpleNamespace(
        provider="surya",
        enabled=True,
        base_url="http://legacy-engine.office.lan:8101",
        auth_type="none",
        encrypted_api_key=None,
        last_validation={
            "status": "ready",
            "model_checks": [{"model_id": model_id, "available": True}],
        },
    )

    class Result:
        def scalars(self):
            return [legacy_engine]

    class Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def execute(self, _query):
            return Result()

    async def blocked_dns(_url: str) -> str:
        raise EngineUrlSafetyError("Link-local addresses are not allowed.")

    monkeypatch.setattr(ocr_engines, "async_session_factory", lambda: Session())
    monkeypatch.setattr(ocr_engines, "assert_safe_engine_url", blocked_dns)

    assert await ocr_engines.resolve_engine_target("surya", model_id) is None
