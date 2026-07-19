"""Per-model inference timeout resolution."""

from __future__ import annotations

from app.core.config import Settings

DOCUMENT_CONVERSION_MODELS = frozenset(
    {
        "docling/convert-pipeline",
        "docling/vlm-granite-docling",
    }
)


def resolve_inference_timeout(model_id: str, settings: Settings) -> float:
    if model_id in DOCUMENT_CONVERSION_MODELS:
        return settings.document_conversion_timeout_seconds
    return settings.inference_timeout_seconds
