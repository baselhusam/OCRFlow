"""Page OCR on hosted vision models (OpenRouter) through a configured connection."""

from __future__ import annotations

import re

from app.models.connected.generation import _ConnectedRunner
from app.models.errors import ModelValidationError
from app.schemas.artifacts import DocumentArtifact, PageArtifact
from app.schemas.models.connected.generation import ConnectedOptions
from app.schemas.models.connected.ocr import ConnectedOcrInput, ConnectedOcrOutput

_FENCE = re.compile(r"^\s*```(?:markdown|md)?\s*\n(?P<body>.*?)\n?```\s*$", re.DOTALL | re.IGNORECASE)


def clean_markdown(text: str) -> str:
    """Drop the code fence chat models like to wrap a transcription in."""
    match = _FENCE.match(text)
    return (match.group("body") if match else text).strip()


class ConnectedOcrRunner(_ConnectedRunner):
    model_id = "openrouter/ocr"

    async def _run_impl(self, input: ConnectedOcrInput) -> ConnectedOcrOutput:
        if not input.page.image_base64:
            raise ModelValidationError("OCR nodes require an embedded page image")
        options = input.options
        text, body, provider = await self._invoke(
            ConnectedOptions(
                connection_id=options.connection_id,
                model=options.model,
                temperature=options.temperature,
                max_tokens=options.max_tokens,
                provider_protocol=options.provider_protocol,
            ),
            options.prompt,
            input.page.image_base64,
        )
        markdown = clean_markdown(text)
        warnings: list[str] = []
        try:
            if body["choices"][0].get("finish_reason") == "length":
                warnings.append("output reached max_tokens and may be cut off")
        except (KeyError, IndexError, TypeError, AttributeError):
            pass
        prompt_tokens, completion_tokens = self._usage(body)
        # Hosted chat models return text without geometry, so the page carries
        # no regions; the markdown is the document's content.
        return ConnectedOcrOutput(
            document=DocumentArtifact(
                pages=[PageArtifact(page_index=input.page.page_index)],
                metadata={"provider": provider, "model": options.model, "markdown": markdown},
            ),
            markdown=markdown,
            model=options.model,
            provider=provider,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            warnings=warnings,
        )
