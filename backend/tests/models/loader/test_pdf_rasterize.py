"""Tests for PDF rasterization."""

import io

import pypdfium2 as pdfium
from PIL import Image

from app.models.loader._rasterize import image_bytes_to_page_image, rasterize_pdf


def _make_single_page_pdf() -> bytes:
    pdf = pdfium.PdfDocument.new()
    width, height = 64, 64
    page = pdf.new_page(width, height)
    page.close()
    buffer = io.BytesIO()
    pdf.save(buffer)
    pdf.close()
    return buffer.getvalue()


def test_rasterize_pdf_produces_page_image():
    pdf_bytes = _make_single_page_pdf()
    pages = rasterize_pdf(pdf_bytes, dpi=72, page_range=None, max_pages=10)
    assert len(pages) == 1
    assert pages[0].page_index == 0
    assert pages[0].width > 0
    assert pages[0].height > 0
    assert pages[0].image_base64


def test_image_bytes_to_page_image():
    image = Image.new("RGB", (32, 48), color=(0, 255, 0))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    page = image_bytes_to_page_image(buffer.getvalue())
    assert page.width == 32
    assert page.height == 48
