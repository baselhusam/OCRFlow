"""OpenRouter page OCR runner: request shape and document output."""
import base64
import json
from types import SimpleNamespace

import httpx
import pytest

from app.models.base import ModelConfig
from app.models.connected import generation
from app.models.connected.ocr import ConnectedOcrRunner, clean_markdown
from app.models.errors import ModelInferenceError, ModelValidationError
from app.schemas.models.connected.ocr import ConnectedOcrInput

_PNG = base64.b64encode(b"\x89PNG\r\n\x1a\n").decode()


def _input() -> ConnectedOcrInput:
    return ConnectedOcrInput.model_validate({
        "page": {"page_index": 2, "width": 10, "height": 10, "image_base64": _PNG},
        "options": {"connection_id": "OpenRouter", "model": "qwen/qwen2.5-vl-72b-instruct", "provider_protocol": "openrouter"},
    })


def _install(monkeypatch, handler, protocol: str = "openrouter") -> None:
    connection = SimpleNamespace(name="OpenRouter", protocol=protocol, encrypted_api_key=None)

    async def resolve(_connection_id):
        return connection, "https://openrouter.ai/api/v1"

    monkeypatch.setattr(generation, "resolve_connection", resolve)
    monkeypatch.setattr(generation, "connection_headers", lambda _c: {"Authorization": "Bearer k"})
    real = httpx.AsyncClient
    monkeypatch.setattr(generation.httpx, "AsyncClient", lambda *a, **k: real(transport=httpx.MockTransport(handler)))


async def _run(payload: ConnectedOcrInput):
    runner = ConnectedOcrRunner()
    await runner.load(ModelConfig())
    return await runner.run(payload)


def test_clean_markdown_strips_fence():
    assert clean_markdown("```markdown\n# Title\n\nBody\n```") == "# Title\n\nBody"
    assert clean_markdown("# Plain") == "# Plain"


async def test_ocr_runner_sends_page_and_returns_document(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v1/chat/completions"
        body = json.loads(request.content)
        assert body["model"] == "qwen/qwen2.5-vl-72b-instruct"
        content = body["messages"][-1]["content"]
        assert content[1]["image_url"]["url"].startswith("data:image/png;base64,")
        return httpx.Response(200, json={
            "choices": [{"message": {"content": "```markdown\n# Invoice 42\n```"}, "finish_reason": "length"}],
            "usage": {"prompt_tokens": 900, "completion_tokens": 12},
        })

    _install(monkeypatch, handler)
    result = await _run(_input())
    assert result.markdown == "# Invoice 42"
    assert result.document.pages[0].page_index == 2
    assert result.prompt_tokens == 900
    assert result.warnings


async def test_ocr_runner_surfaces_upstream_error_payload(monkeypatch):
    _install(monkeypatch, lambda _r: httpx.Response(200, json={"error": {"message": "No endpoints found"}}))
    with pytest.raises(ModelInferenceError, match="No endpoints found"):
        await _run(_input())


async def test_ocr_runner_rejects_non_openrouter_connection(monkeypatch):
    _install(monkeypatch, lambda _r: httpx.Response(500), protocol="openai")
    with pytest.raises(ModelValidationError, match="openrouter"):
        await _run(_input())
