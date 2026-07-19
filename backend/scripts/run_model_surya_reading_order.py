#!/usr/bin/env python3
"""CLI smoke script for surya/reading-order."""

from __future__ import annotations

import argparse
import asyncio
import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image

from app.core.config import get_settings
from app.models.surya.layout import SuryaLayoutRunner
from app.models.surya.reading_order import SuryaReadingOrderRunner
from app.schemas.artifacts import PageImage
from app.schemas.models.surya.layout import LayoutDetectionInput
from app.schemas.models.surya.reading_order import ReadingOrderInput


async def main() -> int:
    parser = argparse.ArgumentParser(description="Run surya/reading-order on an image")
    parser.add_argument("--image", required=True, type=Path, help="Path to input image")
    args = parser.parse_args()

    if not args.image.exists():
        print(f"Image not found: {args.image}", file=sys.stderr)
        return 1

    image_bytes = args.image.read_bytes()
    pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    page = PageImage(
        page_index=0,
        width=pil.width,
        height=pil.height,
        image_base64=base64.b64encode(image_bytes).decode("ascii"),
    )

    settings = get_settings()
    config = settings.build_model_config()
    layout_runner = SuryaLayoutRunner()
    await layout_runner.load(config)
    layout_output = await layout_runner.run(LayoutDetectionInput(page=page))
    await layout_runner.unload()

    runner = SuryaReadingOrderRunner()
    await runner.load(config)
    try:
        output = await runner.run(
            ReadingOrderInput(page=page, regions=layout_output.regions)
        )
        print(json.dumps(output.model_dump(), indent=2))
    finally:
        await runner.unload()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
