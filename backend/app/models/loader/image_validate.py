"""Validation for loader/image inputs."""

from app.models.errors import ModelInferenceError
from app.schemas.models.loader.pdf import ImageLoaderInput


def validate_image_loader_input(input: ImageLoaderInput) -> None:
    if input.document.format not in {"image", "images"}:
        raise ModelInferenceError("loader/image requires document.format='image' or 'images'")
    if input.document.source.startswith("asset:") and not input.options.project_id:
        raise ModelInferenceError("project_id is required when using asset sources")
