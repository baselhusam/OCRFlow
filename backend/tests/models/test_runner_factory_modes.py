"""Runner-factory routing across local vs remote runner modes."""

from __future__ import annotations

import pytest

from app.core.config import get_settings
from app.models import runner_factory
from app.models.base_runner import BaseRunner
from app.models.remote_runner import RemoteModelRunner


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
