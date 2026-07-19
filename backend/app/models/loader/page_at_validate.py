"""Validation for loader/page-at inputs."""

from app.models.errors import ModelInferenceError
from app.schemas.models.loader.page_at import PageAtInput


def validate_page_at_input(input: PageAtInput) -> None:
    if not input.pages:
        raise ModelInferenceError("pages must not be empty")
    if input.options.page_index >= len(input.pages):
        raise ModelInferenceError(
            f"page_index {input.options.page_index} out of range (have {len(input.pages)} pages)"
        )
