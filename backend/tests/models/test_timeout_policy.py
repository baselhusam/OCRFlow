from app.core.config import Settings
from app.models.timeout_policy import resolve_inference_timeout


def test_document_conversion_models_use_longer_timeout():
    settings = Settings(
        inference_timeout_seconds=120.0,
        document_conversion_timeout_seconds=600.0,
    )

    assert resolve_inference_timeout("loader/pdf", settings) == 120.0
    assert resolve_inference_timeout("docling/convert-pipeline", settings) == 600.0
    assert resolve_inference_timeout("docling/vlm-granite-docling", settings) == 600.0
