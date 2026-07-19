#!/usr/bin/env python3
"""CLI smoke script for loader/image."""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import sys
from pathlib import Path

from app.core.config import get_settings
from app.models.loader.image import ImageLoaderRunner
from app.schemas.artifacts import DocumentInput
from app.schemas.models.loader.pdf import ImageLoaderInput


async def main() -> int:
    parser = argparse.ArgumentParser(description="Run loader/image on an image file")
    parser.add_argument("--image", required=True, type=Path, help="Path to input image")
    args = parser.parse_args()

    if not args.image.exists():
        print(f"Image not found: {args.image}", file=sys.stderr)
        return 1

    image_bytes = args.image.read_bytes()
    settings = get_settings()
    config = settings.build_model_config()
    runner = ImageLoaderRunner()
    await runner.load(config)
    try:
        output = await runner.run(
            ImageLoaderInput(
                document=DocumentInput(
                    source=base64.b64encode(image_bytes).decode("ascii"),
                    format="image",
                ),
            )
        )
        print(json.dumps({"page_count": len(output.pages), "meta": output.meta.model_dump()}, indent=2))
    finally:
        await runner.unload()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
