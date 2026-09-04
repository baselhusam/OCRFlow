"""Local Liquid LFM2.5-VL runners for document understanding and extraction."""

from __future__ import annotations

import json
from typing import Any

from app.models._image_utils import page_image_to_pil, run_sync
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.device import device_to_torch
from app.models.errors import ModelInferenceError, ModelLoadError, ModelValidationError
from app.schemas.models.liquid.generation import (
    DEFAULT_VISION_MODEL,
    LiquidStructuredOutput,
    LiquidVisionInput,
    LiquidVisionStructuredInput,
    LiquidTextOutput,
)


def _validate_schema_value(value: Any, schema: dict[str, Any], *, path: str = "$") -> None:
    expected = schema.get("type")
    type_checks = {
        "object": lambda item: isinstance(item, dict),
        "array": lambda item: isinstance(item, list),
        "string": lambda item: isinstance(item, str),
        "number": lambda item: isinstance(item, (int, float)) and not isinstance(item, bool),
        "integer": lambda item: isinstance(item, int) and not isinstance(item, bool),
        "boolean": lambda item: isinstance(item, bool),
        "null": lambda item: item is None,
    }
    if isinstance(expected, str) and expected in type_checks and not type_checks[expected](value):
        raise ModelValidationError(f"Structured output {path} must be {expected}")
    if "enum" in schema and value not in schema["enum"]:
        raise ModelValidationError(f"Structured output {path} must be one of {schema['enum']}")
    if isinstance(value, dict):
        required = schema.get("required", [])
        if isinstance(required, list):
            missing = [key for key in required if key not in value]
            if missing:
                raise ModelValidationError(
                    f"Structured output {path} is missing required fields: {', '.join(map(str, missing))}"
                )
        properties = schema.get("properties", {})
        if isinstance(properties, dict):
            for key, child_schema in properties.items():
                if key in value and isinstance(child_schema, dict):
                    _validate_schema_value(value[key], child_schema, path=f"{path}.{key}")
    if isinstance(value, list) and isinstance(schema.get("items"), dict):
        for index, item in enumerate(value):
            _validate_schema_value(item, schema["items"], path=f"{path}[{index}]")


class _LiquidVisionRunner(BaseRunner[Any, Any]):
    """Shared, lazy LFM2.5-VL-1.6B loader and generation implementation."""

    def __init__(self) -> None:
        super().__init__()
        self._model: Any | None = None
        self._processor: Any | None = None
        self._torch: Any | None = None

    async def _load_impl(self, config: ModelConfig) -> None:
        try:
            import torch
            from transformers import AutoModelForImageTextToText, AutoProcessor
        except ImportError as exc:
            raise ModelLoadError(
                "Liquid support requires requirements-liquid.txt (torch and transformers>=5.1)."
            ) from exc

        torch_device = device_to_torch(config.device)
        dtype = torch.bfloat16 if torch_device != "cpu" else torch.float32
        cache_dir = config.model_cache_dir / "liquid"
        try:
            processor = await run_sync(
                AutoProcessor.from_pretrained,
                DEFAULT_VISION_MODEL,
                cache_dir=str(cache_dir),
            )
            model = await run_sync(
                AutoModelForImageTextToText.from_pretrained,
                DEFAULT_VISION_MODEL,
                cache_dir=str(cache_dir),
                dtype=dtype,
            )
            model = await run_sync(model.to, torch_device)
            await run_sync(model.eval)
        except Exception as exc:
            raise ModelLoadError(
                f"Failed to load {DEFAULT_VISION_MODEL} on {torch_device}: {exc}"
            ) from exc
        self._torch = torch
        self._processor = processor
        self._model = model

    async def _unload_impl(self) -> None:
        self._model = None
        self._processor = None
        self._torch = None

    async def _generate(self, input: LiquidVisionInput, *, json_schema: dict[str, Any] | None = None) -> tuple[str, int, int]:
        if self._model is None or self._processor is None or self._torch is None:
            raise ModelInferenceError("Liquid model is not loaded")
        image = await page_image_to_pil(input.page)
        instruction = input.prompt
        if json_schema is not None:
            instruction = (
                f"{instruction}\n\nReturn only valid JSON matching this schema:\n"
                f"{json.dumps(json_schema, ensure_ascii=False)}"
            )
        content: list[dict[str, Any]] = [{"type": "image", "image": image}, {"type": "text", "text": instruction}]
        messages: list[dict[str, Any]] = []
        if input.options.system_prompt:
            messages.append({"role": "system", "content": input.options.system_prompt})
        messages.append({"role": "user", "content": content})

        def generate() -> tuple[str, int, int]:
            assert self._model is not None and self._processor is not None and self._torch is not None
            inputs = self._processor.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=True,
                return_dict=True,
                return_tensors="pt",
            ).to(self._model.device)
            input_tokens = int(inputs["input_ids"].shape[-1])
            generation_args: dict[str, Any] = {
                "max_new_tokens": input.options.max_tokens,
                "do_sample": input.options.temperature > 0,
            }
            if input.options.temperature > 0:
                generation_args["temperature"] = input.options.temperature
            with self._torch.inference_mode():
                output = self._model.generate(**inputs, **generation_args)
            generated = output[0][input_tokens:]
            text = self._processor.decode(generated, skip_special_tokens=True).strip()
            return text, input_tokens, int(generated.shape[-1])

        try:
            text, prompt_tokens, completion_tokens = await run_sync(generate)
        except Exception as exc:
            raise ModelInferenceError(f"Liquid inference failed: {exc}") from exc
        if not text:
            raise ModelValidationError("Liquid returned an empty response")
        return text, prompt_tokens, completion_tokens


class LiquidVisionRunner(_LiquidVisionRunner):
    model_id = "liquid/vision-prompt"

    async def _run_impl(self, input: LiquidVisionInput) -> LiquidTextOutput:
        text, prompt_tokens, completion_tokens = await self._generate(input)
        return LiquidTextOutput(
            text=text,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )


class LiquidVisionStructuredRunner(_LiquidVisionRunner):
    model_id = "liquid/vision-structured-extract"

    async def _run_impl(self, input: LiquidVisionStructuredInput) -> LiquidStructuredOutput:
        raw_text, prompt_tokens, completion_tokens = await self._generate(
            input,
            json_schema=input.json_schema,
        )
        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise ModelValidationError("Liquid structured output was not valid JSON") from exc
        if not isinstance(data, dict):
            raise ModelValidationError("Liquid structured output must be a JSON object")
        _validate_schema_value(data, input.json_schema)
        return LiquidStructuredOutput(
            data=data,
            raw_text=raw_text,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )
