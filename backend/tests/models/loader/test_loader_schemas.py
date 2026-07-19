"""Tests for loader schema validation."""

import pytest

from app.schemas.models.loader.page_at import PageAtInput, PageAtOptions
from app.schemas.models.loader.pdf import ImageLoaderInput, PdfLoaderInput
from app.schemas.artifacts import DocumentInput, PageArtifact, PageImage


def test_pdf_loader_input_valid():
    payload = PdfLoaderInput(
        document=DocumentInput(source="dGVzdA==", format="pdf"),
        options={"dpi": 150, "max_pages": 10, "project_id": "proj-1"},
    )
    assert payload.options.dpi == 150


def test_pdf_loader_input_accepts_document():
    payload = PdfLoaderInput(
        document=DocumentInput(source="x", format="image"),
    )
    assert payload.document.format == "image"


def test_image_loader_input_valid():
    payload = ImageLoaderInput(
        document=DocumentInput(source="dGVzdA==", format="image"),
    )
    assert payload.document.format == "image"


def test_page_at_input_valid():
    page = PageArtifact(
        page_index=0,
        page=PageImage(page_index=0, width=100, height=100, image_base64="aGk="),
    )
    payload = PageAtInput(pages=[page], options=PageAtOptions(page_index=0))
    assert payload.options.page_index == 0
