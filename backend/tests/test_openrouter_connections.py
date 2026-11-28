"""OpenRouter: key verification, OCR model discovery, and the canvas catalog."""
import uuid
from types import SimpleNamespace

import httpx

from app.schemas.model_connection import ModelConnectionValidationRequest
from app.services import model_connections


def _client(handler):
    real_client = httpx.AsyncClient
    def factory(*_args, **_kwargs): return real_client(transport=httpx.MockTransport(handler))
    return factory


async def _allow(value: str) -> str: return value.rstrip("/")


_MODELS = [
    {"id": "qwen/qwen2.5-vl-72b-instruct", "name": "Qwen: Qwen2.5 VL 72B", "description": "Strong at documents and charts.",
     "context_length": 32000, "architecture": {"input_modalities": ["text", "image"], "output_modalities": ["text"]},
     "pricing": {"prompt": "0.0000008", "completion": "0.0000008"}, "supported_parameters": ["max_tokens", "response_format"]},
    {"id": "google/gemma-4-31b-it:free", "name": "Google: Gemma 4 31B (free)", "description": "General model.",
     "architecture": {"input_modalities": ["text", "image"], "output_modalities": ["text"]},
     "pricing": {"prompt": "0", "completion": "0"}},
    {"id": "openai/gpt-6:batch", "name": "Batch", "architecture": {"input_modalities": ["image"], "output_modalities": ["text"]}},
    {"id": "openrouter/auto", "name": "Auto Router", "architecture": {"input_modalities": ["image"], "output_modalities": ["text"]}},
    {"id": "meta/llama-text", "name": "Text only", "architecture": {"input_modalities": ["text"], "output_modalities": ["text"]}},
    {"id": "google/image-gen", "name": "Image gen", "architecture": {"input_modalities": ["text", "image"], "output_modalities": ["image", "text"]}},
]


def _request(api_key: str | None = "sk-or-test") -> ModelConnectionValidationRequest:
    return ModelConnectionValidationRequest(
        name="OpenRouter", protocol="openrouter", base_url="https://openrouter.ai/api/v1", api_key=api_key,
    )


def test_catalog_keeps_image_to_text_models_document_first():
    models = model_connections.ocr_models_from_catalog(_MODELS)
    assert [model.id for model in models] == ["qwen/qwen2.5-vl-72b-instruct", "google/gemma-4-31b-it:free"]
    qwen, gemma = models
    assert qwen.document_focused and qwen.structured_outputs
    assert qwen.prompt_price == 0.8 and qwen.context_length == 32000
    assert gemma.free and not gemma.document_focused


async def test_connection_verifies_key_then_lists_ocr_models(monkeypatch):
    seen: list[str] = []
    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url.path)
        assert request.headers["authorization"] == "Bearer sk-or-test"
        if request.url.path == "/api/v1/key":
            return httpx.Response(200, json={"data": {"label": "ocr"}})
        assert request.url.path == "/api/v1/models"
        return httpx.Response(200, json={"data": _MODELS})
    monkeypatch.setattr(model_connections.httpx, "AsyncClient", _client(handler))
    monkeypatch.setattr(model_connections, "assert_safe_engine_url", _allow)
    result = await model_connections.validate_connection(_request())
    assert seen == ["/api/v1/key", "/api/v1/models"]
    assert result.status == "ready"
    assert len(result.ocr_models) == 2
    assert "(ocr)" in result.detail


async def test_bad_key_is_rejected_before_listing(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v1/key"
        return httpx.Response(401, json={"error": {"message": "User not found.", "code": 401}})
    monkeypatch.setattr(model_connections.httpx, "AsyncClient", _client(handler))
    monkeypatch.setattr(model_connections, "assert_safe_engine_url", _allow)
    result = await model_connections.validate_connection(_request("bad"))
    assert result.status == "authentication_required"
    assert result.ocr_models == []


async def test_missing_key_needs_authentication(monkeypatch):
    monkeypatch.setattr(model_connections, "assert_safe_engine_url", _allow)
    result = await model_connections.validate_connection(_request(None))
    assert result.status == "authentication_required"


async def test_ocr_catalog_lists_only_ready_enabled_connections():
    ready = SimpleNamespace(id=uuid.uuid4(), name="OpenRouter", protocol="openrouter", enabled=True, enabled_models=None,
        last_validation={"status": "ready", "ocr_models": [{"id": "qwen/qwen2.5-vl-72b-instruct", "name": "Qwen"}]})
    disabled = SimpleNamespace(id=uuid.uuid4(), name="Off", protocol="openrouter", enabled=False, enabled_models=None,
        last_validation={"status": "ready", "ocr_models": [{"id": "x/y", "name": "Y"}]})
    class Result:
        def scalars(self): return [ready, disabled]
    class Session:
        async def execute(self, _query): return Result()
    catalog = await model_connections.list_ocr_catalog(Session())
    assert [entry.connection_name for entry in catalog.connections] == ["OpenRouter"]
    assert catalog.connections[0].models[0].id == "qwen/qwen2.5-vl-72b-instruct"


_VALIDATION = {"status": "ready", "ocr_models": [
    {"id": "qwen/qwen2.5-vl-72b-instruct", "name": "Qwen VL", "document_focused": True},
    {"id": "google/gemma-4-31b-it:free", "name": "Gemma"},
    {"id": "openai/gpt-6", "name": "GPT-6"},
]}


def _connection(enabled_models):
    return SimpleNamespace(id=uuid.uuid4(), name="OpenRouter", protocol="openrouter", enabled=True,
                           enabled_models=enabled_models, last_validation=_VALIDATION)


def test_null_selection_enables_document_models_only():
    assert model_connections.enabled_model_ids(_connection(None)) == ["qwen/qwen2.5-vl-72b-instruct"]


def test_explicit_selection_drops_models_no_longer_listed():
    connection = _connection(["openai/gpt-6", "gone/model"])
    assert model_connections.enabled_model_ids(connection) == ["openai/gpt-6"]
    assert model_connections.enabled_model_ids(_connection([])) == []


async def test_catalog_lists_only_enabled_models():
    class Result:
        def scalars(self): return [_connection(["google/gemma-4-31b-it:free", "openai/gpt-6"])]
    class Session:
        async def execute(self, _query): return Result()
    catalog = await model_connections.list_ocr_catalog(Session())
    assert [model.id for model in catalog.connections[0].models] == ["google/gemma-4-31b-it:free", "openai/gpt-6"]


def test_aliases_are_not_listed():
    models = model_connections.ocr_models_from_catalog([
        {"id": "~openai/gpt-latest", "name": "OpenAI: latest", "architecture": {"input_modalities": ["image"], "output_modalities": ["text"]}},
    ])
    assert models == []
