"""Shared image and coordinate utilities for model runners."""

from __future__ import annotations

import asyncio
import base64
import io
import tempfile
from collections.abc import Callable
from pathlib import Path
from typing import Any, TypeVar

import httpx
from PIL import Image

from app.models.device import device_to_torch  # noqa: F401
from app.models.errors import ModelInferenceError
from app.schemas.artifacts import BBox, PageImage

T = TypeVar("T")


def normalize_bbox_from_pixels(
    left: float,
    top: float,
    right: float,
    bottom: float,
    width: int,
    height: int,
) -> BBox:
    if width <= 0 or height <= 0:
        raise ModelInferenceError("Image width and height must be positive")
    return [
        max(0.0, min(1.0, left / width)),
        max(0.0, min(1.0, top / height)),
        max(0.0, min(1.0, right / width)),
        max(0.0, min(1.0, bottom / height)),
    ]


def normalize_polygon_from_pixels(
    polygon: list[list[float]],
    width: int,
    height: int,
) -> list[list[float]]:
    if width <= 0 or height <= 0:
        raise ModelInferenceError("Image width and height must be positive")
    return [
        [
            max(0.0, min(1.0, point[0] / width)),
            max(0.0, min(1.0, point[1] / height)),
        ]
        for point in polygon
    ]


def denormalize_bbox_to_pixels(bbox: BBox, width: int, height: int) -> tuple[int, int, int, int]:
    x0, y0, x1, y1 = bbox
    return (
        int(x0 * width),
        int(y0 * height),
        int(x1 * width),
        int(y1 * height),
    )


async def page_image_to_pil(page: PageImage) -> Image.Image:
    if page.image_base64:
        try:
            raw = base64.b64decode(page.image_base64, validate=True)
        except Exception as exc:
            raise ModelInferenceError("Invalid image_base64 payload") from exc
        return Image.open(io.BytesIO(raw)).convert("RGB")

    if page.image_url:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(page.image_url)
                response.raise_for_status()
                return Image.open(io.BytesIO(response.content)).convert("RGB")
        except Exception as exc:
            raise ModelInferenceError(f"Failed to fetch image_url: {page.image_url}") from exc

    raise ModelInferenceError("PageImage must provide image_base64 or image_url")


async def run_sync(func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    return await asyncio.to_thread(func, *args, **kwargs)


def artifacts_path(config_cache_dir: Path) -> Path:
    config_cache_dir.mkdir(parents=True, exist_ok=True)
    return config_cache_dir


async def pil_to_temp_path(image: Image.Image, suffix: str = ".png") -> Path:
    def _write() -> Path:
        handle = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        path = Path(handle.name)
        handle.close()
        image.save(path, format="PNG")
        return path

    return await run_sync(_write)


def decode_upload_to_page_image(
    *,
    page_index: int,
    image_bytes: bytes,
    width: int | None = None,
    height: int | None = None,
) -> PageImage:
    pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return PageImage(
        page_index=page_index,
        width=width or pil.width,
        height=height or pil.height,
        image_base64=base64.b64encode(image_bytes).decode("ascii"),
    )


def pil_to_page_image(image: Image.Image, *, page_index: int) -> PageImage:
    rgb = image.convert("RGB")
    buffer = io.BytesIO()
    rgb.save(buffer, format="PNG")
    raw = buffer.getvalue()
    return PageImage(
        page_index=page_index,
        width=rgb.width,
        height=rgb.height,
        image_base64=base64.b64encode(raw).decode("ascii"),
    )
