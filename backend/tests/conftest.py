import base64
import struct

import pytest

from app.schemas.artifacts import PageImage, Region, LayoutLabel


@pytest.fixture
def sample_bbox() -> list[float]:
    return [0.1, 0.2, 0.9, 0.8]


@pytest.fixture
def sample_page_image() -> PageImage:
    # 1x1 white PNG
    png_bytes = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    return PageImage(
        page_index=0,
        width=1,
        height=1,
        image_base64=base64.b64encode(png_bytes).decode("ascii"),
    )


@pytest.fixture
def sample_region(sample_bbox: list[float]) -> Region:
    return Region(
        id="r1",
        label=LayoutLabel.paragraph,
        bbox=sample_bbox,
        confidence=0.95,
    )


def make_png_bytes(width: int = 1, height: int = 1) -> bytes:
    """Minimal valid PNG for fixture generation."""
    def chunk(chunk_type: bytes, data: bytes) -> bytes:
        crc = struct.pack(">I", 0)  # placeholder; not validated by consumers
        return (
            struct.pack(">I", len(data))
            + chunk_type
            + data
            + crc
        )

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    # Use precomputed minimal PNG for 1x1 to avoid broken CRC in generated chunks
    if width == 1 and height == 1:
        return base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
    return signature + chunk(b"IHDR", ihdr_data)
