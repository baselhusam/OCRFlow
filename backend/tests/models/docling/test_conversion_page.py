"""Tests for Docling conversion helpers."""

from __future__ import annotations

import asyncio
import base64
import io

import pytest
from PIL import Image, ImageDraw

from app.models.docling._conversion import build_conversion_page
from app.schemas.artifacts import PageImage


def _page_image(page_index: int) -> tuple[PageImage, Image.Image]:
    img = Image.new("RGB", (200, 80), "white")
    draw = ImageDraw.Draw(img)
    draw.text((10, 20), f"page {page_index}", fill="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    page = PageImage(
        page_index=page_index,
        width=img.width,
        height=img.height,
        image_base64=base64.b64encode(buf.getvalue()).decode("ascii"),
    )
    return page, img


@pytest.mark.asyncio
async def test_build_conversion_page_uses_backend_index_zero_for_sliced_pages() -> None:
    page_image, pil = _page_image(3)

    _conv_res, page = await build_conversion_page(page_image, pil)

    assert page.page_no == 3
    assert page._backend is not None
    assert page._backend.is_valid()
