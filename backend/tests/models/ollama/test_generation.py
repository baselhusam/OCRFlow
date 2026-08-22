import json

import httpx
import pytest
from pydantic import ValidationError

from app.core.config import get_settings
from app.models.ollama.generation import (
    OllamaStructuredRunner,
    OllamaTextRunner,
    OllamaVisionRunner,
)
from app.schemas.artifacts import PageImage
from app.schemas.models.ollama.generation import (
    OllamaStructuredInput,
    OllamaTextInput,
    OllamaVisionInput,
)


def _install_transport(monkeypatch, runner, handler):
    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(
        runner,
        "_new_client",
        lambda **kwargs: httpx.AsyncClient(transport=transport),
    )


@pytest.mark.asyncio
async def test_text_prompt_calls_local_ollama(monkeypatch):
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": []})
        body = json.loads(request.content)
        assert body["model"] == "qwen3:0.6b"
        assert body["think"] is False
        assert body["messages"][-1]["content"].endswith("Input:\nInvoice total 42")
        return httpx.Response(
            200,
            json={
                "message": {"content": "The invoice total is 42."},
                "prompt_eval_count": 12,
                "eval_count": 8,
            },
        )

    runner = OllamaTextRunner()
    _install_transport(monkeypatch, runner, handler)
    await runner.load(get_settings().build_model_config())

    result = await runner.run(
        OllamaTextInput(
            text="Invoice total 42",
            prompt="Summarize",
        )
    )

    assert result.text == "The invoice total is 42."
    assert result.prompt_tokens == 12
    assert result.completion_tokens == 8


@pytest.mark.asyncio
async def test_structured_extract_validates_generated_schema(monkeypatch):
    schema = {
        "type": "object",
        "properties": {
            "invoice_number": {"type": "string"},
            "total": {"type": "number"},
        },
        "required": ["invoice_number", "total"],
    }

    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": []})
        body = json.loads(request.content)
        assert body["format"] == schema
        return httpx.Response(
            200,
            json={
                "message": {
                    "content": '{"invoice_number":"INV-42","total":42.0}'
                }
            },
        )

    runner = OllamaStructuredRunner()
    _install_transport(monkeypatch, runner, handler)
    await runner.load(get_settings().build_model_config())

    result = await runner.run(
        OllamaStructuredInput(
            text="Invoice INV-42 total 42.00",
            prompt="Extract invoice fields",
            json_schema=schema,
        )
    )

    assert result.data == {"invoice_number": "INV-42", "total": 42.0}


@pytest.mark.asyncio
async def test_vision_prompt_sends_page_image(monkeypatch):
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": []})
        body = json.loads(request.content)
        assert body["model"] == "qwen3.5:0.8b"
        assert body["messages"][-1]["images"] == ["aW1hZ2U="]
        return httpx.Response(
            200,
            json={"message": {"content": "A bar chart rising from 10 to 20."}},
        )

    runner = OllamaVisionRunner()
    _install_transport(monkeypatch, runner, handler)
    await runner.load(get_settings().build_model_config())

    result = await runner.run(
        OllamaVisionInput(
            page=PageImage(
                page_index=0,
                width=100,
                height=100,
                image_base64="aW1hZ2U=",
            ),
            prompt="Summarize this chart",
        )
    )

    assert result.text.startswith("A bar chart")


def test_rejects_unapproved_over_budget_models():
    with pytest.raises(ValidationError, match="model must be one of"):
        OllamaTextInput(
            text="hello",
            options={"model": "qwen3.5:9b"},
        )
