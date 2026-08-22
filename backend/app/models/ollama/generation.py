"""Local prompt, structured extraction, and vision runners backed by Ollama."""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import get_settings
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.errors import ModelInferenceError, ModelLoadError, ModelValidationError
from app.schemas.models.ollama.generation import (
    OllamaStructuredInput,
    OllamaStructuredOutput,
    OllamaTextInput,
    OllamaTextOutput,
    OllamaVisionInput,
    OllamaVisionStructuredInput,
)


def _validate_schema_value(
    value: Any,
    schema: dict[str, Any],
    *,
    path: str = "$",
) -> None:
    expected = schema.get("type")
    type_checks = {
        "object": lambda item: isinstance(item, dict),
        "array": lambda item: isinstance(item, list),
        "string": lambda item: isinstance(item, str),
        "number": lambda item: isinstance(item, (int, float))
        and not isinstance(item, bool),
        "integer": lambda item: isinstance(item, int) and not isinstance(item, bool),
        "boolean": lambda item: isinstance(item, bool),
        "null": lambda item: item is None,
    }
    if isinstance(expected, str) and expected in type_checks:
        if not type_checks[expected](value):
            raise ModelValidationError(
                f"Structured output {path} must be {expected}"
            )

    if "enum" in schema and value not in schema["enum"]:
        raise ModelValidationError(
            f"Structured output {path} must be one of {schema['enum']}"
        )

    if isinstance(value, dict):
        required = schema.get("required", [])
        if isinstance(required, list):
            missing = [key for key in required if key not in value]
            if missing:
                raise ModelValidationError(
                    f"Structured output {path} is missing required fields: "
                    f"{', '.join(str(key) for key in missing)}"
                )
        properties = schema.get("properties", {})
        if isinstance(properties, dict):
            for key, child_schema in properties.items():
                if key in value and isinstance(child_schema, dict):
                    _validate_schema_value(
                        value[key],
                        child_schema,
                        path=f"{path}.{key}",
                    )

    if isinstance(value, list) and isinstance(schema.get("items"), dict):
        for index, item in enumerate(value):
            _validate_schema_value(
                item,
                schema["items"],
                path=f"{path}[{index}]",
            )


class _OllamaRunner(BaseRunner[Any, Any]):
    def __init__(self) -> None:
        super().__init__()
        self._base_url = get_settings().ollama_base_url.rstrip("/")

    def _new_client(self, *, timeout: float | None = None) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=timeout or 5.0)

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            async with self._new_client() as client:
                response = await client.get(f"{self._base_url}/api/tags")
                response.raise_for_status()
        except (httpx.HTTPError, ValueError) as exc:
            raise ModelLoadError(
                f"Cannot reach Ollama at {self._base_url}. Start Ollama and pull "
                "qwen3:0.6b and qwen3.5:0.8b."
            ) from exc

    async def _unload_impl(self) -> None:
        return None

    async def _chat(
        self,
        *,
        model: str,
        prompt: str,
        system_prompt: str | None,
        temperature: float,
        max_tokens: int,
        images: list[str] | None = None,
        output_schema: dict[str, Any] | None = None,
    ) -> tuple[str, dict[str, Any]]:
        messages: list[dict[str, Any]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        user_message: dict[str, Any] = {"role": "user", "content": prompt}
        if images:
            user_message["images"] = images
        messages.append(user_message)
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": False,
            "think": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        if output_schema is not None:
            payload["format"] = output_schema

        timeout = self.config.timeout_seconds if self.config else 120.0
        try:
            async with self._new_client(timeout=timeout) as client:
                response = await client.post(
                    f"{self._base_url}/api/chat",
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise ModelInferenceError(
                f"Ollama request failed at {self._base_url}: {exc}"
            ) from exc

        if not response.is_success:
            try:
                detail = response.json().get("error", response.text)
            except ValueError:
                detail = response.text
            if response.status_code == 404:
                raise ModelLoadError(
                    f"Ollama model {model} is not installed. Run: ollama pull {model}"
                )
            raise ModelInferenceError(
                f"Ollama returned status {response.status_code}: {detail}"
            )

        try:
            body = response.json()
            content = body["message"]["content"]
        except (ValueError, KeyError, TypeError) as exc:
            raise ModelValidationError(
                "Ollama returned an invalid chat response"
            ) from exc
        if not isinstance(content, str) or not content.strip():
            raise ModelValidationError("Ollama returned an empty response")
        return content.strip(), body

    @staticmethod
    def _usage(body: dict[str, Any]) -> dict[str, int | None]:
        return {
            "prompt_tokens": body.get("prompt_eval_count")
            if isinstance(body.get("prompt_eval_count"), int)
            else None,
            "completion_tokens": body.get("eval_count")
            if isinstance(body.get("eval_count"), int)
            else None,
        }


class OllamaTextRunner(_OllamaRunner):
    model_id = "ollama/text-prompt"

    async def _run_impl(self, input: OllamaTextInput) -> OllamaTextOutput:
        content, body = await self._chat(
            model=input.options.model,
            prompt=f"{input.prompt}\n\nInput:\n{input.text}",
            system_prompt=input.options.system_prompt,
            temperature=input.options.temperature,
            max_tokens=input.options.max_tokens,
        )
        return OllamaTextOutput(
            text=content,
            model=input.options.model,
            **self._usage(body),
        )


class OllamaStructuredRunner(_OllamaRunner):
    model_id = "ollama/structured-extract"

    async def _run_impl(
        self,
        input: OllamaStructuredInput,
    ) -> OllamaStructuredOutput:
        schema_text = json.dumps(input.json_schema, separators=(",", ":"))
        content, body = await self._chat(
            model=input.options.model,
            prompt=(
                f"{input.prompt}\n\nReturn only JSON matching this schema:\n"
                f"{schema_text}\n\nInput:\n{input.text}"
            ),
            system_prompt=input.options.system_prompt,
            temperature=input.options.temperature,
            max_tokens=input.options.max_tokens,
            output_schema=input.json_schema,
        )
        try:
            data = json.loads(content)
        except json.JSONDecodeError as exc:
            raise ModelValidationError(
                "Ollama structured output was not valid JSON"
            ) from exc
        if not isinstance(data, dict):
            raise ModelValidationError(
                "Ollama structured output must be a JSON object"
            )
        _validate_schema_value(data, input.json_schema)
        return OllamaStructuredOutput(
            data=data,
            raw_text=content,
            model=input.options.model,
            **self._usage(body),
        )


class OllamaVisionRunner(_OllamaRunner):
    model_id = "ollama/vision-prompt"

    async def _run_impl(self, input: OllamaVisionInput) -> OllamaTextOutput:
        if not input.page.image_base64:
            raise ModelValidationError(
                "Ollama vision nodes require an embedded page image"
            )
        content, body = await self._chat(
            model=input.options.model,
            prompt=input.prompt,
            system_prompt=input.options.system_prompt,
            temperature=input.options.temperature,
            max_tokens=input.options.max_tokens,
            images=[input.page.image_base64],
        )
        return OllamaTextOutput(
            text=content,
            model=input.options.model,
            **self._usage(body),
        )


class OllamaVisionStructuredRunner(_OllamaRunner):
    model_id = "ollama/vision-structured-extract"

    async def _run_impl(
        self,
        input: OllamaVisionStructuredInput,
    ) -> OllamaStructuredOutput:
        if not input.page.image_base64:
            raise ModelValidationError(
                "Ollama vision nodes require an embedded page image"
            )
        schema_text = json.dumps(input.json_schema, separators=(",", ":"))
        content, body = await self._chat(
            model=input.options.model,
            prompt=(
                f"{input.prompt}\n\nReturn only JSON matching this schema:\n"
                f"{schema_text}"
            ),
            system_prompt=input.options.system_prompt,
            temperature=input.options.temperature,
            max_tokens=input.options.max_tokens,
            images=[input.page.image_base64],
            output_schema=input.json_schema,
        )
        try:
            data = json.loads(content)
        except json.JSONDecodeError as exc:
            raise ModelValidationError(
                "Ollama structured output was not valid JSON"
            ) from exc
        if not isinstance(data, dict):
            raise ModelValidationError(
                "Ollama structured output must be a JSON object"
            )
        _validate_schema_value(data, input.json_schema)
        return OllamaStructuredOutput(
            data=data,
            raw_text=content,
            model=input.options.model,
            **self._usage(body),
        )
