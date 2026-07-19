"""Tests for loader input validation."""

import pytest

from app.models.errors import ModelInferenceError
from app.models.loader.image_validate import validate_image_loader_input
from app.models.loader.page_at_validate import validate_page_at_input
from app.models.loader.pdf_validate import validate_pdf_loader_input
from app.schemas.artifacts import DocumentInput, PageArtifact, PageImage
from app.schemas.models.loader.page_at import PageAtInput, PageAtOptions
from app.schemas.models.loader.pdf import ImageLoaderInput, PdfLoaderInput


def test_validate_pdf_requires_pdf_format():
    with pytest.raises(ModelInferenceError, match="format='pdf'"):
        validate_pdf_loader_input(
            PdfLoaderInput(document=DocumentInput(source="x", format="image"))
        )


def test_validate_pdf_requires_project_id_for_asset():
    with pytest.raises(ModelInferenceError, match="project_id"):
        validate_pdf_loader_input(
            PdfLoaderInput(document=DocumentInput(source="asset:abc", format="pdf"))
        )


def test_validate_image_requires_image_format():
    with pytest.raises(ModelInferenceError, match="format='image'"):
        validate_image_loader_input(
            ImageLoaderInput(document=DocumentInput(source="x", format="pdf"))
        )


def test_validate_page_at_index_out_of_range():
    page = PageArtifact(
        page_index=0,
        page=PageImage(page_index=0, width=10, height=10, image_base64="aGk="),
    )
    with pytest.raises(ModelInferenceError, match="out of range"):
        validate_page_at_input(
            PageAtInput(pages=[page], options=PageAtOptions(page_index=1))
        )
