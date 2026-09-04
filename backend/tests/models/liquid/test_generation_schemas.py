"""Liquid LFM2.5-VL request contracts and remote-service wiring."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import get_settings
from app.models.remote_runner import RemoteModelRunner
from app.models.runner_factory import build_runner
from app.models.servable import models_for_provider
import app.internal_service.app as internal_app
from app.schemas.models.liquid.generation import (
    DEFAULT_VISION_MODEL,
    LiquidVisionInput,
    LiquidVisionStructuredInput,
)


def test_liquid_defaults_to_lfm2_5_vl_1_6b(sample_page_image):
    payload = LiquidVisionInput(page=sample_page_image)

    assert payload.options.model == DEFAULT_VISION_MODEL
    assert payload.options.temperature == 0.1


def test_liquid_rejects_an_unserved_checkpoint(sample_page_image):
    with pytest.raises(ValidationError, match="model must be"):
        LiquidVisionInput(
            page=sample_page_image,
            options={"model": "LiquidAI/LFM2.5-VL-450M"},
        )


def test_liquid_structured_request_requires_an_object_schema(sample_page_image):
    with pytest.raises(ValidationError, match="top-level object"):
        LiquidVisionStructuredInput(
            page=sample_page_image,
            json_schema={"type": "array", "items": {"type": "string"}},
        )


def test_liquid_models_are_servable_remotely(monkeypatch):
    monkeypatch.setenv("OCRFLOW_RUNNER_MODE", "remote")
    monkeypatch.setenv("OCRFLOW_LIQUID_SERVICE_URL", "http://liquid:8000")
    get_settings.cache_clear()
    try:
        runner = build_runner("liquid/vision-prompt")
    finally:
        get_settings.cache_clear()

    assert isinstance(runner, RemoteModelRunner)
    assert runner._service_url == "http://liquid:8000"
    assert {model.model_id for model in models_for_provider("liquid")} == {
        "liquid/vision-prompt",
        "liquid/vision-structured-extract",
    }


async def test_liquid_service_advertises_its_two_models(monkeypatch):
    monkeypatch.setenv("OCRFLOW_SERVICE_PROVIDER", "liquid")
    get_settings.cache_clear()
    try:
        app = internal_app.create_internal_app()
        route = next(
            route
            for route in app.routes
            if getattr(route, "path", None) == "/internal/capabilities"
        )
        payload = await route.endpoint()
    finally:
        get_settings.cache_clear()

    assert payload == {
        "api_version": "1",
        "provider": "liquid",
        "models": [
            "liquid/vision-prompt",
            "liquid/vision-structured-extract",
        ],
    }
