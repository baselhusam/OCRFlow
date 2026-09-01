"""Runner-factory routing across local vs remote runner modes."""

from __future__ import annotations

import pytest

from app.core.config import get_settings
from app.models import runner_factory
from app.models.base_runner import BaseRunner
from app.models.errors import ModelLoadError
from app.models.remote_runner import RemoteModelRunner
from app.services.ocr_engines import EngineTarget


@pytest.fixture
def reset_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_local_mode_uses_local_runner(monkeypatch, reset_settings):
    monkeypatch.setenv("OCRFLOW_RUNNER_MODE", "local")
    get_settings.cache_clear()

    runner = runner_factory.build_runner("paddle/doclayout-s")
    assert isinstance(runner, BaseRunner)
    assert not isinstance(runner, RemoteModelRunner)


def test_remote_mode_uses_remote_runner_for_provider(monkeypatch, reset_settings):
    monkeypatch.setenv("OCRFLOW_RUNNER_MODE", "remote")
    monkeypatch.setenv("OCRFLOW_PADDLE_SERVICE_URL", "http://paddle:8000")
    get_settings.cache_clear()

    runner = runner_factory.build_runner("paddle/doclayout-s")
    assert isinstance(runner, RemoteModelRunner)
    assert runner._service_url == "http://paddle:8000"


def test_remote_mode_keeps_loaders_local(monkeypatch, reset_settings):
    monkeypatch.setenv("OCRFLOW_RUNNER_MODE", "remote")
    get_settings.cache_clear()

    runner = runner_factory.build_runner("loader/pdf")
    assert not isinstance(runner, RemoteModelRunner)


def test_provider_service_stays_local_in_remote_env(monkeypatch, reset_settings):
    monkeypatch.setenv("OCRFLOW_RUNNER_MODE", "remote")
    monkeypatch.setenv("OCRFLOW_SERVICE_PROVIDER", "surya")
    monkeypatch.setenv("OCRFLOW_SURYA_SERVICE_URL", "http://127.0.0.1:8101")
    get_settings.cache_clear()

    runner = runner_factory.build_runner("surya/layout")
    assert isinstance(runner, BaseRunner)
    assert not isinstance(runner, RemoteModelRunner)


def test_remote_mode_missing_url_raises(monkeypatch, reset_settings):
    monkeypatch.setenv("OCRFLOW_RUNNER_MODE", "remote")
    monkeypatch.setenv("OCRFLOW_PADDLE_SERVICE_URL", "")
    get_settings.cache_clear()

    with pytest.raises(runner_factory.ProviderServiceUnavailableError):
        runner_factory.build_runner("paddle/doclayout-s")


def test_unknown_model_raises(monkeypatch, reset_settings):
    monkeypatch.delenv("OCRFLOW_RUNNER_MODE", raising=False)
    get_settings.cache_clear()

    with pytest.raises(Exception):
        runner_factory.build_runner("nope/not-a-model")


def test_missing_optional_import_is_model_load_error(monkeypatch, reset_settings):
    monkeypatch.setenv("OCRFLOW_RUNNER_MODE", "local")
    get_settings.cache_clear()

    def _missing(_name: str):
        raise ImportError("No module named 'docling'")

    monkeypatch.setattr(runner_factory.importlib, "import_module", _missing)

    with pytest.raises(ModelLoadError, match="docling"):
        runner_factory.build_runner("docling/layout-heron")


@pytest.mark.asyncio
async def test_probe_health_when_optional_dep_missing(monkeypatch, reset_settings):
    monkeypatch.setenv("OCRFLOW_RUNNER_MODE", "local")
    get_settings.cache_clear()

    def _missing(_name: str):
        raise ImportError("No module named 'docling'")

    monkeypatch.setattr(runner_factory.importlib, "import_module", _missing)

    health = await runner_factory.probe_runner_health("docling/layout-heron")
    assert health.model_id == "docling/layout-heron"
    assert health.loaded is False
    assert health.message is not None
    assert "docling" in health.message.lower()


@pytest.mark.asyncio
async def test_probe_health_when_remote_provider_url_missing(monkeypatch, reset_settings):
    monkeypatch.setenv("OCRFLOW_RUNNER_MODE", "remote")
    monkeypatch.setenv("OCRFLOW_PADDLE_SERVICE_URL", "")
    get_settings.cache_clear()

    health = await runner_factory.probe_runner_health("paddle/doclayout-s")
    assert health.model_id == "paddle/doclayout-s"
    assert health.loaded is False
    assert health.message is not None


@pytest.mark.asyncio
async def test_local_mode_uses_a_verified_external_engine(monkeypatch, reset_settings):
    monkeypatch.setenv("OCRFLOW_RUNNER_MODE", "local")
    get_settings.cache_clear()

    async def external_target(provider: str, model_id: str):
        assert (provider, model_id) == ("paddle", "paddle/doclayout-s")
        return EngineTarget(base_url="http://lan-paddle:9103", headers={})

    monkeypatch.setattr(runner_factory, "resolve_engine_target", external_target)
    await runner_factory.get_runner_cache().unload_all()

    runner = await runner_factory.get_cached_runner(
        "paddle/doclayout-s", runner_factory.get_settings().build_model_config()
    )
    assert isinstance(runner, RemoteModelRunner)
    assert runner._service_url == "http://lan-paddle:9103"
