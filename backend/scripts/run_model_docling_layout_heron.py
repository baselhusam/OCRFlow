#!/usr/bin/env python3
"""CLI smoke script for docling/layout-heron."""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import sys
from pathlib import Path

from app.core.config import get_settings
from app.models.docling.layout_heron import DoclingLayoutHeronRunner
from app.schemas.artifacts import PageImage
from app.schemas.models.docling.layout_heron import LayoutDetectionInput


async def main() -> int:
    parser = argparse.ArgumentParser(description="Run docling/layout-heron on an image")
    parser.add_argument("--image", required=True, type=Path, help="Path to input image")
    args = parser.parse_args()

    if not args.image.exists():
        print(f"Image not found: {args.image}", file=sys.stderr)
        return 1

    image_bytes = args.image.read_bytes()
    from PIL import Image
    import io

    pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    page = PageImage(
        page_index=0,
        width=pil.width,
        height=pil.height,
        image_base64=base64.b64encode(image_bytes).decode("ascii"),
    )

    settings = get_settings()
    config = settings.build_model_config()
    runner = DoclingLayoutHeronRunner()
    await runner.load(config)
    try:
        output = await runner.run(LayoutDetectionInput(page=page))
        print(json.dumps(output.model_dump(), indent=2))
    finally:
        await runner.unload()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
