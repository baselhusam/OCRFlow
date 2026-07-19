"""Generate golden fixtures for surya/layout (requires GPU and surya-ocr)."""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
from pathlib import Path

from PIL import Image

from app.core.config import get_settings
from app.models.surya.layout import SuryaLayoutRunner
from app.schemas.artifacts import PageImage
from app.schemas.models.surya.layout import LayoutDetectionInput


async def generate(image_path: Path, output_path: Path) -> None:
    image_bytes = image_path.read_bytes()
    pil = Image.open(image_path).convert("RGB")
    page = PageImage(
        page_index=0,
        width=pil.width,
        height=pil.height,
        image_base64=base64.b64encode(image_bytes).decode("ascii"),
    )
    runner = SuryaLayoutRunner()
    config = get_settings().build_model_config()
    await runner.load(config)
    try:
        output = await runner.run(LayoutDetectionInput(page=page))
        output_path.write_text(json.dumps(output.model_dump(), indent=2), encoding="utf-8")
    finally:
        await runner.unload()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    asyncio.run(generate(args.image, args.output))


if __name__ == "__main__":
    main()
