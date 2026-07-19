"""Validation for loader/pdf inputs."""

from app.models.errors import ModelInferenceError
from app.schemas.models.loader.pdf import PdfLoaderInput


def validate_pdf_loader_input(input: PdfLoaderInput) -> None:
    if input.document.format != "pdf":
        raise ModelInferenceError("loader/pdf requires document.format='pdf'")
    if input.document.source.startswith("asset:") and not input.options.project_id:
        raise ModelInferenceError("project_id is required when using asset sources")
